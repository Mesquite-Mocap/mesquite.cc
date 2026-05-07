// ============================================================
//  MESQUITE DONGLE — T-Display-S3 (DISPLAY DISABLED)
//  Hardware : LilyGo T-Display-S3 (screen left dark, board still used)
//  Core     : ESP32 Arduino core 3.x (IDF 5.x)
//
//  LIBRARIES REQUIRED:
//    - ESPAsyncWebServer  (by mathieucarbou)
//    - AsyncTCP           (by mathieucarbou)
//
//  ARDUINO IDE SETTINGS (critical):
//    Board               : LilyGo T-Display-S3
//    USB CDC On Boot     : Enabled
//    USB Mode            : Hardware CDC and JTAG
//    PSRAM               : OPI PSRAM
//    Flash Size          : 16MB (128Mb)
//    Partition Scheme    : 16M Flash (3MB APP/9.9MB FATFS)
//    Upload Mode         : UART0 / Hardware CDC
//    Arduino Runs On     : Core 1
//    Events Run On       : Core 1
//
//  MAC NOTE:
//    WiFi.macAddress() returns the STA MAC of this ESP32-S3.
//    In WIFI_AP_STA mode the AP MAC = STA MAC + 1.
//    Use the STA MAC printed at boot when registering this
//    dongle as a peer in your pod firmware.
// ============================================================

#include "Arduino.h"
#include <esp_now.h>
#include "WiFi.h"
#include "ESPAsyncWebServer.h"
#include "AsyncTCP.h"

// ============================================================
//  PINS  (display-only pins kept as defines but unused)
// ============================================================

#define BTN_MAC      14   // KEY1 — was: hold = show MAC
#define BTN_STATUS    0   // BOOT — was: toggle pod status screen
#define LCD_POWER_ON 15   // was: drive HIGH to power LCD rail

// ============================================================
//  POD CONFIG  (17 pods)
// ============================================================

#define NUM_PODS       17
#define POD_TIMEOUT_MS 5000

// Binary wire format (must match pod_watch.ino's pod_packet_t and
// webserialnative.js's BONE_NAMES table).
#define POD_PACKET_LEN 16
#define SYNC0          0xAA
#define SYNC1          0x55

const char* const POD_ABBR[NUM_PODS] = {
    "HD",   //  0  Head
    "SPN",  //  1  Spine
    "HIP",  //  2  HipsAlt
    "LUA",  //  3  LeftArm
    "LFA",  //  4  LeftForeArm
    "LH",   //  5  LeftHand
    "RUA",  //  6  RightArm
    "RFA",  //  7  RightForeArm
    "RH",   //  8  RightHand
    "LUL",  //  9  LeftUpLeg
    "LLL",  // 10  LeftLeg
    "LF",   // 11  LeftFoot
    "RUL",  // 12  RightUpLeg
    "RLL",  // 13  RightLeg
    "RF",   // 14  RightFoot
    "LS",   // 15  Left Shoulder
    "RS",   // 16  Right Shoulder
};

// ============================================================
//  SHARED STATE
// ============================================================

volatile bool          podConnected[NUM_PODS] = {false};
volatile unsigned long podLastSeen[NUM_PODS]  = {0};
portMUX_TYPE           stateMux = portMUX_INITIALIZER_UNLOCKED;

// ============================================================
//  DATA STRUCT + PEER MANAGEMENT
// ============================================================

// Receive-side mirror of pod_watch.ino's pod_packet_t. Kept here as a hard
// reference; OnDataRecv does not actually decode fields -- it just validates
// length+sync and forwards the raw bytes to USB serial. The browser unpacks.
typedef struct __attribute__((packed)) pod_packet_t {
    uint8_t  sync0;
    uint8_t  sync1;
    uint8_t  id;
    uint8_t  batt;
    int16_t  qx;
    int16_t  qy;
    int16_t  qz;
    int16_t  qw;
    uint16_t count;
    uint16_t ms_lo;
} pod_packet_t;
static_assert(sizeof(pod_packet_t) == POD_PACKET_LEN,
              "pod_packet_t must match POD_PACKET_LEN");

esp_now_peer_info_t peerMacs[NUM_PODS];
bool                peerMacsInit[NUM_PODS] = {false};
esp_now_peer_info_t peerInfo;

// ============================================================
//  WEB SERVER / WEBSOCKET
// ============================================================

AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// ============================================================
//  TASK HANDLES
// ============================================================

TaskHandle_t webSocketTaskHandle = NULL;
TaskHandle_t espNowTaskHandle    = NULL;

// Forward declaration so loop() can call sendReset()
void sendReset();

// ============================================================
//  POD TIMEOUT TASK
//  (was the timeout sweep inside displayTask — kept so
//   podConnected[] still flips false after POD_TIMEOUT_MS)
// ============================================================

void podTimeoutTask(void *pvParameters) {
    for (;;) {
        unsigned long now = millis();
        for (int i = 0; i < NUM_PODS; i++) {
            portENTER_CRITICAL(&stateMux);
            bool          wasOn = podConnected[i];
            unsigned long last  = podLastSeen[i];
            portEXIT_CRITICAL(&stateMux);

            if (wasOn && (now - last > POD_TIMEOUT_MS)) {
                portENTER_CRITICAL(&stateMux);
                podConnected[i] = false;
                portEXIT_CRITICAL(&stateMux);
            }
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

// ============================================================
//  ESP-NOW CALLBACKS
//  Note: recv callback signature changed in IDF 5.x.
//  Compile-time switch handles both old and new core versions.
// ============================================================

void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
    // Was: per-send Serial.println. Removed -- with binary forwarding, the
    // serial line is hot data only, not log noise. Re-enable only when
    // debugging the reboot path.
    (void)mac_addr; (void)status;
}

#if ESP_IDF_VERSION_MAJOR >= 5
void OnDataRecv(const esp_now_recv_info_t *recv_info, const uint8_t *incomingData, int len) {
    const uint8_t *mac_addr = recv_info->src_addr;
#else
void OnDataRecv(const uint8_t *mac_addr, const uint8_t *incomingData, int len) {
#endif
    // Validate framing first -- a stray non-protocol packet must not be
    // forwarded to USB or it desynchronizes the host parser.
    if (len != POD_PACKET_LEN
        || incomingData[0] != SYNC0
        || incomingData[1] != SYNC1) {
        return;
    }

    uint8_t id = incomingData[2];
    if (id >= NUM_PODS) {
        // Unknown bone id (or 0xFF control marker echoed back) -- drop.
        return;
    }

    // Forward the raw 16 bytes to the host. The browser reassembles via the
    // sync header and unpacks into the same {bone,x,y,z,w,batt,count,millis}
    // shape the JSON path used to produce.
    Serial.write(incomingData, POD_PACKET_LEN);

    // Track liveness for the local connection map.
    portENTER_CRITICAL(&stateMux);
    podConnected[id] = true;
    podLastSeen[id]  = millis();
    portEXIT_CRITICAL(&stateMux);

    // Register the pod as a unicast peer the first time we see it. Required
    // so sendReset() can hit it back over ESP-NOW.
    if (!peerMacsInit[id]) {
        peerMacsInit[id] = true;
        memcpy(peerMacs[id].peer_addr, mac_addr, 6);
        peerMacs[id].channel = 0;
        peerMacs[id].encrypt = false;
        esp_now_add_peer(&peerMacs[id]);
    }
}

// ============================================================
//  WEBSOCKET
// ============================================================

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
    AwsFrameInfo *info = (AwsFrameInfo *)arg;
    if (info->final && info->index == 0 &&
        info->len == len && info->opcode == WS_TEXT) {
        data[len] = 0;
        Serial.println((char *)data);
    }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client,
             AwsEventType type, void *arg, uint8_t *data, size_t len) {
    switch (type) {
    case WS_EVT_CONNECT:
        Serial.printf("WS client #%u connected from %s\n",
                      client->id(), client->remoteIP().toString().c_str());
        break;
    case WS_EVT_DISCONNECT:
        Serial.printf("WS client #%u disconnected\n", client->id());
        break;
    case WS_EVT_DATA:
        handleWebSocketMessage(arg, data, len);
        break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
        break;
    }
}

void initWebSocket() {
    ws.onEvent(onEvent);
    server.addHandler(&ws);
}

// ============================================================
//  FREERTOS WORKER TASKS
// ============================================================

void webSocketTask(void *pvParameters) {
    for (;;) vTaskDelay(pdMS_TO_TICKS(100));
}

void espNowTask(void *pvParameters) {
    for (;;) vTaskDelay(pdMS_TO_TICKS(100));
}

// ============================================================
//  SETUP
// ============================================================

void setup() {
    Serial.begin(921600);

    // WiFi mode must come before macAddress()
    WiFi.mode(WIFI_AP_STA);
    String mac = WiFi.macAddress();
    Serial.println("STA MAC: " + mac);

    // Buttons — INPUT_PULLUP because KEY1 (IO14) has no external pullup
    pinMode(BTN_MAC,    INPUT_PULLUP);
    pinMode(BTN_STATUS, INPUT_PULLUP);

    // WiFi AP + WebSocket
    initWebSocket();
    WiFi.softAP("MM-" + mac, "12345678");
    server.begin();

    // ESP-NOW
    if (esp_now_init() != ESP_OK) {
        Serial.println("Error initializing ESP-NOW");
        return;
    }
    esp_now_register_send_cb(OnDataSent);
    esp_now_register_recv_cb(OnDataRecv);

    if (esp_now_add_peer(&peerInfo) != ESP_OK) {
        Serial.println("Failed to add broadcast peer");
    }

    Serial.println("Setup complete!");

    xTaskCreatePinnedToCore(espNowTask,     "espNowTask",     4096, NULL, 1, &espNowTaskHandle,    0);
    xTaskCreatePinnedToCore(webSocketTask,  "webSocketTask",  4096, NULL, 1, &webSocketTaskHandle, 1);
    xTaskCreatePinnedToCore(podTimeoutTask, "podTimeoutTask", 2048, NULL, 1, NULL,                 1);
}

// ============================================================
//  LOOP
// ============================================================

void loop() {
    if (Serial.available() > 0) {
        Serial.readString();
        sendReset();
    }
    vTaskDelay(pdMS_TO_TICKS(100));
}

// ============================================================
//  SEND RESET TO ALL PODS
// ============================================================

// Binary control packet -- pod_watch.ino's OnDataRecv decodes it as:
//   [0xAA][0x55][0xFF][cmd]   cmd 0x01 = reboot.
void sendReset() {
    uint8_t reboot_pkt[4] = { SYNC0, SYNC1, 0xFF, 0x01 };
    for (int i = 0; i < NUM_PODS; i++) {
        if (peerMacsInit[i]) {
            esp_now_send(peerMacs[i].peer_addr, reboot_pkt, sizeof(reboot_pkt));
        }
    }
}

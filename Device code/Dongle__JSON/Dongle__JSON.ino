#include "Arduino.h"
#include <esp_now.h>
#include "WiFi.h"
#include "ESPAsyncWebServer.h"

typedef struct struct_message
{
    int id; // must be unique for each sender board
    float x;
    float y;
    float z;
    float w;
    int b;
    int c;
    int m;
    float px;
    float py;
    float pz;
    String bone;
} struct_message;

struct_message myData;

// ESP-NOW peer management for multiple devices
esp_now_peer_info_t peerMacs[15];
bool peerMacsInit[15] = {false};

// Single peer for broadcast
esp_now_peer_info_t peerInfo;

// Create AsyncWebServer object on port 80
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// Task handles
TaskHandle_t webSocketTaskHandle = NULL;
TaskHandle_t espNowTaskHandle = NULL;

// ============== CALLBACKS ==============

void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status)
{
    // Serial.print("\r\nLast Packet Send Status:\t");
    Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
}

void OnDataRecv(const uint8_t *mac_addr, const uint8_t *incomingData, int len)
{
    char macStr[18];
    snprintf(macStr, sizeof(macStr), "%02x:%02x:%02x:%02x:%02x:%02x",
             mac_addr[0], mac_addr[1], mac_addr[2], mac_addr[3], mac_addr[4], mac_addr[5]);

    memcpy(&myData, incomingData, sizeof(myData));

    String url = "{\"id\":\"" + String(macStr) + "\", \"count\":\"" + myData.c + "\", \"millis\":\"" + myData.m + "\", \"bone\":\"" + myData.bone + "\", \"x\":" + myData.x + ", \"y\":" + myData.y + ", \"z\":" + myData.z + ", \"w\":" + myData.w + ", \"batt\":" + float(myData.b) /100 + "}";
    Serial.println(url);

    if (!peerMacsInit[myData.id])
    {
        peerMacsInit[myData.id] = true;
        memcpy(peerMacs[myData.id].peer_addr, mac_addr, 6);
        peerMacs[myData.id].channel = 0;
        peerMacs[myData.id].encrypt = false;

        if (esp_now_add_peer(&peerMacs[myData.id]) != ESP_OK)
        {
            Serial.println("Failed to add peer");
        }
    }

    if (myData.bone == "reboot")
    {
        ESP.restart();
    }
}

void handleWebSocketMessage(void *arg, uint8_t *data, size_t len)
{
    AwsFrameInfo *info = (AwsFrameInfo *)arg;
    if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT)
    {
        data[len] = 0;
        String message = (char *)data;
        Serial.println(message);
    }
}

void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
{
    switch (type)
    {
    case WS_EVT_CONNECT:
        Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
        break;
    case WS_EVT_DISCONNECT:
        Serial.printf("WebSocket client #%u disconnected\n", client->id());
        break;
    case WS_EVT_DATA:
        handleWebSocketMessage(arg, data, len);
        break;
    case WS_EVT_PONG:
    case WS_EVT_ERROR:
        break;
    }
}

void initWebSocket()
{
    ws.onEvent(onEvent);
    server.addHandler(&ws);
}

// ============== FREERTOS TASKS ==============

void webSocketTask(void *pvParameters) {
  // WebSocket and web server runs on core 1
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

void espNowTask(void *pvParameters) {
  // ESP-NOW communication runs on core 0
  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(100));
  }
}

void setup()
{
    Serial.begin(115200);

    String mac = WiFi.macAddress();
    Serial.println(mac);

    pinMode(3, OUTPUT);
    digitalWrite(3, HIGH);

    Serial.println("Initializing...");

    initWebSocket();
    // Make Wi-Fi hotspot
    const char *password = "12345678";
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP("MM-" + mac, password);

    // Start server
    server.begin();
    // Init ESP-NOW
    if (esp_now_init() != ESP_OK)
    {
        Serial.println("Error initializing ESP-NOW");
        return;
    }
    esp_now_register_send_cb(OnDataSent);
    esp_now_register_recv_cb(esp_now_recv_cb_t(OnDataRecv));

    if (esp_now_add_peer(&peerInfo) != ESP_OK)
    {
        Serial.println("Failed to add broadcast peer");
        return;
    }

    Serial.println("Setup complete!");

    // Create FreeRTOS tasks for dual-core execution
    xTaskCreatePinnedToCore(
        espNowTask,          // Task function
        "espNowTask",        // Task name
        4096,                // Stack size
        NULL,                // Parameters
        1,                   // Priority
        &espNowTaskHandle,   // Task handle
        0                    // Core 0
    );

    xTaskCreatePinnedToCore(
        webSocketTask,       // Task function
        "webSocketTask",     // Task name
        4096,                // Stack size
        NULL,                // Parameters
        1,                   // Priority
        &webSocketTaskHandle,// Task handle
        1                    // Core 1
    );
}

void loop()
{
    // Check for serial input to trigger reset
    if (Serial.available() > 0)
    {
        Serial.readString(); // Discard incoming data
        sendReset();
    }
    vTaskDelay(pdMS_TO_TICKS(100));
}

void sendReset()
{
    // Send reboot command to all registered peers
    esp_err_t result;
    for (int i = 0; i < 15; i++)
    {
        if (peerMacsInit[i])
        {
            myData.bone = "reboot";
            myData.id = 17;
            result = esp_now_send(peerMacs[i].peer_addr, (uint8_t *)&myData, sizeof(myData));
            if (result == ESP_OK)
            {
                Serial.println("Reboot command sent with success");
            }
            else
            {
                Serial.println("Error sending reboot command");
            }
        }
    }
}

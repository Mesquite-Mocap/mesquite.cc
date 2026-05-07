#define LILYGO_WATCH_2019_WITH_TOUCH
#include <LilyGoWatch.h> \\https://github.com/Xinyuan-LilyGO/TTGO_TWatch_Library/tree/master

TTGOClass *watch;
TFT_eSPI *tft;
bool isCharging = false;


const char *mac_address_str = "DC:DA:0C:17:10:A0";
uint8_t broadcastAddress[6];

// Array of arrays containing 2 strings each
String boneName[][2] = {
  { "HEAD", "" },
  { "SPINE", "" },
  { "HIPS", "" },
  { "LEFT", "UP ARM" },
  { "LEFT", "FOREARM" },
  { "LEFT", "HAND" },
  { "RIGHT", "UP ARM" },
  { "RIGHT", "FOREARM" },
  { "RIGHT", "HAND" },
  { "LEFT", "UP LEG" },
  { "LEFT", "LOW LEG" },
  { "LEFT", "FOOT" },
  { "RIGHT", "UP LEG" },
  { "RIGHT", "LOW LEG" },
  { "RIGHT", "FOOT" },
  { "LEFT",  "SHOULDER" },   // 15
  { "RIGHT", "SHOULDER" },   // 16
};


// Choose only one!
// NOTE: `bone` is kept only for the on-screen label and the legacy "reboot"
// receive path. It is NO LONGER sent over ESP-NOW -- the wire format is now
// the fixed-size binary packet defined below. The host derives bone-name
// from `sendID` via the same table used in custom_icm.js / Dongle.ino.
// String bone = "Head"; int sendID = 0;  uint16_t BG = 0xffff; uint16_t FG = 0x0000;
 String bone = "Spine"; int sendID = 1;  uint16_t BG = 0xffff; uint16_t FG = 0x0000;
// String bone = "HipsAlt"; int sendID = 2;  uint16_t BG = 0xffff; uint16_t FG = 0x0000;
// String bone = "LeftArm"; int sendID = 3; uint16_t BG = 0x62d6; uint16_t FG = 0xffff;
// String bone = "LeftForeArm"; int sendID = 4; uint16_t BG = 0x62d6; uint16_t FG = 0xffff;
// String bone = "LeftHand"; int sendID = 5;  uint16_t BG = 0x62d6; uint16_t FG = 0xffff;
// String bone = "RightArm"; int sendID = 6; uint16_t BG = 0xf720; uint16_t FG = 0x0000;
// String bone = "RightForeArm"; int sendID = 7;  uint16_t BG = 0xf720; uint16_t FG = 0x0000;
// String bone = "RightHand"; int sendID = 8;  uint16_t BG = 0xf720; uint16_t FG = 0x0000;
// String bone = "LeftUpLeg"; int sendID = 9;  uint16_t BG = 0xc086; uint16_t FG = 0xffff;
// String bone = "LeftLeg"; int sendID = 10; uint16_t BG = 0xc086; uint16_t FG =  0xffff;
// String bone = "LeftFoot"; int sendID = 11; uint16_t BG = 0xc086; uint16_t FG =  0xffff;
// String bone = "RightUpLeg"; int sendID = 12; uint16_t BG = 0x3d89; uint16_t FG =  0xffff;
// String bone = "RightLeg"; int sendID = 13; uint16_t BG = 0x3d89; uint16_t FG = 0xffff;
// String bone = "RightFoot"; int sendID = 14; uint16_t BG = 0x3d89; uint16_t FG =  0xffff;
// String bone = "LeftShoulder"; int sendID = 15; uint16_t BG = 0x62d6; uint16_t FG = 0xffff;
// String bone = "RightShoulder"; int sendID = 16; uint16_t BG = 0xf720; uint16_t FG = 0x0000;




#include <esp_now.h>
#include <EEPROM.h>
#include <Wire.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>  //https://github.com/Links2004/arduinoWebSockets
#include <ESPmDNS.h>
#include "ICM_20948.h"  // Click here to get the library: http://librarymanager/All#SparkFun_ICM_20948_IMU
#define AD0_VAL 0

//#include "soc/rtc_wdt.h"
ICM_20948_I2C myICM;  // Otherwise create an ICM_20948_I2C object

//#include "Button2.h"
#define BUTTON_PIN 5
//Button2 button;

#include "esp_adc_cal.h"
#define BAT_ADC 35

// ---- Haptic (T-Watch 2019 Standard base plate) ----
// Motor lives on the base plate, GPIO 33. Power rail is AXP202 LDO3.
#define MOTOR_PIN 33
#define MOTOR_PULSE_MS 80

// ---- Power button ----
// T-Watch 2019 physical side button routed to GPIO 36 (input-only on ESP32).
#define PWR_BTN_PIN 36
#define LONG_PRESS_MS 2000

int fcount = 0;
int dccount = 0;
int count = 0;

void mac_string_to_uint8_array(const char *mac_str, uint8_t *mac_array) {
  if (mac_str == NULL || mac_array == NULL) {
    return;
  }

  int values[6];  // Temporary storage for parsed hexadecimal values
  int result = sscanf(mac_str, "%x:%x:%x:%x:%x:%x",
                      &values[0], &values[1], &values[2],
                      &values[3], &values[4], &values[5]);

  if (result != 6) {
    return;
  }

  // Convert parsed integer values to uint8_t
  for (int i = 0; i < 6; ++i) {
    mac_array[i] = (uint8_t)values[i];
  }

  return;
}




int lastOn = millis();
bool isOn = true;

int lastTouch = millis();

// =========================================================================
//  BINARY WIRE FORMAT  (16 bytes)
//  Replaces the old struct_message with a packed, fixed-size frame so the
//  payload is small (~9x smaller than the JSON the dongle used to print) and
//  free of the well-known "String inside a memcpy'd struct" heap-pointer bug.
//
//   off  size  field
//   0    1     sync0   = 0xAA
//   1    1     sync1   = 0x55
//   2    1     id      bone enum (see table at top of file)
//   3    1     batt    0..100 (%)
//   4    2     qx_i16  quaternion.x * 32767
//   6    2     qy_i16
//   8    2     qz_i16
//   10   2     qw_i16
//   12   2     count   uint16, wraps
//   14   2     ms_lo   low 16 bits of millis() at send time
// =========================================================================
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

static_assert(sizeof(pod_packet_t) == 16, "pod_packet_t must be exactly 16 bytes");

pod_packet_t myData;

// Quantize a float in [-1, 1] to int16. Saturates rather than wrapping so an
// out-of-range value (e.g. NaN coerced to a huge number) doesn't flip sign.
static inline int16_t q_to_i16(float v) {
  if (v >  1.0f) v =  1.0f;
  if (v < -1.0f) v = -1.0f;
  if (isnan(v))  v = 0.0f;
  return (int16_t)(v * 32767.0f);
}

// Create peer interface
esp_now_peer_info_t peerInfo;

// callback when data is sent
// NOTE: ESP-NOW callback signature changed between ESP32 Arduino core 2.x and 3.x.
// 2.x: void(const uint8_t *mac_addr, esp_now_send_status_t status)
// 3.x: void(const wifi_tx_info_t *tx_info, esp_now_send_status_t status)
#if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
void OnDataSent(const wifi_tx_info_t *tx_info, esp_now_send_status_t status) {
#else
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
#endif
  // Serial.print("\r\nLast Packet Send Status:\t");
 // Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");


  if (status == ESP_NOW_SEND_SUCCESS) {
    dccount = 0;
  } else {
    dccount++;
    //digitalWrite(3, HIGH);
    //Serial.println(dccount);
    // Dongle timeout: 2 minutes of consecutive failed sends (32 fps * 120s = 3840)
    if (dccount > 960) {
      //esp_deep_sleep_start();
      watch->shutdown();
    }
  }
}

String mac_address;


int fps = 32;

int batt_v = 0;
float quatI, quatJ, quatK, quatReal;

uint32_t readADC_Cal(int ADC_Raw) {
  esp_adc_cal_characteristics_t adc_chars;

  esp_adc_cal_characterize(ADC_UNIT_1, ADC_ATTEN_DB_11, ADC_WIDTH_BIT_12, 1100, &adc_chars);
  return (esp_adc_cal_raw_to_voltage(ADC_Raw, &adc_chars));
}

bool calibrated = false;


struct Quat {
  float x;
  float y;
  float z;
  float w;
} quat;

#define NB_RECS 5


char buff[256];
bool rtcIrq = false;
bool initial = 1;
bool otaStart = false;

uint8_t func_select = 0;
uint8_t omm = 99;
uint8_t xcolon = 0;
uint32_t targetTime = 0;  // for next 1 second timeout
uint32_t colour = 0;
int vref = 1100;

bool pressed = false;
uint32_t pressedTime = 0;
bool charge_indication = false;

uint8_t hh, mm, ss;
int pacnum = 0;



void hexdump(const void *mem, uint32_t len, uint8_t cols = 16) {
  const uint8_t *src = (const uint8_t *)mem;
  Serial.printf("\n[HEXDUMP] Address: 0x%08X len: 0x%X (%d)", (ptrdiff_t)src, len, len);
  for (uint32_t i = 0; i < len; i++) {
    if (i % cols == 0) {
      Serial.printf("\n[0x%08X] 0x%08X: ", (ptrdiff_t)src, i);
    }
    Serial.printf("%02X ", *src);
    src++;
  }
  Serial.printf("\n");
}



// define two tasks for Blink & AnalogRead
void TaskWifi(void *pvParameters);
void TaskReadIMU(void *pvParameters);

#if CONFIG_FREERTOS_UNICORE
#define ARDUINO_RUNNING_CORE 0
#else
#define ARDUINO_RUNNING_CORE 1
#endif


void setupIMU() {
  Wire.begin(21, 22);

  delay(500);
  Wire.setClock(400000);

  //myICM.enableDebugging();

  bool initialized = false;
  while (!initialized) {

    myICM.begin(Wire, AD0_VAL);

    Serial.print(F("Initialization of the sensor returned: "));
    Serial.println(myICM.statusString());
    if (myICM.status != ICM_20948_Stat_Ok) {
      Serial.println(F("Trying again..."));
      delay(500);
    } else {
      initialized = true;
    }
  }

  Serial.println(F("Device connected."));

  bool success = true;  // Use success to show if the DMP configuration was successful

  // Initialize the DMP. initializeDMP is a weak function. In this example we overwrite it to change the sample rate (see below)
  success &= (myICM.initializeDMP() == ICM_20948_Stat_Ok);

  // DMP sensor options are defined in ICM_20948_DMP.h
  //    INV_ICM20948_SENSOR_ACCELEROMETER               (16-bit accel)
  //    INV_ICM20948_SENSOR_GYROSCOPE                   (16-bit gyro + 32-bit calibrated gyro)
  //    INV_ICM20948_SENSOR_RAW_ACCELEROMETER           (16-bit accel)
  //    INV_ICM20948_SENSOR_RAW_GYROSCOPE               (16-bit gyro + 32-bit calibrated gyro)
  //    INV_ICM20948_SENSOR_MAGNETIC_FIELD_UNCALIBRATED (16-bit compass)
  //    INV_ICM20948_SENSOR_GYROSCOPE_UNCALIBRATED      (16-bit gyro)
  //    INV_ICM20948_SENSOR_STEP_DETECTOR               (Pedometer Step Detector)
  //    INV_ICM20948_SENSOR_STEP_COUNTER                (Pedometer Step Detector)
  //    INV_ICM20948_SENSOR_GAME_ROTATION_VECTOR        (32-bit 6-axis quaternion)
  //    INV_ICM20948_SENSOR_ROTATION_VECTOR             (32-bit 9-axis quaternion + heading accuracy)
  //    INV_ICM20948_SENSOR_GEOMAGNETIC_ROTATION_VECTOR (32-bit Geomag RV + heading accuracy)
  //    INV_ICM20948_SENSOR_GEOMAGNETIC_FIELD           (32-bit calibrated compass)
  //    INV_ICM20948_SENSOR_GRAVITY                     (32-bit 6-axis quaternion)
  //    INV_ICM2094
  //    INV_ICM20948_SENSOR_ORIENTATION                 (32-bit 9-axis quaternion + heading accuracy)

  // Enable the DMP orientation sensor
  success &= (myICM.enableDMPSensor(INV_ICM20948_SENSOR_GAME_ROTATION_VECTOR) == ICM_20948_Stat_Ok);

  // Enable any additional sensors / features
  success &= (myICM.enableDMPSensor(INV_ICM20948_SENSOR_RAW_GYROSCOPE) == ICM_20948_Stat_Ok);
  success &= (myICM.enableDMPSensor(INV_ICM20948_SENSOR_RAW_ACCELEROMETER) == ICM_20948_Stat_Ok);
  //success &= (myICM.enableDMPSensor(INV_ICM20948_SENSOR_MAGNETIC_FIELD_UNCALIBRATED) == ICM_20948_Stat_Ok);

  // Configuring DMP to output data at multiple ODRs:
  // DMP is capable of outputting multiple sensor data at different rates to FIFO.
  // Setting value can be calculated as follows:
  // Value = (DMP running rate / ODR ) - 1
  // E.g. For a 5Hz ODR rate when DMP is running at 55Hz, value = (55/5) - 1 = 10.
  success &= (myICM.setDMPODRrate(DMP_ODR_Reg_Quat6, 0) == ICM_20948_Stat_Ok);  // Set to the maximum
  //success &= (myICM.setDMPODRrate(DMP_ODR_Reg_Accel, 0) == ICM_20948_Stat_Ok); // Set to the maximum
  //success &= (myICM.setDMPODRrate(DMP_ODR_Reg_Gyro, 0) == ICM_20948_Stat_Ok); // Set to the maximum
  //success &= (myICM.setDMPODRrate(DMP_ODR_Reg_Gyro_Calibr, 0) == ICM_20948_Stat_Ok); // Set to the maximum
  //success &= (myICM.setDMPODRrate(DMP_ODR_Reg_Cpass, 0) == ICM_20948_Stat_Ok); // Set to the maximum
  //success &= (myICM.setDMPODRrate(DMP_ODR_Reg_Cpass_Calibr, 0) == ICM_20948_Stat_Ok); // Set to the maximum

  // Enable the FIFO
  success &= (myICM.enableFIFO() == ICM_20948_Stat_Ok);

  // Enable the DMP
  success &= (myICM.enableDMP() == ICM_20948_Stat_Ok);

  // Reset DMP
  success &= (myICM.resetDMP() == ICM_20948_Stat_Ok);

  // Reset FIFO
  success &= (myICM.resetFIFO() == ICM_20948_Stat_Ok);

  // Check success
  if (success) {
    Serial.println(F("DMP enabled."));
  } else {
    Serial.println(F("Enable DMP failed!"));
    Serial.println(F("Please check that you have uncommented line 29 (#define ICM_20948_USE_DMP) in ICM_20948_C.h..."));
    while (1)
      ;  // Do nothing more
  }



  Serial.println(F("IMU enabled"));
  calibrated = true;
}


void setup() {


  // Get TTGOClass instance
  watch = TTGOClass::getWatch();

  // Initialize the hardware, the BMA423 sensor has been initialized internally
  watch->begin();

  // ---- Haptic motor setup ----
  // Motor/speaker rail on the Standard base plate is AXP202 LDO3. Enable it,
  // otherwise toggling GPIO 33 does nothing (pin flips, motor has no power).
// Set LDO3 voltage explicitly before enabling (motor needs power)
watch->power->setLDO3Voltage(3300);                              // 3.3V
watch->power->setPowerOutPut(AXP202_LDO3, AXP202_ON);
delay(50);                                                        // let rail settle

pinMode(MOTOR_PIN, OUTPUT);
digitalWrite(MOTOR_PIN, LOW);

// Power button (GPIO 36) — input-only on ESP32
pinMode(PWR_BTN_PIN, INPUT);

// Boot indicator: two buzzes to confirm the pod has powered up
motorPulse(2);



  // Turn on the backlight
  watch->openBL();

  pinMode(TOUCH_INT, INPUT);


  watch->button->setPressedHandler(pressedB);
  watch->button->setReleasedHandler(released);


  //Receive objects for easy writing
  tft = watch->tft;
  tft->fillScreen(BG);
  tft->setTextColor(FG, BG);


  tft->setTextFont(7); 
  tft->drawCentreString("MESQUITE.cc", 120, 10, 4);


  if (boneName[sendID][1] == "") {
    tft->setTextSize(3);
    tft->drawCentreString(boneName[sendID][0], 120, 80, 4);
  } else {
    tft->setTextSize(3);
    tft->drawCentreString(boneName[sendID][0], 120, 65, 4);
    tft->setTextSize(2);
    tft->drawCentreString(boneName[sendID][1], 120, 130, 4);
  }

  tft->setTextSize(1);

  mac_string_to_uint8_array(mac_address_str, broadcastAddress);


  // pinMode(3, OUTPUT);
  Serial.begin(115200);
  delay(500);

  lastOn = millis();
  lastTouch = millis();


  WiFi.mode(WIFI_STA);

  // esp_deep_sleep_enable_gpio_wakeup(BIT(36), ESP_GPIO_WAKEUP_GPIO_LOW);


  Serial.println("Connecting");

  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }

  // Once ESPNow is successfully Init, we will register for Send CB to
  // get the status of Trasnmitted packet
  esp_now_register_send_cb(OnDataSent);
  esp_now_register_recv_cb(OnDataRecv);


  // Register peer
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  // Add peer
  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Failed to add peer");
    return;
  }


  mac_address = WiFi.macAddress();
  Serial.println(mac_address);
  delay(100);


  setupIMU();



  xTaskCreatePinnedToCore(
    TaskWifi, "TaskWifi"  // A name just for humans
    ,
    10000  // This stack size can be checked & adjusted by reading the Stack Highwater
    ,
    NULL, 1  // Priority, with 3 (configMAX_PRIORITIES - 1) being the highest, and 0 being the lowest.
    ,
    NULL, 0);

  // delay(1000);
  xTaskCreatePinnedToCore(
    TaskReadIMU, "TaskReadIMU", 10000  // Stack size
    ,
    NULL, 1  // Priority
    ,
    NULL, 1);

  handleBattDisplay();
}


void handleBattDisplay() {
  batt_v = getBattery();
  if (isCharging) {
    tft->fillRoundRect(0, 205, 240, 35, 0, TFT_GREEN);
    tft->setTextColor(TFT_BLACK, TFT_GREEN);
    tft->drawCentreString(String((int)batt_v) + "%, CHARGING", 120, 212, 4);
  } else {
    tft->fillRoundRect(0, 205, 240, 35, 0, TFT_RED);
    tft->setTextColor(TFT_WHITE, TFT_RED);
    tft->drawCentreString(String((int)batt_v) + "%, NOT Charging", 120, 212, 4);
  }
}

void loop() {
}

// Haptic helper: pulse the motor N times with a gap between pulses.
// Blocking: total time = count * MOTOR_PULSE_MS + (count-1) * 150 ms
void motorPulse(int count) {
  for (int i = 0; i < count; i++) {
    if (i > 0) delay(150);
    digitalWrite(MOTOR_PIN, HIGH);
    delay(MOTOR_PULSE_MS);
    digitalWrite(MOTOR_PIN, LOW);
  }
}

// ---- Screen-only helpers (no buzz) ----
// Used by touchscreen taps and the 5s idle auto-sleep.
void sleepScreen() {
  if (!isOn) return;
  watch->closeBL();
  watch->displayOff();
  isOn = false;
}

void wakeScreen() {
  if (isOn) return;
  watch->openBL();
  watch->displayWakeup();
  lastOn = millis();
  isOn = true;
  // Defensive: re-assert LDO3 (motor power rail) in case anything disabled it
  watch->power->setPowerOutPut(AXP202_LDO3, AXP202_ON);
}

void toggleScreen() {
  if (isOn) sleepScreen();
  else wakeScreen();
}

// ---- Long-press button state ----
// Short press does nothing (protects against accidental shutdowns during mocap).
// Hold for LONG_PRESS_MS to fully power down the pod via AXP202.
//
// We poll GPIO 36 (the physical power button) directly instead of using the
// TTGO button library's event handlers, because the library's timing is
// entangled with AXP202's built-in PEK handling and can swallow the event.
// Constants PWR_BTN_PIN and LONG_PRESS_MS are defined at the top of the file.

void pressedB() {
  // Kept as a registered handler for library compatibility. No-op.
}

void released() {
  // No-op. All long-press logic lives in TaskReadIMU's GPIO poll.
}


int getBattery() {
  watch->power->adc1Enable(AXP202_VBUS_VOL_ADC1 | AXP202_VBUS_CUR_ADC1 | AXP202_BATT_CUR_ADC1 | AXP202_BATT_VOL_ADC1, true);
  // get the values
  isCharging = watch->power->isChargeing();
  int per = watch->power->getBattPercentage();
  return per;
}

bool touchoff = false;

void TaskWifi(void *pvParameters) {
  for (;;) {
    // button.loop();

    
    static uint32_t prev_ms = millis();

    if (millis() > (prev_ms + (1000 / fps))) {
      fcount++;

      // Build the 16-byte binary packet. Bone name is no longer on the wire;
      // the dongle and browser both look up name-from-id via the same enum.
      myData.sync0 = 0xAA;
      myData.sync1 = 0x55;
      myData.id    = (uint8_t)sendID;
      // batt_v here is the integer percentage from getBattery(); clamp to 0..100
      // so the byte field is always in range (negative values can leak in
      // briefly during boot before the AXP202 ADC stabilises).
      int b = batt_v;
      if (b < 0)   b = 0;
      if (b > 100) b = 100;
      myData.batt  = (uint8_t)b;
      myData.qx    = q_to_i16(quat.x);
      myData.qy    = q_to_i16(quat.y);
      myData.qz    = q_to_i16(quat.z);
      myData.qw    = q_to_i16(quat.w);
      myData.count = (uint16_t)count;
      myData.ms_lo = (uint16_t)millis();

      esp_now_send(broadcastAddress, (uint8_t *)&myData, sizeof(myData));

      prev_ms = millis();
      count++;
    }
    //vTaskDelay(1/portTICK_PERIOD_MS);  // one tick delay (15ms) in between reads for stability
    vTaskDelay(1);
  }
}

float ax;
float ay;
float az;

void TaskReadIMU(void *pvParameters) {
  // Local state for direct GPIO-based long-press detection.
  // `static` inside a task is fine — persists across iterations.
  static bool btnWasPressed = false;
  static uint32_t btnPressStart = 0;
  static bool longPressDone = false;

  for (;;) {
    watch->button->loop();  // kept because other library internals use it

    // --- Direct GPIO long-press shutdown ---
    // Button is active-low: pressed = 0, released = 1.
    bool btnNowPressed = (digitalRead(PWR_BTN_PIN) == LOW);

    if (btnNowPressed && !btnWasPressed) {
      // Rising edge of a press
      btnPressStart = millis();
      longPressDone = false;
    }
    if (btnNowPressed && !longPressDone
        && (millis() - btnPressStart >= LONG_PRESS_MS)) {
      longPressDone = true;
      motorPulse(1);       // confirmation — user can release now
      delay(100);
      watch->shutdown();
      while (1) delay(1000);  // should never reach here
    }
    btnWasPressed = btnNowPressed;

    // --- Screen-only idle auto-sleep (no buzz) ---
    if (isOn && millis() - lastOn > 5000) {
      sleepScreen();
    }

    // --- Touchscreen: toggle screen only, no buzz ---
    int16_t x, y;
    if (watch->getTouch(x, y)) {
      if (millis() - lastTouch > 600) {
        toggleScreen();
      }
      lastTouch = millis();
    }

    static uint32_t prev_ms1 = millis();
    if (millis() > (prev_ms1 + 1000 * 3)) {
      // read battery every minute
      handleBattDisplay();
      prev_ms1 = millis();
    }


    icm_20948_DMP_data_t data;
    myICM.readDMPdataFromFIFO(&data);

    if ((myICM.status == ICM_20948_Stat_Ok) || (myICM.status == ICM_20948_Stat_FIFOMoreDataAvail))  // Was valid data available?
    {
      //Serial.print(F("Received data! Header: 0x")); // Print the header in HEX so we can see what data is arriving in the FIFO
      //if ( data.header < 0x1000) Serial.print( "0" ); // Pad the zeros
      //if ( data.header < 0x100) Serial.print( "0" );
      //if ( data.header < 0x10) Serial.print( "0" );
      //Serial.println( data.header, HEX );

      if ((data.header & DMP_header_bitmap_Quat6) > 0)  // We have asked for GRV data so we should receive Quat6
      {
        // Q0 value is computed from this equation: Q0^2 + Q1^2 + Q2^2 + Q3^2 = 1.
        // In case of drift, the sum will not add to 1, therefore, quaternion data need to be corrected with right bias values.
        // The quaternion data is scaled by 2^30.

        //Serial.printf("Quat6 data is: Q1:%ld Q2:%ld Q3:%ld\r\n", data.Quat6.Data.Q1, data.Quat6.Data.Q2, data.Quat6.Data.Q3);

        // Scale to +/- 1
        double q1 = ((double)data.Quat6.Data.Q1) / 1073741824.0;  // Convert to double. Divide by 2^30
        double q2 = ((double)data.Quat6.Data.Q2) / 1073741824.0;  // Convert to double. Divide by 2^30
        double q3 = ((double)data.Quat6.Data.Q3) / 1073741824.0;  // Convert to double. Divide by 2^30


        // Convert the quaternions to Euler angles (roll, pitch, yaw)
        // https://en.wikipedia.org/w/index.php?title=Conversion_between_quaternions_and_Euler_angles&section=8#Source_code_2

        double q0 = sqrt(1.0 - ((q1 * q1) + (q2 * q2) + (q3 * q3)));

        double q2sqr = q2 * q2;

        // roll (x-axis rotation)
        double t0 = +2.0 * (q0 * q1 + q2 * q3);
        double t1 = +1.0 - 2.0 * (q1 * q1 + q2sqr);
        double roll = atan2(t0, t1) * 180.0 / PI;

        // pitch (y-axis rotation)
        double t2 = +2.0 * (q0 * q2 - q3 * q1);
        t2 = t2 > 1.0 ? 1.0 : t2;
        t2 = t2 < -1.0 ? -1.0 : t2;
        double pitch = asin(t2) * 180.0 / PI;

        // yaw (z-axis rotation)
        double t3 = +2.0 * (q0 * q3 + q1 * q2);
        double t4 = +1.0 - 2.0 * (q2sqr + q3 * q3);
        double yaw = atan2(t3, t4) * 180.0 / PI;

        /*
      Serial.print(q0, 3);
      Serial.print(" ");
      Serial.print(q1, 3);
      Serial.print(" ");
      Serial.print(q2, 3);
      Serial.print(" ");
      Serial.print(q3, 3);
      Serial.println();
      */

        quat.w = q0;
        quat.x = q1;
        quat.y = q2;
        quat.z = q3;
      }
    }

    if (myICM.status != ICM_20948_Stat_FIFOMoreDataAvail)  // If more data is available then we should read it right away - and not delay
    {
      delay(10);
    }

    //vTaskDelay(1/portTICK_PERIOD_MS);  // one tick delay (15ms) in between reads for stability
    vTaskDelay(1);
  }
}




// NOTE: Recv callback signature also changed between core 2.x and 3.x.
// 2.x: void(const uint8_t *mac_addr, const uint8_t *data, int len)
// 3.x: void(const esp_now_recv_info_t *info, const uint8_t *data, int len)
// Binary control packet from the dongle:
//   [0xAA][0x55][0xFF][cmd]
// where cmd = 0x01 -> reboot. Anything else is ignored. The 0xFF in the id
// slot is the marker that distinguishes a control packet from a normal pod
// data frame (which has id 0..16).
#if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
void OnDataRecv(const esp_now_recv_info_t *recv_info, const uint8_t *incomingData, int len) {
#else
void OnDataRecv(const uint8_t *mac_addr, const uint8_t *incomingData, int len) {
#endif
  if (len >= 4
      && incomingData[0] == 0xAA
      && incomingData[1] == 0x55
      && incomingData[2] == 0xFF) {
    if (incomingData[3] == 0x01) {
      ESP.restart();
    }
  }
}

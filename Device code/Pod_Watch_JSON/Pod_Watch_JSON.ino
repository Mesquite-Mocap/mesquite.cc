#define LILYGO_WATCH_2019_WITH_TOUCH
#include <LilyGoWatch.h>

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
};


// Choose only one!
// String bone = "Head"; int sendID = 0;  uint16_t BG = 0xffff; uint16_t FG = 0x0000;
// String bone = "Spine"; int sendID = 1;  uint16_t BG = 0xffff; uint16_t FG = 0x0000;
// String bone = "HipsAlt"; int sendID = 2;  uint16_t BG = 0xffff; uint16_t FG = 0x0000;
// String bone = "LeftArm"; int sendID = 3; uint16_t BG = 0x62d6; uint16_t FG = 0xffff;
// String bone = "LeftForeArm"; int sendID = 4; uint16_t BG = 0x62d6; uint16_t FG = 0xffff;
 String bone = "LeftHand"; int sendID = 5;  uint16_t BG = 0x62d6; uint16_t FG = 0xffff;
// String bone = "RightArm"; int sendID = 6; uint16_t BG = 0xf720; uint16_t FG = 0x0000;
// String bone = "RightForeArm"; int sendID = 7;  uint16_t BG = 0xf720; uint16_t FG = 0x0000;
// String bone = "RightHand"; int sendID = 8;  uint16_t BG = 0xf720; uint16_t FG = 0x0000;
// String bone = "LeftUpLeg"; int sendID = 9;  uint16_t BG = 0xc086; uint16_t FG = 0xffff;
// String bone = "LeftLeg"; int sendID = 10; uint16_t BG = 0xc086; uint16_t FG =  0xffff;
// String bone = "LeftFoot"; int sendID = 11; uint16_t BG = 0xc086; uint16_t FG =  0xffff;
// String bone = "RightUpLeg"; int sendID = 12; uint16_t BG = 0x3d89; uint16_t FG =  0xffff;
// String bone = "RightLeg"; int sendID = 13; uint16_t BG = 0x3d89; uint16_t FG = 0xffff;
//   String bone = "RightFoot"; int sendID = 14; uint16_t BG = 0x3d89; uint16_t FG =  0xffff;




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

typedef struct struct_message {
  int id;  // must be unique for each sender board
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

// Create peer interface
esp_now_peer_info_t peerInfo;

// callback when data is sent
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  // Serial.print("\r\nLast Packet Send Status:\t");
 // Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");


  if (status == ESP_NOW_SEND_SUCCESS) {
    dccount = 0;
  } else {
    dccount++;
    //digitalWrite(3, HIGH);
    //Serial.println(dccount);
    if (dccount > 300) {
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
//success &= (myICM.startupDMPCalibrationAcellData() == ICM_20948_Stat_Ok);
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
  esp_now_register_recv_cb(esp_now_recv_cb_t(OnDataRecv));


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

void pressedB() {
  if (isOn) {
    watch->closeBL();
    watch->displayOff();
    isOn = false;
  } else {
    watch->openBL();
    watch->displayWakeup();
    lastOn = millis();
    isOn = true;
  }
}

void released() {
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
      //String url = "{\"id\":\"" + mac_address + "\", \"count\":" + fcount + ", \"millis\":" + millis() + ", \"bone\":\"" + bone + "\", \"x\":" + quat.x + ", \"y\":" + quat.y + ", \"z\":" + quat.z + ", \"w\":" + quat.w + ", \"batt\":" + (batt_v / 4192) + "}";
      // Serial.println(url);

     // Serial.println(myData.b);

      myData.id = sendID;
      myData.x = quat.x;
      myData.y = quat.y;
      myData.z = quat.z;
      myData.w = quat.w;
      myData.b = batt_v;
      myData.c = count;
      myData.bone = bone;
      myData.m = millis();

      /*
      Serial.println(myData.id);
      Serial.println(myData.x);
      Serial.println(myData.y);
      Serial.println(myData.z);
      Serial.println(myData.w);
      Serial.println(myData.b);
      Serial.println(myData.c);
      Serial.println(myData.bone);
      Serial.println(myData.m);
      */






      //Serial.println(myData.bone);
      // Send message via ESP-NOW
      esp_err_t result = esp_now_send(broadcastAddress, (uint8_t *)&myData, sizeof(myData));

      if (result == ESP_OK) {
        //Serial.println("Sent with success");
      } else {
        //Serial.println("Error sending the data");
      }

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
  for (;;) {
        watch->button->loop();
    if (isOn && millis() - lastOn > 5000) {
      watch->closeBL();
      watch->displayOff();
      isOn = false;
    }

      int16_t x, y;
      if (watch->getTouch(x, y)) {
        if (millis() - lastTouch > 600) {
          pressedB();
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

    while (myICM.status == ICM_20948_Stat_FIFOMoreDataAvail) {
      myICM.readDMPdataFromFIFO(&data);
    }

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





void OnDataRecv(const uint8_t *mac_addr, const uint8_t *incomingData, int len) {
  Serial.println("****************************here");
  Serial.println();
  char macStr[18];
  snprintf(macStr, sizeof(macStr), "%02x:%02x:%02x:%02x:%02x:%02x",
           mac_addr[0], mac_addr[1], mac_addr[2], mac_addr[3], mac_addr[4], mac_addr[5]);
  //Serial.print("Packet received from: ");
  //Serial.println(macStr);
  memcpy(&myData, incomingData, sizeof(myData));


  //Serial.println(myData.bone);

  if (myData.bone == "reboot") {
    ESP.restart();
  }
}

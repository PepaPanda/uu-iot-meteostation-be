#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include <Arduino_LED_Matrix.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT11.h>

#include "secrets.h"

#define pinDHT 2

#define typeDHT11 DHT11

ArduinoLEDMatrix matrix;
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT11 DHTSensor(pinDHT);

uint8_t checkmarkFrame[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,1,0},
  {0,0,0,0,0,0,0,0,0,1,0,0},
  {0,0,0,0,0,0,0,0,1,0,0,0},
  {1,0,0,0,0,0,0,1,0,0,0,0},
  {0,1,0,0,0,0,1,0,0,0,0,0},
  {0,0,1,0,0,1,0,0,0,0,0,0},
  {0,0,0,1,1,0,0,0,0,0,0,0}
};

uint8_t xFrame[8][12] = {
  {1,1,0,0,0,0,0,0,0,0,1,1},
  {0,1,1,0,0,0,0,0,0,1,1,0},
  {0,0,1,1,0,0,0,0,1,1,0,0},
  {0,0,0,1,1,0,0,1,1,0,0,0},
  {0,0,0,0,1,1,1,1,0,0,0,0},
  {0,0,0,1,1,0,0,1,1,0,0,0},
  {0,0,1,1,0,0,0,0,1,1,0,0},
  {0,1,1,0,0,0,0,0,0,1,1,0}
};

struct DhtData { 
  float temp;
  float moist;
};

// Topics
const char PUB_TOPIC[] = "uno-r4/test";

// Network + MQTT clients
WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);

unsigned long lastSend = 0;
int counter = 0;

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  while (WiFi.begin(WIFI_SSID, WIFI_PASS) != WL_CONNECTED) {
    Serial.println("WiFi connect failed, retrying in 5s...");
    matrix.renderBitmap(xFrame, 8, 12);
    delay(5000);
  }

  Serial.println("WiFi connected.");
  Serial.print("Board IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("RSSI: ");
  Serial.println(WiFi.RSSI());
}

void connectMQTT() {
  Serial.print("Connecting to MQTT broker: ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.println(MQTT_PORT);

  // Optional: unique client ID
  mqttClient.setId("uno-r4-wifi-client");

  if (!mqttClient.connect(MQTT_BROKER, MQTT_PORT)) {
    Serial.print("MQTT connect failed, error code = ");
    Serial.println(mqttClient.connectError());
    matrix.renderBitmap(xFrame, 8, 12);
    delay(1000);
    return;
  }

  Serial.println("MQTT connected.");
  matrix.renderBitmap(checkmarkFrame, 8, 12);
  delay(1000);
}

DhtData getDhtData() {
  DhtData data;

  int temp = 0;
  int moist = 0;

  int result = DHTSensor.readTemperatureHumidity(temp, moist);

  if (result != 0) {
    // if errors, set nonsense values
    data.temp = -1000;
    data.moist = -1000;
  } else {
    data.temp = temp;
    data.moist = moist;
  }

  return data;
}

void printLcdLine(const char* text, int row) {
  char buffer[17]; // 16 znaků + \0
  snprintf(buffer, sizeof(buffer), "%-16s", text); // doleva zarovnané, doplní mezery

  lcd.setCursor(0, row);
  lcd.print(buffer);
}

void DisplayOnLcd(const char* text1, const char* text2) {
  lcd.setCursor(0, 0); 
  printLcdLine(text1, 0); 
  lcd.setCursor(0, 1); 
  printLcdLine(text2, 1);
}

void initLcd() {
   lcd.init();
   lcd.backlight();
  DisplayOnLcd("Initializing", "MeteoTrack 1.0");
}

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // wait for serial monitor
  }

  initLcd();
  matrix.begin();
  mqttClient.setKeepAliveInterval(3000);
  connectWiFi();
  connectMQTT();
}

void loop() {
  // Reconnect WiFi if needed
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    DisplayOnLcd("ERR: WiFi fail", "reconnecting");
    matrix.renderBitmap(xFrame, 8, 12);
    connectWiFi();
  }

  // Reconnect MQTT if needed
  if (!mqttClient.connected()) {
    Serial.println("MQTT disconnected. Reconnecting...");
    DisplayOnLcd("ERR: MQTT fail", "reconnecting..");
    matrix.renderBitmap(xFrame, 8, 12);
    connectMQTT();
  }

  // Keep MQTT alive
  mqttClient.poll();

  // Publish every 3 seconds
  if (millis() - lastSend >= 3000 && mqttClient.connected()) {
    DhtData d = getDhtData();
    lastSend = millis();

    counter++;

    mqttClient.beginMessage(PUB_TOPIC);
    mqttClient.print("{\"counter\":");
    mqttClient.print(counter);
    mqttClient.print(",\"uptime_ms\":");
    mqttClient.print(millis());
    mqttClient.print(",\"data\":{");
    mqttClient.print("\"temp\":");
    mqttClient.print(d.temp);
    mqttClient.print(",\"moist\":");
    mqttClient.print(d.moist);
    mqttClient.print("}");
    mqttClient.print("}");
    mqttClient.endMessage();

    Serial.print("Published to ");
    Serial.print(PUB_TOPIC);
    Serial.print(": ");
    Serial.print("{\"counter\":");
    Serial.print(counter);
    Serial.print(",\"uptime_ms\":");
    Serial.print(millis());
    Serial.println("}");
    matrix.renderBitmap(checkmarkFrame, 8, 12);
    String tempToDisplay = "temp: " + String(d.temp);
    String moistToDisplay = "moist: " + String(d.moist);
    DisplayOnLcd(tempToDisplay.c_str(), moistToDisplay.c_str());
  }
}
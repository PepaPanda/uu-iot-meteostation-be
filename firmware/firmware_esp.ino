#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoMqttClient.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>
#include <SparkFun_MAX1704x_Fuel_Gauge_Arduino_Library.h>
#include <Preferences.h>
#include "esp_sleep.h"
#include "driver/rtc_io.h"
#include <math.h>
#include <esp_system.h>

// ======================================================
// BOARD / PINS
// ======================================================

#define I2C_SDA 21
#define I2C_SCL 22

#define BUTTON_PIN 4
#define REED_PIN   32

#define BUTTON_GPIO GPIO_NUM_4
#define REED_GPIO   GPIO_NUM_32

const unsigned long BUTTON_HOLD_MS = 5000;

// ======================================================
// CONFIG PORTAL
// ======================================================

WebServer configServer(80);

const char SETUP_AP_SSID[] = "MeteoStation-Setup";
const char SETUP_AP_PASS[] = "meteosetup"; // min. 8 znaků

const IPAddress AP_IP(192, 168, 4, 1);
const IPAddress AP_GATEWAY(192, 168, 4, 1);
const IPAddress AP_SUBNET(255, 255, 255, 0);

// ======================================================
// MQTT
// ======================================================

const char PUB_TOPIC[] = "uno-r4/test";

WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);

// ======================================================
// SENSORS
// ======================================================

Adafruit_BME280 bme;
BH1750 lightMeter;
SFE_MAX1704X fuelGauge(MAX1704X_MAX17048);

bool bmeReady = false;
bool bhReady = false;
bool fuelReady = false;

// ======================================================
// STORAGE
// ======================================================

Preferences prefs;

const uint32_t CONFIG_MAGIC = 0x4D535432; // "MST2"

enum PublishMode : uint8_t {
  MODE_DEBUG = 0,
  MODE_FREQUENT = 1,
  MODE_NORMAL = 2,
  MODE_BATTERY_SAVER = 3
};

struct DeviceConfig {
  uint32_t magic;
  char wifiSsid[32];
  char wifiPass[64];
  char mqttHost[64];
  uint16_t mqttPort;
  uint8_t publishMode;
};

DeviceConfig config;

// ======================================================
// RTC STATE - survives deep sleep, not full power loss
// ======================================================

const uint32_t RTC_MAGIC = 0x52544332; // "RTC2"

RTC_DATA_ATTR uint32_t rtcMagic = 0;
RTC_DATA_ATTR uint64_t rtcNowSec = 0;
RTC_DATA_ATTR uint32_t rtcLastSleepSec = 0;

RTC_DATA_ATTR bool rtcHasLastSend = false;
RTC_DATA_ATTR uint64_t rtcLastSendSec = 0;

RTC_DATA_ATTR uint32_t rtcRainCount = 0;
RTC_DATA_ATTR bool rtcReedWasLow = false;

RTC_DATA_ATTR uint32_t rtcPublishCounter = 0;
RTC_DATA_ATTR uint8_t rtcConsecutiveFailures = 0;
RTC_DATA_ATTR bool rtcPendingSend = false;

RTC_DATA_ATTR bool rtcHasLastSensor = false;
RTC_DATA_ATTR float rtcLastTemp = 0;
RTC_DATA_ATTR float rtcLastHumidity = 0;
RTC_DATA_ATTR float rtcLastPressure = 0;
RTC_DATA_ATTR float rtcLastLux = 0;
RTC_DATA_ATTR bool rtcLastBmeOk = false;
RTC_DATA_ATTR bool rtcLastBhOk = false;

// ======================================================
// BEHAVIOR SETTINGS
// ======================================================

const uint32_t CHANGE_CHECK_INTERVAL_SEC = 60;
const uint32_t DEBUG_INTERVAL_SEC = 30;
const uint32_t FREQUENT_INTERVAL_SEC = 15 * 60;
const uint32_t NORMAL_INTERVAL_SEC = 30 * 60;
const uint32_t BATTERY_SAVER_INTERVAL_SEC = 60 * 60;

const uint32_t WIFI_CONNECT_TIMEOUT_MS = 12000;
const uint8_t SEND_MAX_ATTEMPTS = 2;

const float INVALID_VALUE = -1000.0f;

// Rapid-change thresholds.
// Ladit podle reálného provozu.
const float TEMP_CHANGE_C = 2.0f;          // změna teploty za jeden check
const float HUMIDITY_CHANGE_PCT = 12.0f;  // změna vlhkosti za jeden check
const float PRESSURE_CHANGE_HPA = 2.0f;   // změna tlaku za jeden check
const float LUX_CHANGE_ABS = 300.0f;      // absolutní změna světla
const float LUX_CHANGE_REL = 0.60f;       // relativní změna světla 60 %

struct SensorData {
  float temp;
  float humidity;
  float pressure_hpa;
  float lux;

  float battery_voltage;
  float battery_percent;

  bool bmeOk;
  bool bhOk;
  bool fuelOk;

  bool reedState;
  bool buttonState;
};

// ======================================================
// SMALL HELPERS
// ======================================================

void copyStringToBuffer(const String& src, char* dst, size_t dstSize) {
  if (dstSize == 0) return;
  src.toCharArray(dst, dstSize);
  dst[dstSize - 1] = '\0';
}

bool isUsableFloat(float value) {
  return !isnan(value) && value > -999.0f && value < 1000000.0f;
}

uint32_t publishIntervalSec() {
  switch (config.publishMode) {
    case MODE_DEBUG:
      return DEBUG_INTERVAL_SEC;
    case MODE_FREQUENT:
      return FREQUENT_INTERVAL_SEC;
    case MODE_NORMAL:
      return NORMAL_INTERVAL_SEC;
    case MODE_BATTERY_SAVER:
      return BATTERY_SAVER_INTERVAL_SEC;
    default:
      return NORMAL_INTERVAL_SEC;
  }
}

const char* publishModeToString(uint8_t mode) {
  switch (mode) {
    case MODE_DEBUG:
      return "debug";
    case MODE_FREQUENT:
      return "frequent";
    case MODE_NORMAL:
      return "normal";
    case MODE_BATTERY_SAVER:
      return "battery_saver";
    default:
      return "normal";
  }
}

uint8_t parsePublishMode(const String& value) {
  if (value == "debug") return MODE_DEBUG;
  if (value == "frequent") return MODE_FREQUENT;
  if (value == "normal") return MODE_NORMAL;
  if (value == "battery_saver") return MODE_BATTERY_SAVER;
  return MODE_NORMAL;
}

const char* wakeReasonToText(esp_sleep_wakeup_cause_t reason) {
  switch (reason) {
    case ESP_SLEEP_WAKEUP_EXT0:
      return "reed";
    case ESP_SLEEP_WAKEUP_TIMER:
      return "timer";
    case ESP_SLEEP_WAKEUP_UNDEFINED:
      return "power_on_or_reset";
    default:
      return "other";
  }
}

void printFloatJson(MqttClient& client, float value, uint8_t decimals = 2) {
  if (isUsableFloat(value)) {
    client.print(value, decimals);
  } else {
    client.print(INVALID_VALUE, decimals);
  }
}

// ======================================================
// CONFIG
// ======================================================

void setDefaultConfig() {
  memset(&config, 0, sizeof(config));
  config.magic = CONFIG_MAGIC;
  strcpy(config.wifiSsid, "");
  strcpy(config.wifiPass, "");
  strcpy(config.mqttHost, "");
  config.mqttPort = 1883;
  config.publishMode = MODE_NORMAL;
}

bool isConfigValid() {
  if (config.magic != CONFIG_MAGIC) return false;
  if (strlen(config.wifiSsid) == 0) return false;
  if (strlen(config.mqttHost) == 0) return false;
  if (config.mqttPort == 0) return false;
  if (config.publishMode > MODE_BATTERY_SAVER) return false;
  return true;
}

bool loadConfig() {
  setDefaultConfig();

  prefs.begin("meteo", true);

  config.magic = prefs.getUInt("magic", 0);

  String ssid = prefs.getString("ssid", "");
  String pass = prefs.getString("pass", "");
  String host = prefs.getString("host", "");

  copyStringToBuffer(ssid, config.wifiSsid, sizeof(config.wifiSsid));
  copyStringToBuffer(pass, config.wifiPass, sizeof(config.wifiPass));
  copyStringToBuffer(host, config.mqttHost, sizeof(config.mqttHost));

  config.mqttPort = prefs.getUShort("port", 1883);
  config.publishMode = prefs.getUChar("mode", MODE_NORMAL);

  prefs.end();

  if (!isConfigValid()) {
    Serial.println("No valid config found.");
    setDefaultConfig();
    return false;
  }

  Serial.println("Config loaded from Preferences.");
  Serial.print("WiFi SSID: ");
  Serial.println(config.wifiSsid);
  Serial.print("MQTT host: ");
  Serial.println(config.mqttHost);
  Serial.print("MQTT port: ");
  Serial.println(config.mqttPort);
  Serial.print("Publish mode: ");
  Serial.println(publishModeToString(config.publishMode));

  return true;
}

void saveConfig() {
  config.magic = CONFIG_MAGIC;

  prefs.begin("meteo", false);

  prefs.putUInt("magic", config.magic);
  prefs.putString("ssid", config.wifiSsid);
  prefs.putString("pass", config.wifiPass);
  prefs.putString("host", config.mqttHost);
  prefs.putUShort("port", config.mqttPort);
  prefs.putUChar("mode", config.publishMode);

  prefs.end();

  Serial.println("Config saved to Preferences.");
}

// ======================================================
// CONFIG PORTAL HTML
// ======================================================

String htmlEscape(const char* input) {
  String out = "";

  for (size_t i = 0; i < strlen(input); i++) {
    char c = input[i];

    if (c == '&') out += "&amp;";
    else if (c == '<') out += "&lt;";
    else if (c == '>') out += "&gt;";
    else if (c == '"') out += "&quot;";
    else if (c == '\'') out += "&#39;";
    else out += c;
  }

  return out;
}

void addModeOption(String& html, const char* value, const char* label, uint8_t modeValue) {
  html += "<option value='";
  html += value;
  html += "'";

  if (config.publishMode == modeValue) {
    html += " selected";
  }

  html += ">";
  html += label;
  html += "</option>";
}

String buildConfigPage() {
  String html = "";

  html += "<!doctype html>";
  html += "<html>";
  html += "<head>";
  html += "<meta name='viewport' content='width=device-width,initial-scale=1'>";
  html += "<title>MeteoStation setup</title>";
  html += "<style>";
  html += "body{font-family:Arial,sans-serif;margin:24px;max-width:520px}";
  html += "input,select,button{width:100%;font-size:16px;padding:10px;margin:6px 0 16px 0;box-sizing:border-box}";
  html += "button{background:#111;color:white;border:0;border-radius:8px}";
  html += ".hint{color:#666;font-size:14px}";
  html += "</style>";
  html += "</head>";
  html += "<body>";

  html += "<h2>MeteoStation setup</h2>";
  html += "<form action='/save' method='get'>";

  html += "WiFi SSID:<br>";
  html += "<input name='ssid' value='";
  html += htmlEscape(config.wifiSsid);
  html += "'>";

  html += "WiFi password:<br>";
  html += "<input name='pass' type='password' value='";
  html += htmlEscape(config.wifiPass);
  html += "'>";

  html += "MQTT host / IP:<br>";
  html += "<input name='host' value='";
  html += htmlEscape(config.mqttHost);
  html += "'>";

  html += "MQTT port:<br>";
  html += "<input name='port' type='number' value='";
  html += String(config.mqttPort);
  html += "'>";

  html += "Measurement mode:<br>";
  html += "<select name='mode'>";
  addModeOption(html, "debug", "Debug - 30 seconds", MODE_DEBUG);
  addModeOption(html, "frequent", "Frequent - 15 minutes", MODE_FREQUENT);
  addModeOption(html, "normal", "Normal - 30 minutes", MODE_NORMAL);
  addModeOption(html, "battery_saver", "Battery saver - 60 minutes", MODE_BATTERY_SAVER);
  html += "</select>";

  html += "<p class='hint'>Zařízení se mezitím budí každou minutu a kontroluje rychlé změny počasí/světla. Debug režim je pro vývoj.</p>";

  html += "<button type='submit'>Save and restart</button>";
  html += "</form>";

  html += "</body>";
  html += "</html>";

  return html;
}

void handleConfigRoot() {
  configServer.send(200, "text/html; charset=utf-8", buildConfigPage());
}

void handleConfigSave() {
  String ssid = configServer.arg("ssid");
  String pass = configServer.arg("pass");
  String host = configServer.arg("host");
  String port = configServer.arg("port");
  String mode = configServer.arg("mode");

  if (ssid.length() == 0 || host.length() == 0) {
    configServer.send(400, "text/plain; charset=utf-8", "SSID and MQTT host are required.");
    return;
  }

  int parsedPort = port.toInt();

  if (parsedPort <= 0 || parsedPort > 65535) {
    parsedPort = 1883;
  }

  copyStringToBuffer(ssid, config.wifiSsid, sizeof(config.wifiSsid));
  copyStringToBuffer(pass, config.wifiPass, sizeof(config.wifiPass));
  copyStringToBuffer(host, config.mqttHost, sizeof(config.mqttHost));

  config.mqttPort = (uint16_t)parsedPort;
  config.publishMode = parsePublishMode(mode);

  saveConfig();

  configServer.send(
    200,
    "text/html; charset=utf-8",
    "<!doctype html><html><body><h2>Saved</h2><p>Configuration saved. Device is restarting...</p></body></html>"
  );

  delay(1000);
  ESP.restart();
}

void startConfigMode() {
  Serial.println();
  Serial.println("====================================");
  Serial.println("Entering config mode");
  Serial.println("====================================");

  WiFi.disconnect(true);
  delay(300);

  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(AP_IP, AP_GATEWAY, AP_SUBNET);

  bool ok = WiFi.softAP(SETUP_AP_SSID, SETUP_AP_PASS);

  if (!ok) {
    Serial.println("Failed to start AP.");
    while (true) {
      delay(1000);
    }
  }

  configServer.on("/", HTTP_GET, handleConfigRoot);
  configServer.on("/save", HTTP_GET, handleConfigSave);
  configServer.begin();

  Serial.println("Config AP started.");
  Serial.print("SSID: ");
  Serial.println(SETUP_AP_SSID);
  Serial.print("PASS: ");
  Serial.println(SETUP_AP_PASS);
  Serial.print("Open: http://");
  Serial.println(WiFi.softAPIP());

  while (true) {
    configServer.handleClient();
    delay(5);
  }
}

bool configButtonHeld() {
  if (digitalRead(BUTTON_PIN) != LOW) {
    return false;
  }

  Serial.println("Button is pressed. Hold for config mode...");

  unsigned long start = millis();

  while (digitalRead(BUTTON_PIN) == LOW) {
    if (millis() - start >= BUTTON_HOLD_MS) {
      Serial.println("Button held long enough.");
      return true;
    }

    delay(20);
  }

  Serial.println("Button released before config timeout.");
  return false;
}

// ======================================================
// RTC / RAIN
// ======================================================

void initRtcStateIfNeeded() {
  esp_sleep_wakeup_cause_t wakeReason = esp_sleep_get_wakeup_cause();

  if (rtcMagic != RTC_MAGIC) {
    rtcMagic = RTC_MAGIC;
    rtcNowSec = 0;
    rtcLastSleepSec = 0;

    rtcHasLastSend = false;
    rtcLastSendSec = 0;

    rtcRainCount = 0;
    rtcReedWasLow = false;

    rtcPublishCounter = 0;
    rtcConsecutiveFailures = 0;
    rtcPendingSend = false;

    rtcHasLastSensor = false;
    rtcLastBmeOk = false;
    rtcLastBhOk = false;

    Serial.println("RTC state initialized.");
    return;
  }

  if (wakeReason == ESP_SLEEP_WAKEUP_TIMER) {
    rtcNowSec += rtcLastSleepSec;
  } else if (wakeReason == ESP_SLEEP_WAKEUP_EXT0) {
    // Reed wake usually happens before the timer.
    // We do not know exact elapsed time, so we only advance a little.
    rtcNowSec += 1;
  } else {
    rtcNowSec += 1;
  }

  Serial.print("RTC time estimate: ");
  Serial.print(rtcNowSec);
  Serial.println(" sec");
}

bool handleRainEvent() {
  esp_sleep_wakeup_cause_t wakeReason = esp_sleep_get_wakeup_cause();
  bool reedNowLow = digitalRead(REED_PIN) == LOW;

  bool reedWake = wakeReason == ESP_SLEEP_WAKEUP_EXT0;
  bool rainEvent = false;

  if ((reedWake || reedNowLow) && !rtcReedWasLow) {
    rtcRainCount++;
    rainEvent = true;

    Serial.println("Rain reed event detected.");
    Serial.print("Accumulated raindrops_amount: ");
    Serial.println(rtcRainCount);
  }

  rtcReedWasLow = reedNowLow;

  return rainEvent;
}

void waitForReedReleaseBeforeSleep() {
  if (digitalRead(REED_PIN) != LOW) {
    rtcReedWasLow = false;
    return;
  }

  Serial.println("Reed is still LOW, waiting for release before sleep...");

  unsigned long start = millis();

  while (digitalRead(REED_PIN) == LOW && millis() - start < 3000) {
    delay(20);
  }

  rtcReedWasLow = digitalRead(REED_PIN) == LOW;

  if (rtcReedWasLow) {
    Serial.println("Reed still LOW after timeout. Sleeping anyway.");
  } else {
    Serial.println("Reed released.");
  }
}

// ======================================================
// SENSORS
// ======================================================

void initSensors() {
  Wire.begin(I2C_SDA, I2C_SCL);
  delay(100);

  Serial.println("Initializing BME280...");

  bmeReady = bme.begin(0x76);

  if (!bmeReady) {
    Serial.println("BME280 not found on 0x76, trying 0x77...");
    bmeReady = bme.begin(0x77);
  }

  if (bmeReady) {
    Serial.println("BME280 initialized.");

    bme.setSampling(
      Adafruit_BME280::MODE_FORCED,
      Adafruit_BME280::SAMPLING_X1,
      Adafruit_BME280::SAMPLING_X1,
      Adafruit_BME280::SAMPLING_X1,
      Adafruit_BME280::FILTER_OFF
    );
  } else {
    Serial.println("BME280 init failed.");
  }

  Serial.println("Initializing BH1750...");

  bhReady = lightMeter.begin(BH1750::ONE_TIME_HIGH_RES_MODE, 0x23, &Wire);

  if (!bhReady) {
    Serial.println("BH1750 not found on 0x23, trying 0x5C...");
    bhReady = lightMeter.begin(BH1750::ONE_TIME_HIGH_RES_MODE, 0x5C, &Wire);
  }

  if (bhReady) {
    Serial.println("BH1750 initialized.");
  } else {
    Serial.println("BH1750 init failed.");
  }

  Serial.println("Initializing MAX17048...");

  fuelReady = fuelGauge.begin();

  if (fuelReady) {
    Serial.println("MAX17048 initialized.");
  } else {
    Serial.println("MAX17048 init failed.");
  }
}

SensorData readSensorData() {
  SensorData data;

  data.temp = INVALID_VALUE;
  data.humidity = INVALID_VALUE;
  data.pressure_hpa = INVALID_VALUE;
  data.lux = INVALID_VALUE;
  data.battery_voltage = INVALID_VALUE;
  data.battery_percent = INVALID_VALUE;

  data.bmeOk = false;
  data.bhOk = false;
  data.fuelOk = false;

  data.reedState = digitalRead(REED_PIN) == LOW;
  data.buttonState = digitalRead(BUTTON_PIN) == LOW;

  if (bmeReady) {
    bme.takeForcedMeasurement();

    float temp = bme.readTemperature();
    float humidity = bme.readHumidity();
    float pressure = bme.readPressure() / 100.0F;

    if (!isnan(temp) && !isnan(humidity) && !isnan(pressure)) {
      data.temp = temp;
      data.humidity = humidity;
      data.pressure_hpa = pressure;
      data.bmeOk = true;
    }
  }

  if (bhReady) {
    delay(180);
    float lux = lightMeter.readLightLevel();

    if (!isnan(lux) && lux >= 0) {
      data.lux = lux;
      data.bhOk = true;
    }
  }

  if (fuelReady) {
    float voltage = fuelGauge.getVoltage();
    float percent = fuelGauge.getSOC();

    if (!isnan(voltage) && voltage > 0.5f) {
      data.battery_voltage = voltage;
      data.battery_percent = percent;
      data.fuelOk = true;
    }
  }

  Serial.println();
  Serial.println("=== SENSOR DATA ===");

  Serial.print("BME OK: ");
  Serial.println(data.bmeOk);

  Serial.print("Temp: ");
  Serial.println(data.temp);

  Serial.print("Humidity: ");
  Serial.println(data.humidity);

  Serial.print("Pressure hPa: ");
  Serial.println(data.pressure_hpa);

  Serial.print("BH1750 OK: ");
  Serial.println(data.bhOk);

  Serial.print("Lux: ");
  Serial.println(data.lux);

  Serial.print("Fuel OK: ");
  Serial.println(data.fuelOk);

  Serial.print("Battery V: ");
  Serial.println(data.battery_voltage);

  Serial.print("Battery %: ");
  Serial.println(data.battery_percent);

  Serial.print("Reed LOW: ");
  Serial.println(data.reedState);

  Serial.print("Button LOW: ");
  Serial.println(data.buttonState);

  return data;
}

// ======================================================
// RAPID CHANGE DETECTION
// ======================================================

String getRapidChangeReason(const SensorData& data) {
  if (!rtcHasLastSensor) {
    return "";
  }

  if (data.bmeOk && rtcLastBmeOk) {
    float tempDiff = fabsf(data.temp - rtcLastTemp);
    float humidityDiff = fabsf(data.humidity - rtcLastHumidity);
    float pressureDiff = fabsf(data.pressure_hpa - rtcLastPressure);

    if (tempDiff >= TEMP_CHANGE_C) {
      return "change_temp";
    }

    if (humidityDiff >= HUMIDITY_CHANGE_PCT) {
      return "change_humidity";
    }

    if (pressureDiff >= PRESSURE_CHANGE_HPA) {
      return "change_pressure";
    }
  }

  if (data.bhOk && rtcLastBhOk) {
    float luxDiff = fabsf(data.lux - rtcLastLux);
    float baseLux = fabsf(rtcLastLux);

    if (baseLux < 10.0f) {
      baseLux = 10.0f;
    }

    float relativeChange = luxDiff / baseLux;

    if (luxDiff >= LUX_CHANGE_ABS && relativeChange >= LUX_CHANGE_REL) {
      return "change_lux";
    }
  }

  return "";
}

void updateLastSensorSnapshot(const SensorData& data) {
  rtcHasLastSensor = true;

  rtcLastBmeOk = data.bmeOk;
  rtcLastBhOk = data.bhOk;

  if (data.bmeOk) {
    rtcLastTemp = data.temp;
    rtcLastHumidity = data.humidity;
    rtcLastPressure = data.pressure_hpa;
  }

  if (data.bhOk) {
    rtcLastLux = data.lux;
  }
}

// ======================================================
// WIFI / MQTT
// ======================================================

volatile bool wifiBeginDone = false;

void wifiBeginTask(void* parameter) {
  WiFi.begin(config.wifiSsid, config.wifiPass);
  wifiBeginDone = true;
  vTaskDelete(NULL);
}

bool connectWiFiOnce(int& rssiOut) {
  rssiOut = -999;
  wifiBeginDone = false;

  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(config.wifiSsid);

  WiFi.disconnect(true, true);
  delay(500);

  WiFi.mode(WIFI_OFF);
  delay(500);

  WiFi.mode(WIFI_STA);
  delay(300);

  WiFi.setSleep(false);

  Serial.println("Starting WiFi.begin task...");

  xTaskCreate(
    wifiBeginTask,
    "wifiBeginTask",
    4096,
    NULL,
    1,
    NULL
  );

  unsigned long beginStart = millis();

  while (!wifiBeginDone && millis() - beginStart < 5000) {
    delay(100);
    Serial.print("b");
  }

  Serial.println();

  if (!wifiBeginDone) {
    Serial.println("WiFi.begin appears stuck. Restarting ESP.");
    delay(500);
    ESP.restart();
  }

  Serial.println("WiFi.begin returned, waiting for connection...");

  unsigned long connectStart = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - connectStart < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    rssiOut = WiFi.RSSI();

    Serial.println("WiFi connected.");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.println(rssiOut);

    return true;
  }

  Serial.println("WiFi connect failed.");

  WiFi.disconnect(true, true);
  delay(300);
  WiFi.mode(WIFI_OFF);

  return false;
}

bool connectMQTTOnce() {
  Serial.print("Connecting to MQTT broker: ");
  Serial.print(config.mqttHost);
  Serial.print(":");
  Serial.println(config.mqttPort);

  char clientId[40];
  uint64_t chipId = ESP.getEfuseMac();
  snprintf(clientId, sizeof(clientId), "meteostation-%04X%08X", (uint16_t)(chipId >> 32), (uint32_t)chipId);

  mqttClient.setId(clientId);
  mqttClient.setKeepAliveInterval(30);

  if (!mqttClient.connect(config.mqttHost, config.mqttPort)) {
    Serial.print("MQTT connect failed, error code = ");
    Serial.println(mqttClient.connectError());
    return false;
  }

  Serial.println("MQTT connected.");
  return true;
}

bool publishTelemetryPayload(
  const SensorData& data,
  uint32_t rainToSend,
  const char* sendReason,
  const char* wakeReason,
  int wifiRssi
) {
  String payload = "{";

  payload += "\"temp\":" + String(data.temp, 2);
  payload += ",\"humidity\":" + String(data.humidity, 2);
  payload += ",\"pressure\":" + String(data.pressure_hpa, 2);
  payload += ",\"lux\":" + String(data.lux, 2);
  payload += ",\"raindrops_amount\":" + String(rainToSend);
  payload += ",\"battery_voltage\":" + String(data.battery_voltage, 3);
  payload += ",\"battery_percent\":" + String(data.battery_percent, 2);
  payload += ",\"wifi_rssi\":" + String(wifiRssi);
  payload += ",\"counter\":" + String(rtcPublishCounter);

  payload += ",\"send_reason\":\"" + String(sendReason) + "\"";
  payload += ",\"wake_reason\":\"" + String(wakeReason) + "\"";
  payload += ",\"mode\":\"" + String(publishModeToString(config.publishMode)) + "\"";

  payload += ",\"bme_ok\":";
  payload += data.bmeOk ? "true" : "false";

  payload += ",\"bh1750_ok\":";
  payload += data.bhOk ? "true" : "false";

  payload += ",\"fuel_ok\":";
  payload += data.fuelOk ? "true" : "false";

  payload += ",\"reed_state\":";
  payload += data.reedState ? "true" : "false";

  payload += ",\"button_state\":";
  payload += data.buttonState ? "true" : "false";

  payload += "}";

  Serial.println("MQTT payload:");
  Serial.println(payload);
  Serial.print("Payload length: ");
  Serial.println(payload.length());

  mqttClient.beginMessage(PUB_TOPIC, (unsigned long)payload.length());
  mqttClient.print(payload);
  bool ok = mqttClient.endMessage();

  Serial.print("MQTT endMessage OK: ");
  Serial.println(ok);

  return ok;
}

bool sendTelemetryOnce(const SensorData& data, const char* sendReason, const char* wakeReason) {
  uint32_t rainToSend = rtcRainCount;
  int wifiRssi = -999;

  if (!connectWiFiOnce(wifiRssi)) {
    return false;
  }

  delay(300);

  if (!connectMQTTOnce()) {
    mqttClient.stop();
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);
    return false;
  }

  delay(200);
  mqttClient.poll();

  bool ok = publishTelemetryPayload(data, rainToSend, sendReason, wakeReason, wifiRssi);

  delay(300);
  mqttClient.poll();

  mqttClient.stop();
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  return ok;
}

bool sendTelemetryWithRetry(const SensorData& data, const char* sendReason, const char* wakeReason) {
  for (uint8_t attempt = 1; attempt <= SEND_MAX_ATTEMPTS; attempt++) {
    Serial.print("Send attempt ");
    Serial.print(attempt);
    Serial.print("/");
    Serial.println(SEND_MAX_ATTEMPTS);

    if (sendTelemetryOnce(data, sendReason, wakeReason)) {
      Serial.println("Telemetry sent.");
      return true;
    }

    if (attempt < SEND_MAX_ATTEMPTS) {
      Serial.println("Send failed, retrying shortly...");
      delay(1500);
    }
  }

  Serial.println("Telemetry failed.");
  return false;
}

// ======================================================
// SLEEP
// ======================================================

uint32_t computeRetrySleepSec() {
  if (rtcConsecutiveFailures == 0) return 30;
  if (rtcConsecutiveFailures == 1) return 60;
  if (rtcConsecutiveFailures == 2) return 120;
  return 300;
}

uint32_t computeNextSleepSec(bool lastSendFailed) {
  if (lastSendFailed || rtcPendingSend) {
    return computeRetrySleepSec();
  }

  uint32_t intervalSec = publishIntervalSec();

  if (config.publishMode == MODE_DEBUG) {
    return DEBUG_INTERVAL_SEC;
  }

  uint32_t checkSec = CHANGE_CHECK_INTERVAL_SEC;

  if (!rtcHasLastSend) {
    return 5;
  }

  uint64_t elapsedSinceSend = rtcNowSec - rtcLastSendSec;

  if (elapsedSinceSend >= intervalSec) {
    return 5;
  }

  uint32_t untilPeriodic = intervalSec - elapsedSinceSend;

  if (untilPeriodic < checkSec) {
    return untilPeriodic;
  }

  return checkSec;
}

void goToDeepSleep(uint32_t sleepSec) {
  if (sleepSec < 5) sleepSec = 5;

  waitForReedReleaseBeforeSleep();

  Serial.println();
  Serial.print("Going to deep sleep for ");
  Serial.print(sleepSec);
  Serial.println(" seconds.");

  rtcLastSleepSec = sleepSec;

  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  pinMode(REED_PIN, INPUT_PULLUP);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  rtc_gpio_pullup_en(REED_GPIO);
  rtc_gpio_pulldown_dis(REED_GPIO);

  rtc_gpio_pullup_en(BUTTON_GPIO);
  rtc_gpio_pulldown_dis(BUTTON_GPIO);

  esp_sleep_enable_timer_wakeup((uint64_t)sleepSec * 1000000ULL);

  // Reed switch immediate wake.
  // On classic ESP32 we use EXT0 for one active-LOW wake pin.
  esp_sleep_enable_ext0_wakeup(REED_GPIO, 0);

  Serial.flush();
  esp_deep_sleep_start();
}

// ======================================================
// MAIN
// ======================================================

void setup() {
  Serial.begin(115200);
  delay(800);

  Serial.println();
  Serial.println("====================================");
  Serial.println("MeteoStation ESP32 firmware");
  Serial.println("Board: LOLIN32 V1.0.0");
  Serial.println("====================================");

  pinMode(REED_PIN, INPUT_PULLUP);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  esp_sleep_wakeup_cause_t wakeReason = esp_sleep_get_wakeup_cause();
  const char* wakeReasonText = wakeReasonToText(wakeReason);

  Serial.print("Wake reason: ");
  Serial.println(wakeReasonText);

  initRtcStateIfNeeded();

  bool hasConfig = loadConfig();

  if (configButtonHeld()) {
    startConfigMode();
  }

  if (!hasConfig) {
    startConfigMode();
  }

  bool rainEvent = handleRainEvent();

  initSensors();

  SensorData data = readSensorData();

  String changeReason = getRapidChangeReason(data);

  bool periodicDue = false;

  if (!rtcHasLastSend) {
    periodicDue = true;
  } else {
    uint32_t intervalSec = publishIntervalSec();
    uint64_t elapsedSinceSend = rtcNowSec - rtcLastSendSec;
    periodicDue = elapsedSinceSend >= intervalSec;
  }

  bool shouldSend = false;
  String sendReason = "";

  if (rtcPendingSend) {
    shouldSend = true;
    sendReason = "retry";
  }

  if (rainEvent) {
    shouldSend = true;
    sendReason = "rain";
  }

  if (changeReason.length() > 0) {
    shouldSend = true;
    sendReason = changeReason;
  }

  if (periodicDue) {
    shouldSend = true;

    if (sendReason.length() == 0) {
      sendReason = "periodic";
    }
  }

  Serial.println();
  Serial.println("=== DECISION ===");

  Serial.print("Rain event: ");
  Serial.println(rainEvent);

  Serial.print("Rapid change: ");
  Serial.println(changeReason.length() > 0 ? changeReason : "none");

  Serial.print("Periodic due: ");
  Serial.println(periodicDue);

  Serial.print("Pending send: ");
  Serial.println(rtcPendingSend);

  Serial.print("Should send: ");
  Serial.println(shouldSend);

  if (sendReason.length() > 0) {
    Serial.print("Send reason: ");
    Serial.println(sendReason);
  }

  bool sendOk = false;
  bool sendFailed = false;

  if (shouldSend) {
    sendOk = sendTelemetryWithRetry(data, sendReason.c_str(), wakeReasonText);

    if (sendOk) {
      rtcPublishCounter++;
      rtcLastSendSec = rtcNowSec;
      rtcHasLastSend = true;

      rtcRainCount = 0;
      rtcPendingSend = false;
      rtcConsecutiveFailures = 0;
    } else {
      rtcPendingSend = true;
      rtcConsecutiveFailures++;
      sendFailed = true;
    }
  }

  updateLastSensorSnapshot(data);

  uint32_t nextSleepSec = computeNextSleepSec(sendFailed);

  Serial.println();
  Serial.println("=== STATE AFTER CYCLE ===");
  Serial.print("Publish counter: ");
  Serial.println(rtcPublishCounter);
  Serial.print("Rain count stored: ");
  Serial.println(rtcRainCount);
  Serial.print("Consecutive failures: ");
  Serial.println(rtcConsecutiveFailures);
  Serial.print("Pending send: ");
  Serial.println(rtcPendingSend);

  goToDeepSleep(nextSleepSec);
}

void loop() {
  // Not used. Device works in wake -> measure -> optional send -> deep sleep cycle.
}
#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include <Arduino_LED_Matrix.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>
#include <EEPROM.h>

ArduinoLEDMatrix matrix;
Adafruit_BME280 bme;
BH1750 lightMeter;

// ===== BUTTON =====
const int BTN_PIN = 2;
const unsigned long BUTTON_HOLD_MS = 5000;

// ===== CONFIG PORTAL =====
WiFiServer configServer(80);
const char SETUP_AP_SSID[] = "MeteoStation-Setup";
const char SETUP_AP_PASS[] = "meteosetup";   // min 8 chars
const uint32_t CONFIG_MAGIC = 0x4D535431;    // "MST1"

// ===== Matrix icons =====
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

uint8_t wifiFrame[8][12] = {
  {0,0,0,0,0,0,0,0,0,0,0,0},
  {0,0,0,1,1,1,1,1,0,0,0,0},
  {0,0,1,0,0,0,0,0,1,0,0,0},
  {0,1,0,0,1,1,1,0,0,1,0,0},
  {0,0,0,1,0,0,0,1,0,0,0,0},
  {0,0,0,0,1,1,1,0,0,0,0,0},
  {0,0,0,0,0,1,0,0,0,0,0,0},
  {0,0,0,0,0,0,0,0,0,0,0,0}
};

struct SensorData {
  float temp;
  float humidity;
  float pressure_hpa;
  float lux;
  bool bmeOk;
  bool bhOk;
};

struct DeviceConfig {
  uint32_t magic;
  char wifiSsid[32];
  char wifiPass[64];
  char mqttHost[64];
  uint16_t mqttPort;
  uint32_t publishIntervalMs;
};

// ===== MQTT =====
const char PUB_TOPIC[] = "uno-r4/test";

WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);

DeviceConfig config;

unsigned long lastSend = 0;
int counter = 0;

bool buttonPressed = false;
unsigned long pressStart = 0;
bool configMode = false;

// ===================== helpers =====================

void copyStringToBuffer(const String& src, char* dst, size_t dstSize) {
  if (dstSize == 0) return;
  src.toCharArray(dst, dstSize);
  dst[dstSize - 1] = '\0';
}

String urlDecode(String input) {
  String output = "";
  char temp[] = "0x00";

  for (unsigned int i = 0; i < input.length(); i++) {
    if (input[i] == '+') {
      output += ' ';
    } else if (input[i] == '%' && i + 2 < input.length()) {
      temp[2] = input[i + 1];
      temp[3] = input[i + 2];
      output += (char) strtol(temp, NULL, 16);
      i += 2;
    } else {
      output += input[i];
    }
  }

  return output;
}

String getQueryParam(const String& requestLine, const char* key) {
  int qStart = requestLine.indexOf('?');
  if (qStart < 0) return "";

  int qEnd = requestLine.indexOf(' ', qStart);
  if (qEnd < 0) return "";

  String query = requestLine.substring(qStart + 1, qEnd);
  String keyEq = String(key) + "=";

  int start = 0;
  while (start < query.length()) {
    int amp = query.indexOf('&', start);
    if (amp < 0) amp = query.length();

    String part = query.substring(start, amp);
    if (part.startsWith(keyEq)) {
      return urlDecode(part.substring(keyEq.length()));
    }

    start = amp + 1;
  }

  return "";
}


void setDefaultConfig() {
  memset(&config, 0, sizeof(config));
  config.magic = CONFIG_MAGIC;

  strcpy(config.wifiSsid, "");
  strcpy(config.wifiPass, "");
  strcpy(config.mqttHost, "");
  config.mqttPort = 1883;
  config.publishIntervalMs = 600000; // 10 min
}

bool isConfigValid() {
  if (config.magic != CONFIG_MAGIC) return false;
  if (strlen(config.wifiSsid) == 0) return false;
  if (strlen(config.mqttHost) == 0) return false;
  if (config.mqttPort == 0) return false;
  if (config.publishIntervalMs < 60000) return false;
  return true;
}

bool loadConfig() {
  EEPROM.get(0, config);

  if (!isConfigValid()) {
    Serial.println("No valid config found.");
    setDefaultConfig();
    return false;
  }

  Serial.println("Config loaded from EEPROM.");
  return true;
}

void saveConfig() {
  config.magic = CONFIG_MAGIC;
  EEPROM.put(0, config);
  Serial.println("Config saved to EEPROM.");
}

void resetBoard() {
  NVIC_SystemReset();
}

// ===================== WiFi / MQTT =====================

bool connectWiFiOnce() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(config.wifiSsid);

  WiFi.begin(config.wifiSsid, config.wifiPass);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 10000) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected.");
    Serial.print("Board IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.println(WiFi.RSSI());
    return true;
  }

  Serial.println("WiFi connect failed.");
  WiFi.end();
  return false;
}
bool connectMQTTOnce() {
  Serial.print("Connecting to MQTT broker: ");
  Serial.print(config.mqttHost);
  Serial.print(":");
  Serial.println(config.mqttPort);

  mqttClient.setId("uno-r4-wifi-client");

  if (!mqttClient.connect(config.mqttHost, config.mqttPort)) {
    Serial.print("MQTT connect failed, error code = ");
    Serial.println(mqttClient.connectError());
    return false;
  }

  Serial.println("MQTT connected.");
  return true;
}

// ===================== Sensors =====================

void initSensors() {
  Wire.begin();

  bool bmeStatus = bme.begin(0x76);
  if (!bmeStatus) {
    Serial.println("BME280 init failed on 0x76, trying 0x77...");
    bmeStatus = bme.begin(0x77);
  }

  if (bmeStatus) {
    Serial.println("BME280 initialized.");
  } else {
    Serial.println("BME280 init failed on both 0x76 and 0x77.");
  }

  bool bhStatus = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE);
  if (bhStatus) {
    Serial.println("BH1750 initialized.");
  } else {
    Serial.println("BH1750 init failed.");
  }
}

SensorData getSensorData() {
  SensorData data;

  data.bmeOk = true;
  data.bhOk = true;

  float temp = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F;

  if (isnan(temp) || isnan(humidity) || isnan(pressure)) {
    data.temp = -1000;
    data.humidity = -1000;
    data.pressure_hpa = -1000;
    data.bmeOk = false;
  } else {
    data.temp = temp;
    data.humidity = humidity;
    data.pressure_hpa = pressure;
  }

  float lux = lightMeter.readLightLevel();
  if (lux < 0) {
    data.lux = -1000;
    data.bhOk = false;
  } else {
    data.lux = lux;
  }

  return data;
}

// ===================== Config Portal =====================

void sendConfigForm(WiFiClient& client) {
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/html; charset=utf-8");
  client.println("Connection: close");
  client.println();

  client.println("<!doctype html>");
  client.println("<html><head><meta name='viewport' content='width=device-width,initial-scale=1'>");
  client.println("<title>Meteo setup</title></head><body>");
  client.println("<h2>MeteoStation setup</h2>");
  client.println("<form action='/save' method='get'>");

  client.print("WiFi SSID:<br><input name='ssid' value='");
  client.print(config.wifiSsid);
  client.println("'><br><br>");

  client.print("WiFi password:<br><input name='pass' value='");
  client.print(config.wifiPass);
  client.println("'><br><br>");

  client.print("MQTT host / IP:<br><input name='host' value='");
  client.print(config.mqttHost);
  client.println("'><br><br>");

  client.print("MQTT port:<br><input name='port' type='number' value='");
  client.print(config.mqttPort);
  client.println("'><br><br>");

  client.print("Publish interval (minutes, minimum 1 minute):<br><input name='interval' type='number' value='");
  client.print(config.publishIntervalMs / 60000);
  client.println("'><br><br>");

  client.println("<button type='submit'>Save</button>");
  client.println("</form>");
  client.println("</body></html>");
}

void sendSavedPage(WiFiClient& client) {
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: text/html; charset=utf-8");
  client.println("Connection: close");
  client.println();

  client.println("<!doctype html>");
  client.println("<html><body>");
  client.println("<h2>Saved</h2>");
  client.println("<p>Configuration saved. Restarting device...</p>");
  client.println("</body></html>");
}

void handleConfigClient(WiFiClient client) {
  String requestLine = "";
  bool firstLineRead = false;
  unsigned long timeoutStart = millis();

  while (client.connected() && millis() - timeoutStart < 2000) {
    if (client.available()) {
      String line = client.readStringUntil('\n');
      line.trim();

      if (!firstLineRead) {
        requestLine = line;
        firstLineRead = true;
      }

      if (line.length() == 0) {
        break;
      }
    }
  }

  Serial.print("HTTP request: ");
  Serial.println(requestLine);

  if (requestLine.startsWith("GET /save?")) {
    String ssid = getQueryParam(requestLine, "ssid");
    String pass = getQueryParam(requestLine, "pass");
    String host = getQueryParam(requestLine, "host");
    String port = getQueryParam(requestLine, "port");
    String interval = getQueryParam(requestLine, "interval");

    if (ssid.length() > 0) copyStringToBuffer(ssid, config.wifiSsid, sizeof(config.wifiSsid));
    copyStringToBuffer(pass, config.wifiPass, sizeof(config.wifiPass));
    if (host.length() > 0) copyStringToBuffer(host, config.mqttHost, sizeof(config.mqttHost));

    int parsedPort = port.toInt();
    if (parsedPort > 0 && parsedPort <= 65535) {
      config.mqttPort = parsedPort;
    }

    unsigned long parsedMinutes = interval.toInt();
    if (parsedMinutes >= 1) {
      config.publishIntervalMs = parsedMinutes * 60000UL;
    }

    saveConfig();
    sendSavedPage(client);
    delay(1000);
    client.stop();
    delay(500);
    resetBoard();
    return;
  }

  sendConfigForm(client);
  delay(1);
  client.stop();
}

void startConfigMode() {
  configMode = true;

  Serial.println("Entering config mode...");
  matrix.renderBitmap(wifiFrame, 8, 12);

  wifiClient.stop();
  WiFi.end();
  delay(1000);

  WiFi.config(IPAddress(192, 168, 4, 1));

  int status = WiFi.beginAP(SETUP_AP_SSID, SETUP_AP_PASS);
  if (status != WL_AP_LISTENING) {
    Serial.println("Failed to start AP mode.");
    while (true) {
      matrix.renderBitmap(xFrame, 8, 12);
      delay(500);
    }
  }

  configServer.begin();

  Serial.println("Config AP started.");
  Serial.print("SSID: ");
  Serial.println(SETUP_AP_SSID);
  Serial.print("PASS: ");
  Serial.println(SETUP_AP_PASS);
  Serial.print("Open: http://");
  Serial.println(WiFi.localIP());

  while (true) {
    WiFiClient client = configServer.available();
    if (client) {
      handleConfigClient(client);
    }
  }
}

void handleButton() {
  static bool lastReading = HIGH;
  static bool stableState = HIGH;
  static unsigned long lastDebounceTime = 0;
  const unsigned long debounceDelay = 50;

  bool reading = digitalRead(BTN_PIN);

  if (reading != lastReading) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (reading != stableState) {
      stableState = reading;

      if (stableState == LOW) {
        buttonPressed = true;
        pressStart = millis();
        Serial.println("Button press started");
      } else {
        buttonPressed = false;
        pressStart = 0;
        Serial.println("Button released");
      }
    }
  }

  lastReading = reading;

  if (buttonPressed && !configMode && (millis() - pressStart >= BUTTON_HOLD_MS)) {
    Serial.println("Button held long enough, entering config mode");
    buttonPressed = false;
    pressStart = 0;
    startConfigMode();
  }
}

bool sendTelemetry() {
  if (!connectWiFiOnce()) {
    Serial.println("WiFi not connected, skipping send.");
    return false;
  }

  if (!connectMQTTOnce()) {
    Serial.println("MQTT not connected, skipping send.");
    WiFi.end();
    return false;
  }

  SensorData d = getSensorData();
  counter++;

  mqttClient.beginMessage(PUB_TOPIC);
  mqttClient.print("{\"counter\":");
  mqttClient.print(counter);
  mqttClient.print(",\"uptime_ms\":");
  mqttClient.print(millis());
  mqttClient.print(",\"data\":{");
  mqttClient.print("\"temp\":");
  mqttClient.print(d.temp);
  mqttClient.print(",\"humidity\":");
  mqttClient.print(d.humidity);
  mqttClient.print(",\"pressure_hpa\":");
  mqttClient.print(d.pressure_hpa);
  mqttClient.print(",\"lux\":");
  mqttClient.print(d.lux);
  mqttClient.print("},\"status\":{");
  mqttClient.print("\"bme280_ok\":");
  mqttClient.print(d.bmeOk ? "true" : "false");
  mqttClient.print(",\"bh1750_ok\":");
  mqttClient.print(d.bhOk ? "true" : "false");
  mqttClient.print("}}");

  bool ok = mqttClient.endMessage();

  mqttClient.stop();
  WiFi.end();

  if (ok) {
    Serial.println("Telemetry sent, WiFi + MQTT disconnected.");
    return true;
  }

  Serial.println("MQTT publish failed.");
  return false;
}

bool sendTelemetryWithRetry(int maxAttempts) {
  for (int attempt = 1; attempt <= maxAttempts; attempt++) {
    Serial.print("Send attempt ");
    Serial.print(attempt);
    Serial.print("/");
    Serial.println(maxAttempts);

    if (sendTelemetry()) {
      return true;
    }

    if (attempt < maxAttempts) {
      Serial.println("Send failed, retrying in 2s...");
      delay(2000);
    }
  }

  Serial.println("All send attempts failed.");
  return false;
}

// ===================== setup / loop =====================

unsigned long nextSendAt = 0;
const unsigned long retryDelayMs = 30000; // 30 sec

void setup() {
  Serial.begin(9600);

  pinMode(BTN_PIN, INPUT_PULLUP);

  matrix.begin();
  mqttClient.setKeepAliveInterval(60);

  bool hasConfig = loadConfig();

  if (!hasConfig) {
    Serial.println("Entering config mode (no config)");
    startConfigMode();
  }

  initSensors();
  nextSendAt = millis();
}

void loop() {
  handleButton();

  if ((long)(millis() - nextSendAt) >= 0) {
    bool sent = sendTelemetryWithRetry(3);

    if (sent) {
      Serial.println("Telemetry delivered.");
      nextSendAt = millis() + config.publishIntervalMs;
    } else {
      Serial.println("Telemetry failed, retry scheduled later.");
      nextSendAt = millis() + retryDelayMs;
    }

    matrix.clear();
  }
}

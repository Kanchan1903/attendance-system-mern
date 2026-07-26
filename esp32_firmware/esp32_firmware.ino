#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>

// --- WiFi Credentials ---
const char* ssid = "GK";
const char* password = "111111111";

// --- Backend API details ---
// Replace with your laptop's IP address (e.g., 192.168.252.110)
const char* serverName = "http://192.168.252.110:5000/api/iot/attendance";

// --- Fingerprint Sensor Setup ---
// For ESP32, use hardware serial if possible, or SoftwareSerial (needs library)
// Here we use Hardware Serial2 (RX2=16, TX2=17) which is standard on ESP32
#define mySerial Serial2
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setup() {
  Serial.begin(115200);
  delay(100);

  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Initialize fingerprint sensor
  Serial.println("\n\nAdafruit finger detect test");
  finger.begin(57600);
  delay(5);
  if (finger.verifyPassword()) {
    Serial.println("Found fingerprint sensor!");
  } else {
    Serial.println("Did not find fingerprint sensor :(");
    while (1) { delay(1); }
  }

  finger.getTemplateCount();
  if (finger.templateCount == 0) {
    Serial.print("Sensor doesn't contain any fingerprint data. Please run the 'enroll' example.");
  } else {
    Serial.println("Waiting for valid finger...");
    Serial.print("Sensor contains "); Serial.print(finger.templateCount); Serial.println(" templates");
  }
}

void loop() {
  getFingerprintIDez();
  delay(50);            //don't ned to run this at full speed.
}

// Returns -1 if failed, otherwise returns ID #
int getFingerprintIDez() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK)  return -1;

  p = finger.fingerFastSearch();
  if (p != FINGERPRINT_OK)  return -1;

  // found a match!
  Serial.print("Found ID #"); Serial.print(finger.fingerID);
  Serial.print(" with confidence of "); Serial.println(finger.confidence);

  // Map the Fingerprint ID to the PRN
  String prn = mapFingerprintToPRN(finger.fingerID);
  
  if (prn != "") {
    sendAttendance(prn);
    delay(2000); // Prevent spamming requests for the same scan
  }

  return finger.fingerID;
}

// Function to map the integer ID from the sensor to your student PRN
String mapFingerprintToPRN(int id) {
  // Add your student ID mappings here
  switch (id) {
    case 1:
      return "101";
    case 2:
      return "102";
    case 3:
      return "103";
    case 4:
      return "104";
    case 5:
      return "105";
    case 6:
      return "106";
    case 7:
      return "23046491245048";
    case 8:
      return "107";
    case 9:
      return "108";
    case 10:
      return "109";
    case 11:
      return "110";
    // Add more cases as needed for more students
    default:
      Serial.println("Unknown fingerprint ID");
      return "";
  }
}

void sendAttendance(String prn) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    // The backend expects { "prn": "...", "timestamp": "..." }
    // We can omit timestamp and let the backend handle the current time, or send it if we have an RTC.
    // For simplicity, we just send PRN and let backend use its own timestamp.
    String httpRequestData = "{\"prn\":\"" + prn + "\"}";
    
    Serial.print("Sending POST: ");
    Serial.println(httpRequestData);

    int httpResponseCode = http.POST(httpRequestData);

    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      String payload = http.getString();
      Serial.println(payload);
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}

import "dotenv/config";

//ENV
const { DEVICE_ID, SECRET_TOKEN, POST_API_URL } = process.env;

export const sendToServer = async (records) => {
  try {
    const response = await fetch(`${POST_API_URL}/telemetry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET_TOKEN}`,
      },
      body: JSON.stringify(
        records.map(({ id, created_at, temperature, humidity, pressure, light, raindrops_amount, battery_percent, wifi_rssi }) => {
          return { 
            remoteId: id, 
            measuredAtUtc: created_at, 
            temperature, humidity, pressure, 
            lighting: light, 
            raindropsAmount: raindrops_amount, 
            nodeBatteryLevel: Math.round(battery_percent), 
            nodeWifiStrength: Math.round(wifi_rssi) 
          };
        })),
      });
  
      if (!response.ok) {
        console.error("Server error:", response.status);
        return false;
      }
    
      console.log("Server POST OK");
      return true;

  } catch (err) {
    console.error("Fetch failed:", err);
    return false;
  }
};

import "dotenv/config";

//ENV
const { DEVICE_ID, SECRET_TOKEN, POST_API_BASE_URL } = process.env;

export const sendToServer = async (r) => {

  if(Array.isArray(r)) {
    console.error("cannot send array as a single record")
    return false;
  }

  try {
    const response = await fetch(`${POST_API_BASE_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET_TOKEN}`,
      },
      body: JSON.stringify({ 
        remoteId: String(r.id), 
        measuredAtUtc: r.created_at, 
        temperature: r.temperature,
        humidity: r.humidity,
        pressure: r.pressure,
        lighting: r.light,
        raindropsAmount: r.raindrops_amount,
        nodeBatteryLevel: Math.round(r.battery_percent), 
        nodeWifiStrength: Math.round(r.wifi_rssi) 
      })
    });
  
      if (!response.ok) {
        console.error("Server error:", response.status);
        console.error(response.body);
        return false;
      }
    
      console.log("Server POST OK");
      return true;

  } catch (err) {
    console.error("Fetch failed:", err);
    return false;
  }
};


export const sendHistoryToServer = async (records) => {
  try {
    const response = await fetch(`${POST_API_BASE_URL}/send-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET_TOKEN}`,
      },
      body: JSON.stringify({
        records: records.map(({ id, created_at, temperature, humidity, pressure, light, raindrops_amount, battery_percent, wifi_rssi }) => {
            return { 
              remoteId: String(id), 
              measuredAtUtc: created_at, 
              temperature, humidity, pressure, 
              lighting: light, 
              raindropsAmount: raindrops_amount, 
              nodeBatteryLevel: Math.round(battery_percent), 
              nodeWifiStrength: Math.round(wifi_rssi) 
            };
          })
      })
      });

      //Handle conflict
      if(response.status === 409) {
        console.log("Resource already exists on the server");
        return true
      }
  
      if (!response.ok) {
        console.error("Server error:", response.status);
        console.error(response.body);
        return false;
      }
    
      console.log("Server POST OK");
      return true;

  } catch (err) {
    console.error("Fetch failed:", err);
    return false;
  }
};

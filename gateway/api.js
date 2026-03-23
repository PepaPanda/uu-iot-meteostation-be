import "dotenv/config";

//ENV
const { DEVICE_ID, SECRET_TOKEN, POST_API_URL } = process.env;

export const sendToServer = async (records) => {
  try {
    const response = await fetch(POST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET_TOKEN}`,
      },
      body: JSON.stringify({ data: records, deviceId: DEVICE_ID }),
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

//ENV
import "dotenv/config";
const { MQTT_BROKER_PORT, DELETE_ALL_BUFFERED_RECORDS } = process.env;

//LIBS
import { createServer } from "node:net";
import { Aedes } from "aedes";

//DB
import {
  initDb,
  saveRecord,
  getLastRecords,
  deleteAllRecords,
  getUnsentRecords,
  markRecordsAsSent,
} from "./db.js";

//API

import { sendToServer } from "./api.js";

//INIT
initDb();
const aedes = await Aedes.createBroker();
const server = createServer(aedes.handle);
const port = parseInt(MQTT_BROKER_PORT);

if (DELETE_ALL_BUFFERED_RECORDS === "true") deleteAllRecords();

server.listen(port, function () {
  console.log("server started and listening on port ", port);
});

/*
    aedes.on("client", function (client) {
    console.log(`Klient pripojen: ${client ? client.id : "unknown"}`);
    });

    aedes.on("clientDisconnect", function (client) {
    console.log(`Klient odpojen: ${client ? client.id : "unknown"}`);
    });
*/

aedes.on("publish", async (packet, client) => {
  // broker sam publikuje i interni zpravy, tak filtrujeme klienta

  if (packet.retain) return;

  const payload = packet.payload.toString();

  if (client) {
    console.log("--- Received msg ---");
    console.log("clientId:", client.id);
    console.log("topic:", packet.topic);
    console.log("payload:", packet.payload.toString());
    console.log("qos:", packet.qos);
    console.log("retain:", packet.retain);
    console.log("----------------------");

    let data;

    try {
      data = JSON.parse(payload);
    } catch (error) {
      console.log("Invalid MQTT JSON payload:");
      console.log(payload);
      console.log(error);
      return;
    }

    Object.keys(data).forEach((key) => {
      const value = data[key];

      // null/undefined
      if (value === undefined || value === null) {
        data[key] = null;
        return;
      }

      // invalid numeric values
      if (
        typeof value === "number" &&
        (!Number.isFinite(value) || value < 0)
        && key !== "wifi_rssi"
      ) {
        data[key] = null;
      }
    });

    saveRecord({
      temperature: data.temp,
      humidity: data.humidity,
      pressure: data.pressure,
      light: data.lux,
      raindrops_amount: data.raindrops_amount || 0,

      battery_voltage: data.battery_voltage,
      battery_percent: data.battery_percent,
      wifi_rssi: data.wifi_rssi,
      counter: data.counter,

      send_reason: data.send_reason,
      wake_reason: data.wake_reason,
      mode: data.mode,

      bme_ok: data.bme_ok,
      bh1750_ok: data.bh1750_ok,
      fuel_ok: data.fuel_ok,
      reed_state: data.reed_state,
      button_state: data.button_state,
    });

    console.log(`last measurement:${JSON.stringify(getLastRecords(1))}`);

    const unsentRecords = getUnsentRecords();
    console.log(
      `There are ${unsentRecords.length} unsent records saved. Attempting to send them now.`,
    );

    const postSuccessful = await sendToServer(unsentRecords);

    if (postSuccessful) {
      console.log("Successfully posted, marking records as sent");
      markRecordsAsSent(unsentRecords);
      return;
    }

    console.log(
      "Post was not successful. Data is saved locally and an attempt will be made on the next measurement.",
    );
    console.log(
      "-------------------------------------------------------------------------------------------------------",
    );
  }
});

server.on("error", function (err) {
  console.error("Server error:", err);
});

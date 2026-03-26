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
const db = initDb();
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

    const data = JSON.parse(payload);

    saveRecord({
      temperature: data.data.temp,
      humidity: data.data.humidity,
      pressure: data.data.pressure_hpa,
      light: data.data.lux,
    });
    console.log(getLastRecords(1));

    const unsentRecords = getUnsentRecords();

    const postSuccessful = await sendToServer(unsentRecords);

    if (postSuccessful) {
      console.log("Successfully posted, marking records as sent");
      markRecordsAsSent(unsentRecords);
      return;
    }

    console.log(
      "Post was not successful. Data is saved locally and an attempt will be made on the next measurement.",
    );
  }
});

server.on("error", function (err) {
  console.error("Server error:", err);
});

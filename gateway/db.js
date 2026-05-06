import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, "data");
const dbPath = path.join(dbDir, "records.db");

fs.mkdirSync(dbDir, { recursive: true });

let db;
let insertRecordStmt;

export const initDb = () => {
  if (db) return db;

  fs.mkdirSync(dbDir, { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      temperature REAL,
      humidity REAL,
      pressure REAL,
      light REAL,
      raindrops_amount INTEGER NOT NULL DEFAULT 0,

      battery_voltage REAL,
      battery_percent REAL,
      wifi_rssi INTEGER,
      counter INTEGER,

      send_reason TEXT,
      wake_reason TEXT,
      mode TEXT,

      bme_ok BOOLEAN NOT NULL DEFAULT 0 CHECK (bme_ok IN (0, 1)),
      bh1750_ok BOOLEAN NOT NULL DEFAULT 0 CHECK (bh1750_ok IN (0, 1)),
      fuel_ok BOOLEAN NOT NULL DEFAULT 0 CHECK (fuel_ok IN (0, 1)),
      reed_state BOOLEAN NOT NULL DEFAULT 0 CHECK (reed_state IN (0, 1)),
      button_state BOOLEAN NOT NULL DEFAULT 0 CHECK (button_state IN (0, 1)),

      created_at TEXT NOT NULL,
      sent_to_server BOOLEAN NOT NULL DEFAULT 0 CHECK (sent_to_server IN (0, 1))
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_sent
    ON records(sent_to_server)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_records_created_at
    ON records(created_at)
  `);

  insertRecordStmt = db.prepare(`
    INSERT INTO records (
      temperature,
      humidity,
      pressure,
      light,
      raindrops_amount,

      battery_voltage,
      battery_percent,
      wifi_rssi,
      counter,

      send_reason,
      wake_reason,
      mode,

      bme_ok,
      bh1750_ok,
      fuel_ok,
      reed_state,
      button_state,

      created_at,
      sent_to_server
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return db;
};

export const closeDb = () => {
  if (!db) return;

  db.close();
  db = undefined;
  insertRecordStmt = undefined;
};

export const dropDb = () => {
  if (!db) initDb();

  db.exec(`DROP TABLE IF EXISTS records`);
  db = undefined;
  insertRecordStmt = undefined;
};

export const saveRecord = ({
  temperature = null,
  humidity = null,
  pressure = null,
  light = null,
  raindrops_amount = 0,

  battery_voltage = null,
  battery_percent = null,
  wifi_rssi = null,
  counter = null,

  send_reason = null,
  wake_reason = null,
  mode = null,

  bme_ok = false,
  bh1750_ok = false,
  fuel_ok = false,
  reed_state = false,
  button_state = false,

  sent_to_server = 0,
}) => {
  if (!db || !insertRecordStmt) initDb();

  return insertRecordStmt.run(
    temperature,
    humidity,
    pressure,
    light,
    raindrops_amount ?? 0,

    battery_voltage,
    battery_percent,
    wifi_rssi,
    counter,

    send_reason,
    wake_reason,
    mode,

    bme_ok ? 1 : 0,
    bh1750_ok ? 1 : 0,
    fuel_ok ? 1 : 0,
    reed_state ? 1 : 0,
    button_state ? 1 : 0,

    new Date().toISOString(),
    sent_to_server ? 1 : 0,
  );
};

export const getLastRecords = (limit = 10) => {
  if (!db) initDb();

  const stmt = db.prepare(`
    SELECT
      id,

      temperature,
      humidity,
      pressure,
      light,
      raindrops_amount,

      battery_voltage,
      battery_percent,
      wifi_rssi,
      counter,

      send_reason,
      wake_reason,
      mode,

      bme_ok,
      bh1750_ok,
      fuel_ok,
      reed_state,
      button_state,

      created_at,
      sent_to_server
    FROM records
    ORDER BY id DESC
    LIMIT ?
  `);

  return stmt.all(limit);
};

export const getUnsentRecords = (limit = 30) => {
  if (!db) initDb();

  const stmt = db.prepare(`
    SELECT *
    FROM records
    WHERE sent_to_server = 0
    ORDER BY id ASC
    LIMIT ?
  `);

  return stmt.all(limit);
};

export const markRecordsAsSent = (records) => {
  if (!db) initDb();

  if(!records) return console.error("couldnt mark records as sent");

  if (!Array.isArray(records)) {
    const record = records;
    records = [];
    records.push(record);
  }

  const ids = records.map((record) => record.id);

  return db
    .prepare(`
      UPDATE records
      SET sent_to_server = 1
      WHERE id IN (${ids.map(() => "?").join(",")})
    `)
    .run(...ids);
};

export const deleteSentRecords = () => {
  if (!db) initDb();

  const stmt = db.prepare(`
    DELETE
    FROM records
    WHERE sent_to_server = 1
  `);

  return stmt.run();
};

export const deleteAllRecords = () => {
  if (!db) initDb();

  const stmt = db.prepare(`
    DELETE
    FROM records
  `);

  return stmt.run();
};
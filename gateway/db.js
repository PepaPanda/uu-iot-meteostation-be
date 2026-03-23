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
            created_at TEXT NOT NULL,
            sent_to_server INTEGER NOT NULL DEFAULT 0
          )
        `);

  db.exec(`
          CREATE INDEX IF NOT EXISTS idx_records_sent
            ON records(sent_to_server);
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
      created_at,
      sent_to_server
    )
    VALUES (?, ?, ?, ?, ?, ?)
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
};

export const saveRecord = ({
  temperature = null,
  humidity = null,
  pressure = null,
  light = null,
  sent_to_server = 0,
}) => {
  return insertRecordStmt.run(
    temperature,
    humidity,
    pressure,
    light,
    new Date().toISOString(),
    sent_to_server ? 1 : 0,
  );
};

export const getLastRecords = (limit = 10) => {
  const stmt = db.prepare(`
    SELECT
      id,
      temperature,
      humidity,
      pressure,
      light,
      created_at,
      sent_to_server
    FROM records
    ORDER BY id DESC
    LIMIT ?
  `);

  return stmt.all(limit);
};

export const getUnsentRecords = () => {
  const stmt = db.prepare(`
    SELECT *
    FROM records
    WHERE sent_to_server = 0
    ORDER BY id DESC
  `);
  return stmt.all();
};

export const markRecordsAsSent = (records) => {
  const ids = records.map((record) => record.id);

  db.prepare(
    `
    UPDATE records
    SET sent_to_server = 1
    WHERE id IN (${ids.map(() => "?").join(",")})
  `,
  ).run(...ids);
};

export const deleteSentRecords = () => {
  const stmt = db.prepare(`
    DELETE
    FROM records
    WHERE sent_to_server = 1
  `);

  return stmt.run();
};

export const deleteAllRecords = () => {
  const stmt = db.prepare(`
    DELETE
    FROM records
  `);

  return stmt.run();
};

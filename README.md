# uu-iot-meteostation-be

## FIRMWARE & HARDWARE

- Push button D2 for 5sec to enter config mode, arduino will create a hotspot:
  - Wifi SSID: MeteoStation-Setup
  - Wifi Password: meteosetup
  - Arduino IP (config website addr): 192.168.4.1
  - Enter config, save
  - Arduino will restart and apply your settings

<img width="1560" height="1176" alt="image" src="https://github.com/user-attachments/assets/9ca86bbc-98de-470a-8a84-14abb93e10fd" />


## GATEWAY

- npm install
- npm run start
- Opens MQTT broker that forwards data and buffers if server is not available
- Use PM2 or other manager to keep the process running


## SERVER

- The server uses the APP_STAGE environment variable to decide whether to load a .env file.
- If APP_STAGE is not set or if it's set to "production", environment variables from .env will NOT be loaded.
- For local testing, you still need to make your own .env file
- `npm install`

- Ensure your env file has `DATABASE_URL=postgresql://meteostation_user:meteostation_password@localhost:5432/meteostation`
- run the database with: `docker compose up -d`
- Init DB with `npm run db:init` (runs server/database/migrations/001_init.sql)
- Seed with `npm run db:seed` (runs server/database/seeds/test.seed.sql)
- Go to http://localhost:8080 And login to adminer:
  - System: PostgreSQL
  - Server: postgres
  - Username: meteostation_user
  - Password: meteostation_password
  - Database: meteostation



- start the server (you need to set an env variable first):
    - **POWERSHEL**: `$env:APP_STAGE="development"; npm run dev`
    - **LINUX/MAC OS**: `APP_STAGE="development" npm run dev`

- STACK:
  - Typescript, express, Postres (with TimescaleDB)
- GOAL: Utilize SSE for sending data to the client

DB
https://drawsql.app/teams/martin-75/diagrams/meteotrack


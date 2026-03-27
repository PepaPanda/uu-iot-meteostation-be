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

- STACK:
  - Typescript, express, Postres (with TimescaleDB)
- GOAL: Utilize SSE for sending data to the client

# API & WebSocket Protocol (`Communication/`)

## 1. HTTP Backend -> Firmware / Bridge Contract
- **Endpoint:** `POST /api/mfr/robot/command` (`FastAPI 127.0.0.1:8000`)
- **Payload Fields (`RobotMotionCommand`):**
  - `command`: `STOP | FORWARD | BACKWARD | TURN_LEFT | TURN_RIGHT | IMPELLER_SET | PUMP_ON | PUMP_OFF | CLEAR_ESTOP | ESTOP`
  - `left_pct`, `right_pct`: integer `[-100, 100]`
  - `impeller_pct`: integer `[0, 100]` (mapped to `1000..1450 µs` unverified bench cap)
  - `pump_duration_sec`: float `[0, 15.0]`
  - `human_approved`: boolean (`true` required for `CLEAR_ESTOP` and `PUMP_ON`)
  - `source_layer`: must NOT begin with `AI` (rejected with HTTP `403` and logged to `safety_events`)

## 2. Firmware Serial / WebSocket NDJSON Frames
- **Backend -> ESP32-S3:**
  - `{"cmd":"ESTOP"}`
  - `{"cmd":"CLEAR_ESTOP"}`
  - `{"cmd":"DRIVE","left":45,"right":45,"impeller_us":1000}`
  - `{"cmd":"PUMP","enable":true}`
- **ESP32-S3 -> Backend (`4 Hz` Telemetry):**
  - `{"state":"HARDWARE_ESTOP|NORMAL_BENCH|WATCHDOG_TIMEOUT|MOTOR_DISABLED_UNVERIFIED","armed":false,"estop":true,"left_pct":0,"right_pct":0,"impeller_us":1000,"pump_active":false,"enc_l":0,"enc_r":0}`
- **Watchdog Timeout:** If no valid packet arrives for `> 1,200 ms`, firmware zeroes `ZK-BM1`, sets `ESC = 1000 µs`, turns pump `OFF`, and emits `WATCHDOG_TIMEOUT`.

# Web-to-Robot Connection Guide (Browser -> Next.js -> FastAPI -> ESP32-S3)

```text
[Next.js Web UI /work-planning (127.0.0.1:3000)]
       |  HTTP JSON (/api/mfr/* proxy route — browser JS NEVER talks directly to motors!)
       v
[Unified FastAPI Backend (127.0.0.1:8000)]  <--- [USB Webcam via OpenCV V4L2/AVFoundation]
       |  PyTorch AI 06 (Advisory ONLY)           + [SQLite / PostgreSQL Persistent Storage]
       |
       |  Controlled Backend Command Dispatch (Watchdog + Human E-Stop Guard)
       v
[Communication/WebSocket/esp32_ws_bridge.py]
       |  Simulation Mode (Default)  OR  USB-UART / Local Wi-Fi JSON
       v
[ESP32-S3 Firmware (ESP32_S3_Firmware/src/main.cpp)]
       |  GPIO (-1 unassigned until bench audit)
       +--> [ZK-BM1 (<= 2 kHz PWM)] --> [25GA Motors]
       +--> [Brushless ESC (50 Hz)] --> [Impeller Motor]
       +--> [L9110S (<= 800 mA)]   --> [Cleaner Pump]

[Hardware Latching E-Stop Switch] ---> Cuts Actuator Supply Directly (Zero Software/AI Dependency)
```

## Critical Rules
1. Browser JavaScript calls Next.js `/api/mfr/*`, which proxies to FastAPI `127.0.0.1:8000/api/mfr/*`.
2. AI 06 detections (`source_layer="AI_CV_MODEL"`) are programmatically rejected (`CommandGuardError` / `HTTP 403`) if attempting to move actuators or bypass safety locks.
3. Hardware E-Stop and physical roof safety tether operate strictly independent of ESP32, Python, or Next.js software.

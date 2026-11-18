# MFR Hardware & Embedded Codebase (`11 code for hard ware mfr/`)

This directory contains the first working hardware abstraction, ESP32-S3 control/telemetry firmware, USB UVC host camera capture service, cleaner-module safety guards, communication protocol, and host simulation harness for **Module Facade Rover (MFR)**.

## Component Safety Summary
| Component | Role | Verified Ratings / Constraints | Default Software State |
|---|---|---|---|
| **ESP32-S3 (`ESP32-S3-WROOM`)** | Main actuator & telemetry MCU (`3.3V` logic) | USB OTG Full-Speed (`12 Mbps`) only -> **NOT used for UVC webcam host**; exact board variant & pinout marked `[CHECK]` | Booted in `E_STOP / OUTPUTS DISABLED` (`MFR_PHYSICAL_OUTPUTS_ENABLED=0`) |
| **ZK-BM1 Dual MOSFET Driver** | Left/Right drive for `25GA` DC gear motors | `3–18 VDC` motor supply, `10 A` cont / `15 A` peak per channel, `3.3V`-compatible logic, **PWM `0–2 kHz` ONLY** | Software PWM capped at `1,000 Hz`, simulation default |
| **25GA DC Gear Motor (`JGA25-370` class)** | `Ø60 mm` drive wheel propulsion | Typical `6V` or `12V`, stall `~1.0–3.7 A`; **exact SKU & encoder `3.3V vs 5V` level `[MISSING]`** | Simulation encoder ticks active; physical pins `-1` |
| **Brushless Motor + ESC** | Drives `Ø84 mm` 8-blade central impeller | `50 Hz` servo PWM (`1000 µs` disarm, `1080–2000 µs` active); KV & BEC specs `[MISSING]` | Disarmed (`1000 µs`) until manual operator start in sim |
| **L9110S + Pump Motor** | Cleaner payload pump control | **`2.5–12 VDC`, MAX `800 mA` continuous (`1.5 A` surge)**; pump stall current `[MISSING]` | Simulation mode default, `15 s` max run cap |
| **USB Webcam + Jumper Adapter** | Visual inspection capture | Requires `5V VBUS` + `90 Ω` `D+/D-` -> **Connect directly to Host PC running FastAPI**, not random ESP32 GPIO | Active OpenCV host capture + safe offline/fixture fallback |

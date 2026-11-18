# MFR Hardware Integration & Compatibility Audit

**Directory Created:** `/Users/Siwakorn/Downloads/mfr/MFR_MASTER/11 code for hard ware mfr/`
**Policy:** Unverified electrical specs, unknown current draws, and unassigned GPIO pins remain in safe simulation mode (`MFR_PHYSICAL_OUTPUTS_ENABLED=0`) until verified on bench instruments.

---

## 1. Component-by-Component Engineering Audit

| # | Hardware Inventory Item | Identified Hardware & Rated Limits | Compatibility & Interface Findings | Verification Status |
|---|---|---|---|---|
| **1** | **ESP32-S3 Controller** | `ESP32-S3-WROOM` (`3.3 V` logic, present on `82 × 82 mm` carrier PCB in `MFR.step`). USB OTG is **Full-Speed ONLY (`12 Mbps`)** on `GPIO 19 (D-) / GPIO 20 (D+)`. | Exact DevKit flash/PSRAM variant (`N8R8` / `N16R8`) and carrier netlist require continuity check before GPIO assignment (`pin_config.h` pins default to `-1`). Dedicated to low-level actuator control + `4 Hz` telemetry. | **Software & C++ Core Tested; Physical MCU Pending** |
| **2** | **ZK-BM1 Module** | **Verified as Dual-Channel MOSFET DC Motor Driver**: `3–18 VDC` motor supply, `10 A` cont / `15 A` peak per channel, `3.3 V`-compatible `IN1–IN4` logic, **PWM MUST stay `0–2 kHz`**. | Compatible with `ESP32-S3` `3.3 V` logic and drives `25GA` DC gear motors cleanly (`1,000 Hz` PWM cap enforced in HAL & firmware). Above `8 A` requires added heatsinking. One `ZK-BM1` drives 2 independent channels (left/right pairs); 4 independent wheels require 2 boards. | **HAL Safety Guard Tested (`>2 kHz` rejected); Bench Unpowered** |
| **3** | **25GA DC Gear Motor** | `JGA25-370` micro metal gear motor class; common `6 V` or `12 V` windings, typical stall `1.0–3.7 A`; standard 6-pin harness (`Red M+`, `White M-`, `Black Enc GND`, `Blue Enc VCC`, `Yellow C1/A`, `Green C2/B`). | `[MISSING]` Exact nominal voltage (`6 V` vs `12 V`), gear ratio, stall current, and encoder output voltage (`3.3 V` vs `5 V` — level shifting required if `5 V`) not yet verified on physical hardware. | **Simulation Ticks Tested; SKU & Stall Unverified** |
| **4** | **Brushless Motor + ESC** | Matched mechanically to `MFR.step` `Ø84 × 25 mm` 8-blade impeller (`Part 1_12`). Standard ESC uses `50 Hz` PWM (`1000 µs` disarm, `1080–2000 µs` throttle). | `[MISSING]` Exact motor KV, cell voltage limit, ESC amp rating, and internal `5 V BEC` wiring (disconnect BEC `+5 V` red lead if ESP32 is powered via external `5 V` rail). Capped at `1450 µs` bench ceiling in unverified mode. | **Disarmed Default Tested; Physical Spin Pending** |
| **5** | **L9110S + Cleaner Pump** | **L9110S Dual H-Bridge IC**: `2.5–12 VDC` supply, **`800 mA` continuous MAX (`1.5 A` brief peak)** per channel. | **CRITICAL LIMIT:** Exceeding `800 mA` overheats L9110S rapidly. Pump motor rated voltage & locked-rotor stall current (`<= 800 mA`) are `[MISSING]`. Physical pump activation blocked by `l9110s_guard.py` until measured; defaults to `CLEANING_SIMULATION` (`15 s` max run cap). | **800 mA Guard Tested; Pump Bench Current Unverified** |
| **6** | **USB Webcam + USB-to-Jumper Converter** | Standard USB 2.0 UVC camera (`5 V` VBUS, differential `D+/D-` `90 Ω` pair). | **DO NOT wire USB camera via jumper wires to ordinary ESP32-S3 GPIOs.** ESP32-S3 USB host (`12 Mbps`) is bandwidth-limited (`QVGA/VGA MJPEG` only, requires PSRAM, competes with Wi-Fi). **Architecture Choice:** Connect USB webcam directly to Host Computer running FastAPI (`cv2.VideoCapture` + browser WebRTC), leaving ESP32-S3 dedicated to deterministic motor telemetry. | **Host OpenCV + Disconnect Fallback Implemented & Tested** |

---

## 2. Hard Safety Isolation Invariants Enforced in Code
1. Browser JS on `/work-planning` never drives GPIOs directly; every command passes through FastAPI `/api/mfr/robot/command`.
2. `source_layer="AI*"` actuator requests are rejected with `HTTP 403` and audited to `safety_events`.
3. Firmware (`MFRControllerCore`) and Python HAL (`MFRRobotControlService`) neutralize all drive/ESC/pump outputs after `1,200 ms` watchdog timeout or `E_STOP`.

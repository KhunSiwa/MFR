# MFR ESP32-S3 Firmware (`ESP32_S3_Firmware`)

## Hardware Role
- Target MCU verified in `MFR.step`: **`ESP32-S3-WROOM`** on an `82 x 82 mm` carrier PCB.
- Dedicated solely to low-level actuator control (`ZK-BM1` drive channels, `25GA` quadrature encoders, `50 Hz` brushless ESC PWM, `L9110S` pump gating) and `4 Hz` telemetry reporting.
- **USB Webcam is NOT routed through ESP32-S3 GPIO** (connect directly to host computer running FastAPI backend).

## Safety Invariants
1. Compiles with `MFR_PHYSICAL_OUTPUTS_ENABLED=0` and unassigned GPIOs (`-1`) by default.
2. Hardware watchdog automatically neutralizes drive, impeller ESC, and pump if no valid command arrives within `1,200 ms`.
3. `ZK-BM1` PWM frequency is hard-capped at `<= 2,000 Hz` (`1,000 Hz` nominal).
4. Continuous pump activation is capped at `15,000 ms` (`15 s`) with physical manual/E-Stop priority.

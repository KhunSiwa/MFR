# Hardware Wiring & Electrical Verification Guide

**WARNING — DO NOT ENERGIZE MOTORS OR PUMP UNTIL EVERY `[CHECK]` ITEM BELOW IS SIGNED OFF ON ACTUAL BENCH UNITS:**

1. **Star Ground Topology:** Connect Battery `(-)` star point -> `ZK-BM1 GND` -> `ESC GND` -> `L9110S GND` -> `ESP32-S3 GND`. Never route high motor return current through ESP32 logic header pins.
2. **ESP32-S3 Board Variant Check:** Confirm exact flash/PSRAM SKU (`N8R8` / `N16R8`) and trace `MFR.step` `82x82 mm` carrier PCB nets. Never assign motor PWM onto strapping GPIOs (`0, 3, 45, 46`), USB (`19, 20`), or Octal PSRAM pins (`33–37`).
3. **ZK-BM1 Wiring (`3–18 VDC`, `10 A` cont/ch, PWM `<= 2 kHz`):**
   - `VIN / V+` -> Downstream of Hardware E-Stop Switch + Main Fuse (`12V` vs `6V` MUST match `25GA` motor rating!)
   - `IN1, IN2` -> Left drive GPIOs (`1000 Hz` LEDC PWM)
   - `IN3, IN4` -> Right drive GPIOs (`1000 Hz` LEDC PWM)
   - `OUT1/OUT2` -> Left `25GA` pair (`M+ / M-`); `OUT3/OUT4` -> Right `25GA` pair
4. **25GA Quadrature Encoder Wiring (`6-Pin Connector`):**
   - Typical color convention: `Red=M+`, `White=M-`, `Black=Enc GND`, `Blue=Enc VCC`, `Yellow=C1(A)`, `Green=C2(B)`.
   - Verify whether encoder `VCC/Signal` is `3.3V` or `5V` open-collector! Use `3.3V` pull-ups or logic level shifters before feeding ESP32-S3 GPIOs (`3.3V` max).
5. **Brushless ESC Wiring:**
   - Signal + GND to `IMPELLER_ESC_PWM_GPIO` (`50 Hz`, `1000 µs` disarm). If ESC has an internal `5V BEC` and ESP32 is powered via external `5V` buck/USB, **disconnect the ESC middle `5V` red wire** so two `5V` regulators do not fight!
6. **L9110S Cleaner Pump Wiring (`2.5–12 VDC`, `800 mA` MAX continuous):**
   - Measure pump stall & running current on a bench PSU first. If locked-rotor or operating current exceeds `800 mA`, **DO NOT** wire through `L9110S` (substitute a `ZK-BM1` or discrete logic-level MOSFET + flyback diode).
7. **USB Webcam Connection:**
   - Plug directly into the computer running the FastAPI backend (`USB A/C`). Do **not** cut/splice into ordinary GPIO jumper wires.

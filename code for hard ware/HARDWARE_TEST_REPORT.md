# Hardware Integration & Simulation Test Report

| Test Area | Environment | Outcome | Notes |
|---|---|---|---|
| `ZK-BM1` PWM limit guard (`<= 2 kHz`) | Software Unit Test | **PASS** | Rejects `> 2000 Hz` to protect H-bridge MOSFETs |
| `L9110S` `800 mA` compatibility gate | Software Unit Test | **PASS** | Rejects unknown/overcurrent pump; passes verified `5V / 550mA` fixture |
| AI safety command isolation (`source_layer="AI_CV_MODEL"`) | Software Unit Test | **PASS** | Raises `CommandGuardError` immediately |
| E-Stop immediate cutoff & human-only release | Software Unit Test | **PASS** | Neutralizes `ZK-BM1`, `ESC=1000 µs`, `Pump OFF` |
| Command watchdog auto-stop (`1,200 ms`) | Software Unit Test | **PASS** | Verified in both Python HAL and compiled C++ `MFRControllerCore` |
| Cleaner blocks structural cracks (`REPAIR_REQUIRED`) | Software Unit Test | **PASS** | Raises `PermissionError` |
| Physical ESP32-S3 / ZK-BM1 / 25GA / L9110S / Pump load test | Physical Hardware | **NOT YET TESTED** | No physical ESP32-S3 or bench motor rig connected; specs marked `[CHECK]` |

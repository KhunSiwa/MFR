# Firmware Build & Flash Guide (`ESP32_S3_Firmware/`)

## Host Build & Unit Verification (Verified Offline)
Host C++17 compilation and safety logic tests run via:
```bash
python3 -B "/Users/Siwakorn/Downloads/mfr/MFR_MASTER/11 code for hard ware mfr/Simulation/test_hardware_abstraction.py"
```

## Flashing Physical ESP32-S3 (When Hardware Toolchain & Board Are Connected)
1. PlatformIO CLI is present at `/opt/anaconda3/bin/pio` (`espressif32` platform package must be installed online once before flashing).
2. Verify port via `ls /dev/cu.*` (`usbmodem*` / `usbserial*`).
3. Leave `MFR_PHYSICAL_OUTPUTS_ENABLED=0` for initial serial telemetry verification:
```bash
cd "/Users/Siwakorn/Downloads/mfr/MFR_MASTER/11 code for hard ware mfr/ESP32_S3_Firmware"
pio run -e esp32_s3_sim -t upload
pio device monitor -b 115200
```
4. Only after completing every `[CHECK]` measurement in `HARDWARE_WIRING_GUIDE.md` and assigning real GPIOs in `include/pin_config.h` (never `-1`), explicitly set `MFR_PHYSICAL_OUTPUTS_ENABLED=1` for guarded bench tests (`wheels lifted off table`).

#pragma once

/**
 * MFR ESP32-S3-WROOM Pin Allocation Template
 * ------------------------------------------
 * SAFETY NOTICE: Exact ESP32-S3 devkit revision (e.g. N8R2 vs N8R8 vs N16R8)
 * and carrier PCB netlist from MFR.step MUST be continuity-checked before
 * soldering or setting MFR_PHYSICAL_OUTPUTS_ENABLED=1.
 *
 * Avoid ESP32-S3 strapping pins (GPIO 0, GPIO 3, GPIO 45, GPIO 46) and USB D-/D+
 * (GPIO 19, GPIO 20) or Octal PSRAM pins (GPIO 33-37 on N8R8/N16R8 modules).
 * `-1` indicates UNVERIFIED / UNASSIGNED in default safe state.
 */

namespace mfr_pins {

// ZK-BM1 Dual MOSFET DC Driver (Left/Right paired or 2x ZK-BM1 for 4 motors)
// Requirement: PWM frequency MUST remain <= 2000 Hz to prevent MOSFET overheating.
constexpr int ZKBM1_LEFT_IN1_GPIO   = -1;  // [CHECK] Assign safe LEDC GPIO (e.g. GPIO 4) after continuity check
constexpr int ZKBM1_LEFT_IN2_GPIO   = -1;  // [CHECK] Assign safe LEDC GPIO (e.g. GPIO 5)
constexpr int ZKBM1_RIGHT_IN3_GPIO  = -1;  // [CHECK] Assign safe LEDC GPIO (e.g. GPIO 6)
constexpr int ZKBM1_RIGHT_IN4_GPIO  = -1;  // [CHECK] Assign safe LEDC GPIO (e.g. GPIO 7)

// 25GA DC Gear Motor Quadrature Encoders (Verify 3.3V vs 5V logic & pullups!)
constexpr int ENC_LEFT_A_GPIO       = -1;  // [CHECK] Voltage-divided/level-shifted to 3.3V max
constexpr int ENC_LEFT_B_GPIO       = -1;
constexpr int ENC_RIGHT_A_GPIO      = -1;
constexpr int ENC_RIGHT_B_GPIO      = -1;

// Brushless Impeller ESC Signal (50 Hz standard RC servo PWM: 1000-2000 us)
constexpr int IMPELLER_ESC_PWM_GPIO = -1;  // [CHECK] Verify ESC BEC 5V isolation before connecting GND/Signal

// L9110S Cleaner Pump Driver (2.5-12V, MAX 800 mA continuous!)
constexpr int L9110S_PUMP_IA_GPIO   = -1;  // [CHECK] Verify pump stall current <= 800 mA first
constexpr int L9110S_PUMP_IB_GPIO   = -1;

// Status LED (WS2812B present on MFR.step carrier) & Aux E-Stop Telemetry Sense
constexpr int STATUS_WS2812_GPIO    = -1;  // [CHECK] Verify GPIO on carrier PCB
constexpr int ESTOP_AUX_SENSE_GPIO  = -1;  // Read-only optocoupler sense; E-Stop cuts power in hardware

}  // namespace mfr_pins

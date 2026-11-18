#pragma once

#include <cstdint>

/**
 * MFR Hardware Safety Policy Constants
 * -------------------------------------
 * Physical actuators remain strictly disabled unless MFR_PHYSICAL_OUTPUTS_ENABLED == 1
 * AND all pins have valid non-negative GPIO mappings AND watchdog is fed within timeout.
 * AI / Computer Vision components have ZERO safety override permissions.
 */

namespace mfr_safety {

#ifndef MFR_PHYSICAL_OUTPUTS_ENABLED
#define MFR_PHYSICAL_OUTPUTS_ENABLED 0
#endif

#ifndef MFR_ZKBM1_MAX_PWM_HZ
#define MFR_ZKBM1_MAX_PWM_HZ 2000
#endif

constexpr bool PHYSICAL_OUTPUTS_COMPILED = (MFR_PHYSICAL_OUTPUTS_ENABLED == 1);
constexpr uint32_t COMMAND_WATCHDOG_TIMEOUT_MS = 1200;   // Auto-neutralize drive if backend heartbeat stalls
constexpr uint32_t TELEMETRY_INTERVAL_MS       = 250;    // 4 Hz telemetry publish cadence
constexpr uint32_t CLEANER_MAX_RUN_MS          = 15000;  // Hard firmware cap on continuous pump activation
constexpr int      ZKBM1_PWM_HZ                = 1000;   // Safe operating point inside 0..2000 Hz ZK-BM1 spec
constexpr int      ESC_PWM_HZ                  = 50;     // Standard 50 Hz ESC control frame
constexpr int      ESC_DISARM_US               = 1000;
constexpr int      ESC_MIN_SPIN_US             = 1080;
constexpr int      ESC_MAX_BENCH_US            = 1450;   // Bench ceiling (never 2000 us unverified)

enum class SystemState : uint8_t {
  SIMULATION_IDLE = 0,
  NORMAL_BENCH,
  WATCHDOG_TIMEOUT,
  HARDWARE_ESTOP,
  MOTOR_DISABLED_UNVERIFIED,
  CLEANER_OVER_DURATION,
  FAULT
};

inline const char* state_to_str(SystemState s) {
  switch (s) {
    case SystemState::SIMULATION_IDLE: return "SIMULATION_IDLE";
    case SystemState::NORMAL_BENCH: return "NORMAL_BENCH";
    case SystemState::WATCHDOG_TIMEOUT: return "WATCHDOG_TIMEOUT";
    case SystemState::HARDWARE_ESTOP: return "E_STOP";
    case SystemState::MOTOR_DISABLED_UNVERIFIED: return "MOTOR_DISABLED_UNVERIFIED";
    case SystemState::CLEANER_OVER_DURATION: return "CLEANER_OVER_DURATION";
    default: return "FAULT";
  }
}

}  // namespace mfr_safety

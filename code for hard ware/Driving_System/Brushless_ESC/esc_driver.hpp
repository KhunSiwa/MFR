#pragma once
#include <cstdint>

namespace mfr_hal {
struct ESCLimits {
  static constexpr uint16_t PWM_HZ = 50U;
  static constexpr uint16_t DISARM_US = 1000U;
  static constexpr uint16_t MIN_SPIN_US = 1080U;
  static constexpr uint16_t BENCH_CEILING_US = 1450U;
};
}  // namespace mfr_hal

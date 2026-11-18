#pragma once
#include <cstdint>

namespace mfr_hal {
struct L9110SLimits {
  static constexpr float MIN_VCC_V = 2.5f;
  static constexpr float MAX_VCC_V = 12.0f;
  static constexpr uint16_t CONT_CURRENT_MA = 800U;
  static constexpr uint16_t PEAK_SURGE_MA = 1500U;
};
}  // namespace mfr_hal

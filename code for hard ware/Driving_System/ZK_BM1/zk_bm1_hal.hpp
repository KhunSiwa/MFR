#pragma once

#include <cstdint>

namespace mfr_hal {

struct ZKBM1Specs {
  static constexpr float MIN_VCC_V = 3.0f;
  static constexpr float MAX_VCC_V = 18.0f;
  static constexpr float CONT_CURRENT_PER_CH_A = 10.0f;
  static constexpr float PEAK_CURRENT_PER_CH_A = 15.0f;
  static constexpr uint32_t MAX_PWM_HZ = 2000U;
};

struct ZKBM1PinPair {
  int in1_gpio;
  int in2_gpio;
};

inline bool is_valid_pwm_hz(uint32_t hz) {
  return hz >= 1U && hz <= ZKBM1Specs::MAX_PWM_HZ;
}

}  // namespace mfr_hal

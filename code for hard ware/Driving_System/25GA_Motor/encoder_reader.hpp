#pragma once
#include <cstdint>

namespace mfr_hal {
// Standard 6-pin JGA25-370 color code: Red=M+, White=M-, Black=EncGND, Blue=EncVCC(3.3/5V CHECK), Yellow=C1(A), Green=C2(B)
struct EncoderState {
  int32_t ticks_left = 0;
  int32_t ticks_right = 0;
  bool level_shifted_verified = false;
};
}  // namespace mfr_hal

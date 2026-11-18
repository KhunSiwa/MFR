/**
 * MFR ESP32-S3 Control & Telemetry Firmware (Safe Simulation + Bench HAL)
 * ------------------------------------------------------------------------
 * Compiles for Arduino-ESP32-S3 AND Native C++17 host test harness.
 * Never directly energizes physical pins when MFR_PHYSICAL_OUTPUTS_ENABLED == 0
 * or when target GPIO in pin_config.h is -1.
 */

#include "../include/pin_config.h"
#include "../include/safety_policy.h"

#ifdef ARDUINO
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "../../Communication/WiFi/wifi_config.example.h"
#endif

#include <algorithm>
#include <cstdint>
#include <string>

struct ActuatorCommandState {
  int left_pct = 0;         // -100..+100
  int right_pct = 0;        // -100..+100
  int impeller_us = mfr_safety::ESC_DISARM_US;
  bool pump_requested = false;
  uint32_t pump_started_ms = 0;
  bool software_estop = true;
  uint32_t last_cmd_ms = 0;
};

struct TelemetrySnapshot {
  mfr_safety::SystemState state = mfr_safety::SystemState::SIMULATION_IDLE;
  bool hardware_outputs_armed = false;
  bool software_estop = true;
  int left_pct = 0;
  int right_pct = 0;
  int impeller_us = mfr_safety::ESC_DISARM_US;
  bool pump_active = false;
  int32_t encoder_left_ticks = 0;
  int32_t encoder_right_ticks = 0;
  int wifi_rssi_dbm = -127;
};

class MFRControllerCore {
 public:
  void begin(uint32_t now_ms) {
    cmd_ = ActuatorCommandState{};
    cmd_.last_cmd_ms = now_ms;
    tel_ = TelemetrySnapshot{};
    tel_.hardware_outputs_armed = mfr_safety::PHYSICAL_OUTPUTS_COMPILED && pins_verified();
    tel_.state = tel_.hardware_outputs_armed
                     ? mfr_safety::SystemState::NORMAL_BENCH
                     : mfr_safety::SystemState::MOTOR_DISABLED_UNVERIFIED;
  }

  static bool pins_verified() {
    return mfr_pins::ZKBM1_LEFT_IN1_GPIO >= 0 &&
           mfr_pins::ZKBM1_LEFT_IN2_GPIO >= 0 &&
           mfr_pins::ZKBM1_RIGHT_IN3_GPIO >= 0 &&
           mfr_pins::ZKBM1_RIGHT_IN4_GPIO >= 0 &&
           mfr_safety::ZKBM1_PWM_HZ <= MFR_ZKBM1_MAX_PWM_HZ;
  }

  bool apply_drive_command(int left_pct, int right_pct, int impeller_us, uint32_t now_ms) {
    if (cmd_.software_estop) {
      neutralize_all(mfr_safety::SystemState::HARDWARE_ESTOP);
      return false;
    }
    cmd_.left_pct = std::max(-100, std::min(100, left_pct));
    cmd_.right_pct = std::max(-100, std::min(100, right_pct));
    cmd_.impeller_us = std::max(mfr_safety::ESC_DISARM_US, std::min(mfr_safety::ESC_MAX_BENCH_US, impeller_us));
    cmd_.last_cmd_ms = now_ms;
    sync_outputs(now_ms);
    return true;
  }

  bool apply_pump_command(bool enable, uint32_t now_ms) {
    if (cmd_.software_estop || !enable) {
      cmd_.pump_requested = false;
      tel_.pump_active = false;
      sync_outputs(now_ms);
      return !enable;
    }
    if (!cmd_.pump_requested) {
      cmd_.pump_started_ms = now_ms;
    }
    cmd_.pump_requested = true;
    cmd_.last_cmd_ms = now_ms;
    sync_outputs(now_ms);
    return true;
  }

  void trigger_estop() {
    cmd_.software_estop = true;
    neutralize_all(mfr_safety::SystemState::HARDWARE_ESTOP);
  }

  bool clear_estop(uint32_t now_ms) {
    cmd_.software_estop = false;
    cmd_.last_cmd_ms = now_ms;
    neutralize_all(mfr_safety::PHYSICAL_OUTPUTS_COMPILED && pins_verified()
                       ? mfr_safety::SystemState::NORMAL_BENCH
                       : mfr_safety::SystemState::MOTOR_DISABLED_UNVERIFIED);
    return true;
  }

  void tick(uint32_t now_ms, uint32_t dt_ms) {
    if (cmd_.software_estop) {
      neutralize_all(mfr_safety::SystemState::HARDWARE_ESTOP);
      return;
    }
    // Watchdog check: stops drive + impeller + pump if backend goes silent
    if ((now_ms - cmd_.last_cmd_ms) > mfr_safety::COMMAND_WATCHDOG_TIMEOUT_MS &&
        (cmd_.left_pct != 0 || cmd_.right_pct != 0 ||
         cmd_.impeller_us > mfr_safety::ESC_DISARM_US || cmd_.pump_requested)) {
      neutralize_all(mfr_safety::SystemState::WATCHDOG_TIMEOUT);
      return;
    }
    // Cleaner maximum continuous duration guard (protects pump & L9110S thermal budget)
    if (cmd_.pump_requested && (now_ms - cmd_.pump_started_ms) > mfr_safety::CLEANER_MAX_RUN_MS) {
      cmd_.pump_requested = false;
      tel_.pump_active = false;
      tel_.state = mfr_safety::SystemState::CLEANER_OVER_DURATION;
    }
    // Simulated quadrature ticks when physical encoders are absent
    if (!tel_.hardware_outputs_armed) {
      tel_.encoder_left_ticks += static_cast<int32_t>((cmd_.left_pct * static_cast<int>(dt_ms)) / 25);
      tel_.encoder_right_ticks += static_cast<int32_t>((cmd_.right_pct * static_cast<int>(dt_ms)) / 25);
    }
    sync_outputs(now_ms);
  }

  const TelemetrySnapshot& telemetry() const { return tel_; }

 private:
  void neutralize_all(mfr_safety::SystemState next_state) {
    cmd_.left_pct = 0;
    cmd_.right_pct = 0;
    cmd_.impeller_us = mfr_safety::ESC_DISARM_US;
    cmd_.pump_requested = false;
    tel_.left_pct = 0;
    tel_.right_pct = 0;
    tel_.impeller_us = mfr_safety::ESC_DISARM_US;
    tel_.pump_active = false;
    tel_.state = next_state;
  }

  void sync_outputs(uint32_t /*now_ms*/) {
    tel_.software_estop = cmd_.software_estop;
    tel_.left_pct = cmd_.left_pct;
    tel_.right_pct = cmd_.right_pct;
    tel_.impeller_us = cmd_.impeller_us;
    tel_.pump_active = cmd_.pump_requested && mfr_pins::L9110S_PUMP_IA_GPIO >= 0;

#if defined(ARDUINO) && (MFR_PHYSICAL_OUTPUTS_ENABLED == 1)
    // Only compiled when owner verifies all GPIOs in pin_config.h and sets flag = 1.
    // LEDC PWM frequency MUST remain <= 2000 Hz for ZK-BM1 MOSFETs.
#endif
  }

  ActuatorCommandState cmd_;
  TelemetrySnapshot tel_;
};

#ifdef ARDUINO
MFRControllerCore g_controller;
uint32_t g_last_tick_ms = 0;
uint32_t g_last_pub_ms = 0;

void setup() {
  Serial.begin(115200);
  g_last_tick_ms = millis();
  g_controller.begin(g_last_tick_ms);
  Serial.println("[MFR ESP32-S3] Booted in SAFE DEFAULT mode (E-STOP / outputs disabled).");
}

void loop() {
  uint32_t now = millis();
  uint32_t dt = now - g_last_tick_ms;
  g_last_tick_ms = now;
  g_controller.tick(now, dt);

  if (Serial.available()) {
    String line = Serial.readStringUntil('\n');
    JsonDocument doc;
    if (!deserializeJson(doc, line)) {
      const char* op = doc["cmd"] | "";
      if (strcmp(op, "ESTOP") == 0) {
        g_controller.trigger_estop();
      } else if (strcmp(op, "CLEAR_ESTOP") == 0) {
        g_controller.clear_estop(now);
      } else if (strcmp(op, "DRIVE") == 0) {
        g_controller.apply_drive_command(doc["left"] | 0, doc["right"] | 0, doc["impeller_us"] | 1000, now);
      } else if (strcmp(op, "PUMP") == 0) {
        g_controller.apply_pump_command(doc["enable"] | false, now);
      }
    }
  }

  if (now - g_last_pub_ms >= mfr_safety::TELEMETRY_INTERVAL_MS) {
    g_last_pub_ms = now;
    const auto& t = g_controller.telemetry();
    JsonDocument out;
    out["state"] = mfr_safety::state_to_str(t.state);
    out["armed"] = t.hardware_outputs_armed;
    out["estop"] = t.software_estop;
    out["left_pct"] = t.left_pct;
    out["right_pct"] = t.right_pct;
    out["impeller_us"] = t.impeller_us;
    out["pump_active"] = t.pump_active;
    out["enc_l"] = t.encoder_left_ticks;
    out["enc_r"] = t.encoder_right_ticks;
    serializeJson(out, Serial);
    Serial.println();
  }
  delay(20);
}
#endif

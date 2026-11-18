"""L9110S Dual-Channel Driver Safety Guard (2.5-12V DC, MAX 800mA Continuous / 1.5A Peak)."""

from __future__ import annotations

L9110S_MIN_VCC_V = 2.5
L9110S_MAX_VCC_V = 12.0
L9110S_CONT_CURRENT_MA = 800
L9110S_PEAK_CURRENT_MA = 1500


def verify_l9110s_compatibility(pump_voltage_v: float | None, pump_stall_ma: int | None) -> dict:
    """Block physical L9110S pump energization if voltage/current exceeds 800mA continuous rating."""
    if pump_voltage_v is None or pump_stall_ma is None:
        return {
            "compatible": False,
            "reason": "Pump motor nominal voltage and stall current are UNVERIFIED; physical L9110S drive disabled.",
        }
    if not L9110S_MIN_VCC_V <= pump_voltage_v <= L9110S_MAX_VCC_V:
        return {
            "compatible": False,
            "reason": f"Pump voltage {pump_voltage_v}V is outside L9110S range [{L9110S_MIN_VCC_V}, {L9110S_MAX_VCC_V}]V.",
        }
    if pump_stall_ma > L9110S_CONT_CURRENT_MA:
        return {
            "compatible": False,
            "reason": (
                f"Pump stall/surge {pump_stall_ma} mA exceeds L9110S continuous limit ({L9110S_CONT_CURRENT_MA} mA); "
                "use higher-current MOSFET driver (e.g., ZK-BM1 / IRLZ44N stage) instead of L9110S."
            ),
        }
    return {"compatible": True, "reason": "Within L9110S 2.5-12V / 800mA envelope."}

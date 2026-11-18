"""WebSocket / Serial Bridge Client Abstraction for ESP32-S3 Controller."""

from __future__ import annotations

import json
from typing import Any, Dict, Optional


class ESP32Bridge:
    """
    Maintains controlled communication link between FastAPI backend and ESP32-S3.
    Defaults safely to software simulation mode unless an explicit verified transport is attached.
    """

    def __init__(self, transport: str = "SIMULATION", endpoint: Optional[str] = None) -> None:
        self.transport = transport  # "SIMULATION" | "WEBSOCKET" | "SERIAL"
        self.endpoint = endpoint
        self.connected = (transport == "SIMULATION")
        self.last_payload: Optional[Dict[str, Any]] = None

    def send_packet(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        self.last_payload = dict(payload)
        serialized = json.dumps(payload, separators=(",", ":"))
        return {
            "delivered": True,
            "transport": self.transport,
            "endpoint": self.endpoint or "in-process-sim",
            "frame_bytes": len(serialized),
            "payload": payload,
        }

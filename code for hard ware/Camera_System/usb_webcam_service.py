"""USB UVC Webcam Capture Service for MFR Computer/Backend Host."""

from __future__ import annotations

import hashlib
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np


class WebcamCaptureError(RuntimeError):
    """Raised when camera connection or frame acquisition fails cleanly."""


class USBWebcamService:
    """
    Host-connected USB UVC camera capture service.
    NOTE: ESP32-S3 is USB Full-Speed (12 Mbps) only; therefore the USB webcam runs on the
    host computer/backend directly via OpenCV V4L2/AVFoundation rather than GPIO jumper wires.
    """

    def __init__(self, device_index: int = 0) -> None:
        self.device_index = device_index
        self.connected = False
        self.source_kind = "UNCONNECTED"
        self.last_error: Optional[str] = None
        self.last_capture_at: Optional[str] = None

    def probe_devices(self, max_index: int = 2) -> List[Dict[str, Any]]:
        found: List[Dict[str, Any]] = []
        for idx in range(max_index + 1):
            cap = cv2.VideoCapture(idx)
            try:
                if cap is not None and cap.isOpened():
                    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
                    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
                    found.append({"index": idx, "width": w, "height": h, "backend": "opencv"})
            finally:
                if cap is not None:
                    cap.release()
        return found

    def status(self) -> Dict[str, Any]:
        return {
            "device_index": self.device_index,
            "connected": self.connected,
            "source_kind": self.source_kind,
            "last_capture_at": self.last_capture_at,
            "last_error": self.last_error,
        }

    def capture_frame_bytes(self, *, fallback_image_path: Optional[Path] = None, allow_fallback: bool = True) -> Dict[str, Any]:
        """Attempt live USB webcam capture; handle disconnect cleanly with honest fallback if permitted."""
        cap = cv2.VideoCapture(self.device_index)
        try:
            if cap is not None and cap.isOpened():
                # Read up to 3 warm-up frames for auto-exposure stability
                frame = None
                for _ in range(3):
                    ok, f = cap.read()
                    if ok and f is not None:
                        frame = f
                if frame is not None:
                    ok_enc, buf = cv2.imencode(".png", frame)
                    if ok_enc:
                        raw = buf.tobytes()
                        self.connected = True
                        self.source_kind = "LIVE_USB_WEBCAM"
                        self.last_error = None
                        self.last_capture_at = datetime.now(timezone.utc).isoformat()
                        return {
                            "bytes": raw,
                            "width": int(frame.shape[1]),
                            "height": int(frame.shape[0]),
                            "sha256": hashlib.sha256(raw).hexdigest(),
                            "source_kind": self.source_kind,
                            "captured_at": self.last_capture_at,
                        }
        except Exception as exc:  # noqa: BLE001
            self.last_error = f"Webcam acquisition exception: {exc}"
        finally:
            if cap is not None:
                cap.release()

        self.connected = False
        self.source_kind = "CAMERA_DISCONNECTED"
        self.last_error = "No live frame acquired from USB webcam device."

        if not allow_fallback:
            raise WebcamCaptureError(self.last_error)

        if fallback_image_path and fallback_image_path.exists():
            raw = fallback_image_path.read_bytes()
            arr = np.frombuffer(raw, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            h, w = (int(img.shape[0]), int(img.shape[1])) if img is not None else (640, 480)
            self.source_kind = "SIMULATED_TEST_FIXTURE"
            self.last_capture_at = datetime.now(timezone.utc).isoformat()
            return {
                "bytes": raw,
                "width": w,
                "height": h,
                "sha256": hashlib.sha256(raw).hexdigest(),
                "source_kind": self.source_kind,
                "captured_at": self.last_capture_at,
            }

        # Synthesize clean labeled diagnostic test frame when no physical webcam or file exists
        canvas = np.full((480, 640, 3), 24, dtype=np.uint8)
        cv2.rectangle(canvas, (30, 30), (610, 450), (56, 189, 248), 2)
        cv2.putText(canvas, "MFR CAMERA DISCONNECTED - SIMULATED FRAME", (55, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.putText(canvas, time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()), (170, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (148, 163, 184), 1)
        ok_enc, buf = cv2.imencode(".png", canvas)
        if not ok_enc:
            raise WebcamCaptureError("Failed to encode fallback PNG frame.")
        raw = buf.tobytes()
        self.source_kind = "SIMULATED_OFFLINE_PATTERN"
        self.last_capture_at = datetime.now(timezone.utc).isoformat()
        return {
            "bytes": raw,
            "width": 640,
            "height": 480,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "source_kind": self.source_kind,
            "captured_at": self.last_capture_at,
        }

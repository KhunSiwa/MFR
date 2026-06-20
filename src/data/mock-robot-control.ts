import { db } from "@/data/api";
import { robotPlatform, robotTwin } from "@/data/robot-platform";
import { defectTypeLabel, elevationLabel, zoneNameLabel } from "@/lib/utils";

export type RobotCommand = "FORWARD" | "BACKWARD" | "TURN_LEFT" | "TURN_RIGHT" | "STOP";

export type RobotSystemStatus = "Idle" | "Moving" | "Cleaning" | "Inspecting" | "Charging";

export type CameraFrame = {
  id: string;
  imageUrl: string;
  timestamp: string;
  robotStatus: RobotSystemStatus;
  batteryStatus: number;
  position: string;
};

export type TelemetrySample = {
  timestamp: string;
  positionX: number;
  positionY: number;
  battery: number;
  speed: number;
  temperature: number;
  missionStatus: RobotSystemStatus;
};

export type GalleryImage = {
  id: string;
  imageUrl: string;
  captureTime: string;
  robotPosition: string;
  inspectionType: string;
  aiDetectionStatus: "Clear" | "Detected" | "Review Required";
  detectionCount: number;
};

const statuses: RobotSystemStatus[] = ["Idle", "Moving", "Cleaning", "Inspecting", "Charging"];
const inspectionTypes = ["สแกนรอยแตกร้าวผิวอาคาร", "ตรวจซิลิโคน", "สำรวจความร้อน", "ตรวจคราบสกปรกบนพื้นผิว"];

function robotStatusLabel(status: RobotSystemStatus) {
  const labels: Record<RobotSystemStatus, string> = {
    Idle: "พักระบบ",
    Moving: "เคลื่อนที่",
    Cleaning: "ทำความสะอาด",
    Inspecting: "ตรวจสอบ",
    Charging: "ชาร์จ",
  };

  return labels[status];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function phase(seed = Date.now()) {
  return Math.floor(seed / 1000);
}

export function getRobotStatus(seed = Date.now()) {
  const p = phase(seed);
  const battery = clamp(robotTwin.batteryStatus - (p % 9) + 4, 18, 100);

  return {
    batteryLevel: battery,
    signalStrength: clamp(robotTwin.networkSignal + ((p % 7) - 3), 35, 100),
    currentSpeed: Number((0.28 + (p % 6) * 0.06).toFixed(2)),
    currentModule: robotPlatform.installedModule,
    systemStatus: statuses[p % statuses.length],
  };
}

export function getTelemetry(seed = Date.now()): TelemetrySample {
  const p = phase(seed);
  return {
    timestamp: new Date(seed).toISOString(),
    positionX: Number((robotTwin.coordinates.x + Math.sin(p / 3) * 4.8).toFixed(2)),
    positionY: Number((robotTwin.coordinates.y + Math.cos(p / 4) * 3.6).toFixed(2)),
    battery: getRobotStatus(seed).batteryLevel,
    speed: Number((0.18 + Math.abs(Math.sin(p / 5)) * 0.58).toFixed(2)),
    temperature: Number((37.4 + Math.sin(p / 6) * 3.2).toFixed(1)),
    missionStatus: statuses[(p + 2) % statuses.length],
  };
}

export function makeCameraFrame(index = 0, seed = Date.now()): CameraFrame {
  const p = phase(seed) - index;
  const zone = db.facadeZones[Math.abs(p) % db.facadeZones.length];
  const status = statuses[Math.abs(p + 3) % statuses.length];
  const statusLabel = robotStatusLabel(status);
  const battery = clamp(getRobotStatus(seed - index * 1000).batteryLevel, 10, 100);
  const timestamp = new Date(seed - index * 1000).toISOString();
  const crackX = 28 + (Math.abs(p) % 35);
  const markerY = 24 + (Math.abs(p * 3) % 34);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#0f172a"/>
          <stop offset="0.55" stop-color="#164e63"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer><feFuncA type="table" tableValues="0 0.13"/></feComponentTransfer>
        </filter>
      </defs>
      <rect width="1280" height="720" fill="url(#sky)"/>
      <rect width="1280" height="720" fill="#020617" opacity="0.18" filter="url(#noise)"/>
      <g opacity="0.9">
        ${Array.from({ length: 12 })
          .map((_, i) => `<rect x="${90 + i * 92}" y="70" width="62" height="585" rx="3" fill="${i % 2 ? "#1e293b" : "#263449"}" opacity="0.86"/>`)
          .join("")}
        ${Array.from({ length: 9 })
          .map((_, y) => `<line x1="70" x2="1210" y1="${108 + y * 62}" y2="${108 + y * 62}" stroke="#94a3b8" stroke-opacity="0.22" stroke-width="2"/>`)
          .join("")}
      </g>
      <g>
        <path d="M${crackX * 12} ${markerY * 7} l22 34 l-14 28 l30 42 l-20 31" fill="none" stroke="#fb7185" stroke-width="8" stroke-linecap="round"/>
        <circle cx="${crackX * 12 + 8}" cy="${markerY * 7 + 72}" r="62" fill="none" stroke="#22d3ee" stroke-width="4" stroke-dasharray="14 12"/>
        <rect x="${crackX * 12 - 70}" y="${markerY * 7 - 40}" width="210" height="34" rx="4" fill="#020617" opacity="0.72"/>
        <text x="${crackX * 12 - 58}" y="${markerY * 7 - 17}" fill="#e0f2fe" font-family="Arial" font-size="20" font-weight="700">AI ROI ${String(Math.abs(p) % 100).padStart(2, "0")}</text>
      </g>
      <g font-family="Arial" fill="#e2e8f0">
        <text x="42" y="54" font-size="26" font-weight="700">ภาพกล้อง VSRP</text>
        <text x="42" y="92" font-size="18" fill="#67e8f9">${zone.name} / ${zone.floorRange}</text>
        <text x="42" y="674" font-size="18" fill="#cbd5e1">แบต ${battery}%  สัญญาณ ${getRobotStatus(seed).signalStrength}%  โหมด ${statusLabel}</text>
        <text x="966" y="54" font-size="18" fill="#cbd5e1">${timestamp}</text>
      </g>
      <g stroke="#22d3ee" stroke-width="3" opacity="0.9">
        <path d="M610 344 h60 M640 314 v60"/>
        <path d="M55 55 h80 M55 55 v80 M1225 55 h-80 M1225 55 v80 M55 665 h80 M55 665 v-80 M1225 665 h-80 M1225 665 v-80"/>
      </g>
    </svg>`;

  return {
    id: `CAM-${Math.abs(p).toString().padStart(6, "0")}`,
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    timestamp,
    robotStatus: status,
    batteryStatus: battery,
    position: `${zoneNameLabel(zone.name)} ${zone.floorRange}`,
  };
}

export function getCameraStream() {
  const now = Date.now();
  return {
    latest: makeCameraFrame(0, now),
    history: Array.from({ length: 8 }, (_, index) => makeCameraFrame(index, now)),
    roadmap: ["สตรีมผ่าน WebSocket", "สตรีมผ่าน RTSP", "เชื่อมต่อ ESP32-CAM"],
  };
}

export function getGalleryImages(): GalleryImage[] {
  return db.inspectionImages.map((image, index) => {
    const zone = db.facadeZones.find((item) => item.id === image.zoneId) ?? db.facadeZones[0];
    const detectionCount = image.detections.length;
    return {
      id: image.id,
      imageUrl: makeCameraFrame(index, new Date(image.capturedAt).getTime()).imageUrl,
      captureTime: image.capturedAt,
      robotPosition: `${elevationLabel(zone.elevation)} ${zone.floorRange}`,
      inspectionType: inspectionTypes[index % inspectionTypes.length],
      aiDetectionStatus: detectionCount === 0 ? "Clear" : detectionCount > 1 ? "Review Required" : "Detected",
      detectionCount,
    };
  });
}

export function describeDetections(imageId: string) {
  const image = db.inspectionImages.find((item) => item.id === imageId);
  if (!image || image.detections.length === 0) return "ไม่พบตำหนิจาก AI";
  return image.detections.map((detection) => defectTypeLabel(detection.type)).join(", ");
}

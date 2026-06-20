import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function riskTone(score: number) {
  if (score >= 82) return "good";
  if (score >= 68) return "warning";
  if (score >= 52) return "elevated";
  return "critical";
}

export function riskLabel(score: number) {
  const tone = riskTone(score);
  return tone === "good" ? "ดี" : tone === "warning" ? "เฝ้าระวัง" : tone === "elevated" ? "เสี่ยงสูง" : "วิกฤต";
}

export function defectColor(type: string) {
  const colors: Record<string, string> = {
    Crack: "#ef4444",
    Rust: "#f97316",
    "Water Stain": "#06b6d4",
    "Water Leak": "#06b6d4",
    "Silicone Damage": "#a855f7",
    "Silicone Deterioration": "#a855f7",
    "Dirt Accumulation": "#78716c",
  };

  return colors[type] ?? "#64748b";
}

export function defectTypeLabel(type: string) {
  const labels: Record<string, string> = {
    Crack: "รอยแตกร้าว",
    Rust: "สนิม",
    "Water Stain": "คราบน้ำ",
    "Water Leak": "น้ำรั่วซึม",
    "Silicone Damage": "ซิลิโคนเสียหาย",
    "Silicone Deterioration": "ซิลิโคนเสื่อมสภาพ",
    "Dirt Accumulation": "สิ่งสกปรกสะสม",
  };

  return labels[type] ?? type;
}

export function severityLabel(severity: string) {
  const labels: Record<string, string> = {
    Low: "ต่ำ",
    Medium: "ปานกลาง",
    High: "สูง",
    Critical: "วิกฤต",
  };

  return labels[severity] ?? severity;
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    New: "รายการใหม่",
    Monitoring: "ติดตามผล",
    "Repair Scheduled": "นัดซ่อมแล้ว",
    Fixed: "แก้ไขแล้ว",
  };

  return labels[status] ?? status;
}

export function elevationLabel(elevation: string) {
  const labels: Record<string, string> = {
    North: "ทิศเหนือ",
    East: "ทิศตะวันออก",
    South: "ทิศใต้",
    West: "ทิศตะวันตก",
  };

  return labels[elevation] ?? elevation;
}

export function zoneNameLabel(name: string) {
  const labels: Record<string, string> = {
    "North Podium": "โพเดียมทิศเหนือ",
    "North Mid Rise": "ช่วงกลางทิศเหนือ",
    "North Crown": "ยอดอาคารทิศเหนือ",
    "East Podium": "โพเดียมทิศตะวันออก",
    "East Atrium": "เอเทรียมทิศตะวันออก",
    "East Crown": "ยอดอาคารทิศตะวันออก",
    "South Podium": "โพเดียมทิศใต้",
    "South Solar Face": "ผิวอาคารรับแดดทิศใต้",
    "West Sky Lobby": "สกายล็อบบี้ทิศตะวันตก",
    "West Crown": "ยอดอาคารทิศตะวันตก",
  };

  return labels[name] ?? name;
}

export function locationLabel(location: string) {
  return location
    .replaceAll("North Podium", "โพเดียมทิศเหนือ")
    .replaceAll("North Mid Rise", "ช่วงกลางทิศเหนือ")
    .replaceAll("North Crown", "ยอดอาคารทิศเหนือ")
    .replaceAll("East Podium", "โพเดียมทิศตะวันออก")
    .replaceAll("East Atrium", "เอเทรียมทิศตะวันออก")
    .replaceAll("East Crown", "ยอดอาคารทิศตะวันออก")
    .replaceAll("South Podium", "โพเดียมทิศใต้")
    .replaceAll("South Solar Face", "ผิวอาคารรับแดดทิศใต้")
    .replaceAll("West Sky Lobby", "สกายล็อบบี้ทิศตะวันตก")
    .replaceAll("West Crown", "ยอดอาคารทิศตะวันตก")
    .replaceAll("head joint", "รอยต่อหัวแผง")
    .replaceAll("vertical joint", "รอยต่อแนวตั้ง")
    .replaceAll("panel", "แผงกระจก")
    .replaceAll("bracket", "ขายึด")
    .replaceAll("joint", "รอยต่อ")
    .replaceAll("rail", "ราง")
    .replaceAll("sill", "ธรณีแผง")
    .replaceAll("latch", "ตัวล็อก")
    .replaceAll("bay", "ช่องแผง");
}

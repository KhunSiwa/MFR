import database from "./database.json";
import type { Database, DefectType } from "@/lib/types";

export const db = database as Database;

export function getInspectionSummary() {
  return {
    totalInspectedAreas: db.inspectionHistory.at(-1)?.areasInspected ?? 0,
    totalCracks: db.defects.filter((defect) => defect.type === "Crack").length,
    totalRust: db.defects.filter((defect) => defect.type === "Rust").length,
    totalWaterStains: db.defects.filter((defect) =>
      ["Water Stain", "Water Leak"].includes(defect.type),
    ).length,
    totalSiliconeIssues: db.defects.filter((defect) =>
      ["Silicone Damage", "Silicone Deterioration"].includes(defect.type),
    ).length,
  };
}

export function getDefectDistribution() {
  const types: DefectType[] = [
    "Crack",
    "Rust",
    "Water Stain",
    "Water Leak",
    "Silicone Damage",
    "Silicone Deterioration",
    "Dirt Accumulation",
  ];

  return types.map((type) => ({
    type,
    count: db.defects.filter((defect) => defect.type === type).length,
  }));
}

export function getHighRiskZones() {
  return [...db.facadeZones]
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 4);
}

export function getReportData() {
  return {
    building: db.building,
    summary: getInspectionSummary(),
    highRiskZones: getHighRiskZones(),
    criticalDefects: db.defects.filter((defect) =>
      ["High", "Critical"].includes(defect.severity),
    ),
    images: db.inspectionImages.filter((image) => image.detections.length > 0).slice(0, 6),
    recommendations: [
      "ให้ความสำคัญกับการเปลี่ยนซิลิโคนบริเวณยอดอาคารทิศตะวันตกก่อนรอบฝนถัดไป",
      "นัดตรวจยืนยันรอยแตกร้าวระดับวิกฤตเหนือชั้น 30 ด้วยทีมโรยตัว",
      "ซ่อมจุดสนิมที่เปิดเผยและตรวจสอบทางระบายน้ำบนผนังทิศใต้",
      "เพิ่มความถี่การติดตามด้วยหุ่นยนต์สำหรับโซนที่มีคะแนนต่ำกว่า 65",
    ],
  };
}

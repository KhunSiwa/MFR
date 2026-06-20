import { NextResponse } from "next/server";
import { db, getHighRiskZones, getInspectionSummary } from "@/data/api";
import { robotModules, robotPlatform, robotTwin } from "@/data/robot-platform";
import { moduleStatusLabel } from "@/lib/robot-labels";

type ChatRequest = {
  message?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ChatRequest;
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json(
      { reply: "พิมพ์คำถามเกี่ยวกับ M.F.R. สถานะอาคาร การตรวจสอบด้วย AI โมดูล หรือการบำรุงรักษาได้เลยครับ" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    reply: buildAiReply(message),
    generatedAt: new Date().toISOString(),
  });
}

function buildAiReply(message: string) {
  const input = message.toLowerCase();
  const summary = getInspectionSummary();
  const highRiskZones = getHighRiskZones();
  const criticalDefects = db.defects.filter((defect) => ["High", "Critical"].includes(defect.severity));

  if (matches(input, ["สรุป", "summary", "ภาพรวม", "dashboard", "แดชบอร์ด"])) {
    return [
      `สรุปภาพรวม M.F.R. ตอนนี้: อาคาร ${db.building.name} มีคะแนนสุขภาพผิวอาคาร ${db.building.healthScore}/100 ระดับความเสี่ยง ${db.building.riskLevel}`,
      `พื้นที่ที่ตรวจล่าสุด ${summary.totalInspectedAreas} จุด พบรอยแตกร้าว ${summary.totalCracks} รายการ สนิม ${summary.totalRust} รายการ คราบน้ำ/รอยรั่ว ${summary.totalWaterStains} รายการ และปัญหาซิลิโคน ${summary.totalSiliconeIssues} รายการ`,
      `คำแนะนำหลัก: โฟกัสโซนคะแนนต่ำก่อน โดยเฉพาะ ${highRiskZones.map((zone) => zone.id).join(", ")}.`,
    ].join("\n\n");
  }

  if (matches(input, ["เสี่ยง", "risk", "critical", "อันตราย", "โซน"])) {
    return [
      `โซนที่ควรเฝ้าระวังที่สุดคือ ${highRiskZones[0]?.id} คะแนน ${highRiskZones[0]?.healthScore}/100.`,
      `โซนเสี่ยงสูง: ${highRiskZones.map((zone) => `${zone.id} (${zone.healthScore})`).join(", ")}`,
      `มีตำหนิระดับ High/Critical ทั้งหมด ${criticalDefects.length} รายการ ควรจัดลำดับซ่อมตามความรุนแรงและตำแหน่งบนผิวอาคาร`,
    ].join("\n\n");
  }

  if (matches(input, ["แตก", "crack", "ร้าว"])) {
    const cracks = db.defects.filter((defect) => defect.type === "Crack");
    return `ตรวจพบรอยแตกร้าว ${cracks.length} รายการ โดยควรตรวจยืนยันรายการ severity สูงก่อน: ${cracks
      .slice(0, 3)
      .map((defect) => `${defect.id} ที่ ${defect.location} (${defect.severity}, ความมั่นใจ ${Math.round(defect.confidence * 100)}%)`)
      .join("; ")}.`;
  }

  if (matches(input, ["สนิม", "corrosion", "rust"])) {
    const rust = db.defects.filter((defect) => defect.type === "Rust");
    return `พบสนิม ${rust.length} รายการ แนะนำทำความสะอาดผิว เคลือบป้องกัน และตรวจซ้ำด้วยโมดูลตรวจสอบหลังซ่อม จุดตัวอย่าง: ${rust
      .slice(0, 3)
      .map((defect) => `${defect.id} ${defect.location}`)
      .join(", ")}.`;
  }

  if (matches(input, ["ซิลิโคน", "silicone", "sealant"])) {
    const silicone = db.defects.filter((defect) => defect.type.includes("Silicone"));
    return `พบปัญหาซิลิโคน ${silicone.length} รายการ ควรเร่งดูจุดที่มีความเสี่ยงน้ำรั่วซึม โดยเฉพาะรายการความรุนแรงสูง และตั้งภารกิจตรวจซ้ำหลังซ่อม`;
  }

  if (matches(input, ["module", "โมดูล", "cleaning", "solar", "inspection"])) {
    return [
      `แพลตฟอร์มตอนนี้ติดตั้งโมดูล ${robotPlatform.installedModule}.`,
      `มีโมดูลทั้งหมด ${robotModules.length} รายการ: ${robotModules.map((module) => `${module.name} (${moduleStatusLabel(module.status)})`).join(", ")}`,
      "แนวคิดหลักคือใช้ฐานหุ่นยนต์เดียว แล้วเปลี่ยนโมดูลสำหรับทำความสะอาดกระจก ทำความสะอาดแผงโซลาร์ ตรวจรอยแตกร้าว ตรวจซิลิโคน ตรวจสนิม และตรวจสภาพพื้นผิว",
    ].join("\n\n");
  }

  if (matches(input, ["battery", "แบต", "telemetry", "ตำแหน่ง", "robot", "หุ่นยนต์"])) {
    return [
      `Telemetry ล่าสุดของหุ่นยนต์: ตำแหน่ง ${robotTwin.position}, ชั้น ${robotTwin.coordinates.floor}, แบตเตอรี่ ${robotTwin.batteryStatus}%, แรงยึดเกาะ ${robotTwin.adhesionForce}N, สัญญาณเครือข่าย ${robotTwin.networkSignal}%`,
      `สถานะแพลตฟอร์ม: ${robotPlatform.fleetStatus}. ภารกิจปัจจุบัน: ${robotTwin.currentMission}`,
    ].join("\n\n");
  }

  if (matches(input, ["แนะนำ", "recommend", "maintenance", "ซ่อม", "บำรุง"])) {
    return [
      "คำแนะนำการบำรุงรักษา:",
      "1. จัดการตำหนิระดับ High/Critical ก่อน โดยเฉพาะรอยแตกร้าวและปัญหาซิลิโคนที่เสี่ยงน้ำรั่ว",
      `2. ตรวจซ้ำโซนคะแนนต่ำ: ${highRiskZones.map((zone) => zone.id).join(", ")}.`,
      "3. ใช้โมดูลทำความสะอาดเพื่อลดคราบสะสม แล้วสแกนซ้ำเพื่อวัดคะแนนสุขภาพหลังทำความสะอาด",
      "4. สร้างรายงานสำหรับเจ้าของอาคารพร้อมหลักฐานภาพก่อน/หลัง",
    ].join("\n");
  }

  return [
    "ผมเป็นผู้ช่วย AI ของ M.F.R. สำหรับช่วยอ่านข้อมูลระบบหุ่นยนต์ผิวอาคารครับ",
    "ถามได้เช่น:",
    "- สรุปแดชบอร์ดตอนนี้",
    "- โซนไหนเสี่ยงที่สุด",
    "- พบรอยแตกร้าวกี่จุด",
    "- แนะนำการบำรุงรักษา",
    "- สถานะหุ่นยนต์ / telemetry",
    "- โมดูลไหนใช้งานอยู่",
  ].join("\n");
}

function matches(input: string, keywords: string[]) {
  return keywords.some((keyword) => input.includes(keyword));
}

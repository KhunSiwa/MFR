import {
  Activity,
  AlertTriangle,
  BatteryMedium,
  Bot,
  BrainCircuit,
  Camera,
  FileText,
  Gauge,
  Home,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { db, getHighRiskZones, getInspectionSummary } from "@/data/api";
import { robotPlatform, robotTwin } from "@/data/robot-platform";

export const coreNavigation = [
  { href: "/home", label: "หน้าแรก", icon: Home },
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/robot", label: "หุ่นยนต์", icon: Bot },
  { href: "/inspection", label: "ตรวจสอบ", icon: Camera },
  { href: "/ai-analysis", label: "วิเคราะห์ AI", icon: BrainCircuit },
  { href: "/reports", label: "รายงาน", icon: FileText },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export const summary = getInspectionSummary();
export const highRiskZones = getHighRiskZones();

export const mvpMetrics = {
  surfaceHealth: db.building.healthScore,
  riskLevel: db.building.riskLevel,
  crackCount: summary.totalCracks,
  corrosionCount: summary.totalRust,
  battery: robotTwin.batteryStatus,
  robotStatus: robotPlatform.fleetStatus,
  currentMission: robotTwin.currentMission,
  currentModule: robotTwin.currentModule,
  location: robotTwin.position,
  latestAlert: highRiskZones[0],
};

export const homeKpis = [
  { label: "สถานะหุ่นยนต์", value: mvpMetrics.robotStatus, icon: Bot, tone: "cyan" },
  { label: "คะแนนสุขภาพผิวอาคาร", value: `${mvpMetrics.surfaceHealth}/100`, icon: ShieldCheck, tone: "emerald" },
  { label: "ภารกิจวันนี้", value: mvpMetrics.currentMission, icon: Activity, tone: "blue" },
  { label: "แจ้งเตือนล่าสุด", value: `${mvpMetrics.latestAlert.id} คะแนน ${mvpMetrics.latestAlert.healthScore}`, icon: AlertTriangle, tone: "amber" },
];

export const dashboardKpis = [
  { label: "จำนวนรอยแตกร้าว", value: mvpMetrics.crackCount, icon: AlertTriangle, tone: "rose" },
  { label: "จำนวนสนิม", value: mvpMetrics.corrosionCount, icon: Wrench, tone: "amber" },
  { label: "แบตเตอรี่", value: `${mvpMetrics.battery}%`, icon: BatteryMedium, tone: "cyan" },
  { label: "การใช้งานหุ่นยนต์", value: "78%", icon: Gauge, tone: "blue" },
];

export const aiRecommendations = [
  "จัดลำดับโซนผิวอาคารที่คะแนนต่ำกว่า 70 ให้ตรวจซ้ำก่อนรอบฝนถัดไป",
  "วางแผนตรวจซิลิโคนบริเวณผนังทิศเหนือและทิศตะวันตกของอาคารสูง",
  "ใช้โมดูลทำความสะอาดก่อนสแกนซ้ำ เพื่อแยกคราบสกปรกออกจากความเสียหายจริง",
  "ส่งออกรายงานสำหรับเจ้าของอาคารหลังดำเนินการบำรุงรักษาเสร็จ",
];

export const settingGroups = [
  "โหมดมืด",
  "การแจ้งเตือน",
  "ตั้งค่าหุ่นยนต์",
  "บัญชี",
  "ธีม",
  "ภาษา",
  "ระบบ",
];

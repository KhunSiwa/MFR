import { PageHeader } from "@/components/layout/page-header";
import { WorkPlanningConsole } from "@/components/work-planning/work-planning-console";

export default function WorkPlanningPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MFR · 3D Inspection & Mission Planner"
        title="การวางแผนการทำงาน"
        description="เชื่อมต่อกล้อง USB · วิเคราะห์ตำหนิด้วย AI 06 · ระบุพิกัดบนอาคาร 3 มิติ · จัดการแผนงานตรวจสอบและทำความสะอาดอย่างปลอดภัย"
      />
      <WorkPlanningConsole />
    </div>
  );
}

import { MissionTable } from "@/components/robot/mission-table";
import { PageHeader } from "@/components/layout/page-header";

export default function MissionsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Mission Management"
        title="ระบบจัดการภารกิจของหุ่นยนต์"
        description="วางแผนและติดตามภารกิจทำความสะอาด ตรวจสอบ สำรวจความร้อน และแสดงประกาศ พร้อมผลลัพธ์และรายงานที่สร้างจากแต่ละโมดูล"
      />
      <MissionTable />
    </div>
  );
}

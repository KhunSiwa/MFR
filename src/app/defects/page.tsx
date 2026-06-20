import { DefectTable } from "@/components/defects/defect-table";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/data/api";

export default function DefectsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="การจัดการตำหนิ"
        title="ตำหนิบนผิวอาคารที่ตรวจพบ"
        description="กรอง ติดตาม และวางแผนซ่อมตำหนิบนผนังอาคารที่ AI ยืนยันแล้ว"
      />
      <DefectTable defects={db.defects} />
    </div>
  );
}

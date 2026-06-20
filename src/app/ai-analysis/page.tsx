import { AnalysisPanel } from "@/components/ai/analysis-panel";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/data/api";

export default function AiAnalysisPage() {
  return (
    <div>
      <PageHeader
        eyebrow="การวิเคราะห์ด้วย AI"
        title="ตรวจสอบผลจากกล้องหุ่นยนต์"
        description="เปรียบเทียบภาพต้นฉบับกับภาพที่มีกรอบตรวจจับ พร้อมคะแนนความมั่นใจสำหรับรอยแตกร้าว สนิม น้ำรั่วซึม และซิลิโคนเสียหาย"
      />
      <AnalysisPanel images={db.inspectionImages} />
    </div>
  );
}

import { HealthTrendChart } from "@/components/charts/inspection-charts";
import { HistoryTimeline } from "@/components/history/history-timeline";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/data/api";

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ประวัติการตรวจ"
        title="ไทม์ไลน์การตรวจผนังอาคาร"
        description="ติดตามวันที่ตรวจ พื้นที่ที่ตรวจ จำนวนตำหนิ และการเปลี่ยนแปลงของคะแนนสุขภาพในแต่ละรอบสแกนของหุ่นยนต์"
      />
      <Card>
        <CardHeader>
          <CardTitle>แนวโน้มคะแนนสุขภาพ</CardTitle>
          <CardDescription>คะแนนสภาพผิวอาคารลดลงตามอายุการใช้งานของโซนที่รับสภาพอากาศหนัก</CardDescription>
        </CardHeader>
        <CardContent>
          <HealthTrendChart data={db.inspectionHistory} />
        </CardContent>
      </Card>
      <HistoryTimeline history={db.inspectionHistory} />
    </div>
  );
}

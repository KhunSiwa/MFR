import { BatteryMedium, Gauge, LineChart } from "lucide-react";
import { DefectDistributionChart, HealthTrendChart } from "@/components/charts/inspection-charts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartCard, StatCard } from "@/features/mfr/components/cards";
import { dashboardKpis } from "@/features/mfr/constants";
import { db, getDefectDistribution } from "@/data/api";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="การวิเคราะห์"
        title="แดชบอร์ด"
        description="สรุปสุขภาพผิวอาคารแบบสะอาดและอ่านง่าย: แนวโน้ม ตำหนิ ประวัติตรวจสอบ การใช้งาน และแบตเตอรี่"
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((item) => <StatCard key={item.label} {...item} />)}
      </div>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="แนวโน้มสุขภาพผิวอาคาร" description="การเปลี่ยนแปลงคะแนนสุขภาพผิวอาคารย้อนหลัง 6 เดือน">
          <HealthTrendChart data={db.inspectionHistory} />
        </ChartCard>
        <ChartCard title="ประวัติการตรวจสอบ" description="สัดส่วนตำหนิที่ AI จำแนกจากภาพตรวจสอบ">
          <DefectDistributionChart data={getDefectDistribution()} />
        </ChartCard>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <MetricPanel title="การใช้งานหุ่นยนต์" icon={LineChart} value="78" suffix="%" />
        <MetricPanel title="แบตเตอรี่" icon={BatteryMedium} value="87" suffix="%" />
        <MetricPanel title="ความมั่นใจของ AI" icon={Gauge} value="96" suffix="%" />
      </section>
    </div>
  );
}

function MetricPanel({ title, icon: Icon, value, suffix }: { title: string; icon: React.ElementType; value: string; suffix: string }) {
  const numeric = Number(value);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>ตัวชี้วัดการปฏิบัติงาน</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-5xl font-semibold tracking-tight">{value}{suffix}</div>
        <Progress value={numeric} className="mt-5" />
      </CardContent>
    </Card>
  );
}

import { Activity, AlertTriangle, Droplets, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { DefectDistributionChart, HealthTrendChart } from "@/components/charts/inspection-charts";
import { HealthGauge } from "@/components/charts/health-gauge";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SurfaceHealthMap } from "@/components/facade/surface-health-map";
import { PlatformOverview } from "@/components/robot/platform-overview";
import { db, getDefectDistribution, getInspectionSummary } from "@/data/api";
import { robotModules, robotPlatform } from "@/data/robot-platform";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const summary = getInspectionSummary();
  const distribution = getDefectDistribution();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="อาคารออเรเลียทาวเวอร์"
        title="Vertical Surface Robot Platform"
        description="ระบบปฏิบัติการหุ่นยนต์ผิวอาคารแนวตั้งแบบโมดูลาร์ ใช้หน่วยหุ่นยนต์ฐานเดียวร่วมกับโมดูลทำความสะอาด ตรวจสอบ สำรวจความร้อน และแสดงประกาศบนอาคาร"
      />

      <section className="grid gap-5 xl:grid-cols-4">
        <MetricCard icon={Activity} label="สถานะแพลตฟอร์ม" value={robotPlatform.fleetStatus} tone="cyan" />
        <MetricCard icon={ShieldCheck} label="โมดูลที่ติดตั้ง" value={robotPlatform.installedModule} tone="violet" />
        <MetricCard icon={Wrench} label="โมดูลทั้งหมด" value={`${robotModules.length} โมดูล`} tone="orange" />
        <MetricCard icon={Droplets} label="บำรุงรักษาล่าสุด" value={formatDate(robotPlatform.lastMaintenanceDate)} tone="sky" />
      </section>

      <PlatformOverview />

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>คะแนนสุขภาพอาคาร</CardTitle>
            <CardDescription>สแกนล่าสุดโดยหุ่นยนต์เสร็จสิ้นเมื่อ {formatDate(db.building.lastInspectionDate)}</CardDescription>
          </CardHeader>
          <CardContent>
            <HealthGauge score={db.building.healthScore} />
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard icon={Activity} label="พื้นที่ที่ตรวจแล้วทั้งหมด" value={summary.totalInspectedAreas} tone="cyan" />
          <MetricCard icon={AlertTriangle} label="รอยแตกร้าวที่พบทั้งหมด" value={summary.totalCracks} tone="red" />
          <MetricCard icon={Wrench} label="จุดสนิมทั้งหมด" value={summary.totalRust} tone="orange" />
          <MetricCard icon={Droplets} label="คราบน้ำทั้งหมด" value={summary.totalWaterStains} tone="sky" />
          <MetricCard icon={ShieldCheck} label="ปัญหาซิลิโคนทั้งหมด" value={summary.totalSiliconeIssues} tone="violet" />
          <Card>
            <CardHeader>
              <CardTitle>ระดับความเสี่ยง</CardTitle>
              <CardDescription>เขียว = ดี, เหลือง = เฝ้าระวัง, แดง = วิกฤต</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Badge tone="warning" className="text-sm">เฝ้าระวัง</Badge>
              <Sparkles className="h-8 w-8 text-yellow-500" />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>แนวโน้มคะแนนสุขภาพ</CardTitle>
            <CardDescription>แนวโน้มสภาพผิวอาคารย้อนหลัง 6 เดือน</CardDescription>
          </CardHeader>
          <CardContent>
            <HealthTrendChart data={db.inspectionHistory} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>สัดส่วนประเภทตำหนิ</CardTitle>
            <CardDescription>จำนวนปัญหาที่ AI จำแนกจากการตรวจครั้งล่าสุด</CardDescription>
          </CardHeader>
          <CardContent>
            <DefectDistributionChart data={distribution} />
          </CardContent>
        </Card>
      </section>

      <section id="surface-map" className="scroll-mt-28">
        <PageHeader
          title="แผนที่สุขภาพผิวอาคาร"
          description="คลิกแต่ละโซนเพื่อดูคะแนนสุขภาพ จำนวนรอยแตกร้าว จำนวนสนิม และวันที่ตรวจล่าสุด"
        />
        <SurfaceHealthMap zones={db.facadeZones} />
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  tone: "cyan" | "red" | "orange" | "sky" | "violet";
}) {
  const colors = {
    cyan: "text-cyan-600 bg-cyan-100 dark:bg-cyan-950",
    red: "text-red-600 bg-red-100 dark:bg-red-950",
    orange: "text-orange-600 bg-orange-100 dark:bg-orange-950",
    sky: "text-sky-600 bg-sky-100 dark:bg-sky-950",
    violet: "text-violet-600 bg-violet-100 dark:bg-violet-950",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span className={`flex h-10 w-10 items-center justify-center rounded-md ${colors[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

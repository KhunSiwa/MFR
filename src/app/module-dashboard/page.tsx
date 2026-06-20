import { CalendarClock, Gauge, HeartPulse, PackageCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { robotModules, robotPlatform } from "@/data/robot-platform";
import { formatDate } from "@/lib/utils";
import { moduleStatusLabel, moduleTypeLabel, statusTone } from "@/lib/robot-labels";

export default function ModuleDashboardPage() {
  const installed = robotModules.find((module) => module.status === "Installed") ?? robotModules[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module Dashboard"
        title="แดชบอร์ดโมดูลที่ติดตั้ง"
        description="ติดตามโมดูลที่กำลังใช้งาน ประสิทธิภาพ สุขภาพโมดูล และการบำรุงรักษาล่าสุดของแพลตฟอร์มหุ่นยนต์"
      />

      <section className="grid gap-5 lg:grid-cols-4">
        <Metric icon={PackageCheck} label="โมดูลที่ติดตั้ง" value={installed.name} />
        <Metric icon={Gauge} label="ประสิทธิภาพโมดูล" value={`${installed.performance}%`} />
        <Metric icon={HeartPulse} label="สุขภาพโมดูล" value={`${installed.healthStatus}%`} />
        <Metric icon={CalendarClock} label="บำรุงรักษาล่าสุด" value={formatDate(installed.lastMaintenanceDate)} />
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{installed.name}</CardTitle>
              <CardDescription>{moduleTypeLabel(installed.type)} บนหุ่นยนต์ {robotPlatform.robotId}</CardDescription>
            </div>
            <Badge tone={statusTone(installed.status)}>{moduleStatusLabel(installed.status)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <Score label="ประสิทธิภาพการทำงาน" value={installed.performance} />
            <Score label="สุขภาพระบบโมดูล" value={installed.healthStatus} />
            <Score label="ความพร้อมในการสร้างรายงาน" value={94} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <List title="ฟังก์ชันที่เปิดใช้งาน" items={installed.functions} />
            <List title="ผลลัพธ์ที่ส่งกลับระบบ" items={installed.outputs} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

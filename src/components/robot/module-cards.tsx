import { CalendarDays, Layers3, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { robotModules } from "@/data/robot-platform";
import { formatDate } from "@/lib/utils";
import { moduleStatusLabel, moduleTypeLabel, statusTone } from "@/lib/robot-labels";

export function ModuleCards() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {robotModules.map((module) => (
        <Card key={module.id}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{module.name}</CardTitle>
                <CardDescription>{moduleTypeLabel(module.type)} · {module.id}</CardDescription>
              </div>
              <Badge tone={statusTone(module.status)}>{moduleStatusLabel(module.status)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Info icon={CalendarDays} label="วันที่ติดตั้ง" value={formatDate(module.installationDate)} />
              <Info icon={ShieldCheck} label="สุขภาพชุดปฏิบัติการ" value={`${module.healthStatus}%`} />
              <Info icon={Layers3} label="ความเข้ากันได้" value={module.compatibility.join(", ")} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">ประสิทธิภาพชุดปฏิบัติการ</span>
                <span className="font-semibold">{module.performance}%</span>
              </div>
              <Progress value={module.performance} />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <List title="ฟังก์ชัน" items={module.functions} />
              <List title="ผลลัพธ์" items={module.outputs} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <Icon className="h-4 w-4 text-cyan-500" />
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
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

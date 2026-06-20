import { Battery, Cpu, Magnet, Radio, Settings2, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { robotPlatform } from "@/data/robot-platform";
import { statusTone } from "@/lib/robot-labels";
import { Badge } from "@/components/ui/badge";

const icons = [Settings2, Magnet, Battery, Video, Cpu, Radio];

export function PlatformOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>สถาปัตยกรรมหุ่นยนต์ฐาน</CardTitle>
        <CardDescription>
          หน่วยหุ่นยนต์หลักรองรับโมดูลสลับได้หลายประเภทสำหรับงานทำความสะอาด ตรวจสอบ สำรวจความร้อน และสื่อสารบนผิวอาคารแนวตั้ง
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {robotPlatform.coreSystems.map((system, index) => {
          const Icon = icons[index] ?? Settings2;

          return (
            <div key={system.name} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
                  <Icon className="h-5 w-5" />
                </span>
                <Badge tone={statusTone(system.status)}>{system.status === "Operational" ? "ปกติ" : system.status === "Warning" ? "เฝ้าระวัง" : "บำรุงรักษา"}</Badge>
              </div>
              <div className="mt-4 font-semibold">{system.name}</div>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500 dark:text-slate-400">{system.details}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">สุขภาพระบบ</span>
                <span className="font-semibold">{system.health}%</span>
              </div>
              <Progress value={system.health} className="mt-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

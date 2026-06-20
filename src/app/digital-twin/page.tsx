import { Battery, Crosshair, MapPinned, Radio, Route, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { robotTwin } from "@/data/robot-platform";

export default function DigitalTwinPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Robot Digital Twin"
        title="ดิจิทัลทวินของหุ่นยนต์บนผิวอาคาร"
        description="ติดตามตำแหน่ง โมดูลปัจจุบัน แบตเตอรี่ ข้อมูลสุขภาพผิวอาคาร และภารกิจที่กำลังทำงานแบบ operational view"
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>ตำแหน่งหุ่นยนต์แบบเรียลไทม์</CardTitle>
            <CardDescription>{robotTwin.position}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative min-h-[520px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid h-[480px] grid-cols-5 gap-2">
                {Array.from({ length: 25 }).map((_, index) => (
                  <div key={index} className="rounded-md border border-white/70 bg-white/70 dark:border-slate-800 dark:bg-slate-950/70" />
                ))}
              </div>
              <div
                className="absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-cyan-300 bg-cyan-600 text-white shadow-xl"
                style={{ left: `${robotTwin.coordinates.x}%`, top: `${robotTwin.coordinates.y}%` }}
              >
                <Crosshair className="h-7 w-7" />
              </div>
              <div className="absolute bottom-4 left-4 rounded-md bg-white/90 p-3 text-sm shadow dark:bg-slate-950/90">
                ชั้น {robotTwin.coordinates.floor} · X {robotTwin.coordinates.x} · Y {robotTwin.coordinates.y}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <TwinCard icon={Route} label="ภารกิจปัจจุบัน" value={robotTwin.currentMission} />
          <TwinCard icon={MapPinned} label="โมดูลปัจจุบัน" value={robotTwin.currentModule} />
          <TwinCard icon={ShieldCheck} label="ข้อมูลสุขภาพผิวอาคาร" value={robotTwin.surfaceHealthData} />
          <Card>
            <CardHeader><CardTitle>สถานะระบบสด</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Meter icon={Battery} label="แบตเตอรี่" value={robotTwin.batteryStatus} />
              <Meter icon={ShieldCheck} label="แรงยึดเกาะแม่เหล็ก" value={robotTwin.adhesionForce} />
              <Meter icon={Radio} label="สัญญาณสื่อสาร" value={robotTwin.networkSignal} />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function TwinCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex gap-3 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Meter({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Icon className="h-4 w-4" />{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

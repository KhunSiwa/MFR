import { BatteryMedium, Bot, MapPin, PackageCheck, Route, Wifi } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleCards } from "@/components/robot/module-cards";
import { RobotActions } from "@/features/mfr/components/robot-actions";
import { RobotCard } from "@/features/mfr/components/cards";
import { robotPlatform, robotTwin } from "@/data/robot-platform";

export default function RobotPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="หุ่นยนต์"
        title="การปฏิบัติงานของหุ่นยนต์"
        description="สถานะ ตำแหน่ง แบตเตอรี่ ภารกิจปัจจุบัน โมดูล และชุดควบคุมภารกิจหลัก"
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <RobotCard icon={Bot} label="สถานะ" value={robotPlatform.fleetStatus} />
        <RobotCard icon={BatteryMedium} label="แบตเตอรี่" value={`${robotTwin.batteryStatus}%`} />
        <RobotCard icon={MapPin} label="ตำแหน่ง" value={robotTwin.position} />
        <RobotCard icon={PackageCheck} label="โมดูลปัจจุบัน" value={robotTwin.currentModule} />
      </div>

      <RobotActions />

      <section className="grid gap-5 lg:grid-cols-3">
        <RobotInfo icon={Route} title="ภารกิจปัจจุบัน" value={robotTwin.currentMission} progress={78} />
        <RobotInfo icon={Wifi} title="สัญญาณเครือข่าย" value={`${robotTwin.networkSignal}%`} progress={robotTwin.networkSignal} />
        <RobotInfo icon={Bot} title="แรงยึดเกาะ" value={`${robotTwin.adhesionForce} N`} progress={88} />
      </section>

      <ModuleCards />
    </div>
  );
}

function RobotInfo({ icon: Icon, title, value, progress }: { icon: React.ElementType; title: string; value: string; progress: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-cyan-500" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>สถานะหุ่นยนต์แบบสด</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <Progress value={progress} className="mt-5" />
      </CardContent>
    </Card>
  );
}

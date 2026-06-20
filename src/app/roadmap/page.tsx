import { Lightbulb, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { futureModules } from "@/data/robot-platform";

export default function RoadmapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Roadmap"
        title="แผนขยายโมดูลในอนาคต"
        description="แนวคิดโมดูลที่สามารถต่อยอดจากหน่วยหุ่นยนต์ฐานเดียวกัน เพื่อให้ Vertical Surface Robot Platform รองรับงานอาคารได้หลากหลายขึ้น"
      />
      <div className="grid gap-5 xl:grid-cols-2">
        {futureModules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{module.name}</CardTitle>
                  <CardDescription>{module.id}</CardDescription>
                </div>
                <Badge tone="muted">แนวคิดอนาคต</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{module.purpose}</p>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Lightbulb className="h-4 w-4" />ความพร้อมแนวคิด</span>
                  <span className="font-semibold">{module.readiness}%</span>
                </div>
                <Progress value={module.readiness} />
              </div>
              <div className="grid gap-2">
                {module.expectedOutputs.map((output) => (
                  <div key={output} className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm dark:bg-slate-900">
                    <Sparkles className="h-4 w-4 text-cyan-500" />
                    {output}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

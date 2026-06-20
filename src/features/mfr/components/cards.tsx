import type { ElementType } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, Lightbulb, Settings2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const toneClasses: Record<string, string> = {
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
  slate: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "cyan",
  description,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  tone?: string;
  description?: string;
}) {
  return (
    <Card className="hover-lift">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone] ?? toneClasses.cyan}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
        {description ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </CardContent>
    </Card>
  );
}

export function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function HealthCard({ score, risk }: { score: number; risk: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>คะแนนสุขภาพผิวอาคาร</CardTitle>
            <CardDescription>โมเดลประเมินสภาพผิวอาคาร</CardDescription>
          </div>
          <Badge tone={score > 80 ? "good" : score > 65 ? "warning" : "critical"}>{risk}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-6xl font-semibold tracking-tight">{score}</div>
        <Progress value={score} className="mt-5" />
      </CardContent>
    </Card>
  );
}

export function RobotCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: ElementType }) {
  return <StatCard label={label} value={value} icon={Icon} tone="cyan" />;
}

export function InspectionCard({
  title,
  value,
  tone = "cyan",
}: {
  title: string;
  value: string | number;
  tone?: string;
}) {
  return <StatCard label={title} value={value} icon={CheckCircle2} tone={tone} />;
}

export function AlertCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription className="leading-6 text-amber-900 dark:text-amber-100">{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function RecommendationCard({ items }: { items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-5 w-5 text-cyan-500" />
          <CardTitle>คำแนะนำจาก AI</CardTitle>
        </div>
        <CardDescription>แนวทางบำรุงรักษาเชิงคาดการณ์จากข้อมูลสุขภาพผิวอาคาร</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl bg-slate-100 p-4 text-sm leading-6 dark:bg-white/5">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" />
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-cyan-500" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

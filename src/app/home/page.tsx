import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, Camera } from "lucide-react";
import { AlertCard, HealthCard, RecommendationCard, StatCard } from "@/features/mfr/components/cards";
import { aiRecommendations, homeKpis, mvpMetrics } from "@/features/mfr/constants";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { RobotHeroSlider } from "@/components/robot/robot-hero-slider";
import { db } from "@/data/api";
import { formatDate } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20 lg:grid-cols-[1fr_420px] lg:p-8">
        <div className="flex flex-col justify-center">
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-500">M.F.R. MVP</div>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            แพลตฟอร์มจัดการสุขภาพผิวอาคาร
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            หุ่นยนต์ฐานกลางพร้อมชุดปฏิบัติการสลับได้สำหรับตรวจสอบ ทำความสะอาด เฝ้าระวังผิวอาคาร วิเคราะห์ด้วย AI และวางแผนบำรุงรักษาเชิงคาดการณ์
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild className="h-12 rounded-2xl">
              <Link href="/dashboard">เปิดแดชบอร์ด <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="secondary" className="h-12 rounded-2xl">
              <Link href="/robot">ควบคุมหุ่นยนต์</Link>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-[1.5rem] border border-white/60 bg-slate-950 dark:border-white/10">
          <RobotHeroSlider className="h-80 w-full lg:h-full" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/10 p-4 text-white backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-cyan-300" /> แพลตฟอร์มหุ่นยนต์ไต่ผิวอาคาร</div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {homeKpis.map((item) => <StatCard key={item.label} {...item} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <HealthCard score={mvpMetrics.surfaceHealth} risk={mvpMetrics.riskLevel} />
        <RecommendationCard items={aiRecommendations.slice(0, 3)} />
      </div>

      <PageHeader
        title="ภาพรวมวันนี้"
        description="สรุปภารกิจ การตรวจสอบ และการแจ้งเตือนล่าสุดของระบบสุขภาพผิวอาคาร"
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <StatCard icon={CalendarClock} label="ภารกิจวันนี้" value={mvpMetrics.currentMission} tone="blue" />
        <StatCard icon={Camera} label="การตรวจสอบล่าสุด" value={formatDate(db.building.lastInspectionDate)} tone="cyan" />
        <AlertCard title="แจ้งเตือนล่าสุด" message={`${mvpMetrics.latestAlert.id} ต้องตรวจทบทวน คะแนนผิวอาคาร ${mvpMetrics.latestAlert.healthScore}/100`} />
      </div>
    </div>
  );
}

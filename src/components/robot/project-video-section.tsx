"use client";

import { Film } from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function ProjectVideoSection({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="วิดีโอนำเสนอผลงาน M.F.R."
      className={`rounded-[2rem] border border-white/70 bg-white/80 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20 ${
        compact ? "p-5 sm:p-6" : "p-6 lg:p-8"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
            <Film className="h-4 w-4" aria-hidden />
            M.F.R. Presentation Video · Project 52171
          </div>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">
            วิดีโอนำเสนอผลงาน M.F.R. (Modular Facade Rover)
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            แนะนำตัวทีมผู้พัฒนาโรงเรียนอัสสัมชัญธนบุรี แนวคิดหุ่นยนต์แบบโมดูลาร์ ระบบ AI วิเคราะห์ผิวอาคาร และแพลตฟอร์มเว็บ (ความยาว 02:50 นาที · ซับไตเติลภาษาไทย)
          </p>
        </div>
        <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
          I-New Gen 2027 · 1080p
        </span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 shadow-inner dark:border-white/10">
        <video
          controls
          playsInline
          preload="metadata"
          poster={`${basePath}/images/mfr-hero-rover.png`}
          className="aspect-video w-full bg-slate-950 object-contain"
        >
          <source src={`${basePath}/videos/52171_MFR_Video.mp4?v=20261122-2116`} type="video/mp4" />
          เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ HTML5
        </video>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Building2,
  Camera,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { coreNavigation } from "@/features/mfr/constants";

const iconFallbacks = { LayoutDashboard, Bot, Camera, FileText, Settings };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 transition-colors duration-500 dark:bg-[#020617] dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white/85 backdrop-blur-2xl xl:block dark:border-white/10 dark:bg-slate-950/85">
        <div className="flex h-full flex-col">
          <Link href="/dashboard" className="flex h-20 items-center gap-3 border-b border-slate-200 px-6 dark:border-white/10">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-cyan-500/10 dark:bg-white dark:text-slate-950">
              <Building2 className="h-6 w-6" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-semibold">ศูนย์ควบคุม M.F.R.</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">ระบบ Modular Facade Rover</span>
            </span>
          </Link>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-5" aria-label="เมนูหลัก">
            {coreNavigation.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon ?? iconFallbacks.LayoutDashboard;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium transition ${
                    active
                      ? "bg-slate-950 text-white shadow-lg shadow-cyan-500/10 dark:bg-white dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-5 dark:border-white/10">
            <div className="rounded-[1.25rem] bg-slate-100 p-4 dark:bg-white/5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-emerald-500" aria-hidden />
                หุ่นยนต์ออนไลน์
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                ภารกิจ MFR-024 กำลังทำงาน ระบบตรวจสอบ AI กล้อง telemetry และแดชบอร์ดชุดปฏิบัติการพร้อมใช้งาน
              </p>
            </div>
            <Link
              href="/"
              onClick={() => {
                window.localStorage.removeItem("mfr-session");
                window.localStorage.removeItem("mfr-auth-mode");
              }}
              className="mt-3 flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              ออกจากระบบ
            </Link>
          </div>
        </div>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/85">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <details className="relative xl:hidden">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white">
                <span className="sr-only">เปิดเมนูนำทาง</span>
                <Menu className="h-5 w-5" aria-hidden />
              </summary>
              <div className="absolute left-0 mt-3 max-h-[75vh] w-80 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-slate-950">
                {coreNavigation.map((item) => {
                  const Icon = item.icon ?? iconFallbacks.LayoutDashboard;
                  return (
                  <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/10">
                    <Icon className="h-4 w-4 text-cyan-500" aria-hidden />
                    {item.label}
                  </Link>
                  );
                })}
              </div>
            </details>

            <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-cyan-500" aria-hidden />
              แพลตฟอร์มสุขภาพผิวอาคารอัจฉริยะ
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

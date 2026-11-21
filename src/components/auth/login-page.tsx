"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowRight, Bot, BrainCircuit, Building2, LockKeyhole, Mail, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { RobotHeroSlider } from "@/components/robot/robot-hero-slider";

const productHighlights = [
  { label: "หุ่นยนต์ชุดปฏิบัติการ", icon: Bot },
  { label: "ตรวจสอบด้วย AI", icon: BrainCircuit },
  { label: "บำรุงรักษาอัจฉริยะ", icon: Wrench },
];

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function enterApp(mode: "login" | "sign-in") {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password.trim()) {
      setError("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }
    setError("");
    window.localStorage.setItem("mfr-session", JSON.stringify({ email: trimmedEmail, loginAt: new Date().toISOString() }));
    window.localStorage.setItem("mfr-auth-mode", mode);
    router.push("/home");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) {
      return;
    }
    enterApp("login");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950 transition-colors duration-500 dark:bg-[#020617] dark:text-white">
      <div className="ai-grid absolute inset-0" />
      <div className="absolute left-1/2 top-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/10" />
      <div className="relative z-10 flex min-h-screen flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-cyan-500/10 dark:bg-white dark:text-slate-950">
              <Building2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <div className="text-sm font-semibold">M.F.R.</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">ระบบ Modular Facade Rover</div>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-700 dark:text-cyan-200">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              แพลตฟอร์มสุขภาพผิวอาคารอัจฉริยะ
            </div>
            <h1 className="mt-7 text-5xl font-semibold leading-[0.95] tracking-tight sm:text-7xl">
              M.F.R. Modular Facade Rover
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              หน้าแรกนี้เป็นเพียงหน้าแนะนำสินค้าและรายละเอียดงานของบริษัท: หุ่นยนต์ฐานกลางพร้อมชุดปฏิบัติการสำหรับตรวจสอบ ทำความสะอาด วิเคราะห์ AI และรองรับการบำรุงรักษาเชิงคาดการณ์สำหรับอาคารอัจฉริยะ
            </p>

            <form onSubmit={handleSubmit} className="mt-9 max-w-md rounded-[1.5rem] border border-white/70 bg-white/80 p-5 shadow-2xl shadow-slate-200/70 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:shadow-black/20">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="email">
                อีเมล
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950">
                <Mail className="h-4 w-4 text-slate-400" aria-hidden />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="กรอกอีเมลของคุณ"
                  className="w-full bg-transparent text-sm outline-none"
                  autoComplete="email"
                  required
                />
              </div>

              <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="password">
                รหัสผ่าน
              </label>
              <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950">
                <LockKeyhole className="h-4 w-4 text-slate-400" aria-hidden />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="กรอกรหัสผ่าน"
                  className="w-full bg-transparent text-sm outline-none"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error ? (
                <p className="mt-3 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="mt-5 h-12 w-full rounded-2xl text-base">
                เข้าสู่ระบบ
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 h-12 w-full rounded-2xl text-base"
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form && !form.reportValidity()) {
                    return;
                  }
                  enterApp("sign-in");
                }}
              >
                ลงชื่อเข้าใช้
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </form>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-blue-600/20 via-cyan-400/20 to-transparent blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950 shadow-2xl shadow-cyan-950/10 backdrop-blur dark:border-white/10">
              <RobotHeroSlider className="aspect-video w-full" priority />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/35" />
              <div className="absolute left-4 right-4 top-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white backdrop-blur">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-cyan-300" aria-hidden />
                  <div>
                    <div className="text-sm font-semibold">ตัวอย่างผลิตภัณฑ์บริษัท</div>
                    <div className="text-xs text-slate-300">หุ่นยนต์ AI สำหรับผิวอาคารอัจฉริยะ</div>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-100">
                  สาธารณะ
                </span>
              </div>
              <div className="absolute bottom-8 left-4 right-4 grid grid-cols-3 gap-2.5">
                {productHighlights.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 text-white shadow-xl backdrop-blur-xl">
                    <item.icon className="h-5 w-5 text-cyan-200" aria-hidden />
                    <div className="mt-1.5 text-xs font-semibold">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

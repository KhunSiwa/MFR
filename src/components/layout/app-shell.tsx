import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  Camera,
  ClipboardList,
  Cpu,
  FileText,
  Gamepad2,
  Images,
  LayoutDashboard,
  Layers3,
  Map,
  Milestone,
  PackageCheck,
  Route,
  Satellite,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "ภาพรวมแพลตฟอร์ม", icon: LayoutDashboard },
  { href: "/modules", label: "จัดการโมดูล", icon: Layers3 },
  { href: "/module-dashboard", label: "แดชบอร์ดโมดูล", icon: PackageCheck },
  { href: "/digital-twin", label: "ดิจิทัลทวิน", icon: Cpu },
  { href: "/robot-control", label: "ควบคุมหุ่นยนต์", icon: Gamepad2 },
  { href: "/live-camera", label: "กล้องสด", icon: Camera },
  { href: "/telemetry", label: "Telemetry", icon: Satellite },
  { href: "/missions", label: "ภารกิจ", icon: Route },
  { href: "/#surface-map", label: "แผนที่ผิวอาคาร", icon: Map },
  { href: "/inspection-gallery", label: "คลังภาพตรวจสอบ", icon: Images },
  { href: "/defects", label: "จัดการตำหนิ", icon: ClipboardList },
  { href: "/ai-analysis", label: "วิเคราะห์ด้วย AI", icon: Bot },
  { href: "/history", label: "ประวัติการตรวจ", icon: BarChart3 },
  { href: "/report", label: "รายงาน", icon: FileText },
  { href: "/roadmap", label: "แผนขยายโมดูล", icon: Milestone },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white/95 backdrop-blur xl:block dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex h-full flex-col">
          <Link href="/" className="flex h-20 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-600 text-white">
              <Building2 className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Vertical Surface</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Robot Platform</span>
            </span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1 px-4 py-5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 p-5 dark:border-slate-800">
            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-emerald-500" />
                หุ่นยนต์ออนไลน์
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                หน่วยหุ่นยนต์ฐานออนไลน์ พร้อมโมดูลตรวจสอบที่ติดตั้งอยู่และข้อมูลภาพ 50 ภาพจากภารกิจล่าสุด
              </p>
            </div>
          </div>
        </div>
      </aside>
      <div className="xl:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-2 xl:hidden">
              <Building2 className="h-6 w-6 text-cyan-600" />
              <span className="text-sm font-semibold">Vertical Surface</span>
            </Link>
            <div className="hidden text-sm text-slate-500 sm:block dark:text-slate-400">
              ระบบปฏิบัติการหุ่นยนต์ผิวอาคารแนวตั้งแบบโมดูลาร์สำหรับงานอาคารหลายประเภท
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 pb-3 xl:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Bell, MonitorCog, Palette, UserRound, Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SettingsCard } from "@/features/mfr/components/cards";

export function SettingsPanel() {
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState("ไทย");

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SettingsCard title="โหมดมืด" description="บันทึกธีมไว้ใน localStorage และทำงานตามค่าระบบของเครื่อง">
        <div className="flex items-center justify-between rounded-2xl bg-slate-100 p-4 dark:bg-white/5">
          <span className="font-medium">สลับธีม</span>
          <ThemeToggle />
        </div>
      </SettingsCard>

      <SettingsCard title="การแจ้งเตือน" description="แจ้งเตือนสถานะหุ่นยนต์และผลการตรวจสอบ">
        <label className="flex items-center justify-between rounded-2xl bg-slate-100 p-4 dark:bg-white/5">
          <span className="flex items-center gap-3 font-medium"><Bell className="h-4 w-4 text-cyan-500" />เปิดการแจ้งเตือน</span>
          <input type="checkbox" checked={notifications} onChange={(event) => setNotifications(event.target.checked)} className="h-5 w-5 accent-cyan-600" />
        </label>
      </SettingsCard>

      <SettingsCard title="ตั้งค่าหุ่นยนต์" description="การตั้งค่าหุ่นยนต์สำหรับ MVP">
        <div className="space-y-3">
          <SettingRow icon={Wrench} label="โมดูลเริ่มต้น" value="ตรวจสอบผิวอาคาร" />
          <SettingRow icon={MonitorCog} label="โหมดฉุกเฉิน" value="เปิดควบคุมด้วยผู้ปฏิบัติงาน" />
        </div>
      </SettingsCard>

      <SettingsCard title="บัญชี" description="โปรไฟล์ผู้ปฏิบัติงานตัวอย่าง">
        <SettingRow icon={UserRound} label="ผู้ปฏิบัติงาน" value="ผู้ใช้ตัวอย่าง MFR" />
      </SettingsCard>

      <SettingsCard title="ธีม" description="รูปลักษณ์ของแบรนด์">
        <SettingRow icon={Palette} label="สีเน้น" value="น้ำเงินไปฟ้าไซแอน" />
      </SettingsCard>

      <SettingsCard title="ภาษา" description="ตั้งค่าภาษาของส่วนติดต่อผู้ใช้">
        <label className="block">
          <span className="mb-2 block text-sm text-slate-500 dark:text-slate-400">ภาษา</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-slate-950">
            <option>ไทย</option>
            <option>อังกฤษ / ไทย</option>
            <option>อังกฤษ</option>
          </select>
        </label>
      </SettingsCard>

      <SettingsCard title="ระบบ" description="เวอร์ชันแพลตฟอร์ม">
        <SettingRow icon={MonitorCog} label="M.F.R. OS" value="MVP v3" />
      </SettingsCard>
    </div>
  );
}

function SettingRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-100 p-4 dark:bg-white/5">
      <span className="flex items-center gap-3 text-sm font-medium"><Icon className="h-4 w-4 text-cyan-500" />{label}</span>
      <span className="text-right text-sm text-slate-500 dark:text-slate-400">{value}</span>
    </div>
  );
}

import { PageHeader } from "@/components/layout/page-header";
import { SettingsPanel } from "@/features/mfr/components/settings-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="ตั้งค่า"
        title="ตั้งค่า"
        description="โหมดมืด การแจ้งเตือน การตั้งค่าหุ่นยนต์ บัญชี ธีม ภาษา และระบบ"
      />
      <SettingsPanel />
    </div>
  );
}

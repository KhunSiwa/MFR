import { ModuleCards } from "@/components/robot/module-cards";
import { ModuleTable } from "@/components/robot/module-table";
import { PageHeader } from "@/components/layout/page-header";

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="คลังโมดูล"
        title="การจัดการโมดูลของแพลตฟอร์มหุ่นยนต์"
        description="โมดูลทุกตัวถูกออกแบบให้เชื่อมต่อกับหน่วยหุ่นยนต์ฐานของ Vertical Surface Robot Platform เพื่อขยายงานจากการทำความสะอาดไปสู่การตรวจสอบ ความร้อน และการสื่อสารบนอาคาร"
      />
      <ModuleTable />
      <ModuleCards />
    </div>
  );
}

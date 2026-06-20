import { Badge } from "@/components/ui/badge";
import { robotModules } from "@/data/robot-platform";
import { formatDate } from "@/lib/utils";
import { moduleStatusLabel, moduleTypeLabel, statusTone } from "@/lib/robot-labels";

export function ModuleTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
          <tr>
            {["ชื่อโมดูล", "ประเภทโมดูล", "สถานะ", "วันที่ติดตั้ง", "ความเข้ากันได้", "สุขภาพ"].map((heading) => (
              <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {robotModules.map((module) => (
            <tr key={module.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="px-4 py-4">
                <div className="font-medium">{module.name}</div>
                <div className="text-xs text-slate-500">{module.id}</div>
              </td>
              <td className="px-4 py-4">{moduleTypeLabel(module.type)}</td>
              <td className="px-4 py-4"><Badge tone={statusTone(module.status)}>{moduleStatusLabel(module.status)}</Badge></td>
              <td className="px-4 py-4">{formatDate(module.installationDate)}</td>
              <td className="px-4 py-4">{module.compatibility.join(", ")}</td>
              <td className="px-4 py-4 font-semibold">{module.healthStatus}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

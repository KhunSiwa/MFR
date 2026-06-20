import { Badge } from "@/components/ui/badge";
import { missions } from "@/data/robot-platform";
import { formatDate } from "@/lib/utils";
import { missionStatusLabel, missionTypeLabel, statusTone } from "@/lib/robot-labels";

export function MissionTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
          <tr>
            {["ภารกิจ", "ประเภท", "เวลาเริ่ม", "เวลาสิ้นสุด", "พื้นที่ครอบคลุม", "ผลลัพธ์", "รายงาน"].map((heading) => (
              <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {missions.map((mission) => (
            <tr key={mission.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <td className="px-4 py-4">
                <div className="font-medium">{mission.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  {mission.id}
                  <Badge tone={statusTone(mission.status)}>{missionStatusLabel(mission.status)}</Badge>
                </div>
              </td>
              <td className="px-4 py-4">{missionTypeLabel(mission.type)}</td>
              <td className="px-4 py-4">{formatDate(mission.startTime)}</td>
              <td className="px-4 py-4">{formatDate(mission.endTime)}</td>
              <td className="px-4 py-4">{mission.areaCovered}</td>
              <td className="px-4 py-4">{mission.results}</td>
              <td className="px-4 py-4 font-medium">{mission.generatedReport}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

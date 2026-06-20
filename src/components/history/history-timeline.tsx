import { Activity, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InspectionHistory } from "@/lib/types";
import { formatDate, riskTone } from "@/lib/utils";

export function HistoryTimeline({ history }: { history: InspectionHistory[] }) {
  return (
    <div className="space-y-4">
      {[...history].reverse().map((item) => (
        <div key={item.date} className="relative rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-md bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">
                <CalendarDays className="h-4 w-4" />
              </span>
              <div>
                <div className="font-semibold">{formatDate(item.date)}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  ตรวจแล้ว {item.areasInspected} พื้นที่ · พบตำหนิ {item.defects} รายการ
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-500" />
              <Badge tone={riskTone(item.healthScore)}>คะแนน {item.healthScore}</Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

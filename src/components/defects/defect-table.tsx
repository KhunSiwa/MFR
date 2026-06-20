"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Defect } from "@/lib/types";
import { cn, defectTypeLabel, formatDate, locationLabel, severityLabel, statusLabel } from "@/lib/utils";

const severityTone = {
  Low: "good",
  Medium: "warning",
  High: "elevated",
  Critical: "critical",
} as const;

export function DefectTable({ defects }: { defects: Defect[] }) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("All");
  const [status, setStatus] = useState("All");

  const filtered = useMemo(
    () =>
      defects.filter((defect) => {
        const matchesQuery = `${defect.id} ${defect.type} ${defect.location}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesSeverity = severity === "All" || defect.severity === severity;
        const matchesStatus = status === "All" || defect.status === status;
        return matchesQuery && matchesSeverity && matchesStatus;
      }),
    [defects, query, severity, status],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-[1fr_180px_210px] dark:border-slate-800">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหารหัสตำหนิ ประเภท หรือสถานที่"
            className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-800 dark:bg-slate-950"
          />
        </label>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger>
            <SelectValue placeholder="ความรุนแรง" />
          </SelectTrigger>
          <SelectContent>
            {["All", "Low", "Medium", "High", "Critical"].map((item) => (
              <SelectItem key={item} value={item}>{item === "All" ? "ทั้งหมด" : severityLabel(item)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="สถานะ" />
          </SelectTrigger>
          <SelectContent>
            {["All", "New", "Monitoring", "Repair Scheduled", "Fixed"].map((item) => (
              <SelectItem key={item} value={item}>{item === "All" ? "ทั้งหมด" : statusLabel(item)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
            <tr>
              {["รหัสตำหนิ", "ประเภทตำหนิ", "ความรุนแรง", "ตำแหน่ง", "วันที่ตรวจพบ", "สถานะ"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((defect) => (
              <tr key={defect.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-4 py-4 font-medium">{defect.id}</td>
                <td className="px-4 py-4">{defectTypeLabel(defect.type)}</td>
                <td className="px-4 py-4">
                  <Badge tone={severityTone[defect.severity]}>{severityLabel(defect.severity)}</Badge>
                </td>
                <td className="max-w-xs px-4 py-4 text-slate-600 dark:text-slate-300">{locationLabel(defect.location)}</td>
                <td className="px-4 py-4">{formatDate(defect.detectionDate)}</td>
                <td className="px-4 py-4">
                  <span
                    className={cn(
                      "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
                      defect.status === "Fixed"
                        ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                        : "border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300",
                    )}
                  >
                    {statusLabel(defect.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

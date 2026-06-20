"use client";

import { useMemo, useState } from "react";
import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { FacadeZone } from "@/lib/types";
import { cn, elevationLabel, formatDate, riskLabel, riskTone, zoneNameLabel } from "@/lib/utils";

const zoneColor = (score: number) => {
  if (score >= 82) return "bg-emerald-500 hover:bg-emerald-400";
  if (score >= 68) return "bg-yellow-400 hover:bg-yellow-300";
  if (score >= 52) return "bg-orange-500 hover:bg-orange-400";
  return "bg-red-600 hover:bg-red-500";
};

export function SurfaceHealthMap({ zones }: { zones: FacadeZone[] }) {
  const [selectedId, setSelectedId] = useState(zones[7]?.id ?? zones[0]?.id);
  const selected = useMemo(
    () => zones.find((zone) => zone.id === selectedId) ?? zones[0],
    [selectedId, zones],
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>แผนที่ผนังอาคารแบบโต้ตอบ</CardTitle>
          <CardDescription>คลิกโซนเพื่อดูความหนาแน่นของตำหนิ คะแนน และรอบตรวจล่าสุดของหุ่นยนต์</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid min-h-[520px] grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-100 p-4 sm:grid-cols-5 dark:border-slate-800 dark:bg-slate-900/60">
            {zones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => setSelectedId(zone.id)}
                className={cn(
                  "group relative flex min-h-36 flex-col justify-between rounded-md p-3 text-left text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
                  zoneColor(zone.healthScore),
                  selected.id === zone.id && "ring-2 ring-cyan-300 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-900",
                )}
              >
                <span>
                  <span className="block text-xs font-semibold opacity-85">{zone.id}</span>
                  <span className="mt-1 block text-sm font-semibold">{zoneNameLabel(zone.name)}</span>
                </span>
                <span>
                  <span className="block text-3xl font-semibold">{zone.healthScore}</span>
                  <span className="text-xs opacity-85">ชั้น {zone.floorRange}</span>
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{zoneNameLabel(selected.name)}</CardTitle>
              <CardDescription>{elevationLabel(selected.elevation)} ชั้น {selected.floorRange}</CardDescription>
            </div>
            <Badge tone={riskTone(selected.healthScore)}>{riskLabel(selected.healthScore)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">คะแนนสุขภาพ</span>
              <span className="font-semibold">{selected.healthScore}/100</span>
            </div>
            <Progress value={selected.healthScore} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["รอยแตกร้าว", selected.crackCount],
              ["สนิม", selected.rustCount],
              ["คราบน้ำ", selected.waterStainCount],
              ["ซิลิโคน", selected.siliconeIssueCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                <div className="mt-1 text-2xl font-semibold">{value}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-cyan-500" />
              ตรวจล่าสุด {formatDate(selected.inspectionDate)}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-500" />
              บันทึกจุดสิ่งสกปรกสะสม {selected.dirtCount} จุด
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

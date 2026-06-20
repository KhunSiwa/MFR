"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { defectColor, defectTypeLabel } from "@/lib/utils";
import type { InspectionHistory } from "@/lib/types";

export function HealthTrendChart({ data }: { data: InspectionHistory[] }) {
  const mounted = useMounted();

  if (!mounted) {
    return <div className="h-72 rounded-lg bg-slate-100 dark:bg-slate-900" />;
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
          <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} tick={{ fontSize: 12 }} />
          <YAxis domain={[40, 100]} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => [`${value} คะแนน`, "คะแนนสุขภาพ"]}
            labelFormatter={(value) => `วันที่ ${value}`}
          />
          <Area type="monotone" dataKey="healthScore" stroke="#06b6d4" strokeWidth={3} fill="url(#scoreGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DefectDistributionChart({ data }: { data: { type: string; count: number }[] }) {
  const mounted = useMounted();

  if (!mounted) {
    return <div className="h-72 rounded-lg bg-slate-100 dark:bg-slate-900" />;
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.18} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="type"
            width={128}
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => defectTypeLabel(String(value))}
          />
          <Tooltip
            formatter={(value) => [`${value} รายการ`, "จำนวน"]}
            labelFormatter={(value) => defectTypeLabel(String(value))}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((entry) => (
              <Cell key={entry.type} fill={defectColor(entry.type)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function useMounted() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { RadialBar, RadialBarChart, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { riskLabel, riskTone } from "@/lib/utils";

export function HealthGauge({ score }: { score: number }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="h-64 w-full rounded-lg bg-slate-100 dark:bg-slate-900" />;
  }

  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={[{ value: score }]}
          innerRadius="72%"
          outerRadius="92%"
          startAngle={220}
          endAngle={-40}
          barSize={18}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" cornerRadius={999} fill="#06b6d4" background />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <div className="text-5xl font-semibold tracking-normal">{score}</div>
        <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">จาก 100 คะแนน</div>
        <Badge tone={riskTone(score)} className="mt-4">
          {riskLabel(score)}
        </Badge>
      </div>
    </div>
  );
}

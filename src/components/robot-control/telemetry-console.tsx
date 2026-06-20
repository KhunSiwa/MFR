"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { Activity, BatteryMedium, Gauge, MapPin, Route, Thermometer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TelemetrySample } from "@/data/mock-robot-control";

export function TelemetryConsole({ initialTelemetry }: { initialTelemetry: TelemetrySample }) {
  const [sample, setSample] = useState(initialTelemetry);
  const [history, setHistory] = useState<TelemetrySample[]>([initialTelemetry]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const response = await fetch("/api/robot-telemetry");
      const nextSample = (await response.json()) as TelemetrySample;
      setSample(nextSample);
      setHistory((items) => [nextSample, ...items].slice(0, 18));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const path = useMemo(() => {
    return history
      .slice()
      .reverse()
      .map((item, index) => {
        const x = 40 + ((item.positionX - 60) / 18) * 420;
        const y = 260 - ((item.positionY - 27) / 16) * 210;
        return `${index === 0 ? "M" : "L"} ${Math.max(30, Math.min(500, x))} ${Math.max(30, Math.min(270, y))}`;
      })
      .join(" ");
  }, [history]);

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader>
          <CardTitle>Robot Telemetry</CardTitle>
          <CardDescription>Mock telemetry updates every second for manual control validation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <TelemetryTile icon={MapPin} label="Position X" value={sample.positionX.toFixed(2)} unit="m" />
            <TelemetryTile icon={MapPin} label="Position Y" value={sample.positionY.toFixed(2)} unit="m" />
            <TelemetryTile icon={BatteryMedium} label="Battery" value={sample.battery.toFixed(0)} unit="%" />
            <TelemetryTile icon={Gauge} label="Speed" value={sample.speed.toFixed(2)} unit="m/s" />
            <TelemetryTile icon={Thermometer} label="Temperature" value={sample.temperature.toFixed(1)} unit="C" />
            <TelemetryTile icon={Activity} label="Mission Status" value={sample.missionStatus} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-950 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Position Trace</div>
                <div className="text-xs text-slate-400">X/Y movement over the latest samples</div>
              </div>
              <Badge tone="good">Live</Badge>
            </div>
            <svg viewBox="0 0 540 300" className="h-[320px] w-full">
              <rect width="540" height="300" rx="8" fill="#020617" />
              {Array.from({ length: 7 }).map((_, index) => (
                <line key={`v-${index}`} x1={40 + index * 76} x2={40 + index * 76} y1="25" y2="270" stroke="#1e293b" />
              ))}
              {Array.from({ length: 5 }).map((_, index) => (
                <line key={`h-${index}`} x1="30" x2="510" y1={40 + index * 55} y2={40 + index * 55} stroke="#1e293b" />
              ))}
              <path d={path} fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={Math.max(30, Math.min(500, 40 + ((sample.positionX - 60) / 18) * 420))} cy={Math.max(30, Math.min(270, 260 - ((sample.positionY - 27) / 16) * 210))} r="10" fill="#67e8f9" />
              <text x="36" y="292" fill="#94a3b8" fontSize="12">Last update {new Date(sample.timestamp).toLocaleTimeString()}</text>
            </svg>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Mission Health</CardTitle>
            <CardDescription>Live readings used by the remote operator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Meter label="Battery" value={sample.battery} />
            <Meter label="Temperature Envelope" value={100 - Math.max(0, sample.temperature - 32) * 4} />
            <Meter label="Drive Stability" value={Math.max(0, 96 - sample.speed * 18)} />
            <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold"><Route className="h-4 w-4 text-cyan-600" />Mission Status</div>
              <div className="mt-3 text-3xl font-semibold">{sample.missionStatus}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Samples</CardTitle>
            <CardDescription>Rolling one-second mock feed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 8).map((item) => (
              <div key={item.timestamp} className="grid grid-cols-4 gap-2 rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-800">
                <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                <span>X {item.positionX.toFixed(1)}</span>
                <span>Y {item.positionY.toFixed(1)}</span>
                <span>{item.speed.toFixed(2)} m/s</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TelemetryTile({ icon: Icon, label, value, unit }: { icon: ElementType; label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Icon className="h-4 w-4 text-cyan-600" />{label}</div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-semibold">{value}</span>
        {unit ? <span className="pb-1 text-sm text-slate-500">{unit}</span> : null}
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono">{bounded.toFixed(0)}%</span>
      </div>
      <Progress value={bounded} />
    </div>
  );
}

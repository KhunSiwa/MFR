"use client";

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import Image from "next/image";
import { BatteryMedium, Camera, Clock, Maximize2, RadioTower, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CameraFrame } from "@/data/mock-robot-control";

type CameraStream = {
  latest: CameraFrame;
  history: CameraFrame[];
  roadmap: string[];
};

export function LiveCameraConsole({ initialStream }: { initialStream: CameraStream }) {
  const [stream, setStream] = useState(initialStream);
  const [recording, setRecording] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const response = await fetch("/api/robot-camera");
      setStream(await response.json());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const latest = stream.latest;
  const latestStatus = robotStatusLabel(latest.robotStatus);

  function openFullscreen() {
    const element = document.getElementById("robot-camera-feed");
    void element?.requestFullscreen?.();
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>ภาพจากกล้องหุ่นยนต์</CardTitle>
              <CardDescription>สตรีมภาพจำลองของ MVP ที่อัปเดตทุกวินาทีจาก mock API</CardDescription>
            </div>
            <Badge tone={recording ? "critical" : "good"}>{recording ? "กำลังบันทึก" : "สด"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div id="robot-camera-feed" className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
            <Image
              src={latest.imageUrl}
              alt="ภาพจากกล้องหุ่นยนต์"
              width={1280}
              height={720}
              unoptimized
              className="aspect-video w-full object-cover"
            />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <OverlayPill icon={Clock} value={new Date(latest.timestamp).toLocaleTimeString()} />
              <OverlayPill icon={RadioTower} value={latestStatus} />
              <OverlayPill icon={BatteryMedium} value={`${latest.batteryStatus}%`} />
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 text-white">
              <div>
                <div className="text-xs uppercase text-cyan-200">ตำแหน่ง</div>
                <div className="text-sm font-semibold">{latest.position}</div>
              </div>
              <div className="font-mono text-xs text-slate-300">{latest.id}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={openFullscreen} variant="secondary"><Maximize2 className="h-4 w-4" />ดูเต็มจอ</Button>
            <Button onClick={() => setSnapshotCount((count) => count + 1)} variant="secondary"><Camera className="h-4 w-4" />บันทึกภาพนิ่ง</Button>
            <Button onClick={() => setRecording((value) => !value)} variant={recording ? "destructive" : "default"}><Video className="h-4 w-4" />บันทึกวิดีโอ</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <MetaTile label="เวลา" value={new Date(latest.timestamp).toLocaleString()} />
            <MetaTile label="สถานะหุ่นยนต์" value={latestStatus} />
            <MetaTile label="สถานะแบตเตอรี่" value={`${latest.batteryStatus}%`} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>ประวัติภาพ</CardTitle>
            <CardDescription>เฟรมจำลองล่าสุดที่เก็บไว้ในสตรีมของ MVP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stream.history.map((frame) => (
              <button
                key={frame.id}
                className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                onClick={() => setStream((current) => ({ ...current, latest: frame }))}
              >
                <Image src={frame.imageUrl} alt="" width={160} height={90} unoptimized className="h-14 w-24 rounded object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{frame.id}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{new Date(frame.timestamp).toLocaleTimeString()}</span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>แผนพัฒนาสตรีมกล้อง</CardTitle>
            <CardDescription>ตัวเลือกกล้องสำหรับเวอร์ชันผลิตจริงหลัง MVP</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stream.roadmap.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
                <span>{item}</span>
                <Badge tone="muted">อนาคต</Badge>
              </div>
            ))}
            <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              ภาพนิ่งที่บันทึกในรอบนี้: <span className="font-semibold">{snapshotCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function robotStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Idle: "พักระบบ",
    Moving: "กำลังเคลื่อนที่",
    Cleaning: "กำลังทำความสะอาด",
    Inspecting: "กำลังตรวจสอบ",
    Charging: "กำลังชาร์จ",
  };

  return labels[status] ?? status;
}

function OverlayPill({ icon: Icon, value }: { icon: ElementType; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded bg-slate-950/75 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-cyan-300" />
      {value}
    </span>
  );
}

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

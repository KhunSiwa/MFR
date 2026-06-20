"use client";

import { useState } from "react";
import { Pause, Play, Square, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RobotActions() {
  const [state, setState] = useState<"Ready" | "Running" | "Paused" | "Stopped" | "Emergency Stop">("Ready");
  const stateLabel = {
    Ready: "พร้อม",
    Running: "กำลังทำงาน",
    Paused: "หยุดชั่วคราว",
    Stopped: "หยุดแล้ว",
    "Emergency Stop": "หยุดฉุกเฉิน",
  }[state];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>ควบคุมภารกิจ</CardTitle>
            <CardDescription>ชุดควบคุม MVP สำหรับลำดับการทำงานของหุ่นยนต์</CardDescription>
          </div>
          <Badge tone={state === "Emergency Stop" ? "critical" : state === "Running" ? "good" : "default"}>{stateLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Button className="h-14 rounded-2xl" onClick={() => setState("Running")}><Play className="h-4 w-4" />เริ่ม</Button>
        <Button className="h-14 rounded-2xl" variant="secondary" onClick={() => setState("Paused")}><Pause className="h-4 w-4" />พัก</Button>
        <Button className="h-14 rounded-2xl" variant="secondary" onClick={() => setState("Stopped")}><Square className="h-4 w-4" />หยุด</Button>
        <Button className="h-14 rounded-2xl" variant="destructive" onClick={() => setState("Emergency Stop")}><TriangleAlert className="h-4 w-4" />หยุดฉุกเฉิน</Button>
      </CardContent>
    </Card>
  );
}

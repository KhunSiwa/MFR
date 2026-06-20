"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Bot, ScanSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InspectionImage } from "@/lib/types";
import { defectColor, defectTypeLabel, formatDate } from "@/lib/utils";

export function AnalysisPanel({ images }: { images: InspectionImage[] }) {
  const detectedImages = images.filter((image) => image.detections.length > 0);
  const [imageId, setImageId] = useState(detectedImages[0]?.id ?? images[0]?.id);
  const selected = useMemo(
    () => images.find((image) => image.id === imageId) ?? images[0],
    [imageId, images],
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>ผลการตรวจจับด้วย AI</CardTitle>
            <CardDescription>เปรียบเทียบภาพกล้องต้นฉบับกับภาพผลลัพธ์ที่ระบุตำหนิ</CardDescription>
          </div>
          <Select value={selected.id} onValueChange={setImageId}>
            <SelectTrigger className="md:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {detectedImages.map((image) => (
                <SelectItem key={image.id} value={image.id}>
                  {image.id} · {image.zoneId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <ImageFrame title="ภาพต้นฉบับ" src={selected.originalUrl} />
            <ImageFrame title="ภาพที่ตรวจจับแล้ว" src={selected.detectedUrl} detections={selected.detections} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-500" />
            <CardTitle>วัตถุที่ตรวจพบ</CardTitle>
          </div>
          <CardDescription>
            รอบตรวจ {selected.robotPass.replace("Pass", "รอบ")} บันทึกเมื่อ {formatDate(selected.capturedAt)} ในโซน {selected.zoneId}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected.detections.map((detection, index) => (
            <div key={`${detection.type}-${index}`} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: defectColor(detection.type) }}
                  />
                  <span className="font-medium">{defectTypeLabel(detection.type)}</span>
                </div>
                <Badge tone={detection.confidence > 0.92 ? "critical" : "default"}>
                  {Math.round(detection.confidence * 100)}%
                </Badge>
              </div>
              <div className="mt-3">
                <Progress value={Math.round(detection.confidence * 100)} />
              </div>
            </div>
          ))}
          <div className="rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <ScanSearch className="mb-2 h-5 w-5 text-cyan-500" />
            โมเดล AI ระบุรอยแตกร้าว สนิม น้ำรั่วซึม และซิลิโคนเสียหาย พร้อมพิกัดกรอบตรวจจับสำหรับทีมบำรุงรักษา
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ImageFrame({
  title,
  src,
  detections,
}: {
  title: string;
  src: string;
  detections?: InspectionImage["detections"];
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
        <Image src={src} alt={title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
        {detections?.map((detection, index) => (
          <div
            key={`${detection.type}-${index}`}
            className="absolute"
            style={{
              left: `${detection.bbox[0]}%`,
              top: `${detection.bbox[1]}%`,
              width: `${detection.bbox[2]}%`,
              height: `${detection.bbox[3]}%`,
            }}
          >
            <span
              className="absolute -inset-3 rounded-full border-[6px] border-dashed opacity-95"
              style={{ borderColor: defectColor(detection.type) }}
              aria-hidden
            />
            <span
              className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[calc(100%+0.4rem)] whitespace-nowrap rounded-md bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-100 shadow-xl dark:bg-slate-950"
            >
              {defectTypeLabel(detection.type)}
            </span>
            <span
              className="absolute left-1/2 top-0 h-3 w-1 -translate-x-1/2 -translate-y-1 rounded-full"
              style={{ backgroundColor: defectColor(detection.type) }}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
}

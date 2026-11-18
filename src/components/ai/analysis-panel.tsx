"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, RefreshCw, ScanSearch, ShieldAlert, Upload, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DefectType, InspectionImage } from "@/lib/types";
import { defectColor, defectTypeLabel, formatDate } from "@/lib/utils";

type V1Sample = {
  sample_id: string;
  tier: string;
  label_status: string;
  source_group: string;
  url: string;
};

type V1Inspection = {
  inspection_id: number;
  source_name: string;
  source_type: string;
  inference_ms: number;
  model_tier: string;
  real_dataset_trained: boolean;
  disclaimer: string;
  operator_review_status: string;
  class_probabilities: Record<string, number>;
  detections: {
    id: number;
    class_id: number;
    class_name: string;
    confidence: number;
    bbox: { cx: number; cy: number; w: number; h: number };
  }[];
  created_at: string;
};

function mapAiClassToDefectType(name: string): DefectType {
  const n = name.toLowerCase();
  if (n.includes("crack")) return "Crack";
  if (n.includes("rust")) return "Rust";
  if (n.includes("sealant")) return "Silicone Deterioration";
  if (n.includes("water")) return "Water Stain";
  return "Dirt Accumulation";
}

export function AnalysisPanel({ images }: { images: InspectionImage[] }) {
  const detectedImages = images.filter((image) => image.detections.length > 0);
  const [imageId, setImageId] = useState(detectedImages[0]?.id ?? images[0]?.id);
  const selectedStatic = useMemo(
    () => images.find((image) => image.id === imageId) ?? images[0],
    [imageId, images],
  );

  // Live AI 06 PyTorch state
  const [samples, setSamples] = useState<V1Sample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>("");
  const [liveResult, setLiveResult] = useState<{
    inspection: V1Inspection;
    imageUrl: string;
  } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        const sRes = await fetch("/api/mfr-v1/samples", { cache: "no-store" });
        if (!sRes.ok || cancelled) return;
        const list: V1Sample[] = await sRes.json();
        if (cancelled) return;
        setSamples(list);
        if (list.length > 0) {
          const first = list.find((s) => s.source_group === "smoke_fixture") ?? list[0];
          setSelectedSampleId((prev) => prev || first.sample_id);
        }
      } catch {
        // Backend optional fallback preserves existing view
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  const runSampleAi06 = async (sampleIdArg?: string) => {
    const sid = sampleIdArg ?? selectedSampleId;
    if (!sid) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const fd = new FormData();
      fd.append("sample_id", sid);
      const res = await fetch("/api/mfr-v1/infer", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "AI 06 inference failed");
      setLiveResult({
        inspection: data,
        imageUrl: `/api/mfr-v1/sample-images/${encodeURIComponent(sid)}`,
      });
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed AI 06 inference");
    } finally {
      setAiBusy(false);
    }
  };

  const runUploadAi06 = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreviewUrl = URL.createObjectURL(file);
    setAiBusy(true);
    setAiError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/mfr-v1/infer", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "AI 06 upload inference failed");
      setLiveResult({
        inspection: data,
        imageUrl: localPreviewUrl,
      });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAiBusy(false);
    }
  };

  const reviewLiveInspection = async (status: "CONFIRMED" | "DISMISSED") => {
    if (!liveResult) return;
    const res = await fetch(`/api/mfr-v1/inspections/${liveResult.inspection.inspection_id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_review_status: status }),
    });
    if (res.ok) {
      const updated: V1Inspection = await res.json();
      setLiveResult({ ...liveResult, inspection: updated });
    }
  };

  const displayOriginalUrl = liveResult ? liveResult.imageUrl : selectedStatic.originalUrl;
  const displayDetectedUrl = liveResult ? liveResult.imageUrl : selectedStatic.detectedUrl;
  const displayDetections = liveResult
    ? liveResult.inspection.detections.map((d) => ({
        type: mapAiClassToDefectType(d.class_name),
        rawLabel: d.class_name,
        confidence: d.confidence,
        bbox: [
          Math.max(2, (d.bbox.cx - d.bbox.w * 0.5) * 100),
          Math.max(4, (d.bbox.cy - d.bbox.h * 0.5) * 100),
          Math.max(12, Math.min(92, d.bbox.w * 100)),
          Math.max(12, Math.min(92, d.bbox.h * 100)),
        ] as [number, number, number, number],
      }))
    : selectedStatic.detections.map((d) => ({
        type: d.type,
        rawLabel: defectTypeLabel(d.type),
        confidence: d.confidence,
        bbox: d.bbox,
      }));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>ผลการตรวจจับด้วย AI 06 (PyTorch MFRDefectNet)</CardTitle>
              <CardDescription>
                เปรียบเทียบภาพกล้องต้นฉบับกับภาพผลลัพธ์ที่ระบุตำหนิ (อัปโหลดภาพหรือเลือกภาพทดสอบเพื่อรัน AI จริง)
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {liveResult ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => setLiveResult(null)}>
                  กลับไปชุดภาพสาธิต
                </Button>
              ) : (
                <Select value={selectedStatic.id} onValueChange={setImageId}>
                  <SelectTrigger className="md:w-48">
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
              )}
            </div>
          </div>

          {/* Real AI 06 Live Runner Bar directly inside AnalysisPanel */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs">
            <select
              aria-label="เลือกภาพตัวอย่าง AI 06"
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="h-9 max-w-[260px] rounded-xl border border-slate-200 bg-white px-2.5 dark:border-white/10 dark:bg-slate-900"
            >
              {samples.length === 0 ? (
                <option value="">กำลังเชื่อมต่อ AI 06...</option>
              ) : (
                samples.map((s) => (
                  <option key={s.sample_id} value={s.sample_id}>
                    {s.sample_id} ({s.source_group === "smoke_fixture" ? "Smoke Sample" : "Facade Audit"})
                  </option>
                ))
              )}
            </select>
            <Button type="button" size="sm" disabled={aiBusy || !selectedSampleId} onClick={() => runSampleAi06()}>
              {aiBusy ? <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="mr-1.5 h-3.5 w-3.5" />}
              ตรวจจับด้วย AI 06 จริง
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 font-medium hover:bg-slate-100 dark:border-white/10 dark:bg-slate-900 dark:hover:bg-white/10">
              <Upload className="h-3.5 w-3.5 text-cyan-500" /> อัปโหลดภาพตรวจความผิดปกติ
              <input type="file" accept="image/*" className="hidden" onChange={runUploadAi06} />
            </label>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-950 dark:text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>AI 06 Advisory Only:</strong> NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES · ใช้ช่วยแจ้งเตือนผู้ควบคุมเท่านั้น ห้ามสั่งหยุดฉุกเฉินหรือขับเคลื่อนมอเตอร์โดยตรง
            </span>
          </div>
          {aiError && <div className="text-xs text-rose-500">{aiError}</div>}
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <ImageFrame title="ภาพต้นฉบับ" src={displayOriginalUrl} />
            <ImageFrame title="ภาพที่ตรวจจับแล้ว (AI 06 ROI)" src={displayDetectedUrl} detections={displayDetections} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-cyan-500" />
              <CardTitle>วัตถุที่ตรวจพบ</CardTitle>
            </div>
            {liveResult ? (
              <Badge tone={liveResult.inspection.operator_review_status === "CONFIRMED" ? "good" : "warning"}>
                {liveResult.inspection.operator_review_status}
              </Badge>
            ) : (
              <Badge tone="muted">DEMO SNAPSHOT</Badge>
            )}
          </div>
          <CardDescription>
            {liveResult
              ? `Inspection #${liveResult.inspection.inspection_id} · ${liveResult.inspection.source_name} · ${liveResult.inspection.inference_ms.toFixed(1)} ms`
              : `รอบตรวจ ${selectedStatic.robotPass.replace("Pass", "รอบ")} บันทึกเมื่อ ${formatDate(selectedStatic.capturedAt)} ในโซน ${selectedStatic.zoneId}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {displayDetections.map((detection, index) => (
            <div key={`${detection.rawLabel}-${index}`} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: defectColor(detection.type) }}
                  />
                  <span className="font-medium">
                    {liveResult ? `${detection.rawLabel} (${defectTypeLabel(detection.type)})` : defectTypeLabel(detection.type)}
                  </span>
                </div>
                <Badge tone={detection.confidence > 0.92 ? "critical" : "default"}>
                  {Math.round(detection.confidence * 100)}% conf
                </Badge>
              </div>
              <div className="mt-3">
                <Progress value={Math.round(detection.confidence * 100)} />
              </div>
            </div>
          ))}

          {liveResult && (
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
              <div className="font-semibold">ความน่าจะเป็น 5 คลาส (MFRDefectNet):</div>
              {Object.entries(liveResult.inspection.class_probabilities).map(([cls, prob]) => (
                <div key={cls} className="flex items-center justify-between">
                  <span>{cls}</span>
                  <span className="font-mono">{(prob * 100).toFixed(1)}%</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => reviewLiveInspection("CONFIRMED")}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> ยืนยันผลตรวจ
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => reviewLiveInspection("DISMISSED")}>
                  <XCircle className="mr-1 h-3.5 w-3.5" /> ปฏิเสธ (Dismiss)
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-slate-100 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            <ScanSearch className="mb-2 h-5 w-5 text-cyan-500" />
            โมเดล AI 06 ระบุ 5 ประเภท: รอยแตกร้าว (Crack), ซิลิโคนเสื่อม (Sealant), สนิม (Rust), คราบน้ำ (Water stain) และพื้นผิวปกติ (Normal) พร้อมกรอบตรวจจับสำหรับทีมบำรุงรักษา
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
  detections?: { type: DefectType; rawLabel: string; confidence: number; bbox: [number, number, number, number] }[];
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-950 dark:border-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={title} className="h-full w-full object-contain" />
        {detections?.map((detection, index) => (
          <div
            key={`${detection.rawLabel}-${index}`}
            className="absolute"
            style={{
              left: `${detection.bbox[0]}%`,
              top: `${detection.bbox[1]}%`,
              width: `${detection.bbox[2]}%`,
              height: `${detection.bbox[3]}%`,
            }}
          >
            <span
              className="absolute -inset-1 rounded-xl border-4 border-dashed opacity-95"
              style={{ borderColor: defectColor(detection.type) }}
              aria-hidden
            />
            <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[calc(100%+0.3rem)] whitespace-nowrap rounded-md bg-slate-950/90 px-2.5 py-1 text-[11px] font-bold text-slate-100 shadow-xl">
              {detection.rawLabel} ({Math.round(detection.confidence * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

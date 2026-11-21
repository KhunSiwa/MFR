"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Droplets,
  OctagonAlert,
  Play,
  RefreshCw,
  ShieldAlert,
  Square,
  Upload,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building3DViewport,
  type BuildingSpec,
  type DefectMarker3D,
  type FacadePanel3D,
} from "./building-3d-viewport";

type ProgressMetrics = {
  total_zones: number;
  completed_zones: number;
  pending_zones: number;
  defects_detected: number;
  human_confirmed_defects: number;
  images_collected: number;
};

type WorkPlanItem = {
  id: number;
  task_code: string;
  building_id: number;
  facade_code: string;
  floor_number: number;
  zone_code: string;
  panel_id: number | null;
  defect_location_id: number | null;
  mission_type: "INSPECTION" | "CLEANING";
  defect_type: string;
  decision_type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigned_module: string;
  estimated_duration_min: number;
  status: string;
  human_approved: boolean;
  verification_notes?: string | null;
};

type SessionItem = {
  id: number;
  session_code: string;
  facade_code: string;
  status: string;
  captures_count: number;
  camera_source: string;
  started_at: string;
};

type HardwareResponse = {
  live_hal: {
    simulation_mode: boolean;
    physical_outputs_armed: boolean;
    estop_engaged: boolean;
    last_command: string;
    esp32_s3: { board: string; transport: string; connected: boolean; pins_verified: boolean; usb_host_uvc_supported_for_prod: boolean };
    driving_system: { driver: string; pwm_hz: number; left_pct: number; right_pct: number; encoder_ticks: number[]; motor_spec_verified: boolean };
    impeller_esc: { armed: boolean; pulse_us: number; bench_verified: boolean };
    cleaner_module: { state: string; simulation_mode: boolean; physical_driver_compatible: boolean; compatibility_note: string; estop_engaged: boolean; elapsed_sec: number; max_duration_sec: number; last_error?: string | null };
  };
  inventory_audit: { component: string; verification_state: string; simulation_mode: boolean; details: Record<string, unknown> }[];
};

const WORK_STATUSES = [
  "Pending",
  "Planned",
  "Ready for review",
  "In progress",
  "Completed",
  "Requires human verification",
] as const;

const DECISIONS = [
  "Inspection required",
  "Cleaning appropriate",
  "Repair required",
  "Human assessment required",
] as const;

export function WorkPlanningConsole() {
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [building, setBuilding] = useState<BuildingSpec | null>(null);
  const [progress, setProgress] = useState<ProgressMetrics | null>(null);
  const [panels, setPanels] = useState<FacadePanel3D[]>([]);
  const [markers, setMarkers] = useState<DefectMarker3D[]>([]);
  const [workPlans, setWorkPlans] = useState<WorkPlanItem[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [hw, setHw] = useState<HardwareResponse | null>(null);

  // Selection & Calibration state
  const [selectedFacade, setSelectedFacade] = useState<string>("ALL");
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedPanelId, setSelectedPanelId] = useState<number | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null);

  // Review form state for clicked marker
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewDecision, setReviewDecision] = useState<string>("Human assessment required");
  const [reviewPanelId, setReviewPanelId] = useState<number | "">("");

  // Webcam & Capture state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camLive, setCamLive] = useState(false);
  const [camMessage, setCamMessage] = useState("USB Webcam: Ready to connect host/browser or capture diagnostic fixture.");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [positionMode, setPositionMode] = useState<"MANUAL_ASSIGNED" | "ESTIMATED">("MANUAL_ASSIGNED");
  const [capturePreset, setCapturePreset] = useState<string>("S04_audit_tile_00.png");
  const [autoIntervalSec, setAutoIntervalSec] = useState<number>(0);
  const [busyAction, setBusyAction] = useState(false);

  // Create work plan form state
  const [newTaskMission, setNewTaskMission] = useState<"INSPECTION" | "CLEANING">("INSPECTION");
  const [newTaskDefect, setNewTaskDefect] = useState("Sealant deterioration");
  const [newTaskPriority, setNewTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("MEDIUM");
  const [newTaskDuration, setNewTaskDuration] = useState(20);
  const [newTaskNotes, setNewTaskNotes] = useState("");

  // Lower Engineering Sub-Tab
  const [activeTab, setActiveTab] = useState<"camera" | "planning" | "hardware">("camera");
  const [driveSpeedPct, setDriveSpeedPct] = useState(35);
  const [impellerPct, setImpellerPct] = useState(0);
  const [hwFiles, setHwFiles] = useState<{ root: string; count: number; files: { path: string; size_bytes: number; category: string }[] } | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const bRes = await fetch("/api/mfr/buildings", { cache: "no-store" });
      if (!bRes.ok) {
        const err = await bRes.json().catch(() => ({}));
        throw new Error(err.detail || err.error || `Backend HTTP ${bRes.status}`);
      }
      const bJson = await bRes.json();
      const firstB = bJson.items?.[0];
      if (!firstB) throw new Error("No building records found.");
      setBuilding(firstB);
      setProgress(firstB.progress);

      const [facRes, defRes, wpRes, sessRes, hwRes, hwFilesRes] = await Promise.all([
        fetch(`/api/mfr/buildings/${firstB.id}/facades`, { cache: "no-store" }),
        fetch(`/api/mfr/defects?building_id=${firstB.id}`, { cache: "no-store" }),
        fetch(`/api/mfr/work-plans?building_id=${firstB.id}`, { cache: "no-store" }),
        fetch(`/api/mfr/inspection/sessions`, { cache: "no-store" }),
        fetch(`/api/mfr/robot/hardware-status`, { cache: "no-store" }),
        fetch(`/api/mfr/hardware/files`, { cache: "no-store" }),
      ]);

      const [facJson, defJson, wpJson, sessJson, hwJson, hwFilesJson] = await Promise.all([
        facRes.json(),
        defRes.json(),
        wpRes.json(),
        sessRes.json(),
        hwRes.json(),
        hwFilesRes.ok ? hwFilesRes.json() : Promise.resolve(null),
      ]);

      setPanels(facJson.panels ?? []);
      setMarkers(defJson.items ?? []);
      setWorkPlans(wpJson.items ?? []);
      setSessions(sessJson.items ?? []);
      setHw(hwJson);
      setHwFiles(hwFilesJson);

      if ((facJson.panels ?? []).length > 0) {
        setSelectedPanelId((prev) => prev ?? facJson.panels[0].id);
      }
      const activeSess = (sessJson.items ?? []).find((s: SessionItem) => s.status === "ACTIVE");
      if (activeSess) setActiveSessionId(activeSess.id);
      setBackendError(null);
    } catch (e) {
      setBackendError(e instanceof Error ? e.message : "Failed to load MFR backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const selectedPanel = useMemo(
    () => panels.find((p) => p.id === selectedPanelId) ?? panels[0] ?? null,
    [panels, selectedPanelId],
  );

  const selectedMarker = useMemo(
    () => markers.find((m) => m.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId],
  );

  const selectMarker = useCallback((m: DefectMarker3D | null) => {
    setSelectedMarkerId(m ? m.id : null);
    if (m) {
      setReviewDecision(m.decision_type);
      setReviewNotes(m.notes ?? "");
      setReviewPanelId(m.panel_id);
    }
  }, []);

  const startWebcam = async () => {
    setNotice(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCamMessage("Browser MediaDevices unavailable; host OpenCV/fixture capture remains ready.");
      setCamLive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamLive(true);
      setCamMessage("USB / Host Webcam active. Images are saved with timestamps & selected facade panel.");
    } catch (err) {
      setCamLive(false);
      setCamMessage(
        `Camera access disconnected or unavailable (${err instanceof Error ? err.message : "no device"}). Host fixture capture available for safe workflow verification.`,
      );
    }
  };

  const stopWebcam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamLive(false);
    setCamMessage("Webcam preview stopped.");
  };

  const grabBrowserSnapshotBase64 = (): string | undefined => {
    if (!camLive || !videoRef.current || videoRef.current.videoWidth === 0) return undefined;
    const c = document.createElement("canvas");
    c.width = videoRef.current.videoWidth;
    c.height = videoRef.current.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(videoRef.current, 0, 0);
    return c.toDataURL("image/png");
  };

  const handleStartSession = async () => {
    if (!building) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/mfr/inspection/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: building.id,
          facade_code: selectedFacade === "ALL" ? "NORTH" : selectedFacade,
          operator_name: "MFR Engineer",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Failed to start session");
      setActiveSessionId(json.session_id);
      setNotice(`Started inspection session ${json.session_code}`);
      await loadAll();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Session start failed");
    } finally {
      setBusyAction(false);
    }
  };

  const handleStopSession = async () => {
    if (!activeSessionId) return;
    setBusyAction(true);
    try {
      await fetch("/api/mfr/inspection/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSessionId }),
      });
      setActiveSessionId(null);
      setAutoIntervalSec(0);
      setNotice("Stopped inspection session.");
      await loadAll();
    } finally {
      setBusyAction(false);
    }
  };

  const captureAndAnalyze = useCallback(
    async (customBase64?: string) => {
      if (!building || !selectedPanel) return;
      setBusyAction(true);
      setNotice(null);
      try {
        const snap = customBase64 ?? (capturePreset === "LIVE_WEBCAM" ? grabBrowserSnapshotBase64() : undefined);
        const capRes = await fetch("/api/mfr/inspection/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: activeSessionId,
            building_id: building.id,
            panel_id: selectedPanel.id,
            facade_code: selectedPanel.face_code,
            floor_number: selectedPanel.floor_number,
            position_mode: positionMode,
            sample_name: !snap && capturePreset !== "LIVE_WEBCAM" ? capturePreset : undefined,
            image_base64: snap,
            allow_fallback: true,
          }),
        });
        const capJson = await capRes.json();
        if (!capRes.ok) throw new Error(capJson.detail || "Capture failed");
        if (!activeSessionId) setActiveSessionId(capJson.session_id);

        const anRes = await fetch("/api/mfr/inspection/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capture_id: capJson.capture_id }),
        });
        const anJson = await anRes.json();
        if (!anRes.ok) throw new Error(anJson.detail || "AI analysis failed");

        const firstMarker = anJson.markers?.[0];
        if (firstMarker) {
          setSelectedMarkerId(firstMarker.id);
          setNotice(
            `Captured ${selectedPanel.panel_code} -> AI 06 detected "${firstMarker.defect_category}" (${(firstMarker.confidence * 100).toFixed(1)}% conf, ADVISORY — requires human verification).`,
          );
        }
        await loadAll();
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Capture/analysis error");
      } finally {
        setBusyAction(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSessionId, building, camLive, capturePreset, loadAll, positionMode, selectedPanel],
  );

  // Interval automatic capture when enabled
  useEffect(() => {
    if (autoIntervalSec <= 0) return;
    const id = window.setInterval(() => {
      if (!busyAction) captureAndAnalyze();
    }, autoIntervalSec * 1000);
    return () => window.clearInterval(id);
  }, [autoIntervalSec, busyAction, captureAndAnalyze]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        captureAndAnalyze(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReviewMarker = async (action: "CONFIRM" | "DISMISS" | "MARK_NORMAL", createPlan = false) => {
    if (!selectedMarker) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/mfr/inspection/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defect_location_id: selectedMarker.id,
          action,
          panel_id: reviewPanelId === "" ? undefined : Number(reviewPanelId),
          decision_type: reviewDecision,
          notes: reviewNotes,
          auto_create_work_plan: createPlan,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Review update failed");
      setNotice(
        json.auto_created_work_plan
          ? `Marker #${selectedMarker.id} updated (${json.verification_status}) & work plan ${json.auto_created_work_plan} created.`
          : `Marker #${selectedMarker.id} saved as ${json.verification_status}.`,
      );
      await loadAll();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreateWorkPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building || !selectedPanel) return;
    setBusyAction(true);
    try {
      const res = await fetch("/api/mfr/work-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          building_id: building.id,
          facade_code: selectedPanel.face_code,
          floor_number: selectedPanel.floor_number,
          zone_code: selectedPanel.zone_code,
          panel_id: selectedPanel.id,
          defect_location_id: selectedMarker?.id ?? null,
          mission_type: newTaskMission,
          defect_type: newTaskDefect,
          decision_type: newTaskMission === "CLEANING" ? "Cleaning appropriate" : "Inspection required",
          priority: newTaskPriority,
          assigned_module: newTaskMission === "CLEANING" ? "CLEANER_L9110S" : "INSPECTION_CAM",
          estimated_duration_min: newTaskDuration,
          status: "Planned",
          verification_notes: newTaskNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Could not create work plan");
      setNewTaskNotes("");
      setNotice(`Created ${json.mission_type} task ${json.task_code}`);
      await loadAll();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusyAction(false);
    }
  };

  const updateWorkPlanField = async (planId: number, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/mfr/work-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json.detail || "Failed to update task");
      return;
    }
    await loadAll();
  };

  const sendCleanerAction = async (workPlanId: number, action: "START_SIMULATION" | "STOP" | "EMERGENCY_STOP") => {
    const res = await fetch("/api/mfr/cleaner/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_plan_id: workPlanId, action, duration_sec: 8.0, human_approved: action === "START_SIMULATION" }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json.detail || "Cleaner command rejected");
      return;
    }
    setNotice(`Cleaner state: ${json.cleaner?.state} (${json.path_summary || "updated"})`);
    await loadAll();
  };

  const sendRobotCommand = async (command: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/mfr/robot/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, left_pct: driveSpeedPct, right_pct: driveSpeedPct, impeller_pct: impellerPct, ...extra }),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(`Robot Guard: ${json.detail || "Command blocked"}`);
      return;
    }
    setNotice(`Backend HAL [${command}] -> simulation=${json.hardware?.simulation_mode}, estop=${json.hardware?.estop_engaged}`);
    await loadAll();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-12 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-500" />
          กำลังเชื่อมต่อ MFR FastAPI Backend & 3D Building Mapping...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Truthfulness & Safety Notice Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-950 dark:text-amber-100 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <div className="font-semibold">
              AI 06 Status: NOT TRAINED / NOT EVALUATED ON REAL BUILDING IMAGES (Smoke-Test Fixture Advisory Only)
            </div>
            <div className="mt-0.5 text-xs opacity-85">
              Hardware physical motor/pump outputs remain DISABLED (Simulation Mode Default) until ZK-BM1, 25GA, ESC, and L9110S specs are verified.
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={loadAll}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> รีเฟรชข้อมูล
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={() => sendRobotCommand("ESTOP")}
          >
            <OctagonAlert className="mr-1.5 h-4 w-4" /> EMERGENCY STOP
          </Button>
        </div>
      </div>

      {backendError && (
        <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300">
          <strong>Backend Connection Issue:</strong> {backendError} (ตรวจสอบ FastAPI ที่ <code>127.0.0.1:8000</code>)
        </div>
      )}

      {notice && (
        <div className="flex items-center justify-between rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-950 dark:text-cyan-100">
          <span>{notice}</span>
          <button type="button" className="ml-4 font-semibold underline" onClick={() => setNotice(null)}>
            ปิด
          </button>
        </div>
      )}

      {/* Inspection Progress KPIs (Real DB Counts) */}
      {progress && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { label: "Total Zones / Panels", val: progress.total_zones, tone: "text-slate-900 dark:text-white" },
            { label: "Completed Zones", val: progress.completed_zones, tone: "text-emerald-600 dark:text-emerald-400" },
            { label: "Pending Zones", val: progress.pending_zones, tone: "text-amber-600 dark:text-amber-400" },
            { label: "Defects Detected (AI)", val: progress.defects_detected, tone: "text-cyan-600 dark:text-cyan-400" },
            { label: "Human-Confirmed Defects", val: progress.human_confirmed_defects, tone: "text-rose-600 dark:text-rose-400" },
            { label: "Images Collected", val: progress.images_collected, tone: "text-indigo-600 dark:text-indigo-400" },
          ].map((k) => (
            <Card key={k.label} className="p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{k.label}</div>
              <div className={`mt-1 text-2xl font-bold ${k.tone}`}>{k.val}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Main Split Workspace: A) 3D Building Viewport + B) Defect/Panel Inspector */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>{building?.name ?? "3D Facade Mapping Workspace"}</CardTitle>
                <CardDescription>
                  Stage A–C: Configurable Building Model ({building?.width_m}×{building?.depth_m}m, {building?.floors_count} Floors) · Select Facade/Floor/Panel or Click 3D Markers
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Select Facade"
                  value={selectedFacade}
                  onChange={(e) => setSelectedFacade(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium dark:border-white/10 dark:bg-slate-900"
                >
                  <option value="ALL">ทุกด้าน (ALL FACADES)</option>
                  <option value="NORTH">NORTH (ด้านหน้า)</option>
                  <option value="EAST">EAST (ด้านขวา)</option>
                  <option value="SOUTH">SOUTH (ด้านหลัง)</option>
                  <option value="WEST">WEST (ด้านซ้าย)</option>
                </select>
                <select
                  aria-label="Select Floor"
                  value={selectedFloor ?? ""}
                  onChange={(e) => setSelectedFloor(e.target.value ? Number(e.target.value) : null)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium dark:border-white/10 dark:bg-slate-900"
                >
                  <option value="">ทุกชั้น (ALL FLOORS)</option>
                  {Array.from({ length: building?.floors_count ?? 6 }, (_, i) => i + 1).map((fl) => (
                    <option key={fl} value={fl}>
                      Floor {fl}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Select Panel"
                  value={selectedPanelId ?? ""}
                  onChange={(e) => setSelectedPanelId(e.target.value ? Number(e.target.value) : null)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium dark:border-white/10 dark:bg-slate-900"
                >
                  {panels
                    .filter((p) => (selectedFacade === "ALL" || p.face_code === selectedFacade) && (selectedFloor === null || p.floor_number === selectedFloor))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.panel_code} ({p.zone_code})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {building && (
              <Building3DViewport
                building={building}
                panels={panels}
                markers={markers}
                selectedFacade={selectedFacade}
                selectedFloor={selectedFloor}
                selectedPanelId={selectedPanelId}
                selectedMarkerId={selectedMarkerId}
                onSelectPanel={(p) => {
                  setSelectedPanelId(p.id);
                  setSelectedFacade(p.face_code);
                  setSelectedFloor(p.floor_number);
                  const matchingMarker = markers.find((m) => m.panel_id === p.id) ?? null;
                  selectMarker(matchingMarker);
                }}
                onSelectMarker={(m) => {
                  selectMarker(m);
                  setSelectedPanelId(m.panel_id);
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Right Inspector: Selected Marker OR Selected Panel Details + Human Verification */}
        <Card className="flex flex-col">
          <CardHeader className="border-b border-slate-200 pb-4 dark:border-white/10">
            <CardTitle className="text-base">
              {selectedMarker ? `Defect Marker #${selectedMarker.id} — ${selectedMarker.panel_code}` : `Zone / Panel Inspector`}
            </CardTitle>
            <CardDescription>
              {selectedMarker
                ? "AI predictions remain advisory until confirmed or dismissed by a human operator."
                : "Select a 3D panel or marker to inspect captured imagery and assign work plans."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4 pt-4">
            {selectedMarker ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={selectedMarker.defect_category === "Crack" ? "critical" : selectedMarker.verification_status === "NORMAL_VERIFIED" ? "good" : "warning"}>
                    {selectedMarker.defect_category}
                  </Badge>
                  <Badge tone={selectedMarker.verification_status === "CONFIRMED" ? "good" : "default"}>
                    {selectedMarker.verification_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-slate-900/70">
                  <div>
                    <span className="text-slate-500">Location / Floor:</span>
                    <div className="font-semibold">{selectedMarker.facade_code} · F{selectedMarker.floor_number}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Confidence (Not Accuracy):</span>
                    <div className="font-semibold">{(selectedMarker.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Panel / Mode:</span>
                    <div className="font-semibold">{selectedMarker.panel_code} ({selectedMarker.position_mode})</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Captured At:</span>
                    <div className="font-semibold">{new Date(selectedMarker.inspected_at).toLocaleTimeString()}</div>
                  </div>
                </div>

                {/* Original vs Annotated Image Comparison */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-slate-500">Original Capture</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMarker.original_url}
                      alt="Original facade capture"
                      className="h-32 w-full rounded-xl border border-slate-200 object-cover dark:border-white/10"
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-slate-500">AI 06 Annotated</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedMarker.annotated_url}
                      alt="Annotated defect detection"
                      className="h-32 w-full rounded-xl border border-slate-200 object-cover dark:border-white/10"
                    />
                  </div>
                </div>

                {/* Manual Position Correction & Decision Classification */}
                <div className="space-y-2 text-xs">
                  <label className="block font-medium text-slate-600 dark:text-slate-300">
                    Reassign Panel (Manual Position Correction)
                    <select
                      value={reviewPanelId}
                      onChange={(e) => setReviewPanelId(e.target.value ? Number(e.target.value) : "")}
                      className="mt-1 h-9 w-full truncate rounded-xl border border-slate-200 bg-white pr-8 pl-2.5 dark:border-white/10 dark:bg-slate-900"
                    >
                      {panels.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.panel_code} ({p.face_code} F{p.floor_number})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block font-medium text-slate-600 dark:text-slate-300">
                    Maintenance Decision Classification
                    <select
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value)}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 dark:border-white/10 dark:bg-slate-900"
                    >
                      {DECISIONS.map((dec) => (
                        <option key={dec} value={dec}>
                          {dec}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block font-medium text-slate-600 dark:text-slate-300">
                    Verification Notes
                    <textarea
                      rows={2}
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-slate-900"
                      placeholder="Add engineering inspection notes..."
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button type="button" size="sm" disabled={busyAction} onClick={() => handleReviewMarker("CONFIRM", true)}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Confirm & Plan
                  </Button>
                  <Button type="button" variant="secondary" size="sm" disabled={busyAction} onClick={() => handleReviewMarker("MARK_NORMAL", false)}>
                    Verified Normal
                  </Button>
                  <Button type="button" variant="secondary" size="sm" disabled={busyAction} onClick={() => handleReviewMarker("DISMISS", false)}>
                    <XCircle className="mr-1.5 h-3.5 w-3.5" /> Dismiss
                  </Button>
                  <Button type="button" variant="secondary" size="sm" disabled={busyAction} onClick={() => handleReviewMarker("CONFIRM", false)}>
                    Save Review
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3 text-xs text-slate-500 dark:text-slate-400">
                {selectedPanel ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/70">
                    <div className="font-semibold text-slate-900 dark:text-white">Selected Panel: {selectedPanel.panel_code}</div>
                    <div className="mt-1">Facade: {selectedPanel.face_code} · Floor {selectedPanel.floor_number} · {selectedPanel.zone_code}</div>
                    <div className="mt-1">Est. 3D Coordinates: ({selectedPanel.x_m}m, {selectedPanel.y_m}m, {selectedPanel.z_m}m)</div>
                  </div>
                ) : null}
                <p>No defect marker selected yet. Use the Camera & AI 06 Console below to capture a panel image and run defect inference.</p>
                {markers.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="font-semibold text-slate-700 dark:text-slate-200">Recent Defect Pins ({markers.length})</div>
                    {markers.slice(0, 5).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => selectMarker(m)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <span className="font-medium">{m.panel_code} · {m.defect_category}</span>
                        <Badge tone={m.verification_status === "CONFIRMED" ? "good" : "default"}>{m.verification_status}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lower Control Tabs: 1) Camera + AI 06  2) Work Planning + Cleaning  3) ESP32-S3 Hardware & Simulation */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={activeTab === "camera" ? "default" : "secondary"} onClick={() => setActiveTab("camera")}>
          <Camera className="mr-2 h-4 w-4" /> 1. USB Camera & AI 06 Inspection
        </Button>
        <Button type="button" variant={activeTab === "planning" ? "default" : "secondary"} onClick={() => setActiveTab("planning")}>
          <ClipboardList className="mr-2 h-4 w-4" /> 2. แผนงาน & Cleaner Missions ({workPlans.length})
        </Button>
        <Button type="button" variant={activeTab === "hardware" ? "default" : "secondary"} onClick={() => setActiveTab("hardware")}>
          <Cpu className="mr-2 h-4 w-4" /> 3. ESP32-S3 Drive & Cleaner Hardware HAL
        </Button>
      </div>

      {/* TAB 1: CAMERA CAPTURE & AI 06 INSPECTION */}
      {activeTab === "camera" && (
        <Card>
          <CardHeader>
            <CardTitle>USB Webcam Capture & AI 06 Defect Analysis</CardTitle>
            <CardDescription>
              Connect USB camera on the host computer/browser (not ESP32-S3 GPIO jumper wires), assign panel calibration coordinates, capture frames, and inspect with MFRDefectNet (AI 06).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[440px_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 dark:border-white/10">
                <video ref={videoRef} autoPlay playsInline muted className="h-64 w-full object-cover" />
                {!camLive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-300">
                    <Camera className="mb-2 h-8 w-8 text-cyan-400" />
                    <div>{camMessage}</div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!camLive ? (
                  <Button type="button" size="sm" onClick={startWebcam}>
                    <Play className="mr-1.5 h-3.5 w-3.5" /> Start Webcam Preview
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" size="sm" onClick={stopWebcam}>
                    <Square className="mr-1.5 h-3.5 w-3.5" /> Stop Preview
                  </Button>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/10">
                  <Upload className="h-3.5 w-3.5" /> Upload Frame
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                  <div className="text-slate-500">Target Building / Panel</div>
                  <div className="mt-1 font-semibold">{selectedPanel ? `${selectedPanel.panel_code} (${selectedPanel.face_code} F${selectedPanel.floor_number})` : "—"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                  <div className="text-slate-500">Localization Tag</div>
                  <select
                    value={positionMode}
                    onChange={(e) => setPositionMode(e.target.value as "MANUAL_ASSIGNED" | "ESTIMATED")}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold dark:border-white/10 dark:bg-slate-900"
                  >
                    <option value="MANUAL_ASSIGNED">MANUAL_ASSIGNED</option>
                    <option value="ESTIMATED">ESTIMATED (No SLAM)</option>
                  </select>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                  <div className="text-slate-500">Image Source / Preset</div>
                  <select
                    value={capturePreset}
                    onChange={(e) => setCapturePreset(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold dark:border-white/10 dark:bg-slate-900"
                  >
                    <option value="S04_audit_tile_00.png">Curtain Wall Facade #1</option>
                    <option value="S04_audit_tile_01.png">Curtain Wall Facade #2</option>
                    <option value="smoke_test_c0_00.png">Fixture: Crack</option>
                    <option value="smoke_test_c1_00.png">Fixture: Sealant</option>
                    <option value="smoke_test_c2_00.png">Fixture: Rust</option>
                    <option value="smoke_test_c3_00.png">Fixture: Water Stain</option>
                    <option value="smoke_test_c4_00.png">Fixture: Normal Glass</option>
                    <option value="LIVE_WEBCAM">Live USB / Host Webcam</option>
                  </select>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                  <div className="text-slate-500">Interval Capture</div>
                  <select
                    value={autoIntervalSec}
                    onChange={(e) => setAutoIntervalSec(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold dark:border-white/10 dark:bg-slate-900"
                  >
                    <option value={0}>Manual Trigger Only</option>
                    <option value={5}>Every 5 seconds</option>
                    <option value={10}>Every 10 seconds</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!activeSessionId ? (
                  <Button type="button" variant="secondary" disabled={busyAction} onClick={handleStartSession}>
                    Start Inspection Session
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" disabled={busyAction} onClick={handleStopSession}>
                    Stop Active Session (#{activeSessionId})
                  </Button>
                )}
                <Button type="button" disabled={busyAction || !selectedPanel} onClick={() => captureAndAnalyze()}>
                  <Camera className="mr-2 h-4 w-4" /> Capture & Run AI 06 Inspection
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 p-3 text-xs dark:border-white/10">
                <div className="font-semibold">Recent Sequential Sessions ({sessions.length})</div>
                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {sessions.slice(0, 4).map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-white/5">
                      <span>{s.session_code} ({s.facade_code})</span>
                      <Badge tone={s.status === "ACTIVE" ? "good" : "default"}>{s.status} · {s.captures_count} img</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 2: WORK PLANNING TABLE & CLEANING MISSIONS */}
      {activeTab === "planning" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">สร้างแผนงานใหม่ (Work Plan)</CardTitle>
              <CardDescription>
                Separates Inspection vs Cleaning vs Structural Repair. Structural cracks cannot be auto-cleaned.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateWorkPlan} className="space-y-3 text-xs">
                <label className="block font-medium">
                  Mission Type
                  <select
                    value={newTaskMission}
                    onChange={(e) => setNewTaskMission(e.target.value as "INSPECTION" | "CLEANING")}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 dark:border-white/10 dark:bg-slate-900"
                  >
                    <option value="INSPECTION">INSPECTION (สำรวจ/บันทึกภาพ)</option>
                    <option value="CLEANING">CLEANING (ทำความสะอาดด้วยโมดูล่าปั๊ม)</option>
                  </select>
                </label>
                <label className="block font-medium">
                  Target / Defect Type
                  <select
                    value={newTaskDefect}
                    onChange={(e) => setNewTaskDefect(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 dark:border-white/10 dark:bg-slate-900"
                  >
                    <option value="Water stain">Water stain</option>
                    <option value="Sealant deterioration">Sealant deterioration</option>
                    <option value="Rust / corrosion">Rust / corrosion</option>
                    <option value="Crack">Crack (Inspection/Repair ONLY)</option>
                    <option value="Pending Surface Check">Pending Surface Check</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block font-medium">
                    Priority
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 dark:border-white/10 dark:bg-slate-900"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </label>
                  <label className="block font-medium">
                    Est. Duration (min)
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={newTaskDuration}
                      onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                      className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 dark:border-white/10 dark:bg-slate-900"
                    />
                  </label>
                </div>
                <label className="block font-medium">
                  Verification Notes
                  <input
                    type="text"
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    placeholder={`Target panel ${selectedPanel?.panel_code ?? "N-F01-P01"}`}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 dark:border-white/10 dark:bg-slate-900"
                  />
                </label>
                <Button type="submit" className="w-full" disabled={busyAction}>
                  Add Work Plan ({selectedPanel?.panel_code ?? "Select Panel"})
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">รายการแผนงานปฏิบัติการบนผิวอาคาร (Editable Work Plans)</CardTitle>
              <CardDescription>All tasks persisted in SQLAlchemy/SQLite database across sessions.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-white/10">
                    <th className="py-2 pr-3">Task ID</th>
                    <th className="py-2 pr-3">Facade / Floor / Zone</th>
                    <th className="py-2 pr-3">Mission / Defect</th>
                    <th className="py-2 pr-3">Decision & Module</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workPlans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        ยังไม่มีแผนงาน — กรุณาตรวจจับหรือสร้างแผนงานจากแผงควบคุม
                      </td>
                    </tr>
                  ) : (
                    workPlans.map((wp) => (
                      <tr key={wp.id} className="border-b border-slate-100 dark:border-white/5">
                        <td className="py-2.5 pr-3 font-semibold">{wp.task_code}</td>
                        <td className="py-2.5 pr-3">
                          {wp.facade_code} · F{wp.floor_number} · {wp.zone_code}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={wp.mission_type === "CLEANING" ? "default" : "warning"}>{wp.mission_type}</Badge>
                          <div className="mt-1">{wp.defect_type} ({wp.estimated_duration_min}m)</div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="font-medium">{wp.decision_type}</div>
                          <div className="text-[11px] text-slate-500">{wp.assigned_module}</div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <select
                            aria-label={`Priority ${wp.task_code}`}
                            value={wp.priority}
                            onChange={(e) => updateWorkPlanField(wp.id, { priority: e.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-slate-900"
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                            <option value="CRITICAL">CRITICAL</option>
                          </select>
                        </td>
                        <td className="py-2.5 pr-3">
                          <select
                            aria-label={`Status ${wp.task_code}`}
                            value={wp.status}
                            onChange={(e) => updateWorkPlanField(wp.id, { status: e.target.value })}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-slate-900"
                          >
                            {WORK_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {wp.mission_type === "CLEANING" && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => sendCleanerAction(wp.id, "START_SIMULATION")}
                              >
                                <Droplets className="mr-1 h-3 w-3" /> Sim Clean
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => updateWorkPlanField(wp.id, { status: "Completed" })}
                            >
                              Close
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: ESP32-S3 HARDWARE ABSTRACTION & SAFETY ISOLATION */}
      {activeTab === "hardware" && hw && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hardware Abstraction & Telemetry (Simulation Default)</CardTitle>
              <CardDescription>
                All commands pass through FastAPI backend (`/api/mfr/robot/command`). Physical energization is blocked until pins & ratings pass verification.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <div>E-Stop State: <strong className={hw.live_hal.estop_engaged ? "text-rose-500" : "text-emerald-500"}>{hw.live_hal.estop_engaged ? "ENGAGED" : "RELEASED"}</strong></div>
                <div>Outputs Armed: <strong>{hw.live_hal.physical_outputs_armed ? "YES" : "NO (SIMULATION)"}</strong></div>
                <div>ZK-BM1 PWM: <strong>{hw.live_hal.driving_system.pwm_hz} Hz (&le;2 kHz)</strong></div>
                <div>Drive L/R: <strong>{hw.live_hal.driving_system.left_pct}% / {hw.live_hal.driving_system.right_pct}%</strong></div>
                <div>Impeller ESC: <strong>{hw.live_hal.impeller_esc.pulse_us} us</strong></div>
                <div>Cleaner State: <strong>{hw.live_hal.cleaner_module.state}</strong></div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => sendRobotCommand("CLEAR_ESTOP", { human_approved: true })}>
                  Clear E-Stop (Human Confirm)
                </Button>
                <Button type="button" size="sm" onClick={() => sendRobotCommand("FORWARD")}>Drive Forward (Sim)</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => sendRobotCommand("TURN_LEFT")}>Turn Left</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => sendRobotCommand("STOP")}>Stop Drive</Button>
                <Button type="button" size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => sendRobotCommand("ESTOP")}>
                  <OctagonAlert className="mr-1 h-3.5 w-3.5" /> E-Stop
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="block">
                  Drive Speed ({driveSpeedPct}%)
                  <input type="range" min={10} max={80} value={driveSpeedPct} onChange={(e) => setDriveSpeedPct(Number(e.target.value))} className="mt-1 w-full" />
                </label>
                <label className="block">
                  Impeller Throttle Sim ({impellerPct}%)
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={100} value={impellerPct} onChange={(e) => setImpellerPct(Number(e.target.value))} className="mt-1 w-full" />
                    <Button type="button" size="sm" variant="secondary" onClick={() => sendRobotCommand("IMPELLER_SET")}>Set</Button>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Component Compatibility Audit Inventory</CardTitle>
              <CardDescription>Direct audit from MFR_HARDWARE_INTEGRATION_AUDIT.md</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {hw.inventory_audit.map((item) => (
                <div key={item.component} className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-2.5 dark:border-white/10">
                  <div>
                    <div className="font-semibold">{item.component}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">{JSON.stringify(item.details)}</div>
                  </div>
                  <Badge tone={item.verification_state === "CONNECTED_HOST_PC" ? "good" : "warning"}>
                    {item.verification_state}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {hwFiles && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Hardware &amp; Firmware Source Codebase ({hwFiles.count} Files) — <code>{hwFiles.root}</code>
                </CardTitle>
                <CardDescription>
                  ESP32-S3 Firmware, ZK-BM1 / 25GA / Brushless ESC Drivers, L9110S Pump Guard, OpenCV Webcam Service & Simulation Tests
                </CardDescription>
              </CardHeader>
              <CardContent className="grid max-h-72 gap-2 overflow-y-auto text-xs sm:grid-cols-2 lg:grid-cols-3">
                {hwFiles.files.map((f) => (
                  <div key={f.path} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
                    <span className="truncate font-mono text-[11px]" title={f.path}>{f.path}</span>
                    <span className="shrink-0 text-[10px] text-slate-400">{f.size_bytes} B</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

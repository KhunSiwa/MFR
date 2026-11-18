/**
 * MFR Module Facade Rover — Typed API Client for Companion Next.js (`SurfaceGo`)
 * -------------------------------------------------------------------------------
 * Ready-to-drop client targeting the offline M7 FastAPI service (127.0.0.1:8000).
 * Zero hardcoded secrets; configure via `NEXT_PUBLIC_MFR_API_BASE`.
 *
 * Truthfulness & Safety Invariants:
 *   - Always render `disclaimer` and `real_dataset_trained` on UI cards.
 *   - Always distinguish `telemetry_source` ('SIMULATED_MOCK' | 'LIVE_BENCH' | 'UNCONNECTED').
 *   - Never expose E-stop override or tether release buttons (backend rejects with HTTP 403).
 */

export type TelemetrySource = "SIMULATED_MOCK" | "LIVE_BENCH" | "UNCONNECTED";
export type SystemState =
  | "NORMAL"
  | "CAMERA_DISCONNECTED"
  | "COMMUNICATION_FAILURE"
  | "SENSOR_FAILURE"
  | "MOTOR_FAULT"
  | "E_STOP"
  | "UNCONNECTED";
export type SurfaceMode = "HORIZONTAL_GROUND_ONLY" | "BENCH_RIG_NO_LOAD";
export type ReviewStatus = "PENDING_HUMAN_REVIEW" | "CONFIRMED" | "DISMISSED";

export interface HealthResponse {
  status: string;
  service: string;
  database_connected: boolean;
  database_dialect: string;
  cv_model_loaded: boolean;
  weights_sha256: string;
  model_tier: string;
  real_dataset_trained: boolean;
  is_real_facade_evaluated: boolean;
  advisory_only: true;
  safety_actuation_allowed: false;
  ai_safety_control_enabled: false;
  estop_override_allowed: false;
  disclaimer: string;
}

export interface ModelStatusResponse {
  model_name: string;
  model_version: string;
  model_tier: string;
  real_dataset_trained: boolean;
  is_real_facade_evaluated: boolean;
  real_facade_status: string;
  weights_sha256: string;
  taxonomy: Record<string, string>;
  input_size: number[];
  smoke_test_metrics?: Record<string, unknown> | null;
  host_inference_latency?: Record<string, unknown> | null;
  advisory_only: true;
  safety_actuation_allowed: false;
  disclaimer: string;
  model_card_path: string;
}

export interface RobotRecord {
  id: number;
  robot_code: string;
  name: string;
  status: string;
  cad_length_mm: number;
  cad_width_mm: number;
  cad_height_mm: number;
  wheelbase_mm: number;
  vertical_glass_certified: false;
  ai_safety_control_enabled: false;
  estop_override_allowed: false;
  notes?: string | null;
  created_at: string;
}

export interface DefectDetection {
  id: number;
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: { cx: number; cy: number; w: number; h: number };
  advisory_only: true;
}

export interface InspectionResponse {
  inspection_id: number;
  robot_code: string;
  model_name: string;
  source_type: string;
  source_name: string;
  input_sha256: string;
  image_size: [number, number];
  inference_ms: number;
  model_tier: string;
  real_dataset_trained: boolean;
  is_real_facade_evaluated: boolean;
  advisory_only: true;
  safety_actuation_allowed: false;
  disclaimer: string;
  operator_review_status: ReviewStatus;
  class_probabilities: Record<string, number>;
  detections: DefectDetection[];
  created_at: string;
}

export interface TelemetryRecord {
  id: number;
  robot_code: string;
  telemetry_source: TelemetrySource;
  system_state: SystemState;
  surface_mode: SurfaceMode;
  battery_voltage_v?: number | null;
  wheel_rpm_avg?: number | null;
  wifi_rssi_dbm?: number | null;
  camera_link_ok: boolean;
  hardware_estop_engaged: boolean;
  ai_safety_control_enabled: false;
  estop_override_allowed: false;
  note?: string | null;
  recorded_at: string;
}

export interface TelemetryCreatePayload {
  robot_code?: string;
  telemetry_source: TelemetrySource;
  system_state: SystemState;
  surface_mode?: SurfaceMode;
  battery_voltage_v?: number | null;
  wheel_rpm_avg?: number | null;
  wifi_rssi_dbm?: number | null;
  camera_link_ok?: boolean;
  hardware_estop_engaged?: boolean;
  note?: string;
}

export interface SafetyEventsResponse {
  ai_safety_control_enabled: false;
  estop_override_allowed: false;
  hardware_estop_independent: true;
  control_layer: string;
  prohibited_actions: string[];
  events: Array<{
    id: number;
    robot_code: string;
    event_type: string;
    severity: string;
    source_component: string;
    blocked_by_policy: boolean;
    hardware_estop_independent: true;
    description: string;
    created_at: string;
  }>;
}

export class MFRApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    const envBase =
      typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_MFR_API_BASE
        ? process.env.NEXT_PUBLIC_MFR_API_BASE
        : "http://127.0.0.1:8000";
    this.baseUrl = (baseUrl ?? envBase).replace(/\/+$/, "");
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`MFR API ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
  }

  getHealth(): Promise<HealthResponse> {
    return this.requestJson<HealthResponse>("/health");
  }

  getModelStatus(): Promise<ModelStatusResponse> {
    return this.requestJson<ModelStatusResponse>("/api/v1/model-status");
  }

  getRobots(): Promise<RobotRecord[]> {
    return this.requestJson<RobotRecord[]>("/api/v1/robots");
  }

  inferUpload(file: File | Blob, robotCode = "MFR-BASE-01"): Promise<InspectionResponse> {
    const form = new FormData();
    form.append("file", file);
    form.append("robot_code", robotCode);
    return this.requestJson<InspectionResponse>("/api/v1/infer", { method: "POST", body: form });
  }

  inferSample(sampleId: string, robotCode = "MFR-BASE-01"): Promise<InspectionResponse> {
    const form = new FormData();
    form.append("sample_id", sampleId);
    form.append("robot_code", robotCode);
    return this.requestJson<InspectionResponse>("/api/v1/infer", { method: "POST", body: form });
  }

  listInspections(limit = 25): Promise<{ total_count: number; items: InspectionResponse[] }> {
    return this.requestJson(`/api/v1/inspections?limit=${limit}`);
  }

  getInspection(inspectionId: number): Promise<InspectionResponse> {
    return this.requestJson<InspectionResponse>(`/api/v1/inspections/${inspectionId}`);
  }

  updateReviewStatus(inspectionId: number, status: ReviewStatus): Promise<InspectionResponse> {
    return this.requestJson<InspectionResponse>(`/api/v1/inspections/${inspectionId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operator_review_status: status }),
    });
  }

  listTelemetry(source?: TelemetrySource): Promise<{
    total_count: number;
    counts_by_source: Record<string, number>;
    items: TelemetryRecord[];
  }> {
    const qs = source ? `?telemetry_source=${encodeURIComponent(source)}` : "";
    return this.requestJson(`/api/v1/telemetry${qs}`);
  }

  postTelemetry(payload: TelemetryCreatePayload): Promise<TelemetryRecord> {
    return this.requestJson<TelemetryRecord>("/api/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  getSafetyEvents(limit = 50): Promise<SafetyEventsResponse> {
    return this.requestJson<SafetyEventsResponse>(`/api/v1/safety-events?limit=${limit}`);
  }
}

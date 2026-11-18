// MFR Module Facade Rover — Offline Dashboard Client (Vanilla ES6, Zero External CDNs)

"use strict";

const state = {
  currentInspectionId: null,
  samples: [],
};

async function apiFetch(path, options = {}) {
  const res = await fetch(path, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_err) {
    data = { raw: text };
  }
  if (!res.ok) {
    const detail = data && data.detail ? data.detail : `HTTP ${res.status}`;
    const err = new Error(detail);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-tab");
      buttons.forEach((b) => b.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = el(`tab-${target}`);
      if (panel) panel.classList.add("active");
    });
  });
}

async function loadOverview() {
  const [health, modelStatus, robots, safety] = await Promise.all([
    apiFetch("/health"),
    apiFetch("/api/v1/model-status"),
    apiFetch("/api/v1/robots"),
    apiFetch("/api/v1/safety-events?limit=10"),
  ]);

  const dbChip = el("hdr-db-chip");
  dbChip.textContent = `DB: ${health.database_connected ? health.database_dialect.toUpperCase() + " OK" : "ERR"}`;
  dbChip.classList.toggle("status-chip-ok", Boolean(health.database_connected));

  const cvChip = el("hdr-cv-chip");
  cvChip.textContent = `CV: ${health.cv_model_loaded ? "LOADED (SMOKE-TEST)" : "UNLOADED"}`;
  cvChip.classList.toggle("status-chip-ok", Boolean(health.cv_model_loaded));

  if (robots.length > 0) {
    const r = robots[0];
    el("ov-robot-status").textContent = r.status;
    el("ov-robot-specs").innerHTML = `
      <div class="kv-row"><span>Robot Code</span><strong>${escapeHtml(r.robot_code)}</strong></div>
      <div class="kv-row"><span>CAD Envelope</span><strong>${r.cad_length_mm.toFixed(1)} × ${r.cad_width_mm.toFixed(1)} × ${r.cad_height_mm.toFixed(1)} mm</strong></div>
      <div class="kv-row"><span>Wheelbase</span><strong>${r.wheelbase_mm.toFixed(1)} mm (Ground Base)</strong></div>
      <div class="kv-row"><span>Vertical Glass Certified</span><strong class="text-danger">${String(r.vertical_glass_certified).toUpperCase()}</strong></div>
    `;
  }

  el("ov-model-tier").textContent = modelStatus.model_tier;
  const smokeAcc = modelStatus.smoke_test_metrics && modelStatus.smoke_test_metrics.smoke_test_accuracy != null
    ? `${(modelStatus.smoke_test_metrics.smoke_test_accuracy * 100).toFixed(0)}% (N=${modelStatus.smoke_test_metrics.test_sample_count} synthetic)`
    : "N/A";
  el("ov-model-specs").innerHTML = `
    <div class="kv-row"><span>Model</span><strong>${escapeHtml(modelStatus.model_name)}</strong></div>
    <div class="kv-row"><span>Real Facade Status</span><strong class="text-danger">${escapeHtml(modelStatus.real_facade_status)}</strong></div>
    <div class="kv-row"><span>Smoke Fixture Only</span><strong>${escapeHtml(smokeAcc)}</strong></div>
    <div class="kv-row"><span>Weights SHA-256</span><strong class="mono">${escapeHtml(modelStatus.weights_sha256.slice(0, 20))}...</strong></div>
  `;

  el("ov-prohibited-list").innerHTML = safety.prohibited_actions
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  renderSafetyEvents(safety.events);
}

function renderSafetyEvents(events) {
  const tbody = el("ov-safety-tbody");
  if (!events || events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No safety events logged.</td></tr>';
    return;
  }
  tbody.innerHTML = events
    .map((ev) => {
      const sevClass = ev.severity === "BLOCKED_403" ? "badge-danger" : "badge-cyan";
      return `
        <tr>
          <td>#${ev.id}</td>
          <td><span class="badge ${sevClass}">${escapeHtml(ev.severity)}</span></td>
          <td class="mono">${escapeHtml(ev.event_type)}</td>
          <td>${ev.blocked_by_policy ? "YES" : "NO"}</td>
          <td>${escapeHtml(ev.description)}</td>
        </tr>
      `;
    })
    .join("");
}

async function testSafety403Guard() {
  const out = el("safety-test-output");
  out.textContent = "Sending prohibited AI_ESTOP_OVERRIDE request to POST /api/v1/safety/command...";
  try {
    await apiFetch("/api/v1/safety/command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        robot_code: "MFR-BASE-01",
        command: "AI_ESTOP_OVERRIDE",
        reason: "Dashboard 403 isolation self-test",
      }),
    });
    out.textContent = "UNEXPECTED: Request was not blocked!";
  } catch (err) {
    out.textContent = `VERIFIED BLOCKED (HTTP ${err.status}): ${err.message}`;
    const safety = await apiFetch("/api/v1/safety-events?limit=10");
    renderSafetyEvents(safety.events);
  }
}

async function loadSamples() {
  const samples = await apiFetch("/api/v1/samples");
  state.samples = samples;
  const sel = el("sample-select");
  sel.innerHTML = samples
    .map((s) => `<option value="${escapeHtml(s.sample_id)}">[${escapeHtml(s.tier)}] ${escapeHtml(s.sample_id)}</option>`)
    .join("");
}

function drawBoundingBox(imageSrc, inspection) {
  const canvas = el("bbox-canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    const w = 512;
    const h = 512;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    if (inspection.detections && inspection.detections.length > 0) {
      const det = inspection.detections[0];
      const bx = (det.bbox.cx - det.bbox.w / 2) * w;
      const by = (det.bbox.cy - det.bbox.h / 2) * h;
      const bw = Math.max(8, det.bbox.w * w);
      const bh = Math.max(8, det.bbox.h * h);

      ctx.strokeStyle = "#00D4FF";
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);

      const label = `ADVISORY: ${det.class_name} (${(det.confidence * 100).toFixed(1)}%)`;
      ctx.font = "bold 13px sans-serif";
      const textW = ctx.measureText(label).width + 14;
      const pillY = by > 28 ? by - 26 : Math.min(h - 26, by + bh + 4);
      const pillX = Math.max(4, Math.min(w - textW - 4, bx));

      ctx.fillStyle = "rgba(10, 26, 51, 0.92)";
      ctx.fillRect(pillX, pillY, textW, 22);
      ctx.strokeStyle = "#FFB020";
      ctx.lineWidth = 1;
      ctx.strokeRect(pillX, pillY, textW, 22);
      ctx.fillStyle = "#FFD68A";
      ctx.fillText(label, pillX + 7, pillY + 15);
    }
  };
  img.src = imageSrc;
}

function renderInspectionResult(insp) {
  state.currentInspectionId = insp.inspection_id;
  el("insp-id-badge").textContent = `Inspection #${insp.inspection_id} (Saved)`;
  el("insp-disclaimer").textContent = `${insp.disclaimer} | advisory_only=${insp.advisory_only} | safety_actuation_allowed=${insp.safety_actuation_allowed}`;

  const top = insp.detections && insp.detections[0] ? insp.detections[0] : null;
  el("insp-meta").innerHTML = `
    <div class="kv-row"><span>Source</span><strong>${escapeHtml(insp.source_type)} — ${escapeHtml(insp.source_name)}</strong></div>
    <div class="kv-row"><span>Primary Advisory Class</span><strong>${top ? escapeHtml(top.class_name) : "None"}</strong></div>
    <div class="kv-row"><span>Confidence</span><strong>${top ? (top.confidence * 100).toFixed(2) + "%" : "—"}</strong></div>
    <div class="kv-row"><span>Inference Latency</span><strong>${insp.inference_ms.toFixed(2)} ms</strong></div>
    <div class="kv-row"><span>Input SHA-256</span><strong class="mono">${escapeHtml(insp.input_sha256)}</strong></div>
    <div class="kv-row"><span>Operator Review</span><strong>${escapeHtml(insp.operator_review_status)}</strong></div>
  `;

  const probs = Object.entries(insp.class_probabilities || {});
  el("prob-bars").innerHTML = probs
    .map(([cls, p]) => {
      const pct = Math.max(0, Math.min(100, p * 100));
      return `
        <div class="prob-item">
          <span>${escapeHtml(cls)}</span>
          <div class="prob-track"><div class="prob-fill" style="width:${pct.toFixed(1)}%"></div></div>
          <span class="mono">${pct.toFixed(1)}%</span>
        </div>
      `;
    })
    .join("");

  el("btn-review-confirm").disabled = false;
  el("btn-review-dismiss").disabled = false;
  el("canvas-caption").textContent = `Persisted Inspection #${insp.inspection_id} (${insp.source_name}) — Advisory bounding box rendered.`;
}

async function runSampleInference(sampleId) {
  const form = new FormData();
  form.append("sample_id", sampleId);
  form.append("robot_code", "MFR-BASE-01");
  const insp = await apiFetch("/api/v1/infer", { method: "POST", body: form });
  drawBoundingBox(`/api/v1/sample-images/${encodeURIComponent(sampleId)}`, insp);
  renderInspectionResult(insp);
  await loadHistory();
}

async function runUploadInference() {
  const input = el("file-upload");
  if (!input.files || input.files.length === 0) {
    el("canvas-caption").textContent = "Please choose an image file first.";
    return;
  }
  const file = input.files[0];
  const form = new FormData();
  form.append("file", file);
  form.append("robot_code", "MFR-BASE-01");

  const insp = await apiFetch("/api/v1/infer", { method: "POST", body: form });
  const objectUrl = URL.createObjectURL(file);
  drawBoundingBox(objectUrl, insp);
  renderInspectionResult(insp);
  await loadHistory();
}

async function updateReviewStatus(status) {
  if (!state.currentInspectionId) return;
  const updated = await apiFetch(`/api/v1/inspections/${state.currentInspectionId}/review`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operator_review_status: status }),
  });
  renderInspectionResult(updated);
  await loadHistory();
}

async function loadHistory() {
  const data = await apiFetch("/api/v1/inspections?limit=50");
  el("hist-count-badge").textContent = `${data.total_count} records`;
  const tbody = el("history-tbody");
  if (!data.items || data.items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10">No persisted inspections yet. Run an inspection in AI Defect Inspector.</td></tr>';
    return;
  }
  tbody.innerHTML = data.items
    .map((row) => {
      const det = row.detections && row.detections[0];
      return `
        <tr>
          <td>#${row.inspection_id}</td>
          <td class="mono">${escapeHtml(row.created_at.replace("T", " ").slice(0, 19))}</td>
          <td><span class="badge badge-warn">${escapeHtml(row.source_type)}</span></td>
          <td>${escapeHtml(row.source_name)}</td>
          <td><strong>${det ? escapeHtml(det.class_name) : "—"}</strong></td>
          <td>${det ? (det.confidence * 100).toFixed(1) + "%" : "—"}</td>
          <td>${row.inference_ms.toFixed(2)}</td>
          <td>${row.advisory_only ? "TRUE" : "FALSE"}</td>
          <td>${escapeHtml(row.operator_review_status)}</td>
          <td class="mono">${escapeHtml(row.input_sha256.slice(0, 12))}...</td>
        </tr>
      `;
    })
    .join("");
}

async function loadTelemetry() {
  const filterVal = el("tel-filter").value;
  const qs = filterVal ? `?telemetry_source=${encodeURIComponent(filterVal)}` : "";
  const data = await apiFetch(`/api/v1/telemetry${qs}`);

  const c = data.counts_by_source || {};
  el("tel-source-counts").innerHTML = `
    <div class="kv-row"><span>SIMULATED_MOCK</span><strong>${c.SIMULATED_MOCK || 0}</strong></div>
    <div class="kv-row"><span>LIVE_BENCH</span><strong>${c.LIVE_BENCH || 0}</strong></div>
    <div class="kv-row"><span>UNCONNECTED</span><strong>${c.UNCONNECTED || 0}</strong></div>
  `;

  const tbody = el("telemetry-tbody");
  if (!data.items || data.items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">No telemetry records for selected filter.</td></tr>';
    return;
  }
  tbody.innerHTML = data.items
    .map((t) => {
      const srcBadge = t.telemetry_source === "LIVE_BENCH" ? "badge-green" : "badge-amber";
      return `
        <tr>
          <td>#${t.id}</td>
          <td class="mono">${escapeHtml(t.recorded_at.replace("T", " ").slice(0, 19))}</td>
          <td><span class="badge ${srcBadge}">${escapeHtml(t.telemetry_source)}</span></td>
          <td><strong>${escapeHtml(t.system_state)}</strong></td>
          <td class="mono">${escapeHtml(t.surface_mode)}</td>
          <td>${t.battery_voltage_v != null ? t.battery_voltage_v.toFixed(1) + " V" : "—"}</td>
          <td>${t.hardware_estop_engaged ? "ENGAGED" : "RELEASED (HW)"}</td>
          <td class="text-danger">${String(t.ai_safety_control_enabled).toUpperCase()}</td>
          <td>${escapeHtml(t.note || "—")}</td>
        </tr>
      `;
    })
    .join("");
}

async function submitTelemetryForm(event) {
  event.preventDefault();
  const form = event.target;
  const statusEl = el("tel-form-status");
  const fd = new FormData(form);
  const payload = {
    robot_code: "MFR-BASE-01",
    telemetry_source: fd.get("telemetry_source"),
    system_state: fd.get("system_state"),
    surface_mode: fd.get("surface_mode"),
    battery_voltage_v: fd.get("battery_voltage_v") ? Number(fd.get("battery_voltage_v")) : null,
    hardware_estop_engaged: form.querySelector('input[name="hardware_estop_engaged"]').checked,
    camera_link_ok: false,
    note: `Logged from M7 Dashboard (${fd.get("telemetry_source")})`,
  };
  try {
    const saved = await apiFetch("/api/v1/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    statusEl.textContent = `Saved telemetry #${saved.id} (${saved.telemetry_source} / ${saved.system_state}).`;
    await loadTelemetry();
  } catch (err) {
    statusEl.textContent = `Rejected (${err.status}): ${err.message}`;
  }
}

async function loadSurfaceGoConcept() {
  const sg = await apiFetch("/api/v1/surfacego-concept");
  el("sg-status-badge").textContent = sg.status;
  el("sg-routes-list").innerHTML = sg.routes
    .map((r) => `<span class="route-pill">${escapeHtml(r)}</span>`)
    .join("");

  const kpis = sg.mockup_kpis || {};
  el("sg-kpis").innerHTML = `
    <div class="kv-row"><span>Mockup Job ID</span><strong>${escapeHtml(kpis.mockup_job_id)}</strong></div>
    <div class="kv-row"><span>Mockup Unit Card</span><strong>${escapeHtml(kpis.mockup_unit_card)}</strong></div>
    <div class="kv-row"><span>Mockup Counters</span><strong>${kpis.mockup_orders} orders · ${kpis.mockup_bots} bots · ${kpis.mockup_hubs} hubs</strong></div>
    <div class="kv-row"><span>Revenue / Area</span><strong>${escapeHtml(kpis.mockup_revenue_placeholder)} · ${escapeHtml(kpis.mockup_area_placeholder)}</strong></div>
    <div class="kv-row"><span>Pricing Tiers</span><strong>${escapeHtml((kpis.mockup_pricing_tiers || []).join(" / "))}</strong></div>
  `;
}

async function bootstrap() {
  initTabs();
  el("btn-refresh-overview").addEventListener("click", loadOverview);
  el("btn-test-safety-403").addEventListener("click", testSafety403Guard);
  el("btn-run-sample").addEventListener("click", () => runSampleInference(el("sample-select").value));
  el("btn-run-upload").addEventListener("click", runUploadInference);
  el("btn-review-confirm").addEventListener("click", () => updateReviewStatus("CONFIRMED"));
  el("btn-review-dismiss").addEventListener("click", () => updateReviewStatus("DISMISSED"));
  el("btn-refresh-history").addEventListener("click", loadHistory);
  el("btn-refresh-telemetry").addEventListener("click", loadTelemetry);
  el("tel-filter").addEventListener("change", loadTelemetry);
  el("telemetry-form").addEventListener("submit", submitTelemetryForm);

  document.querySelectorAll(".quick-sample").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sampleId = btn.getAttribute("data-sample");
      if (sampleId) {
        el("sample-select").value = sampleId;
        runSampleInference(sampleId);
      }
    });
  });

  await Promise.all([
    loadOverview(),
    loadSamples(),
    loadHistory(),
    loadTelemetry(),
    loadSurfaceGoConcept(),
  ]);
}

document.addEventListener("DOMContentLoaded", bootstrap);

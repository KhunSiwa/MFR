"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Compass, Layers, LocateFixed, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type FacadePanel3D = {
  id: number;
  panel_code: string;
  zone_code: string;
  face_code: string;
  floor_number: number;
  col_index: number;
  x_m: number;
  y_m: number;
  z_m: number;
  width_m: number;
  height_m: number;
};

export type DefectMarker3D = {
  id: number;
  panel_id: number;
  panel_code: string;
  facade_code: string;
  floor_number: number;
  zone_code: string;
  defect_category: string;
  confidence: number;
  verification_status: string;
  decision_type: string;
  marker_color: string;
  position_mode: string;
  marker_position_m: [number, number, number];
  notes?: string | null;
  inspected_at: string;
  camera_source: string;
  original_url: string;
  annotated_url: string;
};

export type BuildingSpec = {
  id: number;
  code: string;
  name: string;
  floors_count: number;
  bays_per_floor: number;
  width_m: number;
  depth_m: number;
  floor_height_m: number;
  is_simulated_geometry: boolean;
};

type Vec3 = [number, number, number];

type Props = {
  building: BuildingSpec;
  panels: FacadePanel3D[];
  markers: DefectMarker3D[];
  selectedFacade: string;
  selectedFloor: number | null;
  selectedPanelId: number | null;
  selectedMarkerId: number | null;
  onSelectPanel: (panel: FacadePanel3D) => void;
  onSelectMarker: (marker: DefectMarker3D) => void;
};

const MARKER_HEX: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  blue: "#3b82f6",
  gray: "#94a3b8",
  green: "#22c55e",
};

const DEFAULT_CAMERA = { yaw: -0.62, pitch: 0.34, zoom: 1.0, panX: 0, panY: 0 };

export function Building3DViewport({
  building,
  panels,
  markers,
  selectedFacade,
  selectedFloor,
  selectedPanelId,
  selectedMarkerId,
  onSelectPanel,
  onSelectMarker,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cam, setCam] = useState(DEFAULT_CAMERA);
  const dragRef = useRef<{
    active: boolean;
    mode: "orbit" | "pan";
    startX: number;
    startY: number;
    moved: boolean;
    baseYaw: number;
    basePitch: number;
    basePanX: number;
    basePanY: number;
  }>({
    active: false,
    mode: "orbit",
    startX: 0,
    startY: 0,
    moved: false,
    baseYaw: 0,
    basePitch: 0,
    basePanX: 0,
    basePanY: 0,
  });

  // Hit-test cache updated each render
  const hitsRef = useRef<{
    markers: { marker: DefectMarker3D; x: number; y: number; r: number; depth: number }[];
    panels: { panel: FacadePanel3D; pts: [number, number][]; depth: number }[];
  }>({ markers: [], panels: [] });

  const totalH = building.floors_count * building.floor_height_m;
  const centerZ = totalH * 0.5;

  const projectPoint = useCallback(
    (p: Vec3, width: number, height: number): { x: number; y: number; depth: number; scale: number } => {
      // Shift around building midpoint in Z
      const px = p[0];
      const py = p[1];
      const pz = p[2] - centerZ;

      const cy = Math.cos(cam.yaw);
      const sy = Math.sin(cam.yaw);
      const cp = Math.cos(cam.pitch);
      const sp = Math.sin(cam.pitch);

      // Rotate around Z (yaw) then X (pitch)
      const x1 = px * cy - py * sy;
      const y1 = px * sy + py * cy;
      const z1 = pz;

      const y2 = y1 * cp - z1 * sp;
      const z2 = y1 * sp + z1 * cp;

      const dist = Math.max(building.width_m, building.depth_m, totalH) * 2.15;
      const denom = Math.max(2.0, dist + y2);
      const fov = Math.min(width, height) * 1.45 * cam.zoom;
      const sx = width * 0.5 + cam.panX + (x1 * fov) / denom;
      const sy2 = height * 0.54 + cam.panY - (z2 * fov) / denom;
      return { x: sx, y: sy2, depth: y2, scale: fov / denom };
    },
    [building.depth_m, building.width_m, cam, centerZ, totalH],
  );

  const markerByPanel = useMemo(() => {
    const map = new Map<number, DefectMarker3D[]>();
    for (const m of markers) {
      const list = map.get(m.panel_id) ?? [];
      list.push(m);
      map.set(m.panel_id, list);
    }
    return map;
  }, [markers]);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(360, Math.floor(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Rich dark navy blueprint backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#050d1e");
    grad.addColorStop(1, "#0b1730");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle ground coordinate grid at Z = 0
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
    ctx.lineWidth = 1;
    const gridSpan = Math.max(building.width_m, building.depth_m) * 0.95;
    for (let g = -4; g <= 4; g++) {
      const offset = (g / 4) * gridSpan;
      const a = projectPoint([-gridSpan, offset, 0], w, h);
      const b = projectPoint([gridSpan, offset, 0], w, h);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      const c = projectPoint([offset, -gridSpan, 0], w, h);
      const d = projectPoint([offset, gridSpan, 0], w, h);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    }

    // Build panel 3D quads with back-face / depth awareness
    const quads: {
      panel: FacadePanel3D;
      pts: [number, number][];
      depth: number;
      facing: number;
    }[] = [];

    const cy = Math.cos(cam.yaw);
    const sy = Math.sin(cam.yaw);
    const cp = Math.cos(cam.pitch);

    for (const p of panels) {
      const hw = p.width_m * 0.48;
      const hh = p.height_m * 0.47;
      let corners: Vec3[];
      let normal: Vec3;
      if (p.face_code === "NORTH") {
        corners = [
          [p.x_m - hw, p.y_m, p.z_m - hh],
          [p.x_m + hw, p.y_m, p.z_m - hh],
          [p.x_m + hw, p.y_m, p.z_m + hh],
          [p.x_m - hw, p.y_m, p.z_m + hh],
        ];
        normal = [0, -1, 0];
      } else if (p.face_code === "SOUTH") {
        corners = [
          [p.x_m + hw, p.y_m, p.z_m - hh],
          [p.x_m - hw, p.y_m, p.z_m - hh],
          [p.x_m - hw, p.y_m, p.z_m + hh],
          [p.x_m + hw, p.y_m, p.z_m + hh],
        ];
        normal = [0, 1, 0];
      } else if (p.face_code === "EAST") {
        corners = [
          [p.x_m, p.y_m - hw, p.z_m - hh],
          [p.x_m, p.y_m + hw, p.z_m - hh],
          [p.x_m, p.y_m + hw, p.z_m + hh],
          [p.x_m, p.y_m - hw, p.z_m + hh],
        ];
        normal = [1, 0, 0];
      } else {
        corners = [
          [p.x_m, p.y_m + hw, p.z_m - hh],
          [p.x_m, p.y_m - hw, p.z_m - hh],
          [p.x_m, p.y_m - hw, p.z_m + hh],
          [p.x_m, p.y_m + hw, p.z_m + hh],
        ];
        normal = [-1, 0, 0];
      }

      // Compute transformed Y normal towards camera (-Y camera axis after rotation)
      const ny1 = normal[0] * sy + normal[1] * cy;
      const ny2 = ny1 * cp;
      const proj = corners.map((c) => projectPoint(c, w, h));
      const avgDepth = proj.reduce((acc, q) => acc + q.depth, 0) / 4;
      quads.push({
        panel: p,
        pts: proj.map((q) => [q.x, q.y]),
        depth: avgDepth,
        facing: -ny2,
      });
    }

    // Painter's algorithm sort (far -> near)
    quads.sort((a, b) => b.depth - a.depth);
    const hitPanels: typeof hitsRef.current.panels = [];

    for (const q of quads) {
      const { panel, pts, facing } = q;
      const isSelectedPanel = panel.id === selectedPanelId;
      const isFacadeMatch = selectedFacade === "ALL" || panel.face_code === selectedFacade;
      const isFloorMatch = selectedFloor === null || panel.floor_number === selectedFloor;
      const pMarkers = markerByPanel.get(panel.id) ?? [];
      const topMarker = pMarkers[0];

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();

      if (isSelectedPanel) {
        ctx.fillStyle = "rgba(34, 211, 238, 0.42)";
      } else if (topMarker) {
        const hex = MARKER_HEX[topMarker.marker_color] ?? "#94a3b8";
        ctx.fillStyle = facing > 0 ? `${hex}55` : `${hex}22`;
      } else if (isFacadeMatch && isFloorMatch) {
        ctx.fillStyle = facing > 0 ? "rgba(56, 189, 248, 0.24)" : "rgba(30, 58, 138, 0.14)";
      } else {
        ctx.fillStyle = "rgba(30, 41, 59, 0.12)";
      }
      ctx.fill();

      ctx.strokeStyle = isSelectedPanel
        ? "#22d3ee"
        : facing > 0
          ? "rgba(148, 210, 255, 0.55)"
          : "rgba(100, 116, 139, 0.25)";
      ctx.lineWidth = isSelectedPanel ? 2.4 : 1.0;
      ctx.stroke();

      if (facing > -0.05) {
        hitPanels.push({ panel, pts, depth: q.depth });
      }
    }

    // Roof cap frame for crisp skyscraper silhouette
    const hw = building.width_m * 0.5;
    const hd = building.depth_m * 0.5;
    const roof = [
      projectPoint([-hw, -hd, totalH], w, h),
      projectPoint([hw, -hd, totalH], w, h),
      projectPoint([hw, hd, totalH], w, h),
      projectPoint([-hw, hd, totalH], w, h),
    ];
    ctx.beginPath();
    ctx.moveTo(roof[0].x, roof[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(roof[i].x, roof[i].y);
    ctx.closePath();
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(125, 211, 252, 0.7)";
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Project and draw 3D defect markers sorted back-to-front
    const projMarkers = markers
      .map((m) => {
        const pt = projectPoint(m.marker_position_m, w, h);
        return { m, pt };
      })
      .sort((a, b) => b.pt.depth - a.pt.depth);

    const hitMarkers: typeof hitsRef.current.markers = [];
    for (const { m, pt } of projMarkers) {
      const hex = MARKER_HEX[m.marker_color] ?? "#94a3b8";
      const isSel = m.id === selectedMarkerId;
      const r = isSel ? 10 : 7.5;

      // Halo glow for selected / confirmed markers
      if (isSel || m.verification_status === "CONFIRMED") {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r + 5, 0, Math.PI * 2);
        ctx.fillStyle = `${hex}44`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
      ctx.strokeStyle = isSel ? "#ffffff" : "#020617";
      ctx.lineWidth = isSel ? 2.5 : 1.5;
      ctx.stroke();

      hitMarkers.push({ marker: m, x: pt.x, y: pt.y, r: r + 5, depth: pt.depth });
    }

    // Compass N arrow label at ground North (-Y)
    const nPt = projectPoint([0, -hd - 2.4, 0], w, h);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "600 12px sans-serif";
    ctx.fillText("NORTH (FRONT)", nPt.x - 42, nPt.y + 4);

    hitsRef.current = {
      markers: hitMarkers.reverse(), // Front-most first for clicking
      panels: hitPanels.reverse(),
    };
  }, [
    building.depth_m,
    building.width_m,
    cam.pitch,
    cam.yaw,
    markerByPanel,
    markers,
    panels,
    projectPoint,
    selectedFacade,
    selectedFloor,
    selectedMarkerId,
    selectedPanelId,
    totalH,
  ]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  useEffect(() => {
    const onResize = () => drawScene();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawScene]);

  const pointInPoly = (x: number, y: number, pts: [number, number][]) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0],
        yi = pts[i][1];
      const xj = pts[j][0],
        yj = pts[j][1];
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-6) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      mode: e.shiftKey || e.button === 2 ? "pan" : "orbit",
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      baseYaw: cam.yaw,
      basePitch: cam.pitch,
      basePanX: cam.panX,
      basePanY: cam.panY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.hypot(dx, dy) > 4) dragRef.current.moved = true;
    if (dragRef.current.mode === "pan") {
      setCam((c) => ({
        ...c,
        panX: dragRef.current.basePanX + dx,
        panY: dragRef.current.basePanY + dy,
      }));
    } else {
      setCam((c) => ({
        ...c,
        yaw: dragRef.current.baseYaw + dx * 0.008,
        pitch: Math.max(-1.45, Math.min(1.45, dragRef.current.basePitch + dy * 0.007)),
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const wasClick = dragRef.current.active && !dragRef.current.moved;
    dragRef.current.active = false;
    if (!wasClick || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // Prioritize 3D marker hit before facade panel hit
    for (const hm of hitsRef.current.markers) {
      if (Math.hypot(cx - hm.x, cy - hm.y) <= hm.r) {
        onSelectMarker(hm.marker);
        return;
      }
    }
    for (const hp of hitsRef.current.panels) {
      if (pointInPoly(cx, cy, hp.pts)) {
        onSelectPanel(hp.panel);
        return;
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.09 : 0.92;
    setCam((c) => ({ ...c, zoom: Math.max(0.45, Math.min(3.2, c.zoom * factor)) }));
  };

  return (
    <div className="space-y-3">
      {/* Camera Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5 dark:border-white/10 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCam({ yaw: 0, pitch: 0.08, zoom: 1.05, panX: 0, panY: 0 })}
          >
            <Compass className="mr-1.5 h-3.5 w-3.5" /> Front View
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCam({ yaw: -Math.PI / 2, pitch: 0.08, zoom: 1.05, panX: 0, panY: 0 })}
          >
            <Layers className="mr-1.5 h-3.5 w-3.5" /> Side View
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCam({ yaw: 0, pitch: 1.42, zoom: 1.0, panX: 0, panY: 0 })}
          >
            <LocateFixed className="mr-1.5 h-3.5 w-3.5" /> Top View
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setCam(DEFAULT_CAMERA)}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Camera
          </Button>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Zoom out"
            onClick={() => setCam((c) => ({ ...c, zoom: Math.max(0.45, c.zoom * 0.85) }))}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Zoom in"
            onClick={() => setCam((c) => ({ ...c, zoom: Math.min(3.2, c.zoom * 1.18) }))}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Badge tone="default">{building.is_simulated_geometry ? "CONFIGURABLE 3D MODEL" : "SURVEYED MODEL"}</Badge>
        </div>
      </div>

      {/* Interactive 3D Canvas */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-300 shadow-inner dark:border-cyan-500/20">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
          className="h-[460px] w-full cursor-grab touch-none active:cursor-grabbing sm:h-[520px]"
        />
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-xl bg-slate-950/85 px-3 py-2 text-[11px] text-slate-200 backdrop-blur">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Crack</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Rust / Corrosion</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400" /> Sealant</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Water Stain</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Unverified</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Verified Normal</span>
        </div>
        <div className="pointer-events-none absolute top-3 left-3 hidden rounded-xl bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur sm:block">
          Drag: Orbit · Shift/Right-Drag: Pan · Wheel: Zoom · Click Panel/Pin: Inspect
        </div>
      </div>
    </div>
  );
}

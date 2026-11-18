#!/Library/Frameworks/Python.framework/Versions/3.13/bin/python3
"""Compose MFR Film V3 (Preview & Final) from Blender CG clips, verified UI/AI plates, presenter slates, and broadcast captions."""

import argparse
import json
import math
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

WS = "/Users/Siwakorn/Downloads/mfr/MFR_FILM_V3_WORKSPACE"
SHOT_JSON = os.path.join(WS, "07_STORYBOARD_SCRIPT/film_v3_shots.json")
CG_DIR = os.path.join(WS, "06_ANIMATION/cg_clips")

FONT_REG = "/Users/Siwakorn/Library/Fonts/Sarabun-Regular.ttf"
FONT_BOLD = "/Users/Siwakorn/Library/Fonts/Sarabun-Bold.ttf"

CAD_ISO = os.path.join(WS, "01_CAD_ANALYSIS/_cad_audit_iso.png")
CAD_SIDE = os.path.join(WS, "01_CAD_ANALYSIS/_cad_audit_side.png")
CAD_FRONT = os.path.join(WS, "01_CAD_ANALYSIS/_cad_audit_front.png")
CAD_TOP = os.path.join(WS, "01_CAD_ANALYSIS/_cad_audit_top.png")
AI_EVAL = "/Users/Siwakorn/Downloads/mfr/MFR_MASTER/06_AI_COMPUTER_VISION/evaluation/QA_Eval_Sample_Predictions.png"
LOGO_PNG = "/Users/Siwakorn/Downloads/mfr/MFR_PRODUCTION/08_SHARED_ASSETS/MFR_logo_original.png"


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def paste_fit(canvas, path, box, radius=14):
    if not os.path.exists(path):
        return
    im = Image.open(path).convert("RGBA")
    x, y, w, h = box
    im.thumbnail((w, h), Image.Resampling.LANCZOS)
    px = x + (w - im.width) // 2
    py = y + (h - im.height) // 2
    canvas.paste(im, (px, py), im)


def wrap(d, text, font, max_w):
    words = text.split(" ")
    out, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if d.textlength(cand, font=font) <= max_w or not cur:
            cur = cand
        else:
            out.append(cur)
            cur = w
    if cur:
        out.append(cur)
    return out


def draw_chrome(im, shot, t_rel, dur, fonts, extra_callout=None):
    """Apply clean 4-zone non-colliding HUD & Sarabun bilingual caption dock."""
    f_h1, f_h2, f_b, f_sm, f_tag = fonts
    overlay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # Top-left shot pill (compact)
    pill_txt = f"MFR  •  ACT {shot['act']}  •  {shot['id']}"
    pw = int(d.textlength(pill_txt, font=f_tag)) + 34
    d.rounded_rectangle([36, 26, 36 + pw, 68], radius=10, fill=(7, 15, 32, 195), outline=(56, 189, 248, 180), width=2)
    d.text((53, 33), pill_txt, font=f_tag, fill=(224, 242, 254, 255))

    # Top-right mandatory truth / conceptual badge
    b_col = hex_rgb(shot["badge_color"])
    b_txt = shot["badge"]
    bw = int(d.textlength(b_txt, font=f_tag)) + 38
    bx = 1920 - 36 - bw
    d.rounded_rectangle([bx, 26, bx + bw, 68], radius=10, fill=(*b_col, 232))
    d.text((bx + 19, 33), b_txt, font=f_tag, fill=(255, 255, 255, 255))

    # Optional non-occluding CAD / Telemetry callout pill on upper-left below header
    if extra_callout:
        ew = int(d.textlength(extra_callout, font=f_sm)) + 34
        d.rounded_rectangle([36, 84, 36 + ew, 124], radius=8, fill=(10, 25, 48, 200), outline=(56, 189, 248, 120), width=1)
        d.text((53, 90), extra_callout, font=f_sm, fill=(186, 230, 253, 255))

    # Subtle lower gradient & clean Sarabun subtitle dock (only when Thai/EN narration exists)
    if shot["speaker"] != "—" or shot["id"] in ("S01", "S02"):
        d.rectangle([0, 910, 1920, 1080], fill=(6, 12, 26, 205))
        d.rectangle([0, 910, 1920, 913], fill=(37, 99, 235, 210))
        if shot.get("speaker_name"):
            d.text((64, 922), shot["speaker_name"], font=f_tag, fill=(56, 189, 248, 255))
        d.text((64, 956), shot["th"], font=f_b, fill=(255, 255, 255, 255))
        d.text((64, 1012), shot["en"], font=f_sm, fill=(186, 205, 226, 255))
        # Progress bar on bottom 4px
        prog = min(1.0, max(0.0, t_rel / max(0.1, dur)))
        d.rectangle([0, 1074, int(1920 * prog), 1080], fill=(56, 189, 248, 230))

    base = im.convert("RGBA")
    return Image.alpha_composite(base, overlay).convert("RGB")


def make_motion_plate(shot, f_idx, n_frames, fonts):
    """Render clean animated 2D / Technical / AI / Dashboard / Presenter plates at 1920x1080."""
    f_h1, f_h2, f_b, f_sm, f_tag = fonts
    t = f_idx / 24.0
    p = f_idx / max(1, n_frames - 1)
    ease = 0.5 - 0.5 * math.cos(math.pi * min(1.0, p * 2.5))

    im = Image.new("RGB", (1920, 1080), (9, 20, 40))
    d = ImageDraw.Draw(im)
    # Subtle animated blueprint grid
    shift = int(f_idx * 0.6) % 80
    for gx in range(-shift, 1920, 80):
        d.line([(gx, 0), (gx, 1080)], fill=(16, 33, 62), width=1)
    for gy in range(0, 1080, 80):
        d.line([(0, gy), (1920, gy)], fill=(16, 33, 62), width=1)

    sid = shot["id"]
    kind = shot["kind"]

    if kind == "GRAPHIC_DEFECTS":
        d.text((80, 120), "TARGET FACADE DEFECT TAXONOMY (AI 06 SCOPE)", font=f_h1, fill=(241, 245, 249))
        cards = [
            ("01  CRACK / GLASS EDGE FRACTURE", "Micro-fissures along glazing & mullion stress zones", (239, 68, 68)),
            ("02  SEALANT DETERIORATION", "UV-aged silicone weatherproofing gaps causing leaks", (245, 158, 11)),
            ("03  RUST / CORROSION", "Structural bracket & aluminum frame oxidation", (234, 88, 12)),
            ("04  WATER STAIN / BIO-FOULING", "Mineral runoff & moisture tracking on curtain walls", (56, 189, 248)),
        ]
        for idx, (ct, cd, col) in enumerate(cards):
            reveal = max(0.0, min(1.0, (p - idx * 0.14) / 0.25))
            cx = 80 + (idx % 2) * 890 + int((1.0 - reveal) * 40)
            cy = 215 + (idx // 2) * 320
            d.rounded_rectangle([cx, cy, cx + 850, cy + 280], radius=18, fill=(14, 29, 58), outline=col, width=3)
            d.rectangle([cx + 28, cy + 30, cx + 44, cy + 92], fill=col)
            d.text((cx + 68, cy + 36), ct, font=f_h2, fill=(255, 255, 255))
            d.text((cx + 68, cy + 115), cd, font=f_b, fill=(203, 213, 225))
            d.text((cx + 68, cy + 205), "CLASS STATUS: DEFINED IN AI 06 PIPELINE", font=f_tag, fill=col)

    elif kind == "TITLE_REVEAL":
        paste_fit(im, LOGO_PNG, (660, 140, 600, 360))
        d.text((430, 520), "หุ่นยนต์ปฏิบัติงานบนผนังอาคารแบบโมดูลาร์", font=f_h1, fill=(255, 255, 255))
        d.text((620, 595), "MODULE FACADE ROVER  (MFR)", font=f_h1, fill=(56, 189, 248))
        d.rounded_rectangle([490, 680, 1430, 770], radius=14, fill=(15, 36, 72), outline=(56, 189, 248), width=2)
        d.text((545, 705), "I-New Gen Award 2027  •  โรงเรียนอัสสัมชัญธนบุรี", font=f_h2, fill=(226, 232, 240))

    elif kind == "PRESENTER_HANDOFF":
        # Split slate: P1 -> P2 with Studio Hero Preview & CAD dims
        d.rounded_rectangle([60, 140, 580, 860], radius=18, fill=(14, 32, 66), outline=(56, 189, 248), width=2)
        d.text((95, 175), "P1: เมธาวินทร์ (ม.4)", font=f_h2, fill=(56, 189, 248))
        d.text((95, 235), "Concept & Problem Owner", font=f_sm, fill=(148, 163, 184))
        d.ellipse([230, 320, 410, 500], outline=(125, 211, 252), width=3)
        d.text((140, 760), "LIVE P1 FOOTAGE PLACEHOLDER", font=f_tag, fill=(148, 163, 184))

        d.rounded_rectangle([620, 140, 1300, 860], radius=18, fill=(10, 24, 48), outline=(37, 99, 235), width=2)
        studio_ref = os.path.join(WS, "08_PREVIEW_RENDERS/studio_check/Cam_Tabletop_Wide.png")
        paste_fit(im, studio_ref if os.path.exists(studio_ref) else CAD_ISO, (650, 180, 620, 480))
        d.text((660, 700), "MFR.step  •  1,370 CAD Nodes  •  363,001 Tris", font=f_b, fill=(241, 245, 249))
        d.text((660, 760), "224.0 × 220.2 × 274.6 mm  (Upright Reference)", font=f_sm, fill=(56, 189, 248))

        d.rounded_rectangle([1340, 140, 1860, 860], radius=18, fill=(14, 32, 66), outline=(16, 185, 129), width=2)
        d.text((1375, 175), "P2: ศิวกร (ม.4)", font=f_h2, fill=(52, 211, 153))
        d.text((1375, 235), "CAD & Embedded Lead", font=f_sm, fill=(148, 163, 184))
        d.ellipse([1510, 320, 1690, 500], outline=(110, 231, 183), width=3)
        d.text((1420, 760), "LIVE P2 FOOTAGE PLACEHOLDER", font=f_tag, fill=(148, 163, 184))

    elif kind == "GRAPHIC_ARCHITECTURE":
        d.text((80, 115), "POWER, CONTROL & SAFETY INTERLOCK SEPARATION (MFR.step HARDWARE)", font=f_h1, fill=(241, 245, 249))
        blocks = [
            (90, 220, 520, 480, "LOGIC CONTROLLER (CAD VERIFIED)", "ESP32-S3-WROOM on 82x82 mm PCB\nDual USB-C  |  WS2812B LEDs  |  3.3V Logic\nReceives high-level teleop commands", (16, 185, 129)),
            (700, 220, 1210, 480, "ISOLATED ACTUATOR POWER BUS", "Dedicated Drive & Impeller Rails\n4x Motors (Ø24.4 x 68 mm) + Ø84 Impeller\nConnected via Conn-2pin terminal blocks", (56, 189, 248)),
            (1310, 220, 1830, 480, "INDEPENDENT PHYSICAL SAFETY", "Hardwired E-Stop Cutoff + Rooftop Dual Tether\nZero AI Authority Over Safety Brakes\nPassive mechanical fall arrest priority", (239, 68, 68)),
            (90, 550, 910, 830, "OFF-BOARD AI 06 & VISION SERVER", "FastAPI Backend + YOLOv8 Defect Pipeline\nAdvisory-Only Bounding Box Telemetry", (168, 85, 247)),
            (1010, 550, 1830, 830, "HUMAN OPERATOR-IN-THE-LOOP DASHBOARD", "Live Camera Feed + Defect Confirmation\nManual Motor Enable & Mission Audit Log", (37, 99, 235)),
        ]
        for bx0, by0, bx1, by1, title, body, col in blocks:
            d.rounded_rectangle([bx0, by0, bx1, by1], radius=16, fill=(14, 29, 58), outline=col, width=3)
            d.text((bx0 + 28, by0 + 26), title, font=f_h2, fill=col)
            for li, ln in enumerate(body.split("\n")):
                d.text((bx0 + 28, by0 + 92 + li * 44), ln, font=f_sm, fill=(226, 232, 240))

    elif kind == "GRAPHIC_AI":
        d.text((80, 110), "AI 06 COMPUTER VISION DEFECT PIPELINE", font=f_h1, fill=(241, 245, 249))
        d.rounded_rectangle([70, 175, 1260, 865], radius=16, fill=(12, 24, 48), outline=(168, 85, 247), width=3)
        paste_fit(im, AI_EVAL, (90, 195, 1150, 650))
        # Animated scan line across AI image
        sy = 205 + int((p * 620) % 620)
        d.line([(95, sy), (1235, sy)], fill=(192, 132, 252), width=3)

        d.rounded_rectangle([1300, 175, 1850, 865], radius=16, fill=(16, 28, 56), outline=(245, 158, 11), width=3)
        d.text((1330, 205), "TRUTHFULNESS DISCLOSURE", font=f_h2, fill=(251, 191, 36))
        notes = [
            "• Dataset: Synthetic Smoke-Test Fixture",
            "• Evaluated Samples: 25 Test Crops",
            "• Real Facade Imagery: 0 Images (NOT TRAINED)",
            "• Smoke-Test Macro F1: 1.00 (Fixture)",
            "• Smoke-Test Mean IoU: 0.6113",
            "• Role: Advisory Telemetry ONLY",
            "• Safety Actuation: STRICTLY DISABLED",
        ]
        for ni, ln in enumerate(notes):
            d.text((1330, 285 + ni * 68), ln, font=f_sm, fill=(226, 232, 240))

    elif kind == "GRAPHIC_DASHBOARD":
        d.text((80, 110), "MFR OPERATOR TELEMETRY & INSPECTION DASHBOARD (FASTAPI + WEB UI)", font=f_h1, fill=(241, 245, 249))
        d.rounded_rectangle([80, 180, 1840, 860], radius=18, fill=(12, 22, 42), outline=(56, 189, 248), width=3)
        d.rectangle([80, 180, 1840, 245], fill=(20, 42, 82))
        d.text((120, 198), "MFR MISSION CONSOLE  |  CONTROLLER: ESP32-S3  |  ADVISORY AI: ONLINE  |  TETHER INTERLOCK: ARMED", font=f_tag, fill=(125, 211, 252))
        # Left live feed card
        d.rounded_rectangle([120, 275, 1020, 810], radius=14, fill=(8, 16, 32), outline=(37, 99, 235), width=2)
        paste_fit(im, os.path.join(WS, "08_PREVIEW_RENDERS/facade_check/Cam_Wheel_Glass.png") if os.path.exists(os.path.join(WS, "08_PREVIEW_RENDERS/facade_check/Cam_Wheel_Glass.png")) else AI_EVAL, (140, 295, 860, 460))
        d.text((145, 765), "LIVE INSPECTION STREAM  •  FACADE BAY #04", font=f_tag, fill=(56, 189, 248))
        # Right telemetry bars
        d.rounded_rectangle([1060, 275, 1800, 810], radius=14, fill=(16, 30, 56), outline=(52, 211, 153), width=2)
        metrics = [
            ("IMPELLER DUTY CYCLE (ADHESION STUDY)", 0.68, (56, 189, 248)),
            ("DRIVE MOTOR TORQUE BALANCE (4X)", 0.54 + 0.08 * math.sin(t * 2), (16, 185, 129)),
            ("OPERATOR SAFETY LOCKOUT VERIFIED", 1.00, (34, 197, 94)),
            ("AI 06 DEFECT FLAG LOG (HUMAN REVIEW)", 0.40, (168, 85, 247)),
        ]
        for mi, (mlbl, mval, mcol) in enumerate(metrics):
            my = 315 + mi * 118
            d.text((1095, my), mlbl, font=f_tag, fill=(226, 232, 240))
            d.rounded_rectangle([1095, my + 38, 1765, my + 72], radius=8, fill=(9, 18, 36))
            d.rounded_rectangle([1095, my + 38, 1095 + int(670 * mval), my + 72], radius=8, fill=mcol)

    elif kind == "GRAPHIC_ROADMAP":
        d.text((80, 115), "ENGINEERING VALIDATION ROADMAP (PHASED TEST PROTOCOL)", font=f_h1, fill=(241, 245, 249))
        phases = [
            ("PHASE 1 — BENCH MOBILITY", "Flat-surface drive & ESP32-S3-WROOM telemetry validation on laboratory floor.", (56, 189, 248)),
            ("PHASE 2 — TETHERED ADHESION RIG", "Measure Ø84 mm impeller suction force & dual safety tether load-testing on test glass.", (245, 158, 11)),
            ("PHASE 3 — REAL FACADE AI BENCHMARK", "Collect labeled exterior glass defect photographs to train & evaluate AI 06.", (16, 185, 129)),
        ]
        for pi, (pt, pd, pcol) in enumerate(phases):
            px = 80 + pi * 595
            d.rounded_rectangle([px, 210, px + 565, 820], radius=18, fill=(14, 29, 58), outline=pcol, width=3)
            d.text((px + 32, 245), pt, font=f_h2, fill=pcol)
            for li, ln in enumerate(wrap(d, pd, f_b, 500)):
                d.text((px + 32, 340 + li * 48), ln, font=f_b, fill=(241, 245, 249))
            d.rounded_rectangle([px + 32, 680, px + 530, 770], radius=10, fill=(20, 42, 82))
            d.text((px + 55, 705), f"MILESTONE GATE {pi+1}", font=f_tag, fill=(226, 232, 240))

    elif kind == "END_CREDITS":
        paste_fit(im, LOGO_PNG, (120, 150, 520, 420))
        d.rounded_rectangle([700, 130, 1840, 870], radius=20, fill=(14, 28, 56), outline=(56, 189, 248), width=3)
        d.text((750, 165), "หุ่นยนต์ปฏิบัติงานบนผนังอาคารแบบโมดูลาร์", font=f_h1, fill=(255, 255, 255))
        d.text((750, 225), "Module Facade Rover (MFR)  •  I-New Gen Award 2027", font=f_h2, fill=(56, 189, 248))
        d.text((750, 290), "โรงเรียนอัสสัมชัญธนบุรี  (Assumption College Thonburi)", font=f_b, fill=(226, 232, 240))
        d.line([(750, 348), (1790, 348)], fill=(45, 85, 140), width=2)
        credits = [
            "คณะผู้ประดิษฐ์ (ระดับมัธยมศึกษาตอนปลาย — ม.4):",
            "  • นายเมธาวินทร์ ศิวะพรพันธ์ (30%)     • นายศิวกร รักหนู (25%)",
            "  • นายพีรวิชช์ หาวนพันธ์ (23%)          • นายธนกฤต ธนพันธ์ (12%)",
            "",
            "อาจารย์ที่ปรึกษา:",
            "  • นายนคเรศ เครือเอี่ยม (5% หลัก/ผู้ประสานงาน)     • นายธนพล ติวารี (5% ร่วม)",
            "",
            "CAD Reference: MFR.step (1,370 Nodes)  •  Production: Blender 5.3 + FFmpeg Rec.709",
        ]
        for ci, cl in enumerate(credits):
            d.text((750, 380 + ci * 54), cl, font=f_sm, fill=(203, 213, 225))

    else:
        # PRESENTER_SLATE (S03, S05, S16, S21, S22): Real-footage placeholder + CAD/Status context
        d.rounded_rectangle([80, 135, 920, 865], radius=22, fill=(14, 30, 62), outline=(56, 189, 248), width=3)
        d.ellipse([390, 250, 610, 470], outline=(125, 211, 252), width=4)
        d.arc([290, 480, 710, 790], start=180, end=360, fill=(125, 211, 252), width=4)
        d.text((220, 170), f"LIVE PRESENTER STUDIO PLATE — {shot['speaker']}", font=f_h2, fill=(56, 189, 248))
        d.text((195, 760), f"{shot.get('speaker_name', '')}", font=f_b, fill=(255, 255, 255))
        d.text((165, 815), "FILMING SLATE: INSERT REAL TEAM CAMERA TAKE (NO AI HUMANS)", font=f_tag, fill=(148, 163, 184))

        d.rounded_rectangle([970, 135, 1840, 865], radius=22, fill=(12, 24, 48), outline=(45, 85, 140), width=3)
        studio_ref = os.path.join(WS, "08_PREVIEW_RENDERS/studio_check/Cam_Turntable_Hero.png")
        paste_fit(im, studio_ref if os.path.exists(studio_ref) else CAD_ISO, (1010, 165, 790, 420))
        y0 = 615
        d.text((1015, y0), shot["title"].upper(), font=f_h2, fill=(56, 189, 248))
        for li, ln in enumerate(wrap(d, shot["th"], f_b, 770)[:3]):
            d.text((1015, y0 + 54 + li * 44), ln, font=f_b, fill=(241, 245, 249))

    return draw_chrome(im, shot, t, n_frames / 24.0, fonts)


def iter_cg_frames(clip_path, n_needed):
    """Stream decoded 1920x1080 RGB frames from Blender CG clip, looping/holding last frame safely if exact match."""
    cmd = [
        "/opt/homebrew/bin/ffmpeg", "-v", "error", "-i", clip_path,
        "-vf", "scale=1920:1080,fps=24", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"
    ]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    frame_bytes = 1920 * 1080 * 3
    frames = []
    while len(frames) < n_needed:
        buf = p.stdout.read(frame_bytes)
        if len(buf) < frame_bytes:
            break
        frames.append(buf)
    p.stdout.close()
    p.wait()
    if not frames:
        raise RuntimeError(f"Empty CG clip: {clip_path}")
    while len(frames) < n_needed:
        frames.append(frames[-1])
    return frames


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["preview", "final"], required=True)
    args = parser.parse_args()

    with open(SHOT_JSON) as f:
        spec = json.load(f)

    out_mp4 = os.path.join(
        WS,
        "08_PREVIEW_RENDERS/MFR_FILM_V3_PREVIEW.mp4" if args.mode == "preview" else "09_FINAL_VIDEO/MFR_FILM_V3_FINAL.mp4"
    )
    crf = "28" if args.mode == "preview" else "19"

    fonts = (
        ImageFont.truetype(FONT_BOLD, 36),
        ImageFont.truetype(FONT_BOLD, 28),
        ImageFont.truetype(FONT_REG, 30),
        ImageFont.truetype(FONT_REG, 24),
        ImageFont.truetype(FONT_BOLD, 21),
    )

    cmd = [
        "/opt/homebrew/bin/ffmpeg", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1920x1080", "-r", "24", "-i", "-",
        "-i", spec["audio_master"],
        "-c:v", "libx264", "-preset", "medium" if args.mode == "final" else "fast",
        "-crf", crf, "-pix_fmt", "yuv420p",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-t", "168.0", "-movflags", "+faststart", out_mp4
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    total_written = 0
    for s in spec["shots"]:
        f0 = round(s["t_in"] * 24)
        f1 = round(s["t_out"] * 24)
        n_frames = f1 - f0
        dur = n_frames / 24.0
        clip_path = os.path.join(CG_DIR, f"{s['id']}.mp4")

        if s["kind"].startswith("BLENDER_") and os.path.exists(clip_path):
            raw_list = iter_cg_frames(clip_path, n_frames)
            extra = None
            if s["id"] == "S07":
                extra = "ENVELOPE: 224.0 x 220.2 x 274.6 mm  •  1,370 CAD NODES"
            elif s["id"] == "S09":
                extra = "7 SUBASSEMBLIES: Wheels | Motors | Chassis | Impeller | Bay | PCB | Cover"
            elif s["id"] == "S11":
                extra = "ELECTRONICS BAY: ESP32-S3-WROOM  •  82x82 mm PCB  •  USB-C  •  WS2812B"
            elif s["id"] == "S12":
                extra = "Ø84 mm 8-BLADE IMPELLER SHROUD  •  Ø60 x 38.1 mm WHEELS"
            elif s["id"] == "S19":
                extra = "WHEELS FLUSH ON CURTAIN WALL (Y = 0) — CONCEPTUAL TETHER RIG"
            for fi, buf in enumerate(raw_list):
                im = Image.frombytes("RGB", (1920, 1080), buf)
                out_im = draw_chrome(im, s, fi / 24.0, dur, fonts, extra_callout=extra)
                proc.stdin.write(out_im.tobytes())
        else:
            for fi in range(n_frames):
                out_im = make_motion_plate(s, fi, n_frames, fonts)
                proc.stdin.write(out_im.tobytes())
        total_written += n_frames
        print(f"COMPOSED {s['id']} ({n_frames}f)", flush=True)

    proc.stdin.close()
    rc = proc.wait()
    if rc != 0:
        raise RuntimeError(f"ffmpeg exited with {rc}")
    print(f"DONE {args.mode.upper()}: {out_mp4}, frames={total_written}")


if __name__ == "__main__":
    main()

#!/Library/Frameworks/Python.framework/Versions/3.13/bin/python3
"""Build MFR Film V3 24-shot storyboard animatic (1920x1080, 24 fps, 168.00 s) synced to mfr_master_mix_168s_v2.m4a."""

import json
import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

WS = "/Users/Siwakorn/Downloads/mfr/MFR_FILM_V3_WORKSPACE"
SHOT_JSON = os.path.join(WS, "07_STORYBOARD_SCRIPT/film_v3_shots.json")
OUT_MP4 = os.path.join(WS, "08_PREVIEW_RENDERS/MFR_FILM_V3_ANIMATIC.mp4")

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


def fit_paste(canvas, img_path, box):
    if not os.path.exists(img_path):
        return
    im = Image.open(img_path).convert("RGBA")
    x, y, w, h = box
    im.thumbnail((w, h), Image.Resampling.LANCZOS)
    px = x + (w - im.width) // 2
    py = y + (h - im.height) // 2
    canvas.paste(im, (px, py), im)


def wrap_text(draw, text, font, max_w):
    words = text.split(" ")
    lines, cur = [], ""
    for w in words:
        cand = (cur + " " + w).strip()
        if draw.textlength(cand, font=font) <= max_w or not cur:
            cur = cand
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def make_plate(shot, fonts):
    f_h1, f_h2, f_b, f_sm, f_tag = fonts
    im = Image.new("RGB", (1920, 1080), (10, 22, 44))
    d = ImageDraw.Draw(im)

    # Subtle grid background
    for gx in range(0, 1920, 80):
        d.line([(gx, 0), (gx, 1080)], fill=(18, 34, 64), width=1)
    for gy in range(0, 1080, 80):
        d.line([(0, gy), (1920, gy)], fill=(18, 34, 64), width=1)

    # Top header bar
    d.rectangle([0, 0, 1920, 96], fill=(7, 15, 32))
    d.rectangle([0, 94, 1920, 97], fill=(56, 189, 248))

    act_txt = f"ACT {shot['act']}  |  {shot['id']}  |  {shot['t_in']:.1f}s - {shot['t_out']:.1f}s ({shot['t_out'] - shot['t_in']:.1f}s)"
    d.text((48, 26), act_txt, font=f_h2, fill=(56, 189, 248))

    # Truth / Concept badge top-right
    b_col = hex_rgb(shot["badge_color"])
    b_txt = shot["badge"]
    bw = int(d.textlength(b_txt, font=f_tag)) + 40
    bx = 1920 - 48 - bw
    d.rounded_rectangle([bx, 22, bx + bw, 72], radius=10, fill=b_col)
    d.text((bx + 20, 32), b_txt, font=f_tag, fill=(255, 255, 255))

    # Left stage preview box
    stage_box = (60, 130, 1020, 690)
    d.rounded_rectangle([58, 128, 1082, 822], radius=18, fill=(15, 30, 58), outline=(45, 85, 140), width=3)

    kind = shot["kind"]
    if kind == "BLENDER_STUDIO":
        img = CAD_TOP if shot["id"] in ("S11",) else (CAD_FRONT if shot["id"] in ("S12",) else CAD_ISO)
        fit_paste(im, img, (80, 150, 980, 620))
        d.text((90, 775), f"3D CGI TARGET: {shot['notes']}", font=f_sm, fill=(148, 163, 184))
    elif kind in ("BLENDER_FACADE", "BLENDER_BUILDING"):
        fit_paste(im, CAD_SIDE, (80, 160, 480, 560))
        # Draw wireframe glass facade elevation schematic on right half of stage
        d.rectangle([600, 160, 1040, 760], fill=(20, 46, 86), outline=(56, 189, 248), width=2)
        for mx in range(640, 1040, 88):
            d.line([(mx, 160), (mx, 760)], fill=(96, 165, 250), width=3)
        for my in range(200, 760, 110):
            d.line([(600, my), (1040, my)], fill=(96, 165, 250), width=3)
        d.text((625, 175), "FULL-SCALE GLASS FACADE", font=f_tag, fill=(224, 242, 254))
        d.text((90, 775), f"3D SCENE: {shot['notes']}", font=f_sm, fill=(251, 191, 36))
    elif kind in ("PRESENTER_SLATE", "PRESENTER_HANDOFF", "TITLE_REVEAL"):
        d.rounded_rectangle([160, 190, 600, 730], radius=24, fill=(20, 45, 85), outline=(56, 189, 248), width=3)
        d.ellipse([300, 260, 460, 420], outline=(148, 163, 184), width=4)
        d.arc([230, 440, 530, 680], start=180, end=360, fill=(148, 163, 184), width=4)
        d.text((225, 650), f"CAMERA PLATE: {shot['speaker']}", font=f_tag, fill=(56, 189, 248))
        fit_paste(im, LOGO_PNG if shot["id"] == "S05" else CAD_ISO, (640, 220, 400, 460))
        d.text((90, 775), "NO FAKE AI HUMANS — REAL TEAM RECORDING PLACEHOLDER", font=f_sm, fill=(125, 211, 252))
    elif kind == "GRAPHIC_AI":
        fit_paste(im, AI_EVAL, (80, 150, 980, 610))
        d.text((90, 775), "AI 06 PIPELINE SMOKE-TEST FIXTURE — ADVISORY ONLY", font=f_sm, fill=(216, 180, 254))
    elif kind == "END_CREDITS":
        fit_paste(im, LOGO_PNG, (240, 180, 640, 420))
        d.text((190, 635), "โรงเรียนอัสสัมชัญธนบุรี  |  I-New Gen Award 2027", font=f_b, fill=(226, 232, 240))
        d.text((130, 695), "เมธาวินทร์ (30%)  •  ศิวกร (25%)  •  พีรวิชช์ (23%)  •  ธนกฤต (12%)", font=f_sm, fill=(148, 163, 184))
        d.text((230, 740), "ที่ปรึกษา: นคเรศ เครือเอี่ยม (5%)  •  ธนพล ติวารี (5%)", font=f_sm, fill=(148, 163, 184))
    else:
        fit_paste(im, CAD_ISO, (180, 170, 760, 560))
        d.text((90, 775), f"GRAPHIC PLATE: {shot['notes']}", font=f_sm, fill=(148, 163, 184))

    # Right info & script panel
    d.rounded_rectangle([1120, 128, 1860, 822], radius=18, fill=(15, 28, 52), outline=(45, 85, 140), width=3)
    d.text((1155, 155), shot["title"], font=f_h1, fill=(255, 255, 255))
    spk_line = f"Speaker: {shot.get('speaker_name', shot['speaker'])}"
    d.text((1155, 215), spk_line, font=f_b, fill=(56, 189, 248))

    d.line([(1155, 270), (1825, 270)], fill=(45, 85, 140), width=2)
    d.text((1155, 290), "THAI DIALOGUE / CAPTION:", font=f_tag, fill=(148, 163, 184))
    y_cursor = 335
    for ln in wrap_text(d, shot["th"], f_b, 670):
        d.text((1155, y_cursor), ln, font=f_b, fill=(241, 245, 249))
        y_cursor += 44

    y_cursor += 24
    d.text((1155, y_cursor), "ENGLISH COMPLEMENT:", font=f_tag, fill=(148, 163, 184))
    y_cursor += 40
    for ln in wrap_text(d, shot["en"], f_sm, 670):
        d.text((1155, y_cursor), ln, font=f_sm, fill=(203, 213, 225))
        y_cursor += 34

    d.text((1155, 740), f"PRODUCTION NOTE:", font=f_tag, fill=(148, 163, 184))
    for i, ln in enumerate(wrap_text(d, shot["notes"], f_sm, 670)[:2]):
        d.text((1155, 775 + i * 28), ln, font=f_sm, fill=(148, 163, 184))

    # Bottom Sarabun caption dock
    d.rectangle([0, 860, 1920, 1080], fill=(6, 12, 26))
    d.rectangle([0, 860, 1920, 863], fill=(37, 99, 235))
    d.text((80, 895), shot["th"], font=f_b, fill=(255, 255, 255))
    d.text((80, 960), shot["en"], font=f_sm, fill=(148, 163, 184))
    d.text((80, 1020), "ANIMATIC STORYBOARD PREVIEW  |  MFR FILM V3  |  1920x1080 24FPS", font=f_tag, fill=(100, 116, 139))

    return im


def main():
    with open(SHOT_JSON) as f:
        spec = json.load(f)

    fonts = (
        ImageFont.truetype(FONT_BOLD, 38),
        ImageFont.truetype(FONT_BOLD, 30),
        ImageFont.truetype(FONT_REG, 30),
        ImageFont.truetype(FONT_REG, 24),
        ImageFont.truetype(FONT_BOLD, 22),
    )

    cmd = [
        "/opt/homebrew/bin/ffmpeg", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1920x1080", "-r", "24", "-i", "-",
        "-i", spec["audio_master"],
        "-c:v", "libx264", "-preset", "fast", "-crf", "24", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-t", "168.0", "-movflags", "+faststart", OUT_MP4
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    total_written = 0
    for idx, s in enumerate(spec["shots"]):
        start_f = round(s["t_in"] * 24)
        end_f = round(s["t_out"] * 24)
        n_frames = end_f - start_f
        raw = make_plate(s, fonts).tobytes()
        for _ in range(n_frames):
            proc.stdin.write(raw)
        total_written += n_frames

    proc.stdin.close()
    rc = proc.wait()
    if rc != 0:
        raise RuntimeError(f"ffmpeg failed with code {rc}")
    print(f"ANIMATIC_OK: {OUT_MP4}, frames={total_written}, sec={total_written/24:.2f}")


if __name__ == "__main__":
    main()

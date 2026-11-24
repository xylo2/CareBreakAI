# Commandes pip à exécuter : Aucune dépendance externe requise (bibliothèque standard uniquement)
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path
from typing import Dict, List, Tuple

ROOT_DIR: Path = Path(__file__).resolve().parent.parent
ASSETS_DIR: Path = ROOT_DIR / "dist" / "store_assets"

RGBA = Tuple[int, int, int, int]


def encode_png(width: int, height: int, pixels: bytearray) -> bytes:
    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        start = y * stride
        raw.extend(pixels[start : start + stride])

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")


def fill_rect(buf: bytearray, w: int, h: int, x0: int, y0: int, x1: int, y1: int, col: RGBA) -> None:
    cx0, cy0 = max(0, x0), max(0, y0)
    cx1, cy1 = min(w, x1), min(h, y1)
    r, g, b, a = col
    for y in range(cy0, cy1):
        row = y * w * 4
        for x in range(cx0, cx1):
            idx = row + x * 4
            buf[idx : idx + 4] = bytes((r, g, b, a))


def draw_rounded_box(buf: bytearray, w: int, h: int, box: Tuple[int, int, int, int], radius: int, fill: RGBA, border: RGBA, bw: int = 3) -> None:
    x0, y0, x1, y1 = box
    for y in range(max(0, y0), min(h, y1)):
        for x in range(max(0, x0), min(w, x1)):
            dx = max(x0 + radius - x, 0, x - (x1 - 1 - radius))
            dy = max(y0 + radius - y, 0, y - (y1 - 1 - radius))
            dist = math.hypot(dx, dy)
            if dist <= radius:
                col = border if dist >= radius - bw else fill
                idx = (y * w + x) * 4
                buf[idx : idx + 4] = bytes(col)


def draw_circle(buf: bytearray, w: int, h: int, cx: float, cy: float, r: float, col: RGBA) -> None:
    x0, y0 = max(0, int(cx - r - 1)), max(0, int(cy - r - 1))
    x1, y1 = min(w, int(cx + r + 2)), min(h, int(cy + r + 2))
    for y in range(y0, y1):
        for x in range(x0, x1):
            if math.hypot(x - cx, y - cy) <= r:
                idx = (y * w + x) * 4
                buf[idx : idx + 4] = bytes(col)


def draw_carebreak_emblem(buf: bytearray, w: int, h: int, cx: float, cy: float, size: float) -> None:
    draw_circle(buf, w, h, cx, cy, size * 0.46, (30, 27, 75, 255))
    draw_circle(buf, w, h, cx, cy, size * 0.42, (15, 23, 42, 255))
    draw_circle(buf, w, h, cx, cy, size * 0.34, (45, 212, 191, 255))
    draw_circle(buf, w, h, cx, cy, size * 0.16, (15, 23, 42, 255))
    draw_circle(buf, w, h, cx + size * 0.06, cy - size * 0.06, size * 0.05, (248, 250, 252, 255))
    draw_circle(buf, w, h, cx + size * 0.28, cy - size * 0.26, size * 0.09, (251, 146, 60, 255))


def generate_edge_logo_300(out_path: Path) -> None:
    w = h = 300
    buf = bytearray(w * h * 4)
    draw_rounded_box(buf, w, h, (12, 12, 288, 288), 56, (15, 23, 42, 255), (56, 189, 248, 255), bw=6)
    draw_carebreak_emblem(buf, w, h, 150.0, 150.0, 210.0)
    out_path.write_bytes(encode_png(w, h, buf))


def generate_promo_1280x800(out_path: Path) -> None:
    w, h = 1280, 800
    buf = bytearray(w * h * 4)
    fill_rect(buf, w, h, 0, 0, w, h, (15, 23, 42, 255))
    draw_rounded_box(buf, w, h, (40, 36, 1240, 96), 14, (30, 41, 59, 255), (51, 65, 85, 255), bw=2)
    draw_circle(buf, w, h, 76, 66, 9, (239, 68, 68, 255))
    draw_circle(buf, w, h, 104, 66, 9, (245, 158, 11, 255))
    draw_circle(buf, w, h, 132, 66, 9, (34, 197, 94, 255))

    cards = [
        ((700, 130, 1220, 270), (4, 47, 46, 255), (45, 212, 191, 255), (20, 184, 166, 255)),
        ((700, 290, 1220, 430), (6, 78, 59, 255), (52, 211, 153, 255), (16, 185, 129, 255)),
        ((700, 450, 1220, 590), (12, 74, 110, 255), (56, 189, 248, 255), (2, 132, 199, 255)),
    ]
    for box, bg, bd, btn in cards:
        draw_rounded_box(buf, w, h, box, 18, bg, bd, bw=3)
        draw_circle(buf, w, h, box[0] + 46, box[1] + 54, 24, bd)
        draw_rounded_box(buf, w, h, (box[0] + 90, box[1] + 34, box[2] - 32, box[1] + 52), 6, (241, 245, 249, 255), (241, 245, 249, 255), bw=0)
        draw_rounded_box(buf, w, h, (box[2] - 180, box[3] - 46, box[2] - 24, box[3] - 14), 8, btn, btn, bw=0)

    draw_rounded_box(buf, w, h, (64, 690, 420, 756), 33, (67, 20, 7, 255), (251, 146, 60, 255), bw=3)
    draw_circle(buf, w, h, 102, 723, 18, (251, 146, 60, 255))
    draw_rounded_box(buf, w, h, (290, 704, 404, 742), 19, (22, 163, 74, 255), (22, 163, 74, 255), bw=0)

    draw_carebreak_emblem(buf, w, h, 340.0, 360.0, 320.0)
    out_path.write_bytes(encode_png(w, h, buf))


def generate_all(out_dir: Path = ASSETS_DIR) -> Dict[str, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    edge_logo = out_dir / "edge-logo-300x300.png"
    promo_shot = out_dir / "store-screenshot-1280x800.png"
    generate_edge_logo_300(edge_logo)
    generate_promo_1280x800(promo_shot)
    return {"edge_logo": edge_logo, "screenshot": promo_shot}


if __name__ == "__main__":
    generated = generate_all()
    for label, path in generated.items():
        print(f"[{label}] Image générée : {path}")

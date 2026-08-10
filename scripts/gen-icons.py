#!/usr/bin/env python3
"""
Generate Accelerator's PWA icons with zero dependencies (stdlib zlib + struct).
Design: near-black rounded tile, white infinity (∞) mark with a soft white glow.
Outputs public/icon-192.png, icon-512.png, apple-touch-icon.png, favicon.png.
"""
import struct
import zlib
import os
import math

BG = (10, 10, 15)        # #0A0A0F near-black
INK = (248, 248, 255)    # #F8F8FF near-white


def rounded(x, y, size, radius):
    r = radius
    if x < r and y < r:
        return (x - r) ** 2 + (y - r) ** 2 <= r * r
    if x > size - r and y < r:
        return (x - (size - r)) ** 2 + (y - r) ** 2 <= r * r
    if x < r and y > size - r:
        return (x - r) ** 2 + (y - (size - r)) ** 2 <= r * r
    if x > size - r and y > size - r:
        return (x - (size - r)) ** 2 + (y - (size - r)) ** 2 <= r * r
    return True


def infinity_samples(size, n=1600):
    """Points along a horizontal figure-eight (Lissajous 1:2)."""
    cx, cy = size / 2, size / 2
    rx, ry = size * 0.27, size * 0.155
    pts = []
    for i in range(n):
        t = (i / n) * 2 * math.pi
        x = cx + rx * math.sin(t)
        y = cy + ry * math.sin(2 * t)
        pts.append((x, y))
    return pts


def render(size, maskable=False):
    radius = int(size * 0.22)
    scale = 0.86 if maskable else 1.0  # keep the mark in the maskable safe zone
    stroke = size * 0.045 * scale      # half-width of the solid stroke
    glow_r = size * 0.13 * scale       # glow reach

    pts = infinity_samples(size)
    # Scale points toward center for maskable safe zone.
    cx = cy = size / 2
    pts = [((x - cx) * scale + cx, (y - cy) * scale + cy) for (x, y) in pts]

    ink = bytearray(size * size)        # 0/1 solid stroke mask
    glow = [0.0] * (size * size)        # accumulated glow

    def stamp_solid(px, py):
        r = stroke
        x0, x1 = max(0, int(px - r)), min(size - 1, int(px + r))
        y0, y1 = max(0, int(py - r)), min(size - 1, int(py + r))
        for yy in range(y0, y1 + 1):
            for xx in range(x0, x1 + 1):
                if (xx - px) ** 2 + (yy - py) ** 2 <= r * r:
                    ink[yy * size + xx] = 1

    def stamp_glow(px, py):
        r = glow_r
        x0, x1 = max(0, int(px - r)), min(size - 1, int(px + r))
        y0, y1 = max(0, int(py - r)), min(size - 1, int(py + r))
        for yy in range(y0, y1 + 1):
            for xx in range(x0, x1 + 1):
                d = math.hypot(xx - px, yy - py)
                if d <= r:
                    f = (1 - d / r) ** 2
                    idx = yy * size + xx
                    if f > glow[idx]:
                        glow[idx] = f

    for (px, py) in pts:
        stamp_glow(px, py)
    for (px, py) in pts:
        stamp_solid(px, py)

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # PNG filter byte
        for x in range(size):
            if not rounded(x + 0.5, y + 0.5, size, radius):
                raw.extend((0, 0, 0, 0))
                continue
            idx = y * size + x
            if ink[idx]:
                raw.extend((*INK, 255))
            else:
                g = min(1.0, glow[idx] * 0.55)  # soft glow strength
                col = tuple(int(BG[i] * (1 - g) + INK[i] * g) for i in range(3))
                raw.extend((*col, 255))
    return png_bytes(size, size, bytes(raw))


def png_bytes(w, h, raw):
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw, 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def main():
    out = os.path.join(os.path.dirname(__file__), "..", "public")
    os.makedirs(out, exist_ok=True)
    for name, size, maskable in [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
        ("favicon.png", 64, False),
    ]:
        with open(os.path.join(out, name), "wb") as f:
            f.write(render(size, maskable))
        print(f"wrote {name} ({size}x{size})")


if __name__ == "__main__":
    main()

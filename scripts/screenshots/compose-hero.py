"""The README's hero image of six looks side by side, from the bar shots that shoot-hero.mjs makes.
Usage: compose-hero.py <out dir> <brand dir> <output.png>"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

out_dir, brand, dest = sys.argv[1:4]
S = 2
W, H = 1000, 820
LOOKS = [("soft", "Soft", "Light and shade"), ("soft-dark", "Soft Dark", "Soft, on dark"), ("neon", "Neon", "Dark, with a glow"),
         ("glass", "Glass", "Frosted, in serif"), ("dock", "Dock", "Icons only"), ("3d", "3D", "Keys that press in")]


def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size * S)
        except OSError:
            continue
    return ImageFont.load_default()


SEMI = lambda s: font(["seguisb.ttf", "segoeuib.ttf", "arialbd.ttf"], s)
LIGHT = lambda s: font(["segoeuisl.ttf", "segoeui.ttf"], s)

# The backdrop: slate blue, darker towards the bottom right.
y = np.linspace(0, 1, H * S)[:, None]
x = np.linspace(0, 1, W * S)[None, :]
t = np.clip(y * 0.85 + x * 0.15, 0, 1)
top, bottom = np.array([128, 138, 160]), np.array([64, 71, 91])
arr = (top[None, None, :] * (1 - t[..., None]) + bottom[None, None, :] * t[..., None]).astype(np.uint8)
canvas = Image.fromarray(arr, "RGB").convert("RGBA")
d = ImageDraw.Draw(canvas)

# Title: the app icon and the name, centred, with the line under it.
icon = Image.open(f"{brand}/icon@2x.png").convert("RGBA").resize((70 * S, 70 * S), Image.LANCZOS)
name_font = SEMI(38)
tw = d.textlength("Dockbar", font=name_font)
gap = 14 * S
left = (W * S - (icon.width + gap + tw)) / 2
canvas.alpha_composite(icon, (int(left), 36 * S))
d.text((left + icon.width + gap, 71 * S), "Dockbar", font=name_font, fill=(255, 255, 255, 255), anchor="lm")
d.text((W * S / 2, 148 * S), "A persistent, styleable navigation bar for every Home Assistant dashboard.", font=LIGHT(19), fill=(255, 255, 255, 215), anchor="mm")

BAR_W, STEP, X0, Y0, BAR_H = 132, 154, 50, 196, 524
for i, (look, label, sub) in enumerate(LOOKS):
    bar = Image.open(f"{out_dir}/hero-{look}.png").convert("RGBA")
    bar = bar.crop((0, 0, BAR_W * S, BAR_H * S))
    mask = Image.new("L", bar.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, bar.width - 1, bar.height - 1), 26 * S, fill=255)
    fade = np.ones(bar.height)
    fade_len = 130 * S
    fade[-fade_len:] = np.linspace(1, 0, fade_len)
    m = (np.array(mask, dtype=float) * fade[:, None]).astype(np.uint8)
    bar.putalpha(Image.fromarray(m))
    canvas.alpha_composite(bar, (int((X0 + i * STEP) * S), Y0 * S))
    cx = (X0 + i * STEP + BAR_W / 2) * S
    d.text((cx, 762 * S), label, font=SEMI(22), fill=(255, 255, 255, 255), anchor="mm")
    d.text((cx, 792 * S), sub, font=LIGHT(13), fill=(255, 255, 255, 200), anchor="mm")

canvas.convert("RGB").save(dest)
print("saved", dest, canvas.size)

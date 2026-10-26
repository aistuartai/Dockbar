"""Frames the rendered settings dialogs like the hero: a slate gradient, a soft shadow, a hairline edge, and a fade where the dialog is cut.
Usage: compose.py <dir with the dialog shots> <output dir>"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src_dir, out_dir = sys.argv[1], sys.argv[2]
SS = 4
M = 88            # margin around the dialog, in 2x pixels
R = 32            # the dialog's corner radius at 2x

# name, source, crop box (left, top, right, bottom) in source pixels, fade rows at the cut
JOBS = [
    ("settings-general", "general", (0, 0, 1520, 1620), 150),
    ("settings-list", "buttons-list", (0, 0, 1520, 1560), 150),
    ("settings-toggle", "buttons-toggle", (0, 0, 1520, 1330), 120),
    ("settings-actions", "buttons-picker", (48, 48, 1568, 1420), 150),
]


def gradient(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    t = xx / w * 0.35 + yy / h * 0.65
    c1, c2 = np.array([128, 138, 160], float), np.array([58, 65, 84], float)
    g = c1 * (1 - t[..., None]) + c2 * t[..., None]
    glow = np.exp(-(((xx - w / 2) / (w * 0.6)) ** 2 + ((yy - h * 0.5) / (h * 0.55)) ** 2))
    g = g + glow[..., None] * np.array([22, 24, 32])
    return Image.fromarray(np.clip(g, 0, 255).astype("uint8")).convert("RGBA")


def mask(w, h, fade, round_bottom):
    big = Image.new("L", (w * SS, h * SS), 0)
    d = ImageDraw.Draw(big)
    d.rounded_rectangle((0, 0, w * SS - 1, h * SS - 1 + (0 if round_bottom else R * SS * 2)), R * SS, fill=255)
    a = np.asarray(big.resize((w, h), Image.LANCZOS), float)
    if fade:
        ramp = np.ones(h)
        ramp[h - fade:] = np.linspace(1, 0, fade)
        a = a * ramp[:, None]
    return Image.fromarray(a.astype("uint8"))


for name, source, box, fade in JOBS:
    im = Image.open(f"{src_dir}/{source}.png").convert("RGBA").crop(box)
    w, h = im.size
    full = fade == 0
    m = mask(w, h, fade, round_bottom=full)
    im.putalpha(m)

    W, H = w + 2 * M, h + 2 * M
    canvas = gradient(W, H)

    # shadow that follows the dialog's shape
    pad = 90
    sh = Image.new("L", (w + pad * 2, h + pad * 2), 0)
    sh.paste(m.point(lambda v: int(v * 0.6)), (pad, pad))
    sh = sh.filter(ImageFilter.GaussianBlur(34))
    shadow = Image.new("RGBA", sh.size, (0, 0, 0, 255))
    shadow.putalpha(sh)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(shadow, (M - pad, M - pad + 22), shadow)
    canvas = Image.alpha_composite(canvas, layer)

    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(im, (M, M), im)
    canvas = Image.alpha_composite(canvas, layer)

    # hairline edge, fading with the dialog
    edge = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(edge).rounded_rectangle((0, 0, w * SS - 1, h * SS - 1 + (0 if full else R * SS * 2)), R * SS, outline=255, width=SS * 2)
    e = np.asarray(edge.resize((w, h), Image.LANCZOS), float) * 0.20
    if fade:
        ramp = np.ones(h)
        ramp[h - fade:] = np.linspace(1, 0, fade)
        e = e * ramp[:, None]
    white = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    white.putalpha(Image.fromarray(e.astype("uint8")))
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    layer.paste(white, (M, M), white)
    canvas = Image.alpha_composite(canvas, layer)

    canvas.convert("RGB").save(f"{out_dir}/{name}.png", optimize=True)
    print(name, canvas.size)

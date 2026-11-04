"""Phone frames on a slate background, for the README's phone image (docs/phones.png).
Usage: compose-phones.py <dir with the phone-*.png shots> <output dir>"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

shots, out_dir = sys.argv[1], sys.argv[2]
S = 2
SS = 4

SETS = {
    "phone-a": [("phone-glass-top", "Glass", "Top bar"), ("phone-soft-bottom", "Soft", "Bottom bar"), ("phone-3d-bottom", "3D", "Bottom bar")],
    "phone-c": [("phone-glass-reserve", "Page ends at the bar", "Bottom bar, scrolled"), ("phone-soft-font", "Choose a font", "Monospace, bottom bar"), ("phone-neon-serif", "Fits short bars", "Serif, top bar")],
    "phone-b": [("phone-neon-top", "Neon", "Top bar"), ("phone-softdark-bottom", "Soft Dark", "Bottom bar"), ("phone-dock-bottom", "Dock", "Bottom bar")],
}


def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size * S)
        except OSError:
            continue
    return ImageFont.load_default()


SEMI = lambda s: font(["seguisb.ttf", "segoeuib.ttf", "arialbd.ttf"], s)
REG = lambda s: font(["segoeui.ttf", "arial.ttf"], s)
LIGHT = lambda s: font(["segoeuisl.ttf", "segoeui.ttf"], s)


def gradient(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    t = xx / w * 0.35 + yy / h * 0.65
    c1, c2 = np.array([128, 138, 160], float), np.array([58, 65, 84], float)
    g = c1 * (1 - t[..., None]) + c2 * t[..., None]
    glow = np.exp(-(((xx - w / 2) / (w * 0.6)) ** 2 + ((yy - h * 0.55) / (h * 0.5)) ** 2))
    g = g + glow[..., None] * np.array([22, 24, 32])
    return Image.fromarray(np.clip(g, 0, 255).astype("uint8")).convert("RGBA")


def rounded(w, h, r):
    big = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * SS - 1, h * SS - 1), r * SS, fill=255)
    return big.resize((w, h), Image.LANCZOS)


def phone(shot_path, scr_w=270):
    scr_h = scr_w * 2
    bez = 11
    sw, sh = scr_w * S, scr_h * S
    img = Image.open(shot_path).convert("RGBA").resize((sw, sh), Image.LANCZOS)
    img.putalpha(rounded(sw, sh, 34 * S))
    W, H = sw + bez * 2 * S, sh + bez * 2 * S
    body = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    outer = rounded(W, H, 44 * S)
    frame = Image.new("RGBA", (W, H), (14, 14, 18, 255))
    frame.putalpha(outer)
    body = Image.alpha_composite(body, frame)
    # a faint metallic rim
    rim = Image.new("L", (W * SS, H * SS), 0)
    ImageDraw.Draw(rim).rounded_rectangle((0, 0, W * SS - 1, H * SS - 1), 44 * S * SS, outline=255, width=SS * 2)
    rim = rim.resize((W, H), Image.LANCZOS).point(lambda v: int(v * 0.30))
    rim_img = Image.new("RGBA", (W, H), (190, 196, 210, 255))
    rim_img.putalpha(rim)
    body = Image.alpha_composite(body, rim_img)
    body.alpha_composite(img, (bez * S, bez * S))
    # the camera pill
    d = ImageDraw.Draw(body)
    pw, ph = 74 * S, 20 * S
    px, py = (W - pw) // 2, (bez + 7) * S
    d.rounded_rectangle((px, py, px + pw, py + ph), ph // 2, fill=(8, 8, 10, 255))
    return body


TITLES = {
    "phone-c": ("Fonts, a page that ends at the bar, and tidy footer buttons", "Dashboards stop at the bar even when you scroll, and the pinned buttons sit inside it."),
}
DEFAULT_TITLE = ("On a phone, the bar goes top or bottom", "It keeps clear of the status bar and home indicator, and the page lays itself out around it.")

for name, items in SETS.items():
    title, subtitle = TITLES.get(name, DEFAULT_TITLE)
    CW, CH = 1000, 780
    canvas = gradient(CW * S, CH * S)
    d = ImageDraw.Draw(canvas)
    d.text((CW * S / 2, 52 * S), title, font=SEMI(34), fill=(255, 255, 255, 255), anchor="mm")
    d.text((CW * S / 2, 92 * S), subtitle, font=LIGHT(17), fill=(255, 255, 255, 195), anchor="mm")
    phones = [phone(f"{shots}/{shot}.png") for shot, _, _ in items]
    pw = phones[0].width
    gap = (CW * S - len(phones) * pw) // (len(phones) + 1)
    top = 128 * S
    for i, (p, (_, label, where)) in enumerate(zip(phones, items)):
        x = gap + i * (pw + gap)
        # a soft shadow under each phone
        sh = Image.new("L", canvas.size, 0)
        sh.paste(p.getchannel("A").point(lambda v: int(v * 0.55)), (x, top + 18 * S))
        sh = sh.filter(ImageFilter.GaussianBlur(26 * S))
        black = Image.new("RGBA", canvas.size, (0, 0, 0, 255))
        black.putalpha(sh)
        canvas = Image.alpha_composite(canvas, black)
        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        layer.paste(p, (x, top), p)
        canvas = Image.alpha_composite(canvas, layer)
        d = ImageDraw.Draw(canvas)
        cx = x + pw / 2
        d.text((cx, top + p.height + 34 * S), label, font=SEMI(24), fill=(255, 255, 255, 255), anchor="mm")
        d.text((cx, top + p.height + 62 * S), where, font=REG(15), fill=(255, 255, 255, 175), anchor="mm")
    canvas.convert("RGB").save(f"{out_dir}/{name}.png", optimize=True)
    print(name, canvas.size)

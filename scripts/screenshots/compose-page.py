"""The README's light page image (docs/hero-page.png), built on a rendered Soft bar so its shadows aren't clipped. 2x resolution.
Usage: compose-page.py <bar-page.png> <brand dir> <output.png>"""
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

bar_png, brand, out = sys.argv[1], sys.argv[2], sys.argv[3]
S = 2
SS = 4
BASE = (230, 233, 238)
GREEN = (79, 107, 98)


def font(names, size):
    for n in names:
        try:
            return ImageFont.truetype(n, size * S)
        except OSError:
            continue
    return ImageFont.load_default()


SEMI = lambda s: font(["seguisb.ttf", "segoeuib.ttf", "arialbd.ttf"], s)
LIGHT = lambda s: font(["segoeuisl.ttf", "segoeui.ttf"], s)

canvas = Image.open(bar_png).convert("RGBA")
assert canvas.size == (1000 * S, 640 * S), canvas.size


def rounded(w, h, r):
    big = Image.new("L", (w * SS, h * SS), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * SS - 1, h * SS - 1), r * SS, fill=255)
    return big.resize((w, h), Image.LANCZOS)


def card(canvas, x, y, w, h, r=30):
    x, y, w, h, r = x * S, y * S, w * S, h * S, r * S
    face = rounded(w, h, r)
    for col, off, a in (((255, 255, 255), (-9 * S, -9 * S), 235), ((163, 173, 190), (10 * S, 10 * S), 140)):
        sh = Image.new("L", canvas.size, 0)
        sh.paste(face.point(lambda v, a=a: int(v * a / 255)), (x + off[0], y + off[1]))
        sh = sh.filter(ImageFilter.GaussianBlur(14 * S))
        tint = Image.new("RGBA", canvas.size, col + (255,))
        tint.putalpha(sh)
        canvas = Image.alpha_composite(canvas, tint)
    fill = Image.new("RGBA", (w, h), BASE + (255,))
    fill.putalpha(face)
    canvas.alpha_composite(fill, (x, y))
    return canvas


def pill(canvas, x, y, label, f, padx=16, pady=8):
    d = ImageDraw.Draw(canvas)
    tw = d.textlength(label, font=f)
    w, h = int(tw + padx * 2 * S), int(f.size + pady * 2 * S)
    big = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * SS - 1, h * SS - 1), h * SS // 2, fill=BASE + (255,), outline=(190, 197, 210, 255), width=SS * S)
    canvas.alpha_composite(big.resize((w, h), Image.LANCZOS), (int(x * S), int(y * S)))
    ImageDraw.Draw(canvas).text((x * S + w / 2, y * S + h / 2 - S), label, font=f, fill=GREEN + (255,), anchor="mm")
    return w / S


logo = Image.open(f"{brand}/logo@2x.png").convert("RGBA")
lh = 84 * S
logo = logo.resize((int(logo.width * lh / logo.height), lh), Image.LANCZOS)
canvas.alpha_composite(logo, (200 * S, 60 * S))

d = ImageDraw.Draw(canvas)
d.multiline_text((204 * S, 168 * S), "A persistent, styleable navigation bar\nfor every Home Assistant dashboard.", font=LIGHT(27), fill=GREEN + (255,), spacing=6 * S)

x = 204
for label in ["Any edge", "GUI editor", "Live preview", "Sections", "Actions", "3 levels"]:
    x += pill(canvas, x, 262, label, SEMI(15)) + 10

tiles = [("Garage", "Closed", GREEN), ("Lounge", "On", (217, 164, 0)), ("Solar", "3.2 kW", GREEN)]
for i, (a, b, col) in enumerate(tiles):
    tx = 204 + i * 250
    canvas = card(canvas, tx, 372, 220, 170)
    d = ImageDraw.Draw(canvas)
    d.text(((tx + 26) * S, 396 * S), a.upper(), font=SEMI(14), fill=GREEN + (200,))
    d.text(((tx + 26) * S, 440 * S), b, font=SEMI(38), fill=col + (255,))
    d.rounded_rectangle(((tx + 26) * S, 508 * S, (tx + 86) * S, 514 * S), 3 * S, fill=col + (170,))

canvas.convert("RGB").save(out, optimize=True)
print(out, canvas.size)

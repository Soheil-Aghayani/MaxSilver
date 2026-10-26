#!/usr/bin/env python3
"""Cuts out the oven photo of each PizzaMaster data sheet (white background -> transparent) and writes
assets/products/pl/ms-pm7Nx.webp (the site) and assets/products/xl/ms-pm7Nx.png (Google Sheets IMAGE() cannot show webp).
The sheet shows one model of each series (722, 732, 742: two decks); the other models of the series use the same photo and say so in their text.
Usage: python tools/make_pizzamaster_photos.py <folder with the PDFs>   (PyMuPDF + Pillow)"""
import glob, io, os, sys
import fitz
from PIL import Image, ImageDraw

SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\Baskar\Downloads\Documents'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
for f in sorted(glob.glob(os.path.join(SRC, '*.pdf'))):
    d = fitz.open(f)
    head = d[0].get_text()
    import re
    m = re.search(r'PM (7\d)X Series', head)
    if not m or 'Modular Electric Deck Oven' not in head:
        continue
    s = m.group(1)
    out = os.path.join(ROOT, 'assets', 'products', 'pl', 'ms-pm%sx.webp' % s)
    if os.path.exists(out):
        continue
    x = d[0].get_images(full=True)[0][0]
    pix = fitz.Pixmap(d, x)
    if pix.n >= 5:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    work = im.copy()
    MAG = (255, 0, 255)
    seeds = [(2, 2), (im.width - 3, 2), (2, im.height - 3), (im.width - 3, im.height - 3)]
    # the white inside the stand (between the legs and shelves) is not connected to the edge
    seeds += [(int(im.width * fx), int(im.height * fy)) for fx in (0.5,) for fy in (0.66, 0.82, 0.93)]
    for seed in seeds:
        if min(work.getpixel(seed)) > 240:
            ImageDraw.floodfill(work, seed, MAG, thresh=14)
    rgba = im.convert('RGBA')
    px, wp = rgba.load(), work.load()
    for yy in range(im.height):
        for xx in range(im.width):
            if wp[xx, yy] == MAG:
                px[xx, yy] = (255, 255, 255, 0)
    rgba = rgba.crop(rgba.getbbox())
    side = max(rgba.size)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(rgba, ((side - rgba.width) // 2, (side - rgba.height) // 2))
    a = sq.resize((640, 640), Image.LANCZOS)
    a.save(out, 'WEBP', quality=88, method=6)
    sq.resize((400, 400), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'products', 'xl', 'ms-pm%sx.png' % s), 'PNG', optimize=True)
    print(s, os.path.getsize(out))

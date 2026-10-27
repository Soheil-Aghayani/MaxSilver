#!/usr/bin/env python3
"""Takes the 15 PW7 oven pictures made by GPT (ms-pw721.png ... ms-pw745.png, transparent, one scale for all) and writes
assets/products/pl/ms-pw7NN.webp (640 px square, for the site) and assets/products/xl/ms-pw7NN.png (400 px, for Google Sheets).
Each oven is placed on a square canvas with the SAME scale (the tallest oven fills the height), so the family can be compared at a glance.
Usage: python tools/import_pw7_family_photos.py <folder with the 15 PNGs>"""
import os, sys
from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\Baskar\Documents\ChatGPT\Max Silver\output\maxsilver-pw7-family'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
models = ['72%d' % i for i in range(1, 6)] + ['73%d' % i for i in range(1, 6)] + ['74%d' % i for i in range(1, 6)]
imgs = {}
for m in models:
    im = Image.open(os.path.join(SRC, 'ms-pw%s.png' % m)).convert('RGBA')
    imgs[m] = im.crop(im.getbbox())
top = max(max(i.size) for i in imgs.values())            # one scale: the biggest side of the biggest picture
for m, im in imgs.items():
    sq = Image.new('RGBA', (top, top), (0, 0, 0, 0))
    sq.paste(im, ((top - im.width) // 2, top - im.height))   # sit on the bottom edge like real ovens on a floor
    sq.resize((640, 640), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'products', 'pl', 'ms-pw%s.webp' % m), 'WEBP', quality=88, method=6)
    sq.resize((400, 400), Image.LANCZOS).save(os.path.join(ROOT, 'assets', 'products', 'xl', 'ms-pw%s.png' % m), 'PNG', optimize=True)
print(len(imgs), 'models written; canvas side', top)

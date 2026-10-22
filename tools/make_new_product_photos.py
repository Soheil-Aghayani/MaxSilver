#!/usr/bin/env python3
"""Makes the catalog pictures of the products added on 1405/07/29 from the GPT cut-outs (transparent PNG).
  assets/products/pl/<stem>.webp  440x440 transparent, centered with a small margin (catalog, planner, assistant)
  assets/products/xl/<stem>.png   320x320 transparent (price book pictures; the sheet reads them from GitHub Pages)
Max Silver gets the cut-out with the brand logo, Wintora the logo-free one.
Usage:  python tools/make_new_product_photos.py <folder with the *_cutout*.png files>   (needs Pillow and numpy)"""
import os, sys
import numpy as np
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, '..', '04_Product_Catalog', 'New_Photos_1405_08', 'cutouts')
# stem -> (file for Max Silver, file for Wintora)
JOBS = {
    'new-oven4': ('oven-4-burner-with-oven_cutout.png', 'oven-4-burner-with-oven_cutout_nologo.png'),
    'new-oven6': ('oven-6-burner-with-oven_cutout.png', 'oven-6-burner-with-oven_cutout_nologo.png'),
    'new-trolley': ('bain-marie-trolley_cutout.png', 'bain-marie-trolley_cutout_nologo.png'),
}


def prepare(path, size):
    im = Image.open(path).convert('RGBA')
    a = np.array(im)
    a[a[:, :, 3] < 10] = 0                       # stray almost-invisible pixels of the cut-out
    im = Image.fromarray(a)
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox())
    m = int(max(im.size) * 0.06)
    side = max(im.size) + 2 * m
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return sq.resize((size, size), Image.LANCZOS)


for stem, (ms, wt) in JOBS.items():
    for pre, f in (('ms-', ms), ('wt-', wt)):
        p = os.path.join(src, f)
        if not os.path.exists(p):
            print('missing', p)
            continue
        name = pre + stem
        prepare(p, 440).save(os.path.join(root, 'assets', 'products', 'pl', name + '.webp'), 'WEBP', quality=90, method=6)
        prepare(p, 320).save(os.path.join(root, 'assets', 'products', 'xl', name + '.png'), 'PNG', optimize=True)
        print('made', name)

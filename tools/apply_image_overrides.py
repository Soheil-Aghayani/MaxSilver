# -*- coding: utf-8 -*-
"""Re-applies the transparent product photos listed in tools/product-image-overrides.json to assets/catalog.json.

catalog.json is generated from the product database; run this after every regeneration so the cut-out photos
(WebP with a transparent background, made from the PNG sets on the raw-data drive) are not lost.
Usage:  python tools/apply_image_overrides.py
"""
import json, os, sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cat_path = os.path.join(root, 'assets', 'catalog.json')
ov = json.load(open(os.path.join(root, 'tools', 'product-image-overrides.json'), encoding='utf-8'))
data = json.load(open(cat_path, encoding='utf-8'))
by = {i['id']: i for i in data['items']}
done = missing = 0
for cid, e in ov.items():
    if cid not in by or not os.path.exists(os.path.join(root, e['img'].lstrip('./'))):
        missing += 1
        print('skipped', cid)
        continue
    by[cid]['img'] = e['img']
    done += 1
json.dump(data, open(cat_path, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('applied', done, 'skipped', missing)

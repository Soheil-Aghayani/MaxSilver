#!/usr/bin/env python3
"""Adds the nine products the owner asked for on 1405/07/29 to assets/catalog.json for Max Silver and Wintora (18 items).
They have no code, no price and no picture yet: the catalog shows the cube icon and «بدون قیمت»; the sales expert gives the price.
Safe to run again (an id that exists is left alone). Run it again after every regeneration of catalog.json from the database.
Usage:  python tools/add_new_products_1405_08.py [assets/catalog.json]
Pictures: when the cut-out photos exist, put them in assets/products/ and set "img" on these ids (see tools/product-image-overrides.json)."""
import io, json, os, sys

path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'catalog.json')
WHY = 'کالای تازه‌افزوده‌شده؛ کد، قیمت و ابعاد را کارشناس فروش اعلام می‌کند.'
BRANDS = ['max-silver', 'wintora']
# key, name, group, category, specs taken from the name only
ITEMS = [
    ('oven4-700', 'اجاق چهار شعله فردار سری ۷۰۰', 'تجهیزات پخت', 'اجاق', [['تعداد شعله', '۴'], ['نوع', 'فردار'], ['سری', '۷۰۰']]),
    ('oven4-900', 'اجاق چهار شعله فردار سری ۹۰۰', 'تجهیزات پخت', 'اجاق', [['تعداد شعله', '۴'], ['نوع', 'فردار'], ['سری', '۹۰۰']]),
    ('oven6-700', 'اجاق شش شعله فردار سری ۷۰۰', 'تجهیزات پخت', 'اجاق', [['تعداد شعله', '۶'], ['نوع', 'فردار'], ['سری', '۷۰۰']]),
    ('oven6-900', 'اجاق شش شعله فردار سری ۹۰۰', 'تجهیزات پخت', 'اجاق', [['تعداد شعله', '۶'], ['نوع', 'فردار'], ['سری', '۹۰۰']]),
    ('sinktop-75x50', 'رویه سینک ۷۵×۵۰ تک لگن', 'تجهیزات آشپزخانه', 'میز کار', [['تعداد لگن', 'تک']]),
    ('sinktop-50x100', 'رویه سینک ۵۰×۱۰۰ تک لگن', 'تجهیزات آشپزخانه', 'میز کار', [['تعداد لگن', 'تک']]),
    ('sink-75x50', 'سینک ۷۵×۵۰ تک لگن', 'تجهیزات آشپزخانه', 'میز کار', [['تعداد لگن', 'تک']]),
    ('sink-50x100', 'سینک ۵۰×۱۰۰ تک لگن', 'تجهیزات آشپزخانه', 'میز کار', [['تعداد لگن', 'تک']]),
    ('trolley', 'ترولی حمل بن‌ماری', 'ظروف و بن‌ماری', 'بن‌ماری', []),
]

text = io.open(path, encoding='utf-8').read()
data = json.loads(text)
# picture stems made by tools/make_new_product_photos.py (ms- for Max Silver, wt- for Wintora); sinks have none yet
PIC = {'oven4-700': 'new-oven4', 'oven4-900': 'new-oven4', 'oven6-700': 'new-oven6', 'oven6-900': 'new-oven6', 'trolley': 'new-trolley'}
PRE = {'max-silver': 'ms-', 'wintora': 'wt-'}
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
def pic(brand, key):
    s = PIC.get(key)
    f = os.path.join(root, 'assets', 'products', 'pl', PRE[brand] + s + '.webp') if s else ''
    return './assets/products/pl/%s%s.webp' % (PRE[brand], s) if s and os.path.exists(f) else ''
have = {i['id']: i for i in data['items']}
added = 0
for brand in BRANDS:
    for key, name, grp, cat, specs in ITEMS:
        iid = '%s:new-%s' % (brand, key)
        if iid in have:
            if pic(brand, key) and not have[iid].get('img'):
                have[iid]['img'] = pic(brand, key)
            continue
        data['items'].append({'id': iid, 'src': brand, 'name': name, 'code': '', 'grp': grp, 'cat': cat, 'sec': [], 'img': pic(brand, key), 'url': '', 'desc': WHY, 'dims': None, 'wt': None, 'specs': specs})
        added += 1
io.open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('added', added, 'items; total', len(data['items']))

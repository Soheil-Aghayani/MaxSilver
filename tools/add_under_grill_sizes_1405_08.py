#!/usr/bin/env python3
"""Adds the ten under-grill fridges and freezers the owner asked for on 1405/08/09 (sizes 132, 162, 202, 212, 242 for each) to
assets/catalog.json for Max Silver. The number is the length in decimetres: 212 = 2120 x 800 x 615 mm. Codes and prices are pending: the
catalog shows «بدون قیمت»; the ids (max-silver:new-ug-<kind>-<size>) are the same «شناسه برنامه» as in the Google price book rows.
Safe to run again (an id that exists is left alone). Usage:  python tools/add_under_grill_sizes_1405_08.py [assets/catalog.json]"""
import io, json, os, sys

path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'catalog.json')
SIZES = (132, 162, 202, 212, 242)   # the ids keep these numbers
LENGTH = {132: 132, 162: 162, 202: 200, 212: 210, 242: 245}   # real length in cm (owner changed 202/212/242 on 1405/08/09)
DESC = 'کالای تازه‌افزوده‌شده؛ کد و قیمت را کارشناس فروش اعلام می‌کند. ابعاد: طول %s، عرض ۸۰۰، ارتفاع ۶۱۵ میلی‌متر.'
data = json.loads(io.open(path, encoding='utf-8').read())
have = {i['id'] for i in data['items']}
added = 0
for kind, name in (('fridge', 'یخچال زیر گریل'), ('freezer', 'فریزر زیر گریل')):
    for s in SIZES:
        iid = 'max-silver:new-ug-%s-%d' % (kind, s)
        if iid in have:
            continue
        data['items'].append({'id': iid, 'src': 'max-silver', 'name': '%s(615 * 800 * %d)' % (name, LENGTH[s] * 10), 'code': '', 'grp': 'تجهیزات پخت', 'cat': 'گریل', 'sec': [],
                              'img': './assets/products/pl/ms34-1.webp', 'url': '', 'desc': DESC % ('{:,}'.format(LENGTH[s] * 10).replace(',', '٬')),
                              'dims': {'l': LENGTH[s], 'w': 80, 'h': 61.5}, 'wt': None, 'specs': []})
        added += 1
io.open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
print('added', added, 'items; total', len(data['items']))

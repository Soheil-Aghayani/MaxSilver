# Adds the price-list rows that have no product in assets/catalog.json as catalog products, with their Mehr 1405 prices.
# Usage:  python tools/add_pricelist_items.py <price_reference_1405_07.json> assets/catalog.json assets/price-list.json
# Safe to run again: earlier additions (items with "pl": 1) are removed first. A new item has no picture, size or specs
# (the price lists do not carry them), and its description names the price-list group. Rows that look like an existing
# catalog product are listed in the description so the owner can retire one of the two (prices page, «کنار گذاشتن کد»).
import sys, io, json, re, collections
ref, cat_path, pl_path = sys.argv[1], sys.argv[2], sys.argv[3]
d = json.load(io.open(ref, encoding='utf-8'))['items']
c = json.load(io.open(cat_path, encoding='utf-8'))
pl = json.load(io.open(pl_path, encoding='utf-8'))
items = [i for i in c['items'] if not i.get('pl')]
for k in [k for k in pl['items'] if ':pl-' in k]:
    del pl['items'][k]

grp_of = collections.defaultdict(collections.Counter)
for i in items:
    grp_of[i['cat']][i['grp']] += 1
EXTRA_GRP = {'دیگ و تابه': 'تجهیزات پخت', 'سایر': 'تجهیزات آشپزخانه'}
def grp(cat):
    if cat in grp_of:
        return grp_of[cat].most_common(1)[0][0]
    return EXTRA_GRP.get(cat, 'تجهیزات آشپزخانه')

FA = str.maketrans('۰۱۲۳۴۵۶۷۸۹', '0123456789')
STOP = set('با و برای مدل طرح قطعات'.split())
def kw(s):
    s = s.translate(FA).replace('‌', ' ')
    s = re.sub(r'[()+\-،,*×/]', ' ', s)
    return {t for t in s.split() if t and t not in STOP}
def twin(row):
    a = kw(row['name'])
    best = (0, None)
    for i in items:
        if i['src'] != row['brand']:
            continue
        b = kw(i['name'])
        if not a or not b:
            continue
        na, nb = {x for x in a if x.isdigit()}, {x for x in b if x.isdigit()}
        if na and nb and not (na <= nb or nb <= na):
            continue
        sc = len(a & b) / len(a | b)
        if sc > best[0]:
            best = (sc, i)
    return best[1] if best[0] >= 0.5 else None

seen, added, nopr = set(), 0, 0
for n, r in enumerate(d):
    if r.get('match'):
        continue
    key = (r['brand'], r['code'], r['name'])
    if key in seen:
        continue
    seen.add(key)
    iid = '%s:pl-%d' % (r['brand'], n)
    desc = 'از فهرست قیمت مهر ۱۴۰۵' + (' (گروه: %s)' % r['group'] if r.get('group') else '') + '. تصویر و مشخصات این کالا هنوز در کاتالوگ نیست.'
    t = twin(r)
    if t:
        desc += ' ممکن است همان «%s» در کاتالوگ باشد.' % t['name']
    items.append({'id': iid, 'src': r['brand'], 'name': r['name'], 'code': r['code'] or '', 'grp': grp(r['cat']), 'cat': r['cat'],
                  'sec': [], 'img': '', 'url': '', 'desc': desc, 'dims': None, 'wt': None, 'specs': [], 'pl': 1})
    added += 1
    f, p = r['flag'], r['price']
    if f == 'p' and p and p > 0:
        pl['items'][iid] = [int(round(p / 10)), 'p']
    elif f in ('i', 'r'):
        pl['items'][iid] = [0, f]
    else:
        nopr += 1
c['items'] = items
io.open(cat_path, 'w', encoding='utf-8', newline='\n').write(json.dumps(c, ensure_ascii=False, separators=(',', ':')))
io.open(pl_path, 'w', encoding='utf-8', newline='\n').write(json.dumps(pl, ensure_ascii=False, separators=(',', ':')))
print('added', added, 'without a price', nopr, 'total items', len(items), 'priced', len(pl['items']))

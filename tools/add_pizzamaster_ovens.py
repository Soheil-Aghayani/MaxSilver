#!/usr/bin/env python3
"""Adds the PizzaMaster-style electric deck ovens PW721..PW745-ED (15 models, three series of five) to assets/catalog.json for Max Silver,
with the numbers of the supplier's data sheets (tools/pizzamaster_ovens.json, made by parse_pizzamaster_ovens.py) and the cut-out photos.
PW732 already exists from the Mehr 1405 price list (max-silver:pl-231, code 106250): it is completed, not duplicated.
The other 14 have no code and no price yet: the sales expert gives them (the owner will tell the codes).
Safe to run again. Usage: python tools/add_pizzamaster_ovens.py [assets/catalog.json]. Also writes tools/pizzamaster_sheet_rows.json (the rows for the price book)."""
import io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'assets', 'catalog.json')
D = json.load(io.open(os.path.join(HERE, 'pizzamaster_ovens.json'), encoding='utf-8'))
FA = '۰۱۲۳۴۵۶۷۸۹'


def fa(v):
    s = ('%g' % v) if isinstance(v, float) else str(v)
    return s.replace('.', '٫').translate({ord(str(i)): FA[i] for i in range(10)})


def cm(mm):
    return round(mm / 10.0, 1)


SERIES_NOTE = {'72': 'سنگ‌های پخت دو تکه', '73': 'سنگ‌های پخت سه تکه', '74': 'سنگ‌های پخت چهار تکه'}
FEATURES = ('پنل کنترل IQControl، بازیابی سریع دما (TempIQ)، استارت سریع (TurboStart)، سه ناحیهٔ حرارتی (بالا، پایین، جلو)، سنگ سرامیکی با عملکرد ترد کردن کف، '
            'عایق پرتراکم، دریچهٔ تهویهٔ جدا برای هر دکه، هود تهویه، شیشهٔ بزرگ و روشنایی زنون دوتایی، تایمر پخت با آلارم، محافظ دمای بیش از حد، '
            'پایه با شلف و چرخ‌های قفل‌شونده (در مدل‌های ۱ تا ۴ دکه)')
OPTIONS = ('گزینه‌ها: پخت تا ۵۰۰ درجه (XTREME)، سیستم بخار، دکهٔ بلندتر، سنگ‌های مخصوص دمای بالا، شلف کنار، قفسهٔ روغن و ادویه، نگهدارندهٔ ابزار پیتزا، '
           'تایمر هفتگی روشن/خاموش، کابینت زیر فر (با یا بدون محفظهٔ ور آمدن خمیر)، ولتاژ دوگانه، کنترل توان محدود')
VOLT = 'تک‌فاز ۲۳۰ ولت، سه‌فاز ۲۳۰ ولت یا سه‌فاز + نول ۴۰۰ ولت؛ ۵۰/۶۰ هرتز'


def make(model, brand_name, cid):
    x = D[model]
    n = x['decks']
    ser = model[:2]
    pw = 'PW%s-ED' % model
    caps = x['cap']
    specs = [
        ['مدل', pw],
        ['سری', 'PW%sX' % ser],
        ['تعداد دکه', fa(n)],
        ['ابعاد بیرونی با هود (عرض × عمق × ارتفاع)', '%s × %s × %s سانتی‌متر' % (fa(cm(x['width'])), fa(cm(x['depth'])), fa(cm(x['height'])))],
        ['سطح پخت هر دکه', '%s × %s سانتی‌متر (حدود %s مترمربع)' % (fa(cm(x['bake_w'])), fa(cm(x['bake_d'])), fa(x['bake_a']))],
        ['ارتفاع داخلی دکه', '%s سانتی‌متر (دهانهٔ در %s سانتی‌متر)' % (fa(cm(x['deck_h'])), fa(cm(x['door_h'])))],
        ['ظرفیت هر دکه (پیتزای گرد)', 'قطر ۳۰: %s، ۳۳: %s، ۳۵: %s، ۴۰: %s عدد' % (fa(caps['300']), fa(caps['330']), fa(caps['350']), fa(caps['400']))],
        ['توان هر دکه', '%s کیلووات' % fa(x['kw_deck'])],
        ['توان کل فر (۴۰۰ ولت سه‌فاز + نول)', '%s کیلووات' % fa(x['kw_total'])],
        ['برق', VOLT],
        ['بیشینهٔ دمای پخت', '۴۰۰ درجهٔ سانتی‌گراد (با گزینهٔ XTREME تا ۵۰۰)'],
        ['وزن خالص', '%s کیلوگرم' % fa(x['net'])],
        ['وزن با بسته‌بندی', '%s کیلوگرم' % fa(x['gross'])],
        ['امکانات استاندارد', FEATURES],
        ['گزینه‌های اضافه', OPTIONS],
    ]
    desc = ('فر برقی مدولار دک‌دار پیتزا با %s دکهٔ مستقل؛ هر دکه دمای جدا دارد و می‌توان در یک فر چند محصول پخت. عکس، نمونهٔ ۲ دکهٔ همین سری است. '
            'مشخصات از برگهٔ فنی سازنده؛ کد و قیمت را کارشناس فروش اعلام می‌کند.') % fa(n)
    return {'id': cid, 'src': 'max-silver', 'name': 'فر طرح پیتزا مستر مدل ' + pw, 'code': '', 'grp': 'تجهیزات پخت', 'cat': 'فر پیتزا', 'sec': ['فست‌فود', 'رستوران'],
            'img': './assets/products/pl/ms-pm%sx.webp' % ser, 'url': '', 'desc': desc,
            'dims': {'l': cm(x['width']), 'w': cm(x['depth']), 'h': cm(x['height'])}, 'wt': x['net'], 'specs': specs}


data = json.load(io.open(path, encoding='utf-8'))
have = {i['id']: i for i in data['items']}
added = done = 0
rows = []
for model in sorted(D):
    cid = 'max-silver:new-pw%s' % model
    if model == '732':
        cid = 'max-silver:pl-231'
        it = make(model, '', cid)
        old = have.get(cid)
        if old:
            for k in ('img', 'desc', 'dims', 'wt', 'specs', 'sec'):
                old[k] = it[k]
            done += 1
            rows.append((cid, old['code'], old['name'], it))
        continue
    it = make(model, '', cid)
    if cid in have:
        have[cid].update({k: it[k] for k in ('img', 'desc', 'dims', 'wt', 'specs', 'sec')})
        done += 1
    else:
        data['items'].append(it)
        added += 1
    rows.append((cid, '', it['name'], it))
io.open(path, 'w', encoding='utf-8', newline='\n').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
io.open(os.path.join(HERE, 'pizzamaster_sheet_rows.json'), 'w', encoding='utf-8').write(json.dumps(
    [{'id': r[0], 'code': r[1], 'name': r[2], 'dims': '%s × %s × %s' % (r[3]['dims']['l'], r[3]['dims']['w'], r[3]['dims']['h']),
      'text': 'توان هر دکه: %s؛ دکه: %s؛ سطح پخت: %s×%s؛ وزن: %s کیلوگرم' % (r[3]['specs'][7][1], r[3]['specs'][2][1], r[3]['specs'][4][1].split(' ')[0], r[3]['specs'][4][1].split(' ')[2], r[3]['specs'][11][1].split(' ')[0]),
      'ser': r[0][-3:-1], 'img': r[3]['img']} for r in rows], ensure_ascii=False, indent=1))
print('added', added, 'completed', done, 'total', len(data['items']))

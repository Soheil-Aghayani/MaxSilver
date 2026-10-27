#!/usr/bin/env python3
"""Fills EMPTY catalog fields from the product-information sheet the sales/warehouse team filled in
(Share_S_Archive_2026-10-26/Public_Chefmarket/Product details/Product detail(Recovered).xlsx, matched by product code).
Nothing that the catalog already has is overwritten: a different value is only listed in the conflicts report
(00_Project_Overview/Housekeeping/2026-10-27_Folder_Organization/Product_Details_Conflicts.csv). Cells holding "*" are
placeholders and are ignored. Units in the sheet: mm and kg.
Usage: python tools/apply_product_details_sheet.py [--cats "گریل,فر پیتزا"] [--dry]   (PaddleOCR venv python; openpyxl is installed there too)"""
import csv, io, json, os, sys
import openpyxl

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(HERE, '..', 'assets', 'catalog.json')
SHEET = r'C:\Users\Baskar\Desktop\Max Silver\01_Source_Data\Share_S_Archive_2026-10-26\Public_Chefmarket\Product details\Product detail(Recovered).xlsx'
LOG = r'C:\Users\Baskar\Desktop\Max Silver\00_Project_Overview\Housekeeping\2026-10-27_Folder_Organization\Product_Details_Conflicts.csv'
args = sys.argv[1:]
cats = None
if '--cats' in args:
    cats = set(args[args.index('--cats') + 1].split(','))
dry = '--dry' in args
FA = '۰۱۲۳۴۵۶۷۸۹'


def fa(v):
    s = ('%g' % v) if isinstance(v, float) else str(v)
    return s.replace('.', '٫').translate({ord(str(i)): FA[i] for i in range(10)})


def clean(v):
    if v is None:
        return ''
    s = str(v).strip()
    return '' if s in ('*', '-', '0', '0.0') else s


def num(v):
    s = clean(v)
    try:
        return float(s.replace(',', '.'))
    except ValueError:
        return None


wb = openpyxl.load_workbook(SHEET, read_only=True, data_only=True)
rows = [list(r) for r in wb.worksheets[0].iter_rows(values_only=True)]
data = json.load(io.open(CAT, encoding='utf-8'))
bycode = {}
for it in data['items']:
    if it.get('code'):
        bycode.setdefault(str(it['code']).strip(), []).append(it)
filled = collections = 0
stat = {'items': 0, 'desc': 0, 'dims': 0, 'wt': 0, 'spec': 0}
conf = []
for r in rows[2:]:
    code = clean(r[2]).split('.')[0]
    if not code or code not in bycode:
        continue
    for it in bycode[code]:
        if cats and it['cat'] not in cats:
            continue
        touched = False
        d = clean(r[4])
        if d and not it.get('desc') or (d and it.get('desc', '').startswith('از فهرست قیمت')):
            it['desc'] = d; stat['desc'] += 1; touched = True
        elif d and it.get('desc') and d.replace(' ', '') != it['desc'].replace(' ', ''):
            conf.append([it['id'], code, 'توضیح', it['desc'][:80], d[:80]])
        # sheet: length (طول) / width (عرض) / height (ارتفاع) in mm; the catalog keeps l, w, h in cm
        mm = {'l': num(r[8]), 'w': num(r[9]), 'h': num(r[10])}
        dims = dict(it['dims'] or {})
        for k, v in mm.items():
            if v:
                cmv = round(v / 10.0, 1)
                if cmv == int(cmv): cmv = int(cmv)
                if k not in dims:
                    dims[k] = cmv; stat['dims'] += 1; touched = True
                elif abs(dims[k] - cmv) > 1.5:
                    conf.append([it['id'], code, 'ابعاد ' + k, str(dims[k]), str(cmv)])
        if dims and dims != (it['dims'] or {}):
            it['dims'] = dims
        w = num(r[11])
        if w and not it.get('wt'):
            it['wt'] = int(w) if w == int(w) else w; stat['wt'] += 1; touched = True
        have = {s[0] for s in it['specs']}
        for label, val in (('جنس', clean(r[6])), ('ضخامت', clean(r[7])), ('ساخت کشور', clean(r[13])), ('نوع انرژی', clean(r[14])), ('مصرف برق', clean(r[15])), ('مصرف گاز', clean(r[16])), ('ظرفیت', clean(r[17]))):
            if val and label not in have:
                it['specs'].append([label, val]); stat['spec'] += 1; touched = True
        if touched:
            stat['items'] += 1
print(stat, 'conflicts', len(conf))
if not dry:
    io.open(CAT, 'w', encoding='utf-8', newline='\n').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
with open(LOG, 'w', encoding='utf-8-sig', newline='') as fh:
    w = csv.writer(fh); w.writerow(['catalog_id', 'code', 'field', 'catalog_value', 'sheet_value']); w.writerows(conf)

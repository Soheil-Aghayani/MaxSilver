# -*- coding: utf-8 -*-
"""Reads the filled product-level sheet (saved as CSV UTF-8 from the Excel template) and writes assets/product-tiers.json,
which the business planner reads to answer the budget question.
Usage:  python tools/apply_tiers.py path/to/Product_Tiers.csv"""
import csv, io, json, os, sys

WORD = {'اقتصادی': 'eco', 'متعادل': 'mid', 'حرفه‌ای': 'pro', 'حرفه ای': 'pro'}


def main(path):
    rows = list(csv.reader(io.open(path, encoding='utf-8-sig')))
    head = rows[0]
    i_id = [i for i, h in enumerate(head) if h.startswith('شناسه')][0]
    i_tier = [i for i, h in enumerate(head) if h.startswith('سطح')][0]
    tiers = {}
    for r in rows[1:]:
        if len(r) <= max(i_id, i_tier):
            continue
        t = WORD.get(r[i_tier].strip())
        if r[i_id].strip() and t:
            tiers[r[i_id].strip()] = t
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'product-tiers.json')
    json.dump({'note': 'سطح بودجهٔ کالاها: eco اقتصادی، mid متعادل، pro حرفه‌ای', 'tiers': tiers}, io.open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(tiers), 'products carry a level ->', out)


if __name__ == '__main__':
    main(sys.argv[1])

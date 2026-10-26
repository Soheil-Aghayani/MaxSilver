#!/usr/bin/env python3
"""Reads the PizzaMaster technical-specification PDFs (PM 72X, 73X, 74X modular electric deck ovens) and writes
tools/pizzamaster_ovens.json: one record per model (721..725, 731..735, 741..745) with the numbers of the data sheets.
Usage: python tools/parse_pizzamaster_ovens.py <folder with the PDFs>   (needs PyMuPDF; run it with the PaddleOCR venv python)
The PDFs stay outside the repository (supplier files); only the numbers are kept."""
import glob, io, json, os, re, sys
import fitz

SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\Baskar\Downloads\Documents'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pizzamaster_ovens.json')
NUM = r'(-|[\d]+(?:,\d+)?)'
FIVE = r'\s*\|\s*'.join([NUM] * 5)


def num(s):
    if s == '-':
        return None
    v = float(s.replace(',', '.'))
    return int(v) if v == int(v) else v


def grab(t, label, unit, nth=0):
    """the nth row after `label`, whose unit is `unit`, as five numbers"""
    found = [m for m in re.finditer(re.escape(label) + r'[^|]*(?:\|[^|]*?){0,2}?\|\s*' + re.escape(unit) + r'\s*\|\s*' + FIVE, t)]
    if len(found) <= nth:
        return [None] * 5
    return [num(x) for x in found[nth].groups()]


def series(path):
    d = fitz.open(path)
    t = ' | '.join(p.get_text().replace('\n', ' | ') for p in d)
    t = re.sub(r'(\s*\|\s*)+', ' | ', t)
    m = re.search(r'PM (7\d)X Series', t)
    s = m.group(1)
    R = {
        'width': grab(t, 'Oven Width', 'mm'),
        'height': grab(t, 'a) With Hood (standard)', 'mm'),
        'depth': grab(t, 'a) Ventilation Hood (standard)', 'mm'),
        'bake_d': grab(t, 'Total baking surface, depth', 'mm'),
        'bake_w': grab(t, 'Total baking surface, width', 'mm'),
        'bake_a': grab(t, 'Total baking surface, area', 'm2'),
        'net': grab(t, 'Net weight', 'kg'),
        'gross': grab(t, 'Gross weight (total)', 'kg'),
        'stone_d': grab(t, 'Ceramic Clay Stone (standard)', 'mm'),
        'stone_w': grab(t, 'Stone size, width', 'mm'),
        'deck_h': grab(t, 'a) Standard Deck', 'mm', 4) if False else None,
    }
    # per-deck power and the whole oven on 400 V 3ph+N
    kw = [num(x) for x in re.findall(r'Max\. Power \| a\) Per deck \| kW \| ' + FIVE, t)[0]] if re.findall(r'Max\. Power \| a\) Per deck \| kW \| ' + FIVE, t) else [None] * 5
    tot = re.findall(r'b\) Total \(oven\) \| kW \| ' + FIVE, t)
    R['kw_deck'] = kw
    R['kw_total'] = [num(x) for x in tot[0]] if tot else [None] * 5
    cap = {}
    m2 = re.search(r'Length \| Width \| ((?:\d+ \| ){45})', t)
    if m2:
        v = [int(x) for x in m2.group(1).split(' | ') if x]
        for i in range(0, 45, 5):
            cap[v[i]] = v[i + 1]      # round pizza diameter (mm) -> pizzas per deck
    deck = re.search(r'Internal deck height \| a\) Standard Deck \| mm \| (\d+)', t)
    door = re.search(r'Deck door opening height \| a\) Standard Deck \| mm \| (\d+)', t)
    stones = re.search(r'a\) Ceramic Clay Stone \(standard\) \| pcs \| (\d+)', t)
    out = {}
    for i in range(5):
        out['%s%d' % (s, i + 1)] = {k: (v[i] if isinstance(v, list) else v) for k, v in R.items() if v is not None}
        out['%s%d' % (s, i + 1)].update({'decks': i + 1, 'cap': {str(k): cap.get(k) for k in (300, 330, 350, 400)}, 'deck_h': int(deck.group(1)) if deck else None,
                                          'door_h': int(door.group(1)) if door else None, 'stones': int(stones.group(1)) if stones else None})
    return out


res = {}
seen = set()
for f in sorted(glob.glob(os.path.join(SRC, '*.pdf'))):
    try:
        d = fitz.open(f)
        head = d[0].get_text()
        if 'Modular Electric Deck Oven' not in head or not re.search(r'PM 7\dX Series', head):
            continue
        r = series(f)
        key = sorted(r)[0][:2]
        if key in seen:
            continue
        seen.add(key)
        res.update(r)
    except Exception as e:  # not a data sheet
        print('skip', os.path.basename(f), e)
io.open(OUT, 'w', encoding='utf-8').write(json.dumps(res, ensure_ascii=False, indent=1))
print(len(res), 'models', sorted(res))
for k in ('721', '735', '745'):
    print(k, json.dumps(res.get(k), ensure_ascii=False))

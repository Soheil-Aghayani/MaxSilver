# -*- coding: utf-8 -*-
# Reads the owner's regional-expos page (an HTML file made outside the app) and writes assets/expos-data.js, the data behind the second
# section of fairs.html. Run it again whenever the owner updates that file (new events, new pictures):
#   "C:\Program Files\LibreOffice\program\python.exe" tools\import_regional_expos.py "<path to index.html>"
# Pictures: an <img src> inside a card is copied to assets/art/fairs/expo-<id>.<ext>; cards without a picture show a colour block.
import io, os, re, sys, json, html, shutil

SRC = sys.argv[1] if len(sys.argv) > 1 else r'C:\Users\Baskar\Documents\ChatGPT\Max Silver\output\maxsilver-regional-expos-1405\index.html'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'expos-data.js')
ART = os.path.join(ROOT, 'assets', 'art', 'fairs')

FA = '۰۱۲۳۴۵۶۷۸۹'
JM = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
GM = {'ژانویه': 1, 'فوریه': 2, 'مارس': 3, 'آوریل': 4, 'مه': 5, 'ژوئن': 6, 'ژوئیه': 7, 'اوت': 8, 'سپتامبر': 9, 'اکتبر': 10, 'نوامبر': 11, 'دسامبر': 12}


def tx(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def digits(s):
    return ''.join(str(FA.index(c)) if c in FA else c for c in s)


def month_of(name):
    n = name.replace('\u0654', '').replace('\u200c', '').strip()
    if n in JM:
        return 'j', JM.index(n) + 1
    for k, v in GM.items():
        if n.startswith(k):
            return 'g', v
    return None, None


def parse_range(s):
    """'۸–۱۱ آبان ۱۴۰۵' or '۳۰ اکتبر–۲ نوامبر ۲۰۲۶' -> ('j'|'g', (y,m,d1), (y,m,d2)) or None"""
    s = digits(s).split('·')[0].strip()
    parts = re.split(r'\s*[–-]\s*', s)
    if len(parts) != 2:
        return None
    right = re.match(r'(\d+)\s+(\S+)(?:\s+(\d{4}))?', parts[1])
    left = re.match(r'(\d+)(?:\s+(\S+))?(?:\s+(\d{4}))?$', parts[0])
    if not right or not left:
        return None
    cal, m2 = month_of(right.group(2))
    if not cal:
        return None
    y2 = int(right.group(3)) if right.group(3) else None
    if y2 is None:
        return None
    m1, y1 = m2, y2
    if left.group(2):
        c1, mm = month_of(left.group(2))
        if c1 != cal or not mm:
            return None
        m1 = mm
        if left.group(3):
            y1 = int(left.group(3))
        elif m1 > m2:
            y1 = y2 - 1
    return cal, (y1, m1, int(left.group(1))), (y2, m2, int(right.group(1)))


def main():
    t = io.open(SRC, encoding='utf-8').read()
    arts = re.findall(r'<article class="card"(.*?)</article>', t, re.S)
    events = []
    base = os.path.dirname(SRC)
    for n, a in enumerate(arts, 1):
        attrs = re.match(r'([^>]*)>', a).group(1)
        g = lambda k: (re.search(k + r'="([^"]*)"', attrs) or [None, ''])[1]

        def cls(c, tag=r'[a-z0-9]+'):
            m = re.search(r'<' + tag + r'[^>]*class="[^"]*\b' + c + r'\b[^"]*"[^>]*>(.*?)</' + tag + '>', a, re.S)
            return tx(m.group(1)) if m else ''
        e = {'region': g('data-region'), 'tags': g('data-tags').split(), 'title': cls('event-title'), 'venue': cls('venue'),
             'dateMain': cls('date-main'), 'dateAlt': cls('date-alt'), 'fit': re.sub(r'^ارتباط با Max Silver:\s*', '', cls('fit')),
             'tagList': [tx(x) for x in re.findall(r'<span class="tag">(.*?)</span>', a, re.S)], 'match': cls('match'), 'note': cls('card-note')}
        c = cls('country')
        e['country'], e['city'] = (c.split('·', 1) + [''])[:2] if '·' in c else (c, '')
        e['country'], e['city'] = e['country'].strip(), e['city'].strip()
        e['confidence'] = cls('confidence')
        m = e['match']
        e['matchLevel'] = 'high' if 'بالا' in m else 'medium' if 'متوسط' in m else 'low' if 'محدود' in m else ''
        e['actions'] = [{'label': tx(l), 'href': h, 'primary': 'yellow' in c2} for c2, h, l in re.findall(r'<a class="(action[^"]*)" href="([^"]*)"[^>]*>(.*?)</a>', a, re.S)]
        r = parse_range(e['dateMain'])
        if r:
            if r[0] == 'j':
                e['jf'], e['jt'] = list(r[1]), list(r[2])
            else:
                e['gf'], e['gt'] = list(r[1]), list(r[2])
        else:
            print('date not parsed:', e['title'], '|', e['dateMain'])
        e['id'] = 'expo-%02d' % n
        im = re.search(r'<img[^>]*src="([^"]*)"', a)
        e['art'] = ''
        if im and not im.group(1).startswith(('http', 'data:')):
            src = os.path.join(base, im.group(1))
            if os.path.isfile(src):
                os.makedirs(ART, exist_ok=True)
                ext = os.path.splitext(src)[1].lower()
                dst = os.path.join(ART, e['id'] + ext)
                shutil.copyfile(src, dst)
                e['art'] = 'expo-%02d%s' % (n, ext)
        events.append(e)
    trips = [{'title': tx(a), 'text': tx(b)} for a, b in re.findall(r'<div class="trip"><strong>(.*?)</strong><p>(.*?)</p></div>', t, re.S)]
    methods = [{'title': tx(a), 'text': tx(b)} for a, b in re.findall(r'<div class="method-item"><strong>(.*?)</strong>(.*?)</div>', t, re.S)]
    hero = tx((re.search(r'<p class="hero-lead">(.*?)</p>', t, re.S) or [None, ''])[1])
    note = tx((re.search(r'<p class="hero-note">(.*?)</p>', t, re.S) or [None, ''])[1])
    data = {'title': tx((re.search(r'<h1 id="page-title">(.*?)</h1>', t, re.S) or [None, ''])[1]), 'lead': hero, 'note': note, 'trips': trips, 'methods': methods, 'events': events}
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write('// Generated by tools/import_regional_expos.py from the owner\'s regional-expos page. Do not edit by hand.\nwindow.MS_EXPOS = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
    print('wrote', OUT, len(events), 'events,', len(trips), 'trips,', len(methods), 'method notes,', sum(1 for e in events if e['art']), 'pictures')


main()

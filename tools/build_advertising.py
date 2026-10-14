# -*- coding: utf-8 -*-
"""Builds advertising.html from the data below (the reference map Advertising_Strategy_Map_Reference_v03).
Run from the repository root:  python tools/build_advertising.py
The shared header comes from sales-process.html so the navigation stays identical; assets/advertising.css|js do the rest."""
import html, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GOALS = [
    'افزایش آگاهی از برند',
    'هدایت مشتریان بالقوه به سمت خرید',
    'ترویج فروش برای محصولات موجود و جدید',
    'معرفی محصول یا خدمت جدید به بازار',
    'متمایز کردن محصولات از رقبا',
]
MARKETING = [
    'بازاریابی شبکه‌های اجتماعی و پیام‌رسان‌ها',
    'بازاریابی ایمیلی',
    'روابط عمومی',
    'سئو و AIO و GEO',
    'تبلیغات پولی',
    'افیلیت مارکتینگ',
]
# (title, icon key, children)  - a child is a string or (title, [grandchildren]) or (title, [grandchildren], note)
BRANCHES = [
    ('چاپی', 'print', [
        'پوستر',
        'تبلیغات در مجله‌های مناسب',
        'بروشور',
        ('بیلبورد', [], 'استفاده از تابلوی سردر مغازه در نقش بیلبورد، با لوکیشن مناسب'),
    ]),
    ('هدایای تبلیغاتی', 'gift', [
        'نصاب‌ها',
        'پاساژها و فروشگاه‌ها',
        ('سازمانی', ['مدیریت', 'کارشناسی']),
    ]),
    ('آنلاین', 'online', [
        'ریپورتاژ',
        ('تبلیغات پیامکی', ['مناسبت‌های شخصی مثل تولد', 'مناسبت‌های ملی، ورزشی و …', 'جاری (بر اساس تقویم)']),
        'تبلیغات پاپ‌آپ',
        'تبلیغات ویدئویی',
        'تبلیغات درون‌برنامه‌ای',
        'تبلیغات نمایشی',
        'تبلیغات همسان',
        'موتورهای جستجو',
        'سئو و GEO در بازاریابی محتوا',
        'ایمیل',
        ('شبکه‌های اجتماعی', ['اینستاگرام', 'لینکدین', 'تلگرام', 'واتساپ', 'روبیکا', 'بله', 'ایتا'], None,
         ['تصویری', 'ویدئویی', 'استوری', 'اکسپلور', 'پست خرید']),
    ]),
]

ICONS = {
    'print': '<path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/>',
    'gift': '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M7.500 8a2.500 2.500 0 0 1 0-5C10 3 12 8 12 8s2-5 4.500-5a2.500 2.500 0 0 1 0 5"/>',
    'online': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.500 3 14.500 0 18M12 3c-3 3.500-3 14.500 0 18"/>',
    'goal': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.500"/>',
    'mk': '<path d="m3 11 18-8v18L3 13zM11 15v4a2 2 0 0 0 4 0v-3"/>',
}
SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'
e = html.escape
fa = lambda n: str(n).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))


def count_leaves(children):
    n = 0
    for c in children:
        if isinstance(c, str):
            n += 1
        else:
            sub = c[1]
            n += len(sub) if sub else 1
    return n


def leaf(text, note=None):
    return '<li class="ad-leaf" data-q="%s"><span>%s</span>%s</li>' % (e(text), e(text), ('<small>%s</small>' % e(note)) if note else '')


def child(c):
    if isinstance(c, str):
        return leaf(c)
    title, subs = c[0], c[1]
    note = c[2] if len(c) > 2 else None
    fmts = c[3] if len(c) > 3 else None
    if not subs:
        return leaf(title, note)
    inner = ''.join(leaf(s) for s in subs)
    out = '<li class="ad-group"><details class="ad-d lvl3" open><summary><span>%s</span><b>%s</b></summary><ul class="ad-list">%s</ul>' % (e(title), fa(len(subs)), inner)
    if fmts:
        out += '<div class="ad-fmt"><span class="ad-fmt-t">قالب محتوا</span>%s</div>' % ''.join('<span class="ad-chip">%s</span>' % e(f) for f in fmts)
    return out + '</details></li>'


def branch(title, icon, children):
    return ('<section class="ad-branch" data-branch="%s"><details class="ad-d lvl2" open><summary><span class="ad-ico">%s</span><span class="ad-t">%s</span><b>%s</b></summary>'
            '<ul class="ad-list">%s</ul></details></section>') % (icon, SVG % ICONS[icon], e(title), fa(count_leaves(children)), ''.join(child(c) for c in children))


def build():
    src = open(os.path.join(ROOT, 'sales-process.html'), encoding='utf-8').read()
    head = src[:src.index('<main class="portal sp">')]
    stamp = re.search(r'\?v=(\d+)', src).group(1)
    head = head.replace('<title>نقشهٔ فروش | مکث‌سیلور</title>', '<title>استراتژی تبلیغات | مکث‌سیلور</title>')
    head = re.sub(r'<meta name="description" content="[^"]*"', '<meta name="description" content="نمودار استراتژی تبلیغات مکث‌سیلور: اهداف، رسانه‌های چاپی، هدایای تبلیغاتی و تبلیغات آنلاین."', head, count=1)
    head = head.replace('./assets/sales-process.2.css', './assets/advertising.css')
    head = head.replace('<li><a href="./sales-process.html" aria-current="page"', '<li><a href="./sales-process.html"')
    head = head.replace('<body class="ms-portal-body">', '<body class="ms-portal-body" data-manager-only="advertising">')
    goals = ''.join('<li><span class="ad-goal-n">%s</span><span>%s</span></li>' % (fa(i + 1), e(g)) for i, g in enumerate(GOALS))
    mk = ''.join('<li class="ad-leaf" data-q="%s"><span>%s</span></li>' % (e(m), e(m)) for m in MARKETING)
    body = '''<main class="ad" id="ad">
    <header class="ad-head">
      <div><h1>استراتژی تبلیغات</h1><p>نمودار مرجع · نسخهٔ ۳</p></div>
      <div class="ad-tools">
        <div class="ad-seg" role="tablist" aria-label="نمایش">
          <button type="button" role="tab" aria-selected="true" data-view="tree">درخت</button>
          <button type="button" role="tab" aria-selected="false" data-view="map">نقشه</button>
        </div>
        <button type="button" class="ad-ico-btn" data-expand="open" aria-label="باز کردن همه" title="باز کردن همه">%(open)s</button>
        <button type="button" class="ad-ico-btn" data-expand="close" aria-label="بستن همه" title="بستن همه">%(close)s</button>
        <a class="ad-ico-btn" href="./assets/advertising-strategy-map-v03.pdf" download aria-label="دریافت PDF" title="دریافت PDF">%(dl)s</a>
      </div>
    </header>

    <section class="ad-view" id="viewTree">
      <label class="ad-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.300-4.300"/></svg><input type="search" id="adQ" placeholder="جست‌وجو در درخت…" autocomplete="off" aria-label="جست‌وجو در درخت"></label>

      <section class="ad-root" aria-labelledby="adRoot">
        <div class="ad-root-node"><span class="ad-ico">%(mk)s</span><div><h2 id="adRoot">تبلیغات</h2><p>زیرمجموعهٔ بازاریابی</p></div></div>
        <div class="ad-goals"><h3><span class="ad-ico">%(goal)s</span>اهداف</h3><ul>%(goals)s</ul></div>
      </section>

      <div class="ad-branches">%(branches)s</div>

      <section class="ad-marketing"><details class="ad-d lvl2" open><summary><span class="ad-ico">%(mk)s</span><span class="ad-t">بازاریابی؛ فعالیت‌های پشتیبان</span><b>%(mkn)s</b></summary><ul class="ad-list">%(mkl)s</ul></details></section>
      <p class="ad-empty" id="adEmpty" hidden>موردی پیدا نشد.</p>
    </section>

    <section class="ad-view" id="viewMap" hidden>
      <figure class="ad-map"><a href="./assets/advertising-strategy-map-v03.png" target="_blank" rel="noopener"><img src="./assets/advertising-strategy-map-v03.png" alt="نمودار استراتژی تبلیغات مکث‌سیلور" width="1920" height="1080" loading="lazy"></a>
      <figcaption>برای دیدن با اندازهٔ کامل، روی تصویر بزنید.</figcaption></figure>
    </section>
  </main>
  <footer class="ms-site-footer"><p>تهیه‌کنندگان: محمود قربانی و سهیل آقایانی</p></footer>
  <script src="./assets/roles.js?v=%(v)s"></script>
  <script src="./assets/role-gate.js?v=%(v)s"></script>
  <script src="./assets/notify.js?v=%(v)s" defer></script>
  <script src="./assets/install.js?v=%(v)s" defer></script>
  <script src="./assets/advertising.js?v=%(v)s" defer></script>
  <script src="./assets/share.2.js?v=%(v)s" defer></script>
  <script src="./assets/sw-register.js?v=%(v)s" defer></script>
</body>
</html>
''' % {
        'open': SVG % '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
        'close': SVG % '<path d="m7 20 5-5 5 5M7 4l5 5 5-5"/>',
        'dl': SVG % '<path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14"/>',
        'mk': SVG % ICONS['mk'], 'goal': SVG % ICONS['goal'], 'goals': goals,
        'branches': ''.join(branch(*b) for b in BRANCHES),
        'mkn': fa(len(MARKETING)), 'mkl': mk, 'v': stamp,
    }
    with open(os.path.join(ROOT, 'advertising.html'), 'w', encoding='utf-8', newline='') as f:
        f.write(head + body)
    print('advertising.html written, stamp', stamp)


if __name__ == '__main__':
    build()

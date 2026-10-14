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
    'سئو، AEO، AIO، GEO و SXO',
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
        ('سئو و بهینه‌سازی برای هوش مصنوعی', ['SEO · دیده‌شدن در نتایج جستجو', 'AEO · پاسخ مستقیم به پرسش‌ها', 'AIO · حضور در خلاصه‌های هوش مصنوعی', 'GEO · ارجاع در پاسخ‌های هوش مصنوعی مولد', 'SXO · تجربهٔ کاربر از جست‌وجو تا خرید'], 'در بازاریابی محتوا'),
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


def li(title, note=None, kids='', cls='', badge=None, icon=None):
    head = '<div class="t-n %s">%s<span class="t-t">%s</span>%s%s</div>' % (
        cls, ('<span class="t-i">%s</span>' % icon) if icon else '', e(title),
        ('<b>%s</b>' % badge) if badge else '', ('<small>%s</small>' % e(note)) if note else '')
    return '<li class="t">%s%s</li>' % (head, ('<ul class="t-kids">%s</ul>' % kids) if kids else '')


def child(c):
    if isinstance(c, str):
        return li(c, cls='leaf')
    title, subs = c[0], c[1]
    note = c[2] if len(c) > 2 else None
    fmts = c[3] if len(c) > 3 else None
    if not subs:
        return li(title, note, cls='leaf')
    kids = ''.join(li(s, cls='leaf') for s in subs)
    if fmts:
        kids += li('قالب محتوا', kids=''.join(li(f, cls='chip') for f in fmts), cls='meta')
    return li(title, note, kids, cls='mid', badge=fa(len(subs)))


KEYS = {'print': 'چاپی', 'gift': 'هدایای تبلیغاتی', 'online': 'آنلاین', 'mk': 'فعالیت‌های پشتیبان'}


def branch(title, key, children, count=None):
    icon = SVG % ICONS[key]
    kids = ''.join(child(c) for c in children)
    return '<li class="t b-%s" data-branch="%s">%s<ul class="t-kids">%s</ul></li>' % (
        key, key, '<div class="t-n branch"><span class="t-i">%s</span><span class="t-t">%s</span><b>%s</b></div>' % (icon, e(title), fa(count if count is not None else count_leaves(children))), kids)


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
    branches = ''.join(branch(t, k, ch) for t, k, ch in BRANCHES) + branch('فعالیت‌های پشتیبان بازاریابی', 'mk', MARKETING)
    chips = '<button type="button" class="ad-chipbtn" data-pick="all" aria-pressed="true">همه</button>' + ''.join(
        '<button type="button" class="ad-chipbtn c-%s" data-pick="%s" aria-pressed="false"><span class="ad-dot"></span>%s</button>' % (k, k, e(t))
        for t, k, _ in BRANCHES) + '<button type="button" class="ad-chipbtn c-mk" data-pick="mk" aria-pressed="false"><span class="ad-dot"></span>پشتیبان بازاریابی</button>'
    body = """<main class="ad" id="ad">
    <header class="ad-head">
      <div><h1>استراتژی تبلیغات</h1><p>نمودار مرجع · نسخهٔ ۳</p></div>
      <div class="ad-tools">
        <div class="ad-seg" role="tablist" aria-label="نمایش">
          <button type="button" role="tab" aria-selected="true" data-view="tree">درخت</button>
          <button type="button" role="tab" aria-selected="false" data-view="map">نقشه</button>
        </div>
        <a class="ad-ico-btn" href="./assets/advertising-strategy-map-v03.pdf" download aria-label="دریافت PDF" title="دریافت PDF">%(dl)s</a>
      </div>
    </header>

    <section class="ad-view" id="viewTree">
      <section class="ad-goals" aria-labelledby="adGoals"><h2 id="adGoals"><span class="ad-i">%(goal)s</span>اهداف تبلیغات</h2><ul>%(goals)s</ul></section>
      <div class="ad-bar">
        <div class="ad-picks" role="group" aria-label="شاخه">%(chips)s</div>
        <label class="ad-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.300-4.300"/></svg><input type="search" id="adQ" placeholder="جست‌وجو…" autocomplete="off" aria-label="جست‌وجو در درخت"></label>
      </div>
      <div class="ad-treewrap"><ul class="t-top"><li class="t t-rootli"><div class="t-n root"><span class="t-i">%(mk)s</span><span class="t-t">تبلیغات</span></div><ul class="t-kids" id="adTree">%(branches)s</ul></li></ul></div>
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
""" % {
        'dl': SVG % '<path d="M12 3v12m0 0-4-4m4 4 4-4M5 19h14"/>',
        'mk': SVG % ICONS['mk'], 'goal': SVG % ICONS['goal'], 'goals': goals, 'chips': chips,
        'branches': branches, 'v': stamp,
    }
    with open(os.path.join(ROOT, 'advertising.html'), 'w', encoding='utf-8', newline='') as f:
        f.write(head + body)
    print('advertising.html written, stamp', stamp)


if __name__ == '__main__':
    build()

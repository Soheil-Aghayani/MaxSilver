# -*- coding: utf-8 -*-
"""Builds customers.html from the shared header of sales-analysis.html (so the navigation stays identical).
Run from the repository root:  python tools/build_customers.py"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NAV_LI = ('<li data-manager-only="customers"><a href="./customers.html" aria-label="مشتریان" data-tip="مشتریان">'
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6M17 5a3.5 3.5 0 0 1 0 7M22 20c0-2.6-1.8-4.7-4.5-5.6"/></svg>'
          '<span>مشتریان</span></a></li>')


def build():
    src = open(os.path.join(ROOT, 'sales-analysis.html'), encoding='utf-8').read()
    head = src[:src.index('<main class="analysis">')]
    stamp = re.search(r'\?v=(\d+)', src).group(1)
    head = re.sub(r'<title>[^<]*</title>', '<title>مشتریان | مکث‌سیلور</title>', head, count=1)
    head = re.sub(r'<meta name="description" content="[^"]*"', '<meta name="description" content="پایگاه مشتریان مکث‌سیلور؛ صفحهٔ هر مشتری با فروش سال‌ها، گروه و مسئول."', head, count=1)
    head = re.sub(r'<link rel="stylesheet" href="\./assets/sales-analysis\.2\.css[^"]*" />', '<link rel="stylesheet" href="./assets/customers.css?v=%s" />' % stamp, head)
    head = head.replace('<body class="ms-portal-body" data-manager-only="analysis">', '<body class="ms-portal-body" data-manager-only="customers">')
    head = head.replace('<li data-manager-only="customers"><a href="./customers.html" aria-label', '<li data-manager-only="customers"><a href="./customers.html" aria-current="page" aria-label')
    body = '''<main class="cu" id="cu"><p class="cu-note">در حال بارگذاری…</p></main>
  <footer class="ms-site-footer"><p>تهیه‌کنندگان: محمود قربانی و سهیل آقایانی</p></footer>
  <script src="./assets/roles.js?v=%(v)s"></script>
  <script src="./assets/role-gate.js?v=%(v)s"></script>
  <script src="./assets/notify.js?v=%(v)s" defer></script>
  <script src="./assets/install.js?v=%(v)s" defer></script>
  <script src="./assets/vendor/firebase-app-compat-10.12.5.js" defer></script>
  <script src="./assets/vendor/firebase-auth-compat-10.12.5.js" defer></script>
  <script src="./assets/vendor/firebase-firestore-compat-10.12.5.js" defer></script>
  <script src="./assets/firebase-config.js?v=%(v)s" defer></script>
  <script src="./assets/workbook-import.js?v=%(v)s" defer></script>
  <script src="./assets/customers.js?v=%(v)s" defer></script>
  <script src="./assets/share.2.js?v=%(v)s" defer></script>
  <script src="./assets/sw-register.js?v=%(v)s" defer></script>
</body>
</html>
''' % {'v': stamp}
    with open(os.path.join(ROOT, 'customers.html'), 'w', encoding='utf-8', newline='') as f:
        f.write(head + body)
    print('customers.html written, stamp', stamp)


if __name__ == '__main__':
    build()

(function () {
  'use strict';
  // Staff sign-in and account administration against the Laravel backend (api-client.js). Firebase screens are untouched.
  var root = document.getElementById('bk'), api = window.MSApi, R = window.MSRoles;
  if (!root || !api) return;
  var S = { view: '', user: null, users: [], portal: null, busy: false, error: '', note: '', otp: '', email: '', needCode: false };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function can(area) { return !!(S.user && S.user.areas && S.user.areas.indexOf(area) >= 0); }
  function msg() { return (S.error ? '<p class="bk-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.note ? '<p class="bk-ok" role="status">' + esc(S.note) + '</p>' : ''); }
  function fail(e) { S.busy = false; S.error = (e && e.message) || 'خطا'; S.note = ''; render(); }
  function go(v) { S.view = v; S.error = ''; render(); }
  // the server address is never asked from staff: on the real site it is fixed; only a developer on this PC or the office network (or ?server in the address) can change it
  var PROD = 'https://api.agseyl.ir';
  function isDev() { return /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname) || /[?&]server(&|$)/.test(location.search); }
  function defaultBase() { return /^https?:$/.test(location.protocol) && location.hostname ? location.protocol + '//' + location.hostname + ':8080' : 'http://localhost:8080'; }

  function viewServer() {
    return '<section class="bk-card"><h1>اتصال به سرور</h1><p class="bk-sub">آدرس سرور مکث‌سیلور را بنویسید (روی شبکهٔ محلی، مثل http://192.168.1.10:8080).</p>' + msg() +
      '<form id="fBase"><label>آدرس سرور<input name="u" dir="ltr" inputmode="url" value="' + esc(api.base() || defaultBase()) + '" required></label>' +
      '<div class="bk-row"><button class="bk-btn" ' + (S.busy ? 'disabled' : '') + '>آزمایش و ذخیره</button>' + (api.base() ? '<button type="button" class="bk-btn ghost" data-off>خاموش‌کردن (برگشت به Firebase)</button>' : '') + '</div></form></section>';
  }
  function viewLogin() {
    return '<section class="bk-card"><h1>ورود کارکنان</h1>' + (isDev() ? '<p class="bk-sub">سرور: <bdi dir="ltr">' + esc(api.base()) + '</bdi> · <button type="button" class="bk-link" data-server>تغییر</button></p>' : '') + msg() +
      '<form id="fLogin" autocomplete="on"><label>ایمیل<input name="email" type="email" dir="ltr" autocomplete="username" value="' + esc(S.email) + '" required></label>' +
      '<label>رمز عبور<input name="password" type="password" dir="ltr" autocomplete="current-password" required></label>' +
      ('<label>کد شش‌رقمی برنامهٔ احراز هویت' + (S.needCode ? '' : ' (اگر ورود دومرحله‌ای دارید)') + '<input name="code" dir="ltr" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code"' + (S.needCode ? ' required autofocus' : '') + '></label>') +
      '<button class="bk-btn" ' + (S.busy ? 'disabled' : '') + '>' + (S.busy ? 'در حال ورود…' : 'ورود') + '</button></form></section>';
  }
  function viewEnroll() {
    var svg = '';
    try { var q = window.qrcode(0, 'M'); q.addData(S.otp); q.make(); svg = q.createSvgTag({ scalable: true, margin: 2 }); } catch (e) { svg = ''; }
    return '<section class="bk-card"><h1>فعال‌سازی ورود دومرحله‌ای</h1><p class="bk-sub">برای نقش شما ورود دومرحله‌ای الزامی است. این کد را با یک برنامهٔ احراز هویت (Google Authenticator، Microsoft Authenticator یا مشابه) اسکن کنید و کد شش‌رقمی را بنویسید.</p>' + msg() +
      '<div class="bk-qr" aria-label="کد QR">' + svg + '</div><details><summary>اسکن نمی‌شود؟</summary><p dir="ltr" class="bk-secret">' + esc((S.otp.match(/secret=([A-Z2-7]+)/) || [])[1] || '') + '</p></details>' +
      '<form id="fEnroll"><label>کد شش‌رقمی<input name="code" dir="ltr" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" required></label><button class="bk-btn" ' + (S.busy ? 'disabled' : '') + '>تأیید</button></form></section>';
  }
  function roleOptions(sel) {
    return R.ORDER.map(function (r) { return '<option value="' + r + '"' + (r === sel ? ' selected' : '') + '>' + esc(R.label(r)) + '</option>'; }).join('');
  }
  function viewHome() {
    var u = S.user, h = '<section class="bk-card"><div class="bk-head"><div><h1>' + esc(u.name) + '</h1><p class="bk-sub">' + esc(R.label(u.role)) + ' · <bdi dir="ltr">' + esc(u.email) + '</bdi>' + (u.has_2fa ? ' · ورود دومرحله‌ای فعال' : '') + '</p></div><button class="bk-btn ghost" data-out>خروج</button></div>' + msg() +
      '<p class="bk-sub">بخش‌هایی که این نقش می‌بیند: ' + u.areas.length + ' مورد</p></section>';
    if (can('roleAdmin')) {
      h += '<section class="bk-card"><h2>ساخت حساب</h2><form id="fNew" class="bk-grid"><label>نام<input name="name" required maxlength="120"></label><label>ایمیل<input name="email" type="email" dir="ltr" required></label>' +
        '<label>رمز (حداقل ۸ نویسه، با حرف بزرگ و کوچک انگلیسی)<input name="password" type="password" dir="ltr" minlength="8" required autocomplete="new-password"></label><label>نقش<select name="role">' + roleOptions('visitor') + '</select></label>' +
        '<label>موبایل (اختیاری)<input name="phone" dir="ltr" inputmode="numeric" pattern="09\\d{9}"></label><button class="bk-btn" ' + (S.busy ? 'disabled' : '') + '>ساخت</button></form></section>';
    }
    if (can('team')) {
      h += '<section class="bk-card"><h2>اعضای تیم</h2><div class="bk-table" role="table"><div class="bk-tr bk-th" role="row"><span>نام</span><span>نقش</span><span>آخرین ورود</span><span></span></div>' +
        S.users.map(function (x) {
          var edit = can('roleAdmin');
          return '<div class="bk-tr" role="row"><span>' + esc(x.name) + '<small dir="ltr">' + esc(x.email) + '</small></span><span>' +
            (edit ? '<select data-role="' + x.id + '" aria-label="نقش ' + esc(x.name) + '">' + roleOptions(x.role) + '</select>' : esc(R.label(x.role))) + '</span><span>' + (x.last_login_at ? esc(new Date(x.last_login_at).toLocaleDateString('fa-IR')) : '-') + '</span><span>' +
            (edit ? '<button class="bk-btn ghost" data-active="' + x.id + '" data-to="' + (x.is_active ? 0 : 1) + '">' + (x.is_active ? 'غیرفعال‌کردن' : 'فعال‌کردن') + '</button>' : (x.is_active ? '' : 'غیرفعال')) + '</span></div>';
        }).join('') + '</div></section>';
    }
    if (can('siteUpdate') && S.portal) {
      var p = S.portal, ok = p.configured && p.writable && p.zip, two = !!u.has_2fa;
      var ask = '<label>رمز عبور شما (برای تأیید)<input name="password" type="password" dir="ltr" required autocomplete="current-password"></label>' +
        (two ? '<label>کد شش‌رقمی برنامهٔ احراز هویت<input name="code" dir="ltr" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" required></label>' : '');
      h += '<section class="bk-card"><h2>به‌روزرسانی سایت</h2><p class="bk-sub">نسخهٔ فعلی صفحه‌های سایت روی این سرور: <bdi dir="ltr">' + esc(p.version || 'نامشخص') + '</bdi>. فایل zip به‌روزرسانی را اینجا بارگذاری کنید؛ فقط فایل‌های ایستا (صفحه، تصویر، قلم) پذیرفته می‌شود و از نسخهٔ قبلی یک نسخهٔ بازگشت نگه داشته می‌شود. حجم مجاز: ' + p.upload_mb + ' مگابایت.</p>' +
        (ok ? '' : '<p class="bk-err">این بخش هنوز آماده نیست: ' + (!p.configured ? 'مسیر پوشهٔ سایت (PORTAL_PATH) در تنظیمات سرور نیست.' : !p.writable ? 'پوشهٔ سایت قابل نوشتن نیست.' : 'افزونهٔ zip در هاست خاموش است.') + '</p>') +
        (ok ? '<form id="fSite"><label>فایل zip<input name="file" type="file" accept=".zip,application/zip" required></label>' + ask + '<button class="bk-btn" ' + (S.busy ? 'disabled' : '') + '>بارگذاری و به‌روزرسانی</button></form>' : '') +
        (ok && p.backups && p.backups.length ? '<details><summary class="bk-link">بازگرداندن به نسخهٔ قبل (' + p.backups.length + ' نسخهٔ بازگشت)</summary><form id="fSiteBack">' + ask + '<button class="bk-btn ghost" ' + (S.busy ? 'disabled' : '') + '>بازگرداندن آخرین به‌روزرسانی</button></form></details>' : '') + '</section>';
    }
    return h;
  }

  function render() {
    root.innerHTML = S.view === 'server' ? viewServer() : S.view === 'login' ? viewLogin() : S.view === 'enroll' ? viewEnroll() : S.view === 'home' ? viewHome() : '';
    var f;
    if ((f = root.querySelector('input[autofocus]'))) f.focus();
  }

  function loadHome() {
    return api.me().then(function (u) {
      S.user = u;
      return can('team') ? api.users().then(function (l) { S.users = l; }) : null;
    }).then(function () {
      return can('siteUpdate') ? api.portal().then(function (p) { S.portal = p; }, function () { S.portal = null; }) : null;
    }).then(function () { S.busy = false; go('home'); }, function (e) { if (e.status === 401) { go('login'); } else fail(e); });
  }

  root.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target, v = function (n) { return f.elements[n] ? f.elements[n].value.trim() : ''; };
    if (S.busy) return;
    S.busy = true; S.error = ''; S.note = '';
    if (f.id === 'fBase') {
      try { api.setBase(v('u')); } catch (e) { return fail(e); }
      api.ping().then(function () { S.busy = false; go('login'); }, function () { api.setBase(''); fail({ message: 'سرور پاسخ نداد. آدرس و روشن‌بودن سرور را بررسی کنید.' }); });
    } else if (f.id === 'fLogin') {
      S.email = v('email');
      api.login(S.email, f.elements.password.value, v('code')).then(function (r) {
        S.needCode = false;
        if (r.must_enroll_2fa) return api.twoFactorStart().then(function (s) { S.otp = s.otpauth; S.busy = false; go('enroll'); });
        return loadHome();
      }, function (e) { if (e.data && e.data.need_code) { S.needCode = true; S.busy = false; S.error = ''; render(); } else fail(e); });
    } else if (f.id === 'fEnroll') {
      api.twoFactorConfirm(v('code')).then(function () { S.otp = ''; return loadHome(); }, fail);
    } else if (f.id === 'fSite' || f.id === 'fSiteBack') {
      var fd = new FormData();
      if (f.id === 'fSite') fd.append('file', f.elements.file.files[0]);
      fd.append('password', f.elements.password.value);
      if (f.elements.code && f.elements.code.value) fd.append('code', f.elements.code.value.trim());
      var rb = f.id === 'fSiteBack', pw = f.elements.password.value, cd = f.elements.code ? f.elements.code.value.trim() : '';
      (rb ? api.portalRollback({ password: pw, code: cd || undefined }) : api.portalUpdate(fd)).then(function (r) {
        return loadHome().then(function () { S.note = rb ? 'به نسخهٔ قبل برگشت (' + r.restored + ' فایل). نسخهٔ فعلی: ' + (r.version || '') : 'سایت به‌روز شد: ' + r.files + ' فایل' + (r.deleted ? '، ' + r.deleted + ' حذف' : '') + '. نسخهٔ فعلی: ' + (r.version || '') + '. صفحه را با Ctrl+F5 تازه کنید.'; render(); });
      }, fail);
    } else if (f.id === 'fNew') {
      var d = { name: v('name'), email: v('email'), password: f.elements.password.value, role: v('role') };
      if (v('phone')) d.phone = v('phone');
      api.createUser(d).then(function () { S.note = 'حساب ساخته شد.'; return loadHome().then(function () { S.note = 'حساب ساخته شد.'; render(); }); }, fail);
    }
  });
  root.addEventListener('click', function (ev) {
    var t = ev.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-server')) go('server');
    else if (t.hasAttribute('data-off')) { api.setBase(''); S.note = 'سرور خاموش شد؛ پورتال دوباره از Firebase استفاده می‌کند.'; render(); }
    else if (t.hasAttribute('data-out')) api.logout().then(function () { S.user = null; go('login'); });
    else if (t.hasAttribute('data-active')) {
      api.updateUser(t.getAttribute('data-active'), { is_active: t.getAttribute('data-to') === '1' }).then(loadHome, fail);
    }
  });
  root.addEventListener('change', function (ev) {
    var s = ev.target; if (!s.hasAttribute || !s.hasAttribute('data-role')) return;
    api.updateUser(s.getAttribute('data-role'), { role: s.value }).then(loadHome, function (e) { fail(e); loadHome().then(function () { S.error = e.message; render(); }); });
  });

  if (!api.enabled() && !isDev()) { try { api.setBase(window.MS_API_BASE || PROD); } catch (e) { /* ignore */ } }
  if (!api.enabled()) go('server');
  else if (api.token()) loadHome();
  else go('login');
})();

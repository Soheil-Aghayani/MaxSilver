(function () {
  'use strict';
  // Staff sign-in and account administration against the Laravel backend (api-client.js). Firebase screens are untouched.
  var root = document.getElementById('bk'), api = window.MSApi, R = window.MSRoles;
  if (!root || !api) return;
  var S = { view: '', user: null, users: [], portal: null, pwFor: 0, delFor: 0, twoStep: false, busy: false, error: '', note: '', otp: '', email: '', needCode: false };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function can(area) { return !!(S.user && S.user.areas && S.user.areas.indexOf(area) >= 0); }
  var IC = {
    off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>',
    on: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.500 3 3 5-6"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="m11 12 8-8m-3 3 3 3"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.500-5.600-6.500-11a6.500 6.500 0 0 1 13 0c0 5.400-6.500 11-6.500 11z"/><circle cx="12" cy="10" r="2.500"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
  };
  function ic(attr, cls, title, svg) { return '<button type="button" class="bk-ic' + (cls ? ' ' + cls : '') + '" ' + attr + ' title="' + esc(title) + '" aria-label="' + esc(title) + '">' + svg + '</button>'; }
  // messages on the home screen float at the bottom, so they are seen wherever the person is on the page
  function toast(kind, text) {
    var old = document.getElementById('bkToast'); if (old) old.remove();
    var t = document.createElement('div'); t.id = 'bkToast'; t.className = 'bk-toast ' + kind; t.setAttribute('role', kind === 'err' ? 'alert' : 'status'); t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, kind === 'err' ? 9000 : 6000);
  }
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
      '<label class="bk-check"><input type="checkbox" name="remember"' + (S.remember ? ' checked' : '') + '> مرا روی این دستگاه به خاطر بسپار (۳۰ روز؛ فقط دستگاه شخصی)</label>' +
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
  function twoCard(u) {
    var h = '<section class="bk-card"><h2>ورود دومرحله‌ای</h2>';
    if (S.otp && S.twoStep) {
      var svg = '';
      try { var q = window.qrcode(0, 'M'); q.addData(S.otp); q.make(); svg = q.createSvgTag({ scalable: true, margin: 2 }); } catch (e) { svg = ''; }
      return h + '<p class="bk-sub">این کد را با یک برنامهٔ احراز هویت (Google Authenticator، Microsoft Authenticator یا مشابه) اسکن کنید و کد شش‌رقمی را بنویسید.</p><div class="bk-qr" aria-label="کد QR">' + svg + '</div>' +
        '<details><summary>اسکن نمی‌شود؟</summary><p dir="ltr" class="bk-secret">' + esc((S.otp.match(/secret=([A-Z2-7]+)/) || [])[1] || '') + '</p></details>' +
        '<form id="fTwoOn"><label>کد شش‌رقمی<input name="code" dir="ltr" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" required autofocus></label><div class="bk-row"><button class="bk-btn" ' + (S.busy ? 'disabled' : '') + '>تأیید و فعال‌سازی</button><button type="button" class="bk-btn ghost" data-2fa-cancel>انصراف</button></div></form></section>';
    }
    if (!u.has_2fa) {
      return h + '<p class="bk-sub">ورود دومرحله‌ای خاموش است. با فعال‌کردن آن، هنگام ورود علاوه بر رمز، یک کد شش‌رقمی از برنامهٔ احراز هویت گوشی هم پرسیده می‌شود و حساب شما امن‌تر است.</p><div><button type="button" class="bk-btn" data-2fa-on>فعال‌سازی</button></div></section>';
    }
    if (u.needs_2fa) {
      return h + '<p class="bk-sub">روشن است. برای نقش شما الزامی است و نمی‌توان آن را خاموش کرد.</p><p class="bk-sub">دستگاه‌های به‌خاطرسپرده: اگر دستگاهی گم شد یا مشکوک است، همه را فراموش کنید؛ در ورود بعدی دوباره کد پرسیده می‌شود.</p><button type="button" class="bk-btn ghost" data-forget-dev>فراموش‌کردن همهٔ دستگاه‌ها</button></section>';
    }
    return h + '<p class="bk-sub">روشن است. برای خاموش‌کردن، رمز و یک کد فعلی را بنویسید.</p>' +
      '<form id="fTwoOff" class="bk-grid"><label>رمز عبور<input name="password" type="password" dir="ltr" required autocomplete="current-password"></label><label>کد شش‌رقمی<input name="code" dir="ltr" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" required></label><button class="bk-btn ghost" ' + (S.busy ? 'disabled' : '') + '>خاموش‌کردن</button></form></section>';
  }
  function viewHome() {
    var u = S.user, h = '<section class="bk-card"><div class="bk-head"><div><h1>' + esc(u.name) + '</h1><p class="bk-sub">' + esc(R.label(u.role)) + ' · <bdi dir="ltr">' + esc(u.email) + '</bdi>' + (u.has_2fa ? ' · ورود دومرحله‌ای فعال' : '') + '</p></div>' + ic('data-out', '', 'خروج از حساب', IC.out) + '</div>' + msg() + '</section>';
    h += twoCard(u);
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
            (edit ? '<div class="bk-acts">' + (can('territory') && R.hasField && R.hasField(x.role, 'territory') ? '<a class="bk-ic" href="./panel.html#team" title="منطقهٔ فعالیت و ویرایش کامل" aria-label="منطقهٔ فعالیت و ویرایش کامل">' + IC.pin + '</a>' : '') + ic('data-active="' + x.id + '" data-to="' + (x.is_active ? 0 : 1) + '"', '', x.is_active ? 'غیرفعال‌کردن حساب' : 'فعال‌کردن حساب', x.is_active ? IC.off : IC.on) +
              (x.id !== u.id ? ic('data-pw="' + x.id + '"', '', 'رمز تازه', IC.key) + ic('data-del="' + x.id + '"', 'danger' + (S.delFor === x.id ? ' sure' : ''), S.delFor === x.id ? 'تأیید حذف برای همیشه' : 'حذف حساب', IC.trash) : '') + '</div>' : (x.is_active ? '' : 'غیرفعال')) + '</span></div>' +
            (S.pwFor === x.id ? '<form id="fUserPw" class="bk-pwrow" data-id="' + x.id + '"><label>رمز تازه برای ' + esc(x.name) + ' (حداقل ۸ نویسه، با حرف بزرگ و کوچک انگلیسی)<input name="password" type="password" dir="ltr" minlength="8" required autocomplete="new-password" autofocus></label><button class="bk-btn sm">ذخیره</button><button type="button" class="bk-btn ghost sm" data-pwcancel>انصراف</button></form>' : '');
        }).join('') + '</div></section>';
    }
    if (can('siteUpdate') && S.portal) {
      var p = S.portal, ok = p.configured && p.writable && p.zip, two = !!u.has_2fa;
      var ask = '<label>رمز عبور شما (برای تأیید)<input name="password" type="password" dir="ltr" required autocomplete="current-password"></label>' +
        (two ? '<label>کد شش‌رقمی برنامهٔ احراز هویت' + (api.device() ? ' (اختیاری: این دستگاه به خاطر سپرده شده است)' : '') + '<input name="code" dir="ltr" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code"' + (api.device() ? '' : ' required') + '></label>' : '');
      h += '<section class="bk-card"><h2>به‌روزرسانی سایت</h2><p class="bk-sub">نسخهٔ فعلی صفحه‌های سایت روی این سرور: <bdi dir="ltr">' + esc(p.version || 'نامشخص') + '</bdi>. فایل zip به‌روزرسانی را اینجا بارگذاری کنید؛ فقط فایل‌های ایستا (صفحه، تصویر، قلم) پذیرفته می‌شود و از نسخهٔ قبلی یک نسخهٔ بازگشت نگه داشته می‌شود. حجم مجاز: ' + p.upload_mb + ' مگابایت.</p>' +
        (ok ? '' : '<p class="bk-err">این بخش هنوز آماده نیست: ' + (!p.configured ? 'مسیر پوشهٔ سایت (PORTAL_PATH) در تنظیمات سرور نیست.' : !p.writable ? 'پوشهٔ سایت قابل نوشتن نیست.' : 'افزونهٔ zip در هاست خاموش است.') + '</p>') +
        (ok ? '<form id="fSite"><label class="bk-file" id="siteFile"><input name="file" type="file" accept=".zip,application/zip" required><span class="bk-file-btn">انتخاب فایل zip</span><span class="bk-file-name">فایلی انتخاب نشده</span></label>' + ask + '<button class="bk-btn" ' + (S.busy ? 'disabled' : '') + '>بارگذاری و به‌روزرسانی</button></form>' : '') +
        (ok ? '<details><summary class="bk-link">فایل اپلیکیشن اندروید (APK)</summary><form id="fApk"><p class="bk-sub">نسخهٔ تازهٔ برنامه را بارگذاری کنید. فایل در پوشهٔ خصوصی سرور می‌ماند و فقط کسانی که وارد حساب شده‌اند می‌توانند دانلودش کنند.</p>' +
          '<label class="bk-file" id="apkFile"><input name="file" type="file" accept=".apk,application/vnd.android.package-archive" required><span class="bk-file-btn">انتخاب فایل APK</span><span class="bk-file-name">فایلی انتخاب نشده</span></label>' +
          '<label>شمارهٔ نسخه<input name="version" dir="ltr" placeholder="1.0.1" maxlength="20" required></label>' +
          '<label>SHA-256 گواهی امضا (اختیاری)<input name="signerSha256" dir="ltr" maxlength="64" pattern="[0-9a-fA-F]{64}"></label>' + ask + '<button class="bk-btn" ' + (S.busy ? 'disabled' : '') + '>بارگذاری APK</button></form></details>' : '') +
        (ok && p.backups && p.backups.length ? '<details><summary class="bk-link">بازگرداندن به نسخهٔ قبل (' + p.backups.length + ' نسخهٔ بازگشت)</summary><form id="fSiteBack">' + ask + '<button class="bk-btn ghost" ' + (S.busy ? 'disabled' : '') + '>بازگرداندن آخرین به‌روزرسانی</button></form></details>' : '') + '</section>';
    }
    return h;
  }

  function render() {
    root.innerHTML = S.view === 'server' ? viewServer() : S.view === 'login' ? viewLogin() : S.view === 'enroll' ? viewEnroll() : S.view === 'home' ? viewHome() : '';
    var f;
    if (S.view === 'home' && (S.error || S.note)) { toast(S.error ? 'err' : 'ok', S.error || S.note); S.error = ''; S.note = ''; }
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
      S.remember = !!(f.elements.remember && f.elements.remember.checked);
      api.login(S.email, f.elements.password.value, v('code'), S.remember).then(function (r) {
        S.needCode = false;
        if (r.must_enroll_2fa) return api.twoFactorStart().then(function (s) { S.otp = s.otpauth; S.busy = false; go('enroll'); });
        return loadHome();
      }, function (e) { if (e.data && e.data.need_code) { S.needCode = true; S.busy = false; S.error = ''; render(); } else fail(e); });
    } else if (f.id === 'fEnroll') {
      api.twoFactorConfirm(v('code')).then(function () { S.otp = ''; return loadHome(); }, fail);
    } else if (f.id === 'fTwoOn') {
      api.twoFactorVerify(v('code')).then(function () { S.otp = ''; S.twoStep = false; return loadHome().then(function () { S.note = 'ورود دومرحله‌ای فعال شد.'; render(); }); }, fail);
    } else if (f.id === 'fTwoOff') {
      api.twoFactorDisable({ password: f.elements.password.value, code: v('code') }).then(function () { return loadHome().then(function () { S.note = 'ورود دومرحله‌ای خاموش شد.'; render(); }); }, fail);
    } else if (f.id === 'fUserPw') {
      var uid = f.getAttribute('data-id');
      api.setUserPassword(uid, f.elements.password.value).then(function () { S.pwFor = 0; S.busy = false; S.error = ''; S.note = 'رمز تازه ذخیره شد و آن شخص از همهٔ دستگاه‌ها خارج شد. رمز را حضوری به او بدهید.'; render(); }, fail);
    } else if (f.id === 'fApk') {
      var ad = new FormData();
      ad.append('file', f.elements.file.files[0]); ad.append('version', v('version')); ad.append('password', f.elements.password.value); if (api.device()) ad.append('device', api.device());
      if (v('signerSha256')) ad.append('signerSha256', v('signerSha256'));
      ad.append('signer', 'CN=Max Silver, O=Max Steel Arya, C=IR');
      if (f.elements.code && f.elements.code.value) ad.append('code', f.elements.code.value.trim());
      api.appUpload(ad).then(function (r) { S.busy = false; S.note = 'فایل اپلیکیشن بارگذاری شد: نسخهٔ ' + r.version; render(); }, fail);
    } else if (f.id === 'fSite' || f.id === 'fSiteBack') {
      var fd = new FormData();
      if (f.id === 'fSite') fd.append('file', f.elements.file.files[0]);
      fd.append('password', f.elements.password.value); if (api.device()) fd.append('device', api.device());
      if (f.elements.code && f.elements.code.value) fd.append('code', f.elements.code.value.trim());
      var rb = f.id === 'fSiteBack', pw = f.elements.password.value, cd = f.elements.code ? f.elements.code.value.trim() : '';
      (rb ? api.portalRollback({ password: pw, code: cd || undefined, device: api.device() || undefined }) : api.portalUpdate(fd)).then(function (r) {
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
    else if (t.hasAttribute('data-forget-dev')) api.forgetDevices().then(function () { S.note = 'همهٔ دستگاه‌های به‌خاطرسپرده فراموش شد.'; render(); }, fail);
    else if (t.hasAttribute('data-2fa-on')) { S.busy = true; api.twoFactorBegin().then(function (r) { S.otp = r.otpauth; S.twoStep = true; S.busy = false; render(); }, fail); }
    else if (t.hasAttribute('data-2fa-cancel')) { S.otp = ''; S.twoStep = false; render(); }
    else if (t.hasAttribute('data-pw')) { S.pwFor = Number(t.getAttribute('data-pw')); S.delFor = 0; S.error = ''; S.note = ''; render(); }
    else if (t.hasAttribute('data-pwcancel')) { S.pwFor = 0; render(); }
    else if (t.hasAttribute('data-del')) {
      var did = Number(t.getAttribute('data-del'));
      if (S.delFor !== did) { S.delFor = did; S.pwFor = 0; render(); setTimeout(function () { if (S.delFor === did) { S.delFor = 0; render(); } }, 5000); return; }
      S.delFor = 0;
      api.deleteUser(did).then(function () { return loadHome().then(function () { S.note = 'حساب حذف شد.'; render(); }); }, fail);
    }
    else if (t.hasAttribute('data-active')) {
      api.updateUser(t.getAttribute('data-active'), { is_active: t.getAttribute('data-to') === '1' }).then(loadHome, fail);
    }
  });
  root.addEventListener('change', function (ev) {
    var s = ev.target;
    if (s.type === 'file' && s.closest && (s.closest('#siteFile') || s.closest('#apkFile'))) {
      var lb = s.closest('#siteFile') || s.closest('#apkFile'), nm = lb.querySelector('.bk-file-name');
      nm.textContent = s.files && s.files[0] ? s.files[0].name + ' (' + (s.files[0].size / 1048576).toFixed(2) + ' مگابایت)' : 'فایلی انتخاب نشده';
      lb.classList.toggle('has', !!(s.files && s.files[0]));
      return;
    }
    if (!s.hasAttribute || !s.hasAttribute('data-role')) return;
    api.updateUser(s.getAttribute('data-role'), { role: s.value }).then(loadHome, function (e) { fail(e); loadHome().then(function () { S.error = e.message; render(); }); });
  });

  if (!api.enabled() && !isDev()) { try { api.setBase(window.MS_API_BASE || PROD); } catch (e) { /* ignore */ } }
  if (!api.enabled()) go('server');
  else if (api.token()) loadHome();
  else go('login');
})();

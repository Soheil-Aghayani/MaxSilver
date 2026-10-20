// Landing page of the links Firebase emails (password reset, email verification, email change). Set it as the
// "custom action URL" in the Firebase console and the same links open here, in the site's own style and language.
(function () {
  'use strict';
  var card = document.getElementById('rsCard');
  var q = new URLSearchParams(location.search), mode = q.get('mode') || '', code = q.get('oobCode') || '';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var IC = {
    key: '<path d="M14 7a4 4 0 1 1-1.2 7.8L10 18H8v2H6v2H3v-3l7.5-7.5A4 4 0 0 1 14 7z"/><circle cx="15.5" cy="8.5" r="1"/>',
    ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    bad: '<path d="M12 8v5m0 3.5h.01M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
  };
  function icon(k, cls) { return '<span class="rs-ico ' + (cls || '') + '" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + IC[k] + '</svg></span>'; }
  function show(html) { card.innerHTML = html; }
  function fail(msg) {
    show(icon('bad', 'bad') + '<h1>پیوند کار نمی‌کند</h1><p class="rs-note">' + esc(msg || 'این پیوند منقضی شده یا قبلاً استفاده شده است.') + ' از صفحهٔ ورود دوباره «رمز عبور را فراموش کرده‌اید؟» را بزنید.</p><a class="rs-btn" href="./panel.html">رفتن به صفحهٔ ورود</a>');
  }
  function errMsg(e) {
    var c = (e && e.code) || '';
    if (/expired|invalid-action|user-disabled|user-not-found/.test(c)) return 'این پیوند منقضی شده یا قبلاً استفاده شده است.';
    if (/weak-password/.test(c)) return 'رمز ضعیف است؛ دست‌کم ۸ نویسه بگذارید.';
    if (/network/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || 'نامشخص');
  }
  var eye = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  function strength(v) { var s = 0; if (v.length >= 8) s++; if (v.length >= 12) s++; if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++; return Math.min(s, 4); }

  function start() {
    if (!window.firebase || !window.MS_FIREBASE || !code) { fail('پیوند ناقص است.'); return; }
    firebase.initializeApp(window.MS_FIREBASE);
    var auth = firebase.auth();
    if (mode === 'resetPassword') {
      auth.verifyPasswordResetCode(code).then(function (email) {
        show(icon('key') + '<h1>رمز عبور تازه</h1><p class="rs-note">برای این حساب رمز تازه انتخاب کنید:</p><span class="rs-mail">' + esc(email) + '</span>' +
          '<form id="rsForm" novalidate><label>رمز تازه<span class="rs-field"><input type="password" name="nw" autocomplete="new-password" minlength="8" required><button type="button" class="rs-eye" data-eye aria-label="نمایش رمز">' + eye + '</button></span></label>' +
          '<div class="rs-meter" aria-hidden="true"><i id="rsBar"></i></div><p class="rs-hint">دست‌کم ۸ نویسه؛ ترکیب حرف، عدد و نشانه بهتر است.</p>' +
          '<label>تکرار رمز<span class="rs-field"><input type="password" name="rp" autocomplete="new-password" minlength="8" required></span></label>' +
          '<p class="rs-err" id="rsErr" role="alert" hidden></p><button type="submit" class="rs-btn" id="rsGo">ذخیرهٔ رمز تازه</button></form>');
        var f = document.getElementById('rsForm'), bar = document.getElementById('rsBar'), err = document.getElementById('rsErr'), go = document.getElementById('rsGo');
        f.elements.nw.addEventListener('input', function () { var s = strength(f.elements.nw.value); bar.style.width = (s * 25) + '%'; bar.style.background = ['#d9534f', '#d9534f', '#e0a800', '#6aa84f', '#1b8a3a'][s]; });
        f.querySelector('[data-eye]').addEventListener('click', function () { var t = f.elements.nw.type === 'password' ? 'text' : 'password'; f.elements.nw.type = t; f.elements.rp.type = t; });
        f.addEventListener('submit', function (e) {
          e.preventDefault(); err.hidden = true;
          var nw = f.elements.nw.value, rp = f.elements.rp.value;
          if (nw.length < 8) { err.textContent = 'رمز تازه دست‌کم ۸ نویسه باشد.'; err.hidden = false; return; }
          if (nw !== rp) { err.textContent = 'رمز تازه و تکرارش یکی نیست.'; err.hidden = false; return; }
          go.disabled = true; go.textContent = 'در حال ذخیره…';
          auth.confirmPasswordReset(code, nw).then(function () {
            show(icon('ok', 'ok') + '<h1>رمز عبور عوض شد</h1><p class="rs-note">حالا با رمز تازه وارد شوید.</p><a class="rs-btn" href="./panel.html">ورود به حساب</a>');
          }, function (er) { err.textContent = errMsg(er); err.hidden = false; go.disabled = false; go.textContent = 'ذخیرهٔ رمز تازه'; });
        });
      }, function (e) { fail(errMsg(e)); });
    } else if (mode === 'verifyEmail' || mode === 'recoverEmail') {
      auth.applyActionCode(code).then(function () {
        show(icon('ok', 'ok') + '<h1>' + (mode === 'verifyEmail' ? 'ایمیل شما تأیید شد' : 'ایمیل حساب بازگردانده شد') + '</h1><p class="rs-note">می‌توانید به حساب خود بروید.</p><a class="rs-btn" href="./panel.html">رفتن به حساب</a>');
      }, function (e) { fail(errMsg(e)); });
    } else fail('نوع پیوند شناخته نشد.');
  }
  if (document.readyState === 'complete') start(); else window.addEventListener('load', start);
})();

// track.html: a customer follows a purchase request with its code (no sign-in). The page reads one tiny public document,
// request_status/<code>, that holds only the stage and a time. Internal stages are shown in customer words: a refused pre-invoice
// is still «در حال بررسی» for the customer.
(function () {
  'use strict';
  var root = document.getElementById('tk'), cfg = window.MS_FIREBASE;
  if (!root) return;
  var faD = function (s) { return String(s == null ? '' : s).replace(/[0-9]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  var latin = function (s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // what the customer sees: [step index, headline, sentence]
  var MAP = {
    request: [0, 'درخواست شما دریافت شد', 'کارشناس فروش منطقهٔ شما به‌زودی با شما تماس می‌گیرد.'],
    confirmed: [1, 'کارشناس فروش با شما در تماس است', 'اقلام و شرایط با شما هماهنگ می‌شود.'],
    preinvoice: [2, 'پیش‌فاکتور شما در حال بررسی است', 'پس از تأیید، اطلاعات پرداخت برای شما فرستاده می‌شود.'],
    rejected: [2, 'پیش‌فاکتور شما در حال بررسی است', 'پس از تأیید، اطلاعات پرداخت برای شما فرستاده می‌شود.'],
    accepted: [3, 'سفارش شما تأیید شد', 'سفارش برای آماده‌سازی در حال برنامه‌ریزی است.'],
    warehouse: [4, 'سفارش شما در حال آماده‌سازی است', 'کالا در انبار آماده می‌شود.'],
    production: [4, 'سفارش شما در حال آماده‌سازی است', 'کالا در حال تولید است.'],
    ready: [4, 'سفارش شما آمادهٔ ارسال است', 'به‌زودی ارسال می‌شود.'],
    shipped: [5, 'سفارش شما ارسال شد', 'کالا در مسیر شماست.'],
    delivered: [6, 'سفارش شما تحویل شد', 'از خرید شما سپاسگزاریم.'],
    returned: [-1, 'سفارش مرجوع شد', 'برای پیگیری با فروش تماس بگیرید.'],
    cancelled: [-1, 'سفارش لغو شد', 'برای اطلاعات بیشتر با فروش تماس بگیرید.']
  };
  var STEPS = ['دریافت شد', 'تماس کارشناس', 'پیش‌فاکتور', 'تأیید', 'آماده‌سازی', 'ارسال', 'تحویل'];
  // CON-TEH-051025-4827 (a longer order code is cut to its request part)
  function codeOf(s) {
    var t = latin(s).toUpperCase().replace(/\s+/g, '').replace(/[–—−]/g, '-'), m = /^(CON-[A-Z]{3}-\d{6}-\d{3,5})/.exec(t);
    return m ? m[1] : '';
  }
  var S = { code: '', res: null, busy: false, err: '' };
  function when(ms) { try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms)); } catch (e) { return ''; } }
  function view() {
    var h = '<h1>پیگیری درخواست</h1><p class="tk-lead">کد پیگیری را که پس از ثبت درخواست دیده‌اید بنویسید؛ مثل <b dir="ltr">CON-TEH-051025-4827</b>.</p>' +
      '<form class="tk-form" novalidate><label>کد پیگیری<input type="text" name="code" dir="ltr" autocomplete="off" maxlength="60" value="' + esc(S.code) + '" placeholder="CON-TEH-051025-4827"></label>' +
      '<button type="submit" class="tk-btn"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'در حال جست‌وجو…' : 'پیگیری') + '</button></form>';
    if (S.err) h += '<p class="tk-err" role="alert">' + esc(S.err) + '</p>';
    if (S.res) {
      var m = MAP[S.res.stage] || MAP.request, on = m[0];
      h += '<section class="tk-card"><div class="tk-top"><b dir="ltr">' + esc(S.res.code) + '</b><span>' + esc(when(S.res.updatedAt)) + '</span></div><h2>' + m[1] + '</h2><p>' + m[2] + '</p>' +
        (on >= 0 ? '<ol class="tk-steps">' + STEPS.map(function (s, i) { return '<li class="' + (i < on ? 'done' : i === on ? 'on' : '') + '"><i></i><span>' + s + '</span></li>'; }).join('') + '</ol>' : '') + '</section>';
    }
    return h + '<p class="tk-note">این صفحه فقط مرحلهٔ درخواست را نشان می‌دهد و هیچ اطلاعات شخصی ندارد. برای هر پرسش با فروش مکث‌سیلور تماس بگیرید.</p>';
  }
  function render() { var keep = document.activeElement && document.activeElement.name === 'code'; root.innerHTML = view(); if (keep) { var i = root.querySelector('[name=code]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } }
  function lookup(raw) {
    S.code = raw; S.res = null; S.err = '';
    var code = codeOf(raw);
    if (!code) { S.err = 'کد پیگیری درست نیست؛ با CON شروع می‌شود، سه حرف شهر، تاریخ و چهار رقم.'; render(); return; }
    if (!cfg || !window.firebase) { S.err = 'سرویس در دسترس نیست. صفحه را دوباره باز کنید.'; render(); return; }
    S.busy = true; render();
    var app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg);
    window.firebase.firestore(app).collection('request_status').doc(code).get().then(function (s) {
      if (s.exists) { var d = s.data(); S.res = { code: code, stage: d.stage, updatedAt: d.updatedAt }; }
      else S.err = 'کدی با این شماره پیدا نشد. اگر کد را درست نوشته‌اید، ممکن است پیگیری آنلاین این درخواست هنوز فعال نشده باشد؛ با فروش تماس بگیرید.';
    }, function (e) { S.err = /unavailable|network|timeout/.test(e && e.code || '') ? 'اتصال برقرار نشد. اینترنت (یا VPN) را بررسی کنید.' : 'پیگیری انجام نشد. کمی بعد دوباره امتحان کنید.'; })
      .then(function () { S.busy = false; render(); });
  }
  root.addEventListener('submit', function (e) { e.preventDefault(); lookup(root.querySelector('[name=code]').value); });
  var q = /[?&]code=([^&]+)/.exec(location.search);
  render();
  if (q) { try { lookup(decodeURIComponent(q[1])); } catch (e) { /* ignore */ } }
})();

// install.html: one page to install the app on every kind of device. The device in your hand is highlighted.
// Android gets the real app (APK) with its verification details; iPhone and iPad get the home-screen steps (Apple allows nothing else);
// Windows, Mac and Linux install the web app from Chrome or Edge (Safari on a Mac: Add to Dock).
(function () {
  'use strict';
  var root = document.getElementById('ip'), OS = window.MS_OS;
  if (!root || !OS) return;
  var ua = navigator.userAgent || '', plat = navigator.platform || '';
  function detect() {
    if (/iPhone|iPad|iPod/i.test(ua) || (plat === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
    if (/Linux|X11|CrOS/i.test(ua)) return 'linux';
    return '';
  }
  var ME = detect(), INAPP = /MaxSilverApp/.test(ua);
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fa = function (n) { return String(n).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };

  var CARDS = [
    { id: 'android', name: 'اندروید', lead: 'اپلیکیشن واقعی، تمام‌صفحه', steps: ['دکمهٔ «دانلود اپلیکیشن» را بزنید.', 'فایل دانلودشده را باز کنید.', 'اگر گوشی دربارهٔ «نصب از این منبع» پرسید، اجازه دهید و نصب را تأیید کنید.'] },
    { id: 'ios', name: 'آیفون و آیپد', lead: 'نصب از Safari روی صفحهٔ اصلی', steps: ['این صفحه را در Safari باز کنید (نه داخل پیام‌رسان).', 'دکمهٔ اشتراک‌گذاری (مربع با پیکان رو به بالا) را بزنید.', '«Add to Home Screen» یا «افزودن به صفحهٔ اصلی» را انتخاب و تأیید کنید.'], note: 'اپل اجازهٔ نصب فایل برنامه از بیرون فروشگاه خودش را نمی‌دهد؛ این راه همان تجربهٔ برنامه را می‌دهد.' },
    { id: 'windows', name: 'ویندوز', lead: 'نصب از Chrome یا Edge', steps: ['در Chrome یا Edge این سایت را باز کنید.', 'روی آیکن نصب در نوار آدرس بزنید یا دکمهٔ «نصب» همین کارت را بزنید.', 'برنامه با آیکن مکث‌سیلور در منوی Start و روی دسکتاپ می‌آید.'] },
    { id: 'macos', name: 'مک', lead: 'نصب از Chrome، Edge یا Safari', steps: ['Chrome یا Edge: روی آیکن نصب در نوار آدرس بزنید.', 'Safari: از منوی File گزینهٔ «Add to Dock» را بزنید.', 'برنامه در پوشهٔ Applications و Dock دیده می‌شود.'] },
    { id: 'linux', name: 'لینوکس', lead: 'نصب از Chrome یا Chromium', steps: ['در Chrome یا Chromium این سایت را باز کنید.', 'روی آیکن نصب در نوار آدرس بزنید یا دکمهٔ «نصب» همین کارت را بزنید.', 'Firefox نصب برنامه را روی رایانه پشتیبانی نمی‌کند.'] }
  ];
  // a page shown inside a messenger or any app's own web view can never be installed: say so and hand the link to the real browser
  var WEBVIEW = /Bale|Telegram|Eitaa|Rubika|Soroush|iGap|WhatsApp|Instagram|FBAN|FBAV|Line\/|Twitter|Snapchat|TikTok|MicroMessenger/i.test(ua) || /; wv\)/.test(ua) ||
    (ME === 'ios' && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));
  var copyMsg = '';
  var info = null, deferred = null, apkMsg = '';
  var api = window.MSApi, signed = !!(api && api.signedIn && api.signedIn());
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; render(); });

  function icon(id, px) {
    return '<span class="ip-ico" style="--c:' + OS.TONE[id] + '"><img src="./assets/art/install/' + id + '.webp" alt="" width="' + px + '" height="' + px + '" loading="lazy" onerror="this.remove()">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + OS.ICON[id] + '</svg></span>';
  }
  function mb(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' مگابایت' : Math.max(1, Math.round(b / 1024)) + ' کیلوبایت'; }

  function trust() {
    var a = info && info.android; if (!a) return '';
    var day = String(a.date || '').slice(0, 10);
    return '<details class="ip-trust"><summary>مشخصات فایل و چرا کوچک است</summary><div>' +
      '<p><b>چرا فقط ' + esc(fa(mb(a.bytes))) + '؟</b> این برنامه مرورگر خودش را همراه ندارد: صفحه‌های مکث‌سیلور را مستقیم از سرور شرکت (portal.agseyl.ir) می‌خواند و در قاب برنامه نشان می‌دهد. برای همین سبک است، همیشه آخرین نسخهٔ پورتال را نشان می‌دهد و نیازی نیست دوباره نصب کنید.</p>' +
      '<p>این برنامه فقط به اینترنت دسترسی دارد (و برای ذخیرهٔ فایل‌های اکسل و پی‌دی‌اف در پوشهٔ دانلودها). به مخاطبین، پیامک، دوربین، میکروفون و موقعیت مکانی دسترسی نمی‌خواهد.</p>' +
      '<dl><div><dt>نسخه</dt><dd>' + esc(fa(a.version)) + ' · ' + esc(fa(day)) + '</dd></div><div><dt>حجم</dt><dd>' + esc(fa(mb(a.bytes))) + '</dd></div><div><dt>حداقل اندروید</dt><dd>' + esc(fa(a.minAndroid)) + '</dd></div>' +
      '<div><dt>امضاکننده</dt><dd dir="ltr">' + esc(a.signer) + '</dd></div><div><dt>SHA-256 فایل</dt><dd dir="ltr" class="ip-hash">' + esc(a.sha256) + '</dd></div><div><dt>SHA-256 گواهی امضا</dt><dd dir="ltr" class="ip-hash">' + esc(a.signerSha256) + '</dd></div></dl>' +
      '<p class="ip-small">برای اطمینان، SHA-256 فایل دانلودشده را (با ابزار بررسی هش گوشی یا رایانه) با مقدار بالا مقایسه کنید.</p></div></details>';
  }

  // what each device needs besides its steps: a one-tap shortcut when the browser allows it, and a way out of a messenger
  function extra(id, me) {
    if (!me) return '';
    var h = '';
    if (WEBVIEW && (id === 'android' || id === 'ios')) {
      h += '<div class="ip-warn" role="alert"><b>این صفحه داخل یک پیام‌رسان یا برنامهٔ دیگر باز شده است.</b><p>آن مرورگر درونی اجازهٔ نصب نمی‌دهد. لینک را کپی کنید و در ' + (id === 'ios' ? 'Safari' : 'Chrome') + ' باز کنید.</p>' +
        '<div class="ip-row"><button type="button" class="ip-btn alt" data-copy>کپی لینک</button>' + (id === 'android' ? '<a class="ip-btn" href="intent://' + esc(location.host + location.pathname) + '#Intent;scheme=https;package=com.android.chrome;end">باز کردن در Chrome</a>' : '') + '</div>' +
        (copyMsg ? '<p class="ip-small" role="status">' + esc(copyMsg) + '</p>' : '') + '</div>';
    }
    else if (id === 'android') {
      h += deferred ? '<button type="button" class="ip-btn alt" data-install>میان‌بر روی صفحهٔ اصلی (بدون دانلود)</button>'
        : '<p class="ip-small">اگر دکمهٔ میان‌بر دیده نمی‌شود: در Chrome منوی سه‌نقطه را باز کنید و «Install app» یا «Add to Home screen» را بزنید.</p>';
    }
    else if (id === 'ios') {
      h += '<p class="ip-small">در Safari دکمهٔ اشتراک‌گذاری پایین صفحه است. اگر «Add to Home Screen» را نمی‌بینید، فهرست را پایین بکشید. در Chrome آیفون هم همین گزینه در منوی اشتراک‌گذاری هست.</p><div class="ip-row"><button type="button" class="ip-btn alt" data-copy>کپی لینک</button></div>' + (copyMsg ? '<p class="ip-small" role="status">' + esc(copyMsg) + '</p>' : '');
    }
    return h;
  }
  function card(c) {
    var me = c.id === ME, a = info && info.android;
    var action = '';
    if (c.id === 'android') action = '<button type="button" class="ip-btn" data-apk>دانلود اپلیکیشن' + (a ? ' · ' + esc(fa(mb(a.bytes))) : '') + '</button>' + (apkMsg ? '<p class="ip-small" role="status">' + esc(apkMsg) + '</p>' : '');
    else if (c.id === 'windows' || c.id === 'macos' || c.id === 'linux') action = me && deferred ? '<button type="button" class="ip-btn" data-install>نصب</button>' : '';
    return '<article class="ip-card' + (me ? ' me' : '') + '" id="os-' + c.id + '">' + (me ? '<span class="ip-me">دستگاه شما</span>' : '') +
      '<div class="ip-head">' + icon(c.id, 64) + '<div><h2>' + esc(c.name) + '</h2><p>' + esc(c.lead) + '</p></div></div>' +
      '<ol>' + c.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' + (c.note ? '<p class="ip-small">' + esc(c.note) + '</p>' : '') + action + extra(c.id, me) + (c.id === 'android' ? trust() : '') + '</article>';
  }

  function render() {
    if (INAPP) { root.innerHTML = '<p class="ip-note">شما همین الان داخل اپلیکیشن مکث‌سیلور هستید و نیازی به نصب نیست.</p>'; return; }
    var order = CARDS.slice().sort(function (a, b) { return (b.id === ME) - (a.id === ME); });
    root.innerHTML = '<section class="ip-hero"><div><h1>مکث‌سیلور روی همهٔ دستگاه‌های شما</h1><p>یک‌بار نصب کنید؛ از صفحهٔ اصلی گوشی یا رایانه باز می‌شود، تمام‌صفحه است و همیشه به‌روز می‌ماند.</p></div>' +
      '<img class="ip-mascot" src="./assets/art/install/mascot.webp" alt="" width="132" height="132" onerror="this.remove()"></section>' +
      '<div class="ip-grid">' + order.map(card).join('') + '</div>';
  }

  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-apk]')) {
      apkMsg = 'در حال دانلود…'; render();
      var u = api && api.publicUrl ? api.publicUrl('public/app/android/file') : ''; if (!u) { apkMsg = 'دانلود فقط روی نشانی اصلی مکث‌سیلور ممکن است.'; render(); return; }
      var a = document.createElement('a'); a.href = u; a.download = 'maxsilver.apk'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { apkMsg = 'دانلود شروع شد؛ فایل را از پوشهٔ دانلودها باز کنید.'; render(); }, 600);
      return;
    }
    if (e.target.closest('[data-copy]')) {
      var url = location.href.split('#')[0];
      var done = function (ok) { copyMsg = ok ? 'لینک کپی شد.' : 'کپی نشد؛ لینک را از نوار آدرس بردارید.'; render(); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); }); else done(false);
      return;
    }
    if (!e.target.closest('[data-install]') || !deferred) return;
    var p = deferred; deferred = null;
    try { p.prompt(); } catch (x) { /* the steps above still apply */ }
    render();
  });

  function init() { render(); if (api && api.appInfo) api.appInfo().then(function (j) { info = { android: j }; render(); }, function () { /* the card still works without the details */ }); }
  init();
})();

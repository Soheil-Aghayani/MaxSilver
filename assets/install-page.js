// install.html: the home-screen shortcut is the main, one-tap way on every device. The real app files (APK, Windows, Mac, Linux)
// are an optional section below; desktop files appear only when they are listed in assets/downloads.json.
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
  // one big shortcut card for the device in hand; the file installers sit in an optional "advanced" part
  var dl = null;
  function shortcutCard() {
    var c = null; CARDS.forEach(function (x) { if (x.id === ME) c = x; });
    var h = '<section class="ip-main" id="shortcut"><div class="ip-head">' + (c ? icon(c.id, 64) : '') + '<div><h2>میان‌بر روی صفحهٔ اصلی</h2><p>' + (c ? esc(c.name) : 'هر دستگاه') + ' · یک لمس، بدون دانلود فایل، بدون هشدار</p></div></div>';
    if (c) {
      var steps = c.id === 'android' ? ['منوی مرورگر (سه نقطه بالای صفحه) را باز کنید.', '«Add to Home screen» یا «Install app» را بزنید و تأیید کنید.', 'آیکن مکث‌سیلور روی صفحهٔ اصلی گوشی می‌آید.'] : c.steps;
      h += (deferred && !WEBVIEW ? '<button type="button" class="ip-btn big" data-install>افزودن میان‌بر</button>' : '') +
        '<ol>' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' + (c.note ? '<p class="ip-small">' + esc(c.note) + '</p>' : '') + extra(c.id, true);
    } else {
      h += '<p class="ip-small">دستگاه شما شناخته نشد. در Chrome یا Edge روی آیکن نصب در نوار آدرس بزنید، یا در گوشی «Add to Home screen» را انتخاب کنید.</p>';
    }
    return h + '</section>';
  }
  function fileRow(f) {
    return '<a class="ip-file" href="' + esc(f.url) + '" download rel="noopener"><span><b>' + esc(f.label || 'دانلود') + '</b>' + (f.bytes ? ' · ' + esc(fa(mb(f.bytes))) : '') + '</span>' +
      (f.sha256 ? '<small dir="ltr" class="ip-hash">SHA-256: ' + esc(f.sha256) + '</small>' : '') + '</a>';
  }
  function advanced() {
    var a = info && info.android, names = { windows: 'ویندوز', macos: 'مک', linux: 'لینوکس' }, h = '';
    h += '<details class="ip-adv" id="advanced"><summary>نصب پیشرفته · فایل برنامه (اندروید، ویندوز، مک، لینوکس)</summary><div class="ip-advbody">' +
      '<p class="ip-small">این بخش برای کسانی است که حتماً فایل برنامه را می‌خواهند. چون این فایل‌ها از فروشگاه نمی‌آیند، گوشی یا رایانه ممکن است هشدار «ناشناس» بدهد؛ میان‌بر بالا چنین هشداری ندارد.</p>';
    h += '<article class="ip-card' + (ME === 'android' ? ' me' : '') + '" id="os-android"><div class="ip-head">' + icon('android', 48) + '<div><h3>اندروید · فایل APK</h3><p>اپلیکیشن واقعی، تمام‌صفحه</p></div></div>' +
      '<ol>' + CARDS[0].steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<button type="button" class="ip-btn alt" data-apk>دانلود اپلیکیشن' + (a ? ' · ' + esc(fa(mb(a.bytes))) : '') + '</button>' + (apkMsg ? '<p class="ip-small" role="status">' + esc(apkMsg) + '</p>' : '') + trust() + '</article>';
    ['windows', 'macos', 'linux'].forEach(function (id) {
      var list = (dl && dl[id]) || [];
      h += '<article class="ip-card' + (ME === id ? ' me' : '') + '" id="os-' + id + '"><div class="ip-head">' + icon(id, 48) + '<div><h3>' + names[id] + '</h3><p>' + (list.length ? 'فایل نصب' : 'فایل نصب هنوز آماده نیست') + '</p></div></div>' +
        (list.length ? '<div class="ip-files">' + list.map(fileRow).join('') + '</div>'
          : '<p class="ip-small">تا آماده شدن فایل، همان میان‌بر بالا را از Chrome یا Edge بسازید؛ برنامه با آیکن خودش در منوی شروع می‌آید.</p>') + '</article>';
    });
    h += '<article class="ip-card"><div class="ip-head">' + icon('ios', 48) + '<div><h3>آیفون و آیپد</h3><p>فقط میان‌بر</p></div></div><p class="ip-small">اپل نصب فایل از بیرون فروشگاه خودش را اجازه نمی‌دهد؛ میان‌بر Safari همان تجربهٔ برنامه است.</p></article>';
    return h + '</div></details>';
  }

  function render() {
    if (INAPP) { root.innerHTML = '<p class="ip-note">شما همین الان داخل اپلیکیشن مکث‌سیلور هستید و نیازی به نصب نیست.</p>'; return; }
    var open = false;
    try { open = location.hash === '#advanced' || !!(document.getElementById('advanced') || {}).open; } catch (e) { /* ignore */ }
    root.innerHTML = '<section class="ip-hero"><div><h1>مکث‌سیلور روی صفحهٔ اصلی شما</h1><p>یک میان‌بر بسازید؛ مثل یک برنامه باز می‌شود، تمام‌صفحه است و همیشه به‌روز می‌ماند.</p></div>' +
      '<img class="ip-mascot" src="./assets/art/install/mascot.webp" alt="" width="132" height="132" onerror="this.remove()"></section>' + shortcutCard() + advanced();
    if (open) { var d = document.getElementById('advanced'); if (d) d.open = true; }
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

  function init() { render(); try { fetch('./assets/downloads.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j) { dl = j; render(); } }, function () { /* optional */ }); } catch (e) { /* optional */ } if (api && api.appInfo) api.appInfo().then(function (j) { info = { android: j }; render(); }, function () { /* the card still works without the details */ }); }
  init();
})();

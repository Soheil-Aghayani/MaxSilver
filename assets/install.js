// Installing the app.
//  - First visit only: one dialog offers the install, once. Closing it never brings it back.
//  - Afterwards the install lives in the profile panel (#installSlot, signed-in people only).
// The icon and wording follow the operating system. Chrome and Edge give a real prompt; Safari has none, so the steps are shown.
// A link opened inside a messenger (Bale, Telegram, Eitaa, Instagram ...) can never install: the page says so and offers to
// open the real browser. Every install attempt shows progress and then a clear result.
(function () {
  'use strict';
  var KEY = 'ms-install-seen-v1';
  var ua = navigator.userAgent || '', plat = navigator.platform || '';
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if (standalone) return;

  function detect() {
    if (/SteamOS|Steam Deck|Valve Steam/i.test(ua)) return 'steamos';
    if (/CrOS/.test(ua)) return 'chromeos';
    if (/iPhone|iPad|iPod/i.test(ua) || (plat === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
    if (/Linux|X11/i.test(ua)) return 'linux';
    return 'other';
  }
  var OS = detect();
  var firefox = /Firefox|FxiOS/.test(ua);
  var safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/.test(ua);
  // a page shown by a messenger or by any app's own web view: install is impossible there
  var inApp = /Bale|Telegram|Eitaa|Rubika|Soroush|iGap|WhatsApp|Instagram|FBAN|FBAV|Line\/|Twitter|Snapchat|TikTok|MicroMessenger/i.test(ua) ||
    /; wv\)/.test(ua) || (OS === 'android' && /Version\/\d+\.\d+ Chrome\//.test(ua)) ||
    (OS === 'ios' && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua));

  var NAME = { windows: 'ویندوز', macos: 'مک', linux: 'لینوکس', android: 'اندروید', ios: 'آیفون و آیپد', steamos: 'SteamOS', chromeos: 'ChromeOS', other: 'این دستگاه' };
  var TONE = { windows: '#0078D4', macos: '#111827', ios: '#111827', android: '#3DDC84', linux: '#111827', steamos: '#1b2838', chromeos: '#4285f4', other: '#51627a' };
  var ICON = {
    windows: '<path d="M3 5.4 10.6 4.3v7.1H3zM11.7 4.1 21 2.8v8.6h-9.3zM3 12.5h7.6v7.1L3 18.5zM11.7 12.5H21v8.7l-9.3-1.3z"/>',
    macos: '<path d="M12 7.4c-1-.9-2.6-1.2-3.9-.4C6 8.2 5.4 11.2 6.4 14.2c.8 2.4 2.3 4.8 3.8 4.8.9 0 1.2-.5 1.8-.5s.9.5 1.8.5c1.5 0 3-2.4 3.8-4.7.2-.5-1.7-1-1.7-3.2 0-1.9 1.5-2.6 1.6-2.7-.9-1.3-2.3-1.7-3.2-1.7-1.2 0-2 .8-2.6.9z"/><path d="M13.2 5.8c.7-.7 1-1.7.9-2.6-.9 0-1.9.6-2.4 1.3-.5.6-.8 1.6-.7 2.4.9 0 1.6-.4 2.2-1.1z"/>',
    android: '<path d="M6.5 10.5a5.5 5.5 0 0 1 11 0z"/><path d="m8.7 4.2 1.3 1.8m5.3-1.8L14 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><rect x="6.5" y="11.5" width="11" height="7" rx="1.2"/><rect x="8.6" y="17.8" width="2.2" height="3.4" rx="1.1"/><rect x="13.2" y="17.8" width="2.2" height="3.4" rx="1.1"/><rect x="3.2" y="11.5" width="2.2" height="5.5" rx="1.1"/><rect x="18.6" y="11.5" width="2.2" height="5.5" rx="1.1"/><circle cx="9.7" cy="8.2" r=".7" fill="#fff"/><circle cx="14.3" cy="8.2" r=".7" fill="#fff"/>',
    linux: '<path d="M12 3c-2.2 0-3.5 1.8-3.5 4.2 0 1.3-.8 2.4-1.6 3.7-.9 1.4-1.6 3.3-1.3 5.3.2 1.3 1.2 2 2.4 2.1.8 1.3 2.4 2.1 4 2.1s3.2-.8 4-2.1c1.2-.1 2.2-.8 2.4-2.1.3-2-.4-3.9-1.3-5.3-.8-1.3-1.6-2.4-1.6-3.7C15.5 4.8 14.2 3 12 3z"/><ellipse cx="12" cy="14.3" rx="3.2" ry="4.3" fill="#fff"/><path d="M10.5 8.5h3L12 10z" fill="#f5a623"/><circle cx="10.8" cy="6.8" r=".6" fill="#fff"/><circle cx="13.2" cy="6.8" r=".6" fill="#fff"/><ellipse cx="9" cy="20.6" rx="2.2" ry=".9" fill="#f5a623"/><ellipse cx="15" cy="20.6" rx="2.2" ry=".9" fill="#f5a623"/>',
    steamos: '<circle cx="12" cy="12" r="9.5"/><circle cx="15.8" cy="9.2" r="2.6" fill="#fff"/><circle cx="15.8" cy="9.2" r="1.2"/><circle cx="8.3" cy="15.2" r="1.8" fill="#fff"/><path d="m9 14.2 5-3.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    chromeos: '<path d="M12 12 3.77 7.25A9.5 9.5 0 0 1 20.23 7.25Z" fill="#ea4335"/><path d="M12 12V21.5A9.5 9.5 0 0 1 3.77 7.25Z" fill="#34a853"/><path d="M12 12 20.23 7.25A9.5 9.5 0 0 1 12 21.5Z" fill="#fbbc04"/><circle cx="12" cy="12" r="4.5" fill="#fff"/><circle cx="12" cy="12" r="3.2" fill="#4285f4"/>',
    other: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/>'
  };
  ICON.ios = ICON.macos;
  function icon(os, size) {
    return '<svg class="ms-os-ico" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" style="color:' + TONE[os] + '" fill="currentColor" aria-hidden="true">' + ICON[os] + '</svg>';
  }

  function steps() {
    if (firefox && (OS === 'windows' || OS === 'linux' || OS === 'macos' || OS === 'steamos')) return ['Firefox روی رایانه نصب برنامه را پشتیبانی نمی‌کند.', 'همین نشانی را در Chrome یا Edge باز کنید و دوباره نصب را بزنید.'];
    if (OS === 'ios') return ['در Safari دکمهٔ اشتراک‌گذاری (مربع با پیکان رو به بالا) را بزنید.', 'گزینهٔ «Add to Home Screen» یا «افزودن به صفحهٔ اصلی» را انتخاب و تأیید کنید.'];
    if (OS === 'macos' && safari) return ['در Safari از منوی «File» گزینهٔ «Add to Dock» را بزنید.', 'نام برنامه را تأیید کنید.'];
    if (OS === 'android') return ['منوی مرورگر (سه نقطه) را باز کنید.', 'گزینهٔ «Install app» یا «Add to Home screen» را بزنید و تأیید کنید.', 'اگر گزینه نیست، صفحه را یک بار تازه کنید و چند ثانیه صبر کنید.'];
    return ['در نوار آدرس روی آیکن نصب بزنید، یا از منوی مرورگر «Install مکث‌سیلور» را انتخاب کنید.'];
  }

  // ---- visible progress and result
  var toastEl = null, toastTimer = 0;
  var SPIN = '<span class="ms-spin" aria-hidden="true"></span>';
  var OK = '<svg class="ms-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" class="ring"/><path d="m7.5 12.5 3 3 6-7" class="tick"/></svg>';
  var BAD = '<svg class="ms-bad" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8.5 8.5 7 7m0-7-7 7"/></svg>';
  function toast(state, text, action) {
    clearTimeout(toastTimer);
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'ms-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.setAttribute('data-state', state);
    toastEl.innerHTML = '<span class="ms-toast-ico">' + (state === 'working' ? SPIN : state === 'ok' ? OK : BAD) + '</span><span class="ms-toast-text">' + text + '</span>' +
      (action ? '<button type="button" class="ms-toast-act">' + action.label + '</button>' : '') +
      '<button type="button" class="ms-toast-x" aria-label="بستن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>' +
      (state === 'working' ? '<span class="ms-bar" aria-hidden="true"></span>' : '');
    toastEl.hidden = false;
    var x = toastEl.querySelector('.ms-toast-x');
    if (x) x.addEventListener('click', function () { toastEl.hidden = true; clearTimeout(toastTimer); });
    var btn = toastEl.querySelector('.ms-toast-act');
    if (btn) btn.addEventListener('click', function () { toastEl.hidden = true; action.run(); });
    if (state === 'ok') toastTimer = setTimeout(function () { toastEl.hidden = true; }, 6000);
    if (state === 'fail') toastTimer = setTimeout(function () { toastEl.hidden = true; }, 15000);
  }

  var prompt = null, installedWaiter = 0;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); prompt = e; });
  window.addEventListener('appinstalled', function () {
    prompt = null; clearTimeout(installedWaiter);
    var b = document.querySelector('#installSlot .ms-install'); if (b) b.hidden = true;
    if (dlg && dlg.open) dlg.close();
    toast('ok', 'برنامه نصب شد. از صفحهٔ اصلی دستگاه باز کنید.');
  });

  var dlg = null;
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'ms-share-dialog ms-install-dialog';
    dlg.setAttribute('aria-labelledby', 'msInstallTitle');
    document.body.appendChild(dlg);
    return dlg;
  }
  function open(html) {
    var d = ensureDialog();
    d.innerHTML = html;
    var close = d.querySelector('.ms-install-close, .ms-install-later');
    if (close) close.addEventListener('click', function () { d.close(); });
    if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
    return d;
  }
  function copyLink(done) {
    var url = location.href.split('#')[0];
    var ok = function () { done(true); }, bad = function () { done(false); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, bad);
    else {
      try { var t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); var r = document.execCommand('copy'); t.remove(); done(!!r); } catch (e) { bad(); }
    }
  }
  function showSteps() {
    open('<div class="ms-install-body"><div class="ms-install-hero">' + icon(OS, 44) + '<h2 id="msInstallTitle">نصب برای ' + NAME[OS] + '</h2></div><ol>' +
      steps().map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol><button type="button" class="ms-install-close">بستن</button></div>');
  }
  // the page sits inside a messenger: say so, and hand it to the real browser
  function showInApp() {
    var url = location.href.split('#')[0];
    var host = location.host + location.pathname;
    var intent = 'intent://' + host + '#Intent;scheme=https;package=com.android.chrome;end';
    var help = OS === 'ios' ? ['لینک را کپی کنید.', 'Safari را باز کنید و لینک را در نوار آدرس بچسبانید.', 'سپس دکمهٔ اشتراک‌گذاری و «Add to Home Screen» را بزنید.']
      : ['از منوی همین برنامه (سه نقطه) گزینهٔ «باز کردن در مرورگر» یا «Open in browser» را بزنید.', 'یا دکمهٔ زیر را بزنید تا در Chrome باز شود.', 'سپس نصب را از همان‌جا انجام دهید.'];
    var d = open('<div class="ms-install-body"><div class="ms-install-hero">' + icon(OS, 44) + '<h2 id="msInstallTitle">نصب از داخل پیام‌رسان ممکن نیست</h2></div>' +
      '<p>این صفحه داخل مرورگر درونی یک برنامهٔ دیگر باز شده است و آن مرورگر اجازهٔ نصب نمی‌دهد.</p><ol>' +
      help.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' +
      '<div class="ms-install-actions">' + (OS === 'android' ? '<a class="ms-install-go" href="' + intent + '">باز کردن در Chrome</a>' : '') +
      '<button type="button" class="ms-install-copy">کپی لینک</button></div><button type="button" class="ms-install-close">بستن</button></div>');
    d.querySelector('.ms-install-copy').addEventListener('click', function (e) {
      var b = e.currentTarget;
      copyLink(function (ok) { b.textContent = ok ? 'لینک کپی شد ✓' : 'کپی نشد؛ لینک را دستی بردارید'; });
    });
    void url;
  }

  function install() {
    if (inApp) { showInApp(); return; }
    if (!prompt) { showSteps(); return; }
    var p = prompt; prompt = null;
    toast('working', 'در حال آماده‌سازی نصب…');
    var again = { label: 'تلاش دوباره', run: install };
    try { p.prompt(); } catch (e) { toast('fail', 'نصب شروع نشد.', again); showSteps(); return; }
    p.userChoice.then(function (c) {
      if (c && c.outcome === 'accepted') {
        toast('working', 'در حال نصب روی دستگاه…');
        installedWaiter = setTimeout(function () { toast('fail', 'نصب کامل نشد. دوباره امتحان کنید.', again); }, 25000);
      } else {
        toast('fail', 'نصب لغو شد.', again);
      }
    }, function () { toast('fail', 'نصب انجام نشد.', again); });
  }

  // ---- the profile panel keeps the install for later
  var slot = document.getElementById('installSlot');
  if (slot) {
    var signed = false;
    try { signed = !!localStorage.getItem('ms-role'); } catch (e) { /* ignore */ }
    if (signed) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ms-install';
      b.innerHTML = icon(OS, 22) + '<span>نصب برنامه برای ' + NAME[OS] + '</span>';
      b.addEventListener('click', install);
      slot.appendChild(b);
    }
  }

  // ---- first visit: offered once, never again
  var seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch (e) { /* ignore */ }
  if (seen) return;
  setTimeout(function () {
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
    if (inApp) { showInApp(); return; }
    open('<div class="ms-install-body"><div class="ms-install-hero">' + icon(OS, 56) + '<h2 id="msInstallTitle">مکث‌سیلور را روی ' + NAME[OS] + ' نصب کنید</h2></div>' +
      '<p>دسترسی سریع از صفحهٔ اصلی، بدون باز کردن مرورگر. بعداً هم از «حساب من» می‌توانید نصب کنید.</p>' +
      '<div class="ms-install-actions"><button type="button" class="ms-install-go">نصب</button><button type="button" class="ms-install-later">بعداً</button></div></div>');
    dlg.querySelector('.ms-install-go').addEventListener('click', function () { dlg.close(); install(); });
  }, 1500);
})();

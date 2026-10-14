// Installing the app.
//  - First visit only: one dialog offers the install, once. Closing it never brings it back.
//  - Afterwards the install lives in the profile panel (#installSlot, signed-in people only).
// The icon and wording follow the operating system. Chrome and Edge give a real prompt; Safari has none, so the steps are shown.
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
  var firefox = /Firefox|FxiOS/.test(ua) && !/Seamonkey/.test(ua);
  var safari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR/.test(ua);

  var NAME = { windows: 'ویندوز', macos: 'مک', linux: 'لینوکس', android: 'اندروید', ios: 'آیفون و آیپد', steamos: 'SteamOS', chromeos: 'ChromeOS', other: 'این دستگاه' };
  var TONE = { windows: '#0078D4', macos: '#111827', ios: '#111827', android: '#3DDC84', linux: '#111827', steamos: '#1b2838', chromeos: '#4285f4', other: '#51627a' };
  var ICON = {
    windows: '<path d="M3 5.4 10.6 4.3v7.1H3zM11.7 4.1 21 2.8v8.6h-9.3zM3 12.5h7.6v7.1L3 18.5zM11.7 12.5H21v8.7l-9.3-1.3z"/>',
    macos: '<path d="M12 7.4c-1-.9-2.6-1.2-3.9-.4C6 8.200 5.400 11.200 6.400 14.200c.8 2.400 2.300 4.800 3.800 4.800.9 0 1.200-.5 1.800-.5s.9.5 1.800.5c1.500 0 3-2.400 3.800-4.700.2-.5-1.700-1-1.700-3.200 0-1.900 1.500-2.600 1.600-2.700-.9-1.300-2.300-1.700-3.200-1.700-1.200 0-2 .8-2.600.9z"/><path d="M13.200 5.800c.7-.7 1-1.700.9-2.600-.9 0-1.900.6-2.400 1.300-.5.600-.8 1.600-.7 2.400.9 0 1.600-.4 2.200-1.100z"/>',
    android: '<path d="M6.500 10.500a5.500 5.500 0 0 1 11 0z"/><path d="m8.700 4.200 1.300 1.800m5.300-1.800L14 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><rect x="6.500" y="11.500" width="11" height="7" rx="1.200"/><rect x="8.600" y="17.800" width="2.200" height="3.400" rx="1.100"/><rect x="13.200" y="17.800" width="2.200" height="3.400" rx="1.100"/><rect x="3.200" y="11.500" width="2.200" height="5.500" rx="1.100"/><rect x="18.600" y="11.500" width="2.200" height="5.500" rx="1.100"/><circle cx="9.700" cy="8.200" r=".7" fill="#fff"/><circle cx="14.300" cy="8.200" r=".7" fill="#fff"/>',
    linux: '<path d="M12 3c-2.200 0-3.500 1.800-3.500 4.200 0 1.300-.8 2.400-1.600 3.700-.9 1.400-1.600 3.300-1.300 5.300.2 1.300 1.200 2 2.400 2.100.8 1.300 2.400 2.100 4 2.100s3.200-.8 4-2.100c1.200-.1 2.200-.8 2.400-2.100.3-2-.4-3.900-1.300-5.300-.8-1.300-1.600-2.400-1.600-3.700C15.500 4.800 14.200 3 12 3z"/><ellipse cx="12" cy="14.300" rx="3.200" ry="4.300" fill="#fff"/><path d="M10.500 8.500h3L12 10z" fill="#f5a623"/><circle cx="10.800" cy="6.800" r=".6" fill="#fff"/><circle cx="13.200" cy="6.800" r=".6" fill="#fff"/><ellipse cx="9" cy="20.600" rx="2.200" ry=".9" fill="#f5a623"/><ellipse cx="15" cy="20.600" rx="2.200" ry=".9" fill="#f5a623"/>',
    steamos: '<circle cx="12" cy="12" r="9.500"/><circle cx="15.800" cy="9.200" r="2.600" fill="#fff"/><circle cx="15.800" cy="9.200" r="1.200"/><circle cx="8.300" cy="15.200" r="1.800" fill="#fff"/><path d="m9 14.200 5-3.200" stroke="#fff" stroke-width="1.800" stroke-linecap="round"/>',
    chromeos: '<path d="M12 12 3.770 7.250A9.500 9.500 0 0 1 20.230 7.250Z" fill="#ea4335"/><path d="M12 12V21.500A9.500 9.500 0 0 1 3.770 7.250Z" fill="#34a853"/><path d="M12 12 20.230 7.250A9.500 9.500 0 0 1 12 21.500Z" fill="#fbbc04"/><circle cx="12" cy="12" r="4.500" fill="#fff"/><circle cx="12" cy="12" r="3.200" fill="#4285f4"/>',
    other: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.600"/><path d="M3 12h18M12 3c3 3.500 3 14.500 0 18M12 3c-3 3.500-3 14.500 0 18" fill="none" stroke="currentColor" stroke-width="1.600"/>'
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

  var prompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); prompt = e; });
  window.addEventListener('appinstalled', function () { prompt = null; var b = document.querySelector('#installSlot .ms-install'); if (b) b.hidden = true; });

  var dlg = null;
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'ms-share-dialog ms-install-dialog';
    dlg.setAttribute('aria-labelledby', 'msInstallTitle');
    document.body.appendChild(dlg);
    return dlg;
  }
  function showSteps() {
    var d = ensureDialog();
    d.innerHTML = '<div class="ms-install-body"><div class="ms-install-hero">' + icon(OS, 44) + '<h2 id="msInstallTitle">نصب برای ' + NAME[OS] + '</h2></div><ol>' +
      steps().map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol><button type="button" class="ms-install-close">بستن</button></div>';
    d.querySelector('.ms-install-close').addEventListener('click', function () { d.close(); });
    if (!d.open) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  }
  function install() {
    if (!prompt) { showSteps(); return; }
    var p = prompt; prompt = null;
    p.prompt();
    p.userChoice.then(function (c) { if (!c || c.outcome !== 'accepted') showSteps(); }, showSteps);
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
  if (seen || /FBAN|FBAV|Instagram|Line\//.test(ua)) return;
  setTimeout(function () {
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ }
    var d = ensureDialog();
    d.innerHTML = '<div class="ms-install-body"><div class="ms-install-hero">' + icon(OS, 56) + '<h2 id="msInstallTitle">مکث‌سیلور را روی ' + NAME[OS] + ' نصب کنید</h2></div>' +
      '<p>دسترسی سریع از صفحهٔ اصلی، بدون باز کردن مرورگر. بعداً هم از «حساب من» می‌توانید نصب کنید.</p>' +
      '<div class="ms-install-actions"><button type="button" class="ms-install-go">نصب</button><button type="button" class="ms-install-later">بعداً</button></div></div>';
    d.querySelector('.ms-install-later').addEventListener('click', function () { d.close(); });
    d.querySelector('.ms-install-go').addEventListener('click', function () { if (prompt) { d.close(); install(); } else { showSteps(); } });
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }, 1500);
})();

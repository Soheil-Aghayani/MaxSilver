// "Install the app" on the pages a person without an account can reach (home, panel).
// Chrome and Edge give a real prompt once the page is installable; Safari on iPhone has none, so the dialog says what to tap.
(function () {
  'use strict';
  var slot = document.getElementById('installSlot');
  if (!slot) return;
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if (standalone) return;
  var apple = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var prompt = null;

  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'ms-install';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"/></svg><span>نصب برنامه روی دستگاه</span>';
  slot.appendChild(btn);

  var dlg = document.createElement('dialog');
  dlg.className = 'ms-share-dialog ms-install-dialog';
  dlg.setAttribute('aria-labelledby', 'msInstallTitle');
  document.body.appendChild(dlg);

  function steps() {
    if (apple) return ['در Safari دکمهٔ اشتراک‌گذاری (مربع با پیکان) را بزنید.', 'گزینهٔ «Add to Home Screen» یا «افزودن به صفحهٔ اصلی» را انتخاب و تأیید کنید.'];
    if (/Android/i.test(navigator.userAgent)) return ['منوی مرورگر (سه نقطه) را باز کنید.', 'گزینهٔ «Install app» یا «Add to Home screen» را بزنید و تأیید کنید.', 'اگر گزینه نیست، صفحه را یک بار تازه کنید و چند ثانیه صبر کنید.'];
    return ['در نوار آدرس روی آیکن نصب بزنید، یا از منوی مرورگر «Install» را انتخاب کنید.'];
  }
  function openHelp() {
    dlg.innerHTML = '<div class="ms-install-body"><h2 id="msInstallTitle">نصب مکث‌سیلور</h2><ol>' +
      steps().map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol><button type="button" class="ms-install-close">بستن</button></div>';
    dlg.querySelector('.ms-install-close').addEventListener('click', function () { dlg.close(); });
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); prompt = e; });
  window.addEventListener('appinstalled', function () { btn.hidden = true; });
  btn.addEventListener('click', function () {
    if (!prompt) { openHelp(); return; }
    var p = prompt; prompt = null;
    p.prompt();
    p.userChoice.then(function (c) { if (c && c.outcome === 'accepted') btn.hidden = true; }, openHelp);
  });
})();

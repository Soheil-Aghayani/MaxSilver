(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var base = new URL('./', location.href);
  var had = !!navigator.serviceWorker.controller, shown = false;
  // A new release replaces the old one in the background. The page already open still runs the old files, so the person is told and
  // chooses when to reload (nothing reloads by itself: an unsaved form would be lost).
  function bar() {
    if (shown || !document.body) return;
    shown = true;
    var s = document.createElement('style');
    s.textContent = '.ms-upd-bar{position:fixed;inset-inline:12px;bottom:92px;z-index:2147483000;margin:0 auto;width:fit-content;max-width:calc(100vw - 24px);display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:999px;background:#071b36;color:#fff;box-shadow:0 14px 36px rgba(5,25,52,.4);font:800 13px/1.5 Estedad,Tahoma,sans-serif}' +
      '.ms-upd-bar button{min-height:36px;padding:0 16px;border:0;border-radius:999px;background:#ffcc2a;color:#051934;font:800 13px/1 Estedad,Tahoma,sans-serif;cursor:pointer}' +
      '.ms-upd-bar button.x{width:32px;min-height:32px;padding:0;background:rgba(255,255,255,.14);color:#fff;font-size:16px}';
    document.head.appendChild(s);
    var b = document.createElement('div');
    b.className = 'ms-upd-bar'; b.setAttribute('role', 'status');
    b.innerHTML = '<span>نسخهٔ تازهٔ برنامه آماده است</span><button type="button" data-r>تازه‌سازی</button><button type="button" class="x" data-x aria-label="بعداً">×</button>';
    b.addEventListener('click', function (e) {
      if (e.target.closest('[data-r]')) location.reload();
      else if (e.target.closest('[data-x]')) b.remove();
    });
    document.body.appendChild(b);
  }
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!had) { had = true; return; }      // the first install takes control of the page: nothing is new for this person
    bar();
  });
  navigator.serviceWorker.register(new URL('service-worker.js', base), { scope: base.pathname }).then(function (reg) {
    var check = function () { try { reg.update().catch(function () {}); } catch (e) { /* ignore */ } };
    setInterval(check, 30 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  }).catch(function () {});
})();

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
    s.textContent = '.ms-upd-bar{position:fixed;inset-inline:12px;bottom:92px;z-index:2147483000;margin:0 auto;width:fit-content;max-width:calc(100vw - 24px);display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:999px;background:#071b36;color:#fff;box-shadow:0 14px 36px rgba(5,25,52,.4);font:800 13px/1.5 Estedad,Tahoma,sans-serif;overflow:hidden;animation:ms-upd-in .6s cubic-bezier(.2,1.25,.4,1) both}' +
      '.ms-upd-bar.out{animation:ms-upd-out .45s cubic-bezier(.5,0,.8,.4) forwards;pointer-events:none}' +
      '.ms-upd-bar i.ic{display:grid;place-items:center;flex:none;width:38px;height:38px;margin:-4px 0;animation:ms-upd-bob 1.6s ease-in-out infinite}' +
      '.ms-upd-bar i.ic img{width:38px;height:38px;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))}' +
      '.ms-upd-bar i.t{position:absolute;inset-inline:0;bottom:0;height:3px;background:#ffcc2a;transform-origin:right center;animation:ms-upd-t var(--ms-upd,12s) linear forwards}' +
      '.ms-upd-bar:hover i.t,.ms-upd-bar:active i.t,.ms-upd-bar.hold i.t{animation-play-state:paused}' +
      '.ms-upd-bar button{min-height:36px;padding:0 16px;border:0;border-radius:999px;background:#ffcc2a;color:#051934;font:800 13px/1 Estedad,Tahoma,sans-serif;cursor:pointer;animation:ms-upd-glow 2s ease-in-out infinite}' +
      '.ms-upd-bar button.x{width:32px;min-height:32px;padding:0;background:rgba(255,255,255,.14);color:#fff;font-size:16px;animation:none}' +
      '@keyframes ms-upd-in{from{opacity:0;transform:translateY(70px) scale(.8)}to{opacity:1;transform:none}}' +
      '@keyframes ms-upd-out{to{opacity:0;transform:translateY(80px) scale(.85)}}' +
      '@keyframes ms-upd-t{to{transform:scaleX(0)}}' +
      '@keyframes ms-upd-bob{0%,100%{transform:translateY(2px) rotate(-6deg)}50%{transform:translateY(-4px) rotate(6deg)}}' +
      '@keyframes ms-upd-glow{0%,100%{box-shadow:0 0 0 0 rgba(255,204,42,.55)}50%{box-shadow:0 0 0 7px rgba(255,204,42,0)}}' +
      '@media(prefers-reduced-motion:reduce){.ms-upd-bar,.ms-upd-bar.out,.ms-upd-bar i.ic,.ms-upd-bar button{animation:none}.ms-upd-bar i.t{animation:none;display:none}}';
    document.head.appendChild(s);
    var b = document.createElement('div');
    b.className = 'ms-upd-bar'; b.setAttribute('role', 'status');
    b.innerHTML = '<i class="ic" aria-hidden="true"><img src="./assets/art/tiles/new-version.webp" alt="" width="34" height="34"></i><span>نسخهٔ تازهٔ برنامه آماده است</span><button type="button" data-r>تازه‌سازی</button><button type="button" class="x" data-x aria-label="بعداً">×</button><i class="t" aria-hidden="true"></i>';
    var gone = function () { if (!b.parentNode || b.classList.contains('out')) return; b.classList.add('out'); setTimeout(function () { b.remove(); }, 480); };
    b.addEventListener('click', function (e) {
      if (e.target.closest('[data-r]')) location.reload();
      else if (e.target.closest('[data-x]')) gone();
    });
    var timer = b.querySelector('.t');
    if (timer) timer.addEventListener('animationend', function (e) { if (e.animationName === 'ms-upd-t') gone(); });
    else setTimeout(gone, 12000);
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

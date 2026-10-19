// Small things every page shares: loading skeletons (MSSkel), the offline notice, and remembered filters (MSKeep).
(function (w) {
  'use strict';
  var css = '.ms-skel{display:grid;gap:14px;width:min(1040px,100%);margin:0 auto}.ms-skel .sk{display:block;border-radius:14px;background:linear-gradient(100deg,#eef2f8 30%,#f8fafd 50%,#eef2f8 70%);background-size:300% 100%;animation:ms-sk 1.3s ease-in-out infinite}' +
    '.ms-skel .h{height:34px;width:42%}.ms-skel .t{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.ms-skel .t .sk{height:72px;border-radius:16px}' +
    '.ms-skel .g{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:12px}.ms-skel .g .sk{height:128px;border-radius:18px}' +
    '@media(max-width:720px){.ms-skel .t{grid-template-columns:repeat(2,minmax(0,1fr))}}@keyframes ms-sk{to{background-position:-150% 0}}' +
    '@media(prefers-reduced-motion:reduce){.ms-skel .sk{animation:none}}' +
    '.ms-off-bar{position:fixed;top:0;inset-inline:0;z-index:2147483000;padding:7px 14px;text-align:center;background:#b42318;color:#fff;font:800 13px/1.6 Estedad,Tahoma,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px}.ms-off-bar img{width:26px;height:26px;object-fit:contain}.ms-off-bar.back{background:#14804a}';
  function skel(n) {
    var cards = ''; for (var i = 0; i < (n || 6); i++) cards += '<i class="sk"></i>';
    return '<div class="ms-skel" role="status" aria-busy="true" aria-label="در حال بارگذاری"><i class="sk h"></i><div class="t"><i class="sk"></i><i class="sk"></i><i class="sk"></i><i class="sk"></i></div><div class="g">' + cards + '</div></div>';
  }
  w.MSSkel = skel;
  // filters a person chose are remembered on this device, per page
  w.MSKeep = {
    get: function (name) { try { return JSON.parse(localStorage.getItem('ms-keep-' + name) || '{}') || {}; } catch (e) { return {}; } },
    set: function (name, obj) { try { localStorage.setItem('ms-keep-' + name, JSON.stringify(obj)); } catch (e) { /* ignore */ } }
  };
  function style() { if (document.getElementById('msUiKit')) return; var s = document.createElement('style'); s.id = 'msUiKit'; s.textContent = css; document.head.appendChild(s); }
  var bar = null, hideT = 0;
  function off(on) {
    if (!document.body) return;
    style(); clearTimeout(hideT);
    if (!bar) { bar = document.createElement('div'); bar.className = 'ms-off-bar'; bar.setAttribute('role', 'status'); document.body.appendChild(bar); }
    bar.className = 'ms-off-bar' + (on ? '' : ' back');
    bar.innerHTML = (on ? '<img src="./assets/art/tiles/offline.webp" alt="" width="26" height="26">' : '<img src="./assets/art/tiles/success.webp" alt="" width="26" height="26">') + '<span></span>';
    bar.lastChild.textContent = on ? 'آفلاین هستید؛ تغییرات تا برگشتن اتصال ذخیره نمی‌شود.' : 'دوباره آنلاین شدید.';
    if (!on) hideT = setTimeout(function () { if (bar) { bar.remove(); bar = null; } }, 2500);
  }
  w.addEventListener('offline', function () { off(true); });
  w.addEventListener('online', function () { off(false); });
  function ready() {
    style();
    if (navigator.onLine === false) off(true);
    // the first "loading" line of a page becomes a skeleton until the page draws itself
    var m = document.querySelector('main > p[class$="-note"]');
    if (m && /در حال بارگذاری/.test(m.textContent) && m.parentNode.children.length === 1) m.parentNode.innerHTML = skel();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})(window);

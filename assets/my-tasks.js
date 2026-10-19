// Home page: «کارهای من», what is waiting for this person right now. It reads the list the bell already keeps (assets/notify.js),
// so there is no extra reading from the database. A task that belongs to a part switched off (assets/features.js) is left out.
(function () {
  'use strict';
  var box = document.getElementById('myTasks');
  if (!box) return;
  var KEY = 'ms-notify-v1';
  var IC = {
    request: '<path d="M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1zM9 11h6M9 15h4"/>',
    stage: '<path d="M4 8h13m0 0-3-3m3 3-3 3M20 16H7m0 0 3-3m-3 3 3 3"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
    fulfil: '<path d="m7.5 4.3 9 5.2M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8zM3.3 7 12 12l8.7-5M12 22V12"/>',
    ready: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    pending: '<path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6"/>',
    ticket: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>', public: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>',
    commission: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>'
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function signed() { try { return !!localStorage.getItem('ms-role'); } catch (e) { return false; } }
  function items() {
    try { return (JSON.parse(localStorage.getItem(KEY) || '{}') || {}).items || []; } catch (e) { return []; }
  }
  function hrefOf(x) { return x.href || (x.target === 'tickets' ? './panel.html#tickets' : x.target === 'public' ? './panel.html#public' : './panel.html'); }
  function pageOf(h) { return String(h).replace(/^\.\//, '').split('#')[0]; }
  function off(h) {
    var F = window.MSFeatures; if (!F) return false;
    var p = pageOf(h), f = F.list.filter(function (x) { return x.page === p; })[0];
    return !!(f && F.hidden(f.id) && !(F.owner && F.owner()));
  }
  function paint() {
    if (!signed()) { box.hidden = true; return; }
    var list = items().filter(function (x) { return x && x.text && !off(hrefOf(x)); });
    box.hidden = false;
    if (!list.length) {
      box.innerHTML = '<div class="mt-head"><h2>کارهای من</h2></div><div class="mt-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg><span>فعلاً کاری منتظر شما نیست.</span></div>';
      return;
    }
    box.innerHTML = '<div class="mt-head"><h2>کارهای من</h2><span class="mt-n">' + list.length.toLocaleString('fa-IR') + '</span></div><div class="mt-list">' + list.map(function (x) {
      return '<a class="mt-it" href="' + esc(hrefOf(x)) + '"><span class="mt-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[x.kind] || IC.request) + '</svg></span><span class="mt-tx">' + esc(x.text) + '</span></a>';
    }).join('') + '</div>';
  }
  paint();
  window.addEventListener('ms-notify', paint);
  window.addEventListener('ms-features', paint);
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === 'ms-role') paint(); });
  setTimeout(paint, 1500);
})();

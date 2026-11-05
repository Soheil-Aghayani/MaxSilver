// Our own right-click / long-press menu, in place of the browser's («Copy / Select All»).
// On a card or row it offers: copy the selected text (or the card's text), the card's own buttons (e.g. «انجام شد»), and copy a link.
// Text boxes keep the browser's menu (paste, spell check) and the chat bubbles keep their own menu (panel.js).
(function () {
  'use strict';
  var menu = null, lastOpen = 0, pressT = 0, px = 0, py = 0;
  try {      // the style sheet comes next to this script, with the same version stamp
    var me = document.currentScript, href = me && me.src ? me.src.replace(/ctxmenu\.js/, 'ctxmenu.css') : './assets/ctxmenu.css';
    var ln = document.createElement('link'); ln.rel = 'stylesheet'; ln.href = href; document.head.appendChild(ln);
  } catch (e) { /* the menu still works, only unstyled */ }
  var CARD = 'li, article, tr, [class*="card"], [class*="-item"], [class*="-row"]';
  var NATIVE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], .pn-bubble, #tkMenu, .cx-menu, video, audio';
  var ICO = {
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.600 7.100L4 20l1-4.400A8 8 0 1 1 21 12z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v3"/></svg>',
    act: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>'
  };
  function close() { if (menu) { menu.remove(); menu = null; } }
  function copy(text) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return; } } catch (e) { /* fall through */ }
    var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ } t.remove();
  }
  function clean(s) { return String(s || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim(); }
  // Screens register what a right click on THEIR things should offer: MSCtx.add('.some-row', function (el) { return [{ label, ico, run, danger }]; }).
  // (a screen that loads before this file leaves its registration in window.MSCtxQ)
  var providers = [];
  function add(selector, fn) { providers.push({ s: selector, f: fn }); }
  window.MSCtx = { add: add };
  (window.MSCtxQ || []).forEach(function (q) { add(q[0], q[1]); });
  window.MSCtxQ = { push: function (q) { add(q[0], q[1]); } };

  function build(target) {
    var items = [];
    var sel = window.getSelection ? String(window.getSelection()) : '';
    var card = target.closest ? target.closest(CARD) : null;
    if (card && (card === document.body || card.matches('html, body, main, dialog, form'))) card = null;
    var link = target.closest ? target.closest('a[href]') : null;
    // 1. what the screen itself says is useful here
    providers.forEach(function (p) {
      var host = target.closest ? target.closest(p.s) : null;
      if (!host) return;
      try { (p.f(host) || []).forEach(function (it) { if (it && it.label && typeof it.run === 'function') items.push({ ico: it.ico || 'act', label: it.label, danger: !!it.danger, run: it.run }); }); } catch (e) { /* a broken provider must not take the menu down */ }
    });
    // 2. text the person selected, and links
    if (sel.trim()) {
      items.push({ ico: 'copy', label: 'کپی متن انتخاب‌شده', run: function () { copy(sel.trim()); } });
    }
    if (link && /^https?:|^tel:|^mailto:/i.test(link.href)) {
      items.push({ ico: 'link', label: 'کپی پیوند', run: function () { copy(link.href.replace(/^(tel|mailto):/i, '')); } });
    }
    // the card's own buttons become menu items (each one does exactly what the button does)
    if (card) {
      Array.prototype.forEach.call(card.querySelectorAll('button, [role="button"]'), function (b) {
        var label = clean(b.getAttribute('aria-label') || b.textContent);
        if (!label || label.length > 28 || b.disabled || b.getAttribute('aria-disabled') === 'true' || b.closest('.cx-menu') || b.hidden || b.offsetParent === null) return;
        if (b.closest('[data-no-ctx]')) return;
        if (items.some(function (i) { return i.label === label; })) return;
        items.push({ ico: 'act', label: label, run: function () { b.click(); } });
      });
    }
    // 3. copying the whole card's text is only the last resort, when there is nothing more useful to offer
    if (!items.length && card) {
      var text = clean(card.innerText);
      if (text) items.push({ ico: 'copy', label: 'کپی متن این مورد', run: function () { copy(text.slice(0, 4000)); } });
    }
    return items.slice(0, 9);
  }
  function open(target, x, y) {
    close();
    var items = build(target);
    if (!items.length) return false;
    menu = document.createElement('div'); menu.className = 'cx-menu'; menu.setAttribute('role', 'menu'); menu.style.visibility = 'hidden';
    items.forEach(function (it, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.innerHTML = (ICO[it.ico] || ICO.act) + '<span></span>'; b.lastChild.textContent = it.label;
      if (it.danger) b.className = 'danger';
      b.addEventListener('click', function (e) { e.stopPropagation(); close(); try { it.run(); } catch (x2) { /* ignore */ } });
      menu.appendChild(b);
    });
    document.body.appendChild(menu);
    var w = menu.offsetWidth, h = menu.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, pad = 8;
    var left = Math.min(Math.max(x - w / 2, pad), vw - w - pad), top = y + 8;
    if (top + h > vh - pad) top = Math.max(pad, y - h - 8);
    menu.style.left = left + 'px'; menu.style.top = top + 'px'; menu.style.visibility = '';
    var first = menu.querySelector('button'); if (first) { try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    lastOpen = Date.now();
    return true;
  }

  document.addEventListener('contextmenu', function (e) {
    var t = e.target;
    if (!t || !t.closest || t.closest(NATIVE) || e.defaultPrevented) return;          // text boxes and chat bubbles keep their own
    if (e.ctrlKey || e.shiftKey) return;                                               // Shift/Ctrl + right click: the browser's menu when someone really wants it
    e.preventDefault();
    if (Date.now() - lastOpen < 700 && menu) return;                                    // the long press already opened it
    open(t, e.clientX, e.clientY);
  });
  // phones that send no contextmenu event on a long press (iPhone): the same press, timed here
  document.addEventListener('touchstart', function (e) {
    var t = e.target;
    if (!t || !t.closest || t.closest(NATIVE) || e.touches.length !== 1) return;
    px = e.touches[0].clientX; py = e.touches[0].clientY; clearTimeout(pressT);
    pressT = setTimeout(function () { pressT = 0; if (open(t, px, py) && navigator.vibrate) { try { navigator.vibrate(12); } catch (x) { /* ignore */ } } }, 520);
  }, { passive: true });
  document.addEventListener('touchmove', function (e) { if (pressT && e.touches[0] && (Math.abs(e.touches[0].clientX - px) > 10 || Math.abs(e.touches[0].clientY - py) > 10)) { clearTimeout(pressT); pressT = 0; } }, { passive: true });
  ['touchend', 'touchcancel'].forEach(function (n) { document.addEventListener(n, function () { clearTimeout(pressT); pressT = 0; }, { passive: true }); });
  document.addEventListener('click', function (e) { if (menu && !e.target.closest('.cx-menu') && Date.now() - lastOpen > 300) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.addEventListener('scroll', close, { passive: true, capture: true });
  window.addEventListener('resize', close);
})();

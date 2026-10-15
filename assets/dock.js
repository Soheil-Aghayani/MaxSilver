// The navigation dock: a short fixed bar (home, up to three pinned sections, «همه», account) and a grouped sheet with every
// section the signed-in role may open. Pins are per device. Which sections exist for a role comes from roles.js.
(function () {
  'use strict';
  var nav = document.querySelector('.ms-sitebar .ms-nav-links');
  if (!nav) return;
  var svg = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var ICON = {
    home: svg('<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
    dashboard: svg('<path d="M3 3v18h18M7 14l4-4 4 3 6-7"/><path d="M17 6h4v4"/>'),
    analysis: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 14v3m5-7v7m5-10v10"/>'),
    customers: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6M17 5a3.5 3.5 0 0 1 0 7M22 20c0-2.6-1.8-4.7-4.5-5.6"/>'),
    catalog: svg('<path d="m7.5 4.3 9 5.2M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8ZM3.3 7 12 12l8.7-5M12 22V12"/>'),
    process: svg('<path d="M4 5h7v6H4zM13 13h7v6h-7zM13 5h7v4h-7zM4 15h7v4H4z"/><path d="M11 8h2m-6 3v4m6-6v4h2"/>'),
    advertising: svg('<path d="m3 11 18-8v18L3 13zM11 15v4a2 2 0 0 0 4 0v-3"/>'),
    brand: svg('<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h12"/>'),
    invoices: svg('<path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6"/>'),
    tickets: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>'),
    panel: svg('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7"/>'),
    contact: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.7A8 8 0 1 1 21 12z"/><path d="M9 11h6M9 14h4"/>'),
    all: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    close: svg('<path d="m6 6 12 12M18 6 6 18"/>'),
    names: svg('<path d="M4 7h16M4 12h10M4 17h13"/>'),
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>'
  };
  // g: group of the sheet. area: roles.js area required (none: any signed-in person). page: file name that makes it «current».
  var ITEMS = [
    { id: 'home', href: './index.html', label: 'درگاه مدیریت', g: 'start', page: 'index.html' },
    { id: 'customers', href: './customers.html', label: 'مشتریان', g: 'sales', area: 'customers', page: 'customers.html' },
    { id: 'catalog', href: './product-catalog.html', label: 'کاتالوگ محصولات', g: 'sales', page: 'product-catalog.html' },
    { id: 'invoices', href: './panel.html#invoices', label: 'پیش‌فاکتورها', g: 'sales', area: 'invoices' },
    { id: 'process', href: './sales-process.html', label: 'نقشهٔ فروش', g: 'sales', page: 'sales-process.html' },
    { id: 'dashboard', href: './ceo-dashboard.html', label: 'داشبورد مدیریتی', g: 'mgmt', area: 'dashboard', page: 'ceo-dashboard.html' },
    { id: 'analysis', href: './sales-analysis.html', label: 'تحلیل جزئیات فروش', g: 'mgmt', area: 'analysis', page: 'sales-analysis.html' },
    { id: 'advertising', href: './advertising.html', label: 'استراتژی تبلیغات', g: 'brand', area: 'advertising', page: 'advertising.html' },
    { id: 'brand', href: './brand-books.html', label: 'برندبوک', g: 'brand', area: 'brand', page: 'brand-books.html' },
    { id: 'tickets', href: './panel.html#tickets', label: 'گفت‌وگوها', g: 'account' },
    { id: 'panel', href: './panel.html', label: 'حساب من', g: 'account', page: 'panel.html' },
    { id: 'contact', href: './contact.html', label: 'تماس با ما', g: 'account', anon: true, page: 'contact.html' }
  ];
  var GROUPS = [['sales', 'فروش و مشتری'], ['mgmt', 'تحلیل و مدیریت'], ['brand', 'بازاریابی و برند'], ['account', 'حساب و ارتباط']];
  var DEFAULT_PINS = {
    visitor: ['catalog', 'customers', 'process'], sales_manager: ['customers', 'catalog', 'invoices'], account_manager: ['invoices', 'customers', 'catalog'],
    finance: ['dashboard', 'customers', 'invoices'], ceo: ['dashboard', 'customers', 'catalog'], manager: ['dashboard', 'customers', 'catalog'],
    marketing: ['advertising', 'brand', 'catalog']
  };
  var KEY = 'ms-dock-pins-v1', LABELS = 'ms-all-labels-v1';
  // the bottom bar (up to 1100 px wide) is short, so it takes fewer pins than the top bar of a wide screen
  var mqDock = window.matchMedia ? window.matchMedia('(max-width:1100px)') : { matches: false };
  function maxPins() { return mqDock.matches ? 2 : 5; }
  var faN = function (n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); };

  function role() { try { return localStorage.getItem('ms-role') || ''; } catch (e) { return ''; } }
  function signed() {
    if (role()) return true;
    try { for (var i = 0; i < localStorage.length; i++) if (/^firebase:authUser:/.test(localStorage.key(i))) return true; } catch (e) { /* ignore */ }
    return false;
  }
  function allowed() {
    var r = role(), R = window.MSRoles, on = signed();
    return ITEMS.filter(function (it) {
      if (!on) return it.id === 'home' || it.id === 'panel' || it.id === 'contact';
      if (it.anon) return false;
      if (!it.area) return true;
      if (!r) return false;                       // a session exists but the role has not arrived yet: only the open sections
      return R ? R.can(r, it.area) : false;
    });
  }
  function pinsFor(list) {
    var ids = list.map(function (i) { return i.id; }), saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* ignore */ }
    var base = Array.isArray(saved) ? saved : (DEFAULT_PINS[(window.MSRoles ? window.MSRoles.norm(role()) : role())] || ['catalog', 'customers']);
    return base.filter(function (id, i) { return ids.indexOf(id) >= 0 && id !== 'home' && id !== 'panel' && base.indexOf(id) === i; }).slice(0, maxPins());
  }
  function savePins(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* ignore */ } }

  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function isCurrent(it) {
    if (!it.page || it.page !== page) return false;
    if (it.page === 'panel.html') return !(location.hash === '#invoices' || location.hash === '#tickets') ? it.id === 'panel' : ('#' + it.id) === location.hash;
    return true;
  }
  function link(it, cur) {
    return '<li><a href="' + it.href + '"' + (cur ? ' aria-current="page"' : '') + ' aria-label="' + it.label + '" data-tip="' + it.label + '" data-dock="' + it.id + '">' + ICON[it.id] + '<span>' + it.label + '</span></a></li>';
  }

  var sheet = null, lastFocus = null;
  function render() {
    var list = allowed(), byId = {};
    list.forEach(function (i) { byId[i.id] = i; });
    var on = signed(), html = '', cur = null;
    list.forEach(function (i) { if (isCurrent(i)) cur = i.id; });
    if (!on) {
      html = ['home', 'contact', 'panel'].map(function (id) { return link(byId[id], cur === id); }).join('');
      nav.innerHTML = html; paintBadge(); return;
    }
    var pins = pinsFor(list), shown = ['home'].concat(pins, ['panel']);
    html += link(byId.home, cur === 'home');
    pins.forEach(function (id) { html += link(byId[id], cur === id); });
    var inDock = shown.indexOf(cur) >= 0;
    html += '<li><a href="#all" role="button" aria-haspopup="dialog" aria-label="همهٔ بخش‌ها" data-tip="همهٔ بخش‌ها" data-dock="all"' + (!inDock && cur ? ' class="ms-parent"' : '') + '>' + ICON.all + '<span>همه</span></a></li>';
    html += link(byId.panel, cur === 'panel');
    nav.innerHTML = html;
    paintBadge();
  }
  function paintBadge() { if (window.MSNotify && window.MSNotify.paint) { try { window.MSNotify.paint(); } catch (e) { /* ignore */ } } }

  // ---- the sheet
  function build() {
    sheet = document.createElement('div');
    sheet.className = 'ms-all';
    sheet.hidden = true;
    sheet.innerHTML = '<div class="ms-all-back" data-all-close></div><div class="ms-all-sheet" role="dialog" aria-modal="true" aria-label="همهٔ بخش‌ها"></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', function (e) {
      var pin = e.target.closest('[data-pin]');
      if (pin) {
        var id = pin.getAttribute('data-pin'), list = allowed(), pins = pinsFor(list), i = pins.indexOf(id);
        if (i >= 0) pins.splice(i, 1);
        else if (pins.length < maxPins()) pins.push(id);
        else { var hint = sheet.querySelector('.ms-all-hint'); if (hint) { hint.textContent = 'در این نوار حداکثر ' + faN(maxPins()) + ' بخش جا می‌شود؛ ابتدا یکی را بردارید.'; hint.classList.add('warn'); } return; }
        savePins(pins); render(); fill();
        return;
      }
      if (e.target.closest('[data-all-labels]')) {
        var on = !sheet.querySelector('.ms-all-sheet').classList.contains('labels');
        try { localStorage.setItem(LABELS, on ? '1' : '0'); } catch (x) { /* ignore */ }
        fill();
        return;
      }
      if (e.target.closest('[data-all-close]')) close();
      else if (e.target.closest('a.ms-tile')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) close(); });
  }
  function fill() {
    var list = allowed(), pins = pinsFor(list), body = '', labels = false;
    try { labels = localStorage.getItem(LABELS) === '1'; } catch (e) { /* ignore */ }
    GROUPS.forEach(function (g) {
      var items = list.filter(function (i) { return i.g === g[0]; });
      if (!items.length) return;
      body += '<section><h3>' + g[1] + '</h3><div class="ms-all-grid">' + items.map(function (i) {
        var pinned = pins.indexOf(i.id) >= 0, pinnable = i.id !== 'panel' && i.id !== 'home';
        return '<div class="ms-tile-wrap"><a class="ms-tile' + (isCurrent(i) ? ' cur' : '') + '" href="' + i.href + '" aria-label="' + i.label + '" title="' + i.label + '"><span class="ms-tile-ico">' + ICON[i.id] + '</span><span class="ms-tile-t">' + i.label + '</span></a>' +
          (pinnable ? '<button type="button" class="ms-pin" data-pin="' + i.id + '" aria-pressed="' + pinned + '" aria-label="' + (pinned ? 'برداشتن از نوار' : 'سنجاق به نوار') + ' ' + i.label + '" title="' + (pinned ? 'برداشتن از نوار' : 'سنجاق به نوار') + '">' + ICON.pin + '</button>' : '') + '</div>';
      }).join('') + '</div></section>';
    });
    var box = sheet.querySelector('.ms-all-sheet');
    box.classList.toggle('labels', labels);
    box.innerHTML = '<div class="ms-all-head"><b>همهٔ بخش‌ها</b><span class="ms-all-tools">' +
      '<button type="button" class="ms-all-x" data-all-labels aria-pressed="' + labels + '" aria-label="نمایش نام بخش‌ها" title="نمایش نام بخش‌ها">' + ICON.names + '</button>' +
      '<button type="button" class="ms-all-x" data-all-close aria-label="بستن">' + ICON.close + '</button></span></div>' + body +
      '<p class="ms-all-hint">' + (labels ? 'ستاره: تا ' + faN(maxPins()) + ' بخش را در نوار سنجاق کنید.' : 'برای دیدن نام بخش‌ها، دکمهٔ بالا را بزنید.') + '</p>';
  }
  function open() {
    if (!sheet) build();
    lastFocus = document.activeElement;
    fill();
    sheet.hidden = false;
    document.documentElement.classList.add('ms-all-open');
    var first = sheet.querySelector('.ms-tile'); if (first) { try { first.focus(); } catch (e) { /* ignore */ } }
  }
  function close() {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.documentElement.classList.remove('ms-all-open');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* ignore */ } }
  }
  nav.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-dock=all]');
    if (a) { e.preventDefault(); open(); }
  });

  // the dock follows sign-in and sign-out (MSGate.apply runs on both) and the panel's own hash links
  function hook() {
    var G = window.MSGate;
    if (!G || G.__dock) return;
    var orig = G.apply;
    G.apply = function () { orig.apply(G, arguments); render(); };
    G.__dock = true;
  }
  hook();
  render();
  window.addEventListener('hashchange', render);
  if (mqDock.addEventListener) mqDock.addEventListener('change', function () { render(); if (sheet && !sheet.hidden) fill(); });
  window.addEventListener('storage', function (e) { if (e.key === 'ms-role' || e.key === KEY) render(); });
  window.MSDock = { render: render, open: open, close: close };
})();

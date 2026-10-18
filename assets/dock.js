// The navigation dock: home, the sections a person pinned, and account. Nothing else sits in it.
// All sections live on the home page, where every card has a star that pins it to the dock (up to 3 on a phone, 6 on a wide
// screen). Which sections exist for a role comes from roles.js. Pins are kept per device.
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
    crm: svg('<path d="M9 4h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2V5a1 1 0 0 1 1-1zM9 11h6M9 15h4"/>'),
    prices: svg('<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3"/>'),
    warehouse: svg('<path d="M3 9l9-6 9 6v11H3zM8 20v-6h8v6"/>'),
    banks: svg('<path d="M3 10l9-6 9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18"/>'),
    fairs: svg('<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>'),
    competitors: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6"/>'),
    events: svg('<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2v4m8-4v4"/>'),
    planner: svg('<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M9 21V9"/>'),
    contact: svg('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.7A8 8 0 1 1 21 12z"/><path d="M9 11h6M9 14h4"/>'),
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>'
  };
  // area: roles.js area required (none: any signed-in person). page: file name that makes it «current».
  var ITEMS = [
    { id: 'home', href: './index.html', label: 'درگاه مدیریت', page: 'index.html' },
    { id: 'customers', href: './customers.html', label: 'مشتریان', area: 'customers', page: 'customers.html' },
    { id: 'catalog', href: './product-catalog.html', label: 'کاتالوگ محصولات', page: 'product-catalog.html' },
    { id: 'invoices', href: './panel.html#invoices', label: 'پیش‌فاکتورها', area: 'invoices' },
    { id: 'process', href: './sales-process.html', label: 'نقشهٔ فروش', page: 'sales-process.html' },
    { id: 'planner', href: './planner.html', label: 'طراح کافه و رستوران', page: 'planner.html' },
    { id: 'crm', href: './crm.html', label: 'درخواست‌های خرید', area: 'crm', page: 'crm.html' },
    { id: 'prices', href: './prices.html', label: 'قیمت‌ها', area: 'pricesAudit', page: 'prices.html' },
    { id: 'events', href: './events.html', label: 'مناسبت‌ها', area: 'events', page: 'events.html' },
    { id: 'warehouse', href: './warehouse.html', label: 'انبار و موجودی', area: 'warehouse', page: 'warehouse.html' },
    { id: 'banks', href: './banks.html', label: 'حساب‌های بانکی', area: 'bankAccounts', page: 'banks.html' },
    { id: 'fairs', href: './fairs.html', label: 'نمایشگاه‌ها', page: 'fairs.html' },
    { id: 'competitors', href: './competitors.html', label: 'تحلیل رقبا', area: 'competitors', page: 'competitors.html' },
    { id: 'dashboard', href: './ceo-dashboard.html', label: 'داشبورد CEO', area: 'dashboard', page: 'ceo-dashboard.html' },
    { id: 'analysis', href: './sales-analysis.html', label: 'تحلیل جزئیات فروش', area: 'analysis', page: 'sales-analysis.html' },
    { id: 'advertising', href: './advertising.html', label: 'استراتژی تبلیغات', area: 'advertising', page: 'advertising.html' },
    { id: 'brand', href: './brand-books.html', label: 'برندبوک‌ها', area: 'brand', page: 'brand-books.html' },
    { id: 'tickets', href: './panel.html#tickets', label: 'گفت‌وگوها' },
    { id: 'panel', href: './panel.html', label: 'حساب من', page: 'panel.html' },
    { id: 'contact', href: './contact.html', label: 'تماس با ما', anon: true, page: 'contact.html' }
  ];
  var DEFAULT_PINS = {
    visitor: ['catalog', 'customers', 'process'], sales_manager: ['customers', 'catalog', 'invoices'], account_manager: ['invoices', 'customers', 'catalog'],
    finance: ['dashboard', 'customers', 'invoices'], ceo: ['dashboard', 'customers', 'catalog'], manager: ['dashboard', 'customers', 'catalog'],
    marketing: ['advertising', 'brand', 'catalog']
  };
  var KEY = 'ms-dock-pins-v1';
  // the bottom bar (up to 1100 px wide) is short, so it holds fewer pins than the top bar of a wide screen
  var mqDock = window.matchMedia ? window.matchMedia('(max-width:1100px)') : { matches: false };
  function maxPins() { return mqDock.matches ? 3 : 6; }
  var faN = function (n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); };

  function role() { try { return localStorage.getItem('ms-role') || ''; } catch (e) { return ''; } }
  function signed() {
    if (role()) return true;
    // an anonymous Firebase session (the public request form signs in for a moment to send) is not an account
    try { for (var i = 0; i < localStorage.length; i++) if (/^firebase:authUser:/.test(localStorage.key(i))) { var u = null; try { u = JSON.parse(localStorage.getItem(localStorage.key(i))); } catch (e2) { /* ignore */ } if (!(u && u.isAnonymous)) return true; } } catch (e) { /* ignore */ }
    return false;
  }
  function allowed() {
    var r = role(), R = window.MSRoles, on = signed();
    return ITEMS.filter(function (it) {
      if (!on) return it.id === 'home' || it.id === 'planner' || it.id === 'fairs' || it.id === 'panel' || it.id === 'contact';
      if (it.anon) return false;
      if (!it.area) return true;
      if (!r) return false;
      return R ? R.can(r, it.area) : false;
    });
  }
  function savedPins() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* ignore */ }
    return Array.isArray(saved) ? saved : null;
  }
  function pinsFor(list) {
    var ids = list.map(function (i) { return i.id; });
    var base = savedPins() || (DEFAULT_PINS[(window.MSRoles ? window.MSRoles.norm(role()) : role())] || ['catalog', 'customers']);
    return base.filter(function (id, i) { return ids.indexOf(id) >= 0 && id !== 'home' && id !== 'panel' && base.indexOf(id) === i; });
  }
  function savePins(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* ignore */ } }

  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function isCurrent(it) {
    if (!it.page || it.page !== page) return false;
    if (it.page === 'panel.html') return !(location.hash === '#invoices' || location.hash === '#tickets') ? it.id === 'panel' : ('#' + it.id) === location.hash;
    return true;
  }
  function link(it, cur) {
    return '<li><a href="' + it.href + '"' + (cur ? ' aria-current="page"' : '') + ' aria-label="' + (it.tip || it.label) + '" data-tip="' + (it.tip || it.label) + '" data-dock="' + it.id + '">' + ICON[it.id] + '<span>' + it.label + '</span></a></li>';
  }

  // the open section is a pill behind its link; when the person came from another page it starts where the old page's pill was and slides over
  function dockMorph() {
    if (!window.MSMorph) return;
    var prev = null, raw = null, links = nav.querySelectorAll('a[data-dock]');
    try { raw = JSON.parse(sessionStorage.getItem('ms-dock-from') || 'null'); sessionStorage.removeItem('ms-dock-from'); } catch (e) { raw = null; }
    nav.setAttribute('data-morph', 'dock');
    var key = nav.getAttribute('aria-label') || 'dock';
    if (raw && Date.now() - raw.t < 6000 && raw.n === links.length && Math.abs(raw.w - nav.offsetWidth) < 3) prev = [{ key: key, idx: raw.idx, box: raw.box }];
    window.MSMorph.playAll(document, '.ms-sitebar .ms-nav-links', 'a[data-dock]', 'a[aria-current=page]', prev, { cls: 'dock', copyRadius: true });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.ms-nav-links a[data-dock]');
    if (!a || e.button || e.ctrlKey || e.metaKey || e.shiftKey || a.getAttribute('aria-current') === 'page') return;
    var cur = nav.querySelector('a[aria-current=page]'), links = Array.prototype.slice.call(nav.querySelectorAll('a[data-dock]'));
    if (!cur) return;
    try { sessionStorage.setItem('ms-dock-from', JSON.stringify({ t: Date.now(), idx: links.indexOf(cur), n: links.length, w: nav.offsetWidth, box: { l: cur.offsetLeft, t: cur.offsetTop, w: cur.offsetWidth, h: cur.offsetHeight } })); } catch (x) { /* ignore */ }
  });

  function render() {
    var list = allowed(), byId = {};
    list.forEach(function (i) { byId[i.id] = i; });
    var cur = null, html = '';
    list.forEach(function (i) { if (isCurrent(i)) cur = i.id; });
    if (!signed()) {
      // visitors without an account: home, the business planner (its full name is the tooltip), contact, account
      byId.planner = Object.assign({}, byId.planner, { label: 'راه‌اندازی کسب‌وکار', tip: 'چه کسب‌وکاری می‌خواهید راه بیندازید؟' });
      html = ['home', 'planner', 'fairs', 'contact', 'panel'].map(function (id) { return link(byId[id], cur === id); }).join('');
    } else {
      html = link(byId.home, cur === 'home');
      pinsFor(list).slice(0, maxPins()).forEach(function (id) { html += link(byId[id], cur === id); });
      html += link(byId.panel, cur === 'panel');
    }
    nav.innerHTML = html;
    dockMorph();
    if (window.MSNotify && window.MSNotify.paint) { try { window.MSNotify.paint(); } catch (e) { /* ignore */ } }
    if (window.MSUpdates && window.MSUpdates.paintDot) { try { window.MSUpdates.paintDot(); } catch (e) { /* ignore */ } }
    decorateHome();
  }

  // ---- the home page: every card carries a star that adds or removes the section from the dock
  function idByHref(href) {
    var h = String(href || '');
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].href === h) return ITEMS[i].id;
    return null;
  }
  function decorateHome() {
    if (page !== 'index.html') return;
    var grids = document.querySelectorAll('main .portal-grid:not(.anon)'), grid = grids[0];
    if (!grid) return;
    var on = signed(), list = allowed(), ids = list.map(function (i) { return i.id; }), pins = pinsFor(list).slice(0, maxPins());
    var hint = document.getElementById('dockHint');
    if (!hint) {
      hint = document.createElement('p'); hint.id = 'dockHint'; hint.className = 'dock-hint';
      var top = grid.closest('.hm-secs') || grid; top.parentNode.insertBefore(hint, top);
    }
    hint.hidden = !on;
    if (!hint.classList.contains('warn')) hint.innerHTML = ICON.star + '<span>با ستارهٔ هر بخش، آن را در نوار پایین نگه دارید؛ حداکثر ' + faN(maxPins()) + ' بخش.</span>';
    Array.prototype.forEach.call(document.querySelectorAll('main .portal-grid:not(.anon) a.portal-card'), function (a) {
      var id = idByHref(a.getAttribute('href')), wrap = a.parentNode;
      if (!wrap.classList || !wrap.classList.contains('pc-wrap')) {
        wrap = document.createElement('div'); wrap.className = 'pc-wrap';
        a.parentNode.insertBefore(wrap, a); wrap.appendChild(a);
      }
      wrap.style.display = a.hidden || a.style.display === 'none' ? 'none' : '';
      var star = wrap.querySelector('.pc-star');
      var pinnable = on && id && id !== 'home' && id !== 'panel' && ids.indexOf(id) >= 0;
      if (!pinnable) { if (star) star.remove(); return; }
      if (!star) {
        star = document.createElement('button'); star.type = 'button'; star.className = 'pc-star'; star.innerHTML = ICON.star;
        wrap.appendChild(star);
      }
      var pinned = pins.indexOf(id) >= 0, label = a.querySelector('h2') ? a.querySelector('h2').textContent.trim() : id;
      star.setAttribute('data-pin', id);
      star.setAttribute('aria-pressed', String(pinned));
      star.setAttribute('aria-label', (pinned ? 'برداشتن از نوار: ' : 'افزودن به نوار: ') + label);
      star.title = pinned ? 'برداشتن از نوار پایین' : 'افزودن به نوار پایین';
    });
    // a section whose cards this role cannot open is not shown at all
    Array.prototype.forEach.call(document.querySelectorAll('.hm-sec:not(.anon)'), function (s) {
      s.hidden = !Array.prototype.some.call(s.querySelectorAll('.pc-wrap'), function (w) { return w.style.display !== 'none'; });
    });
  }
  var warnTimer = 0;
  document.addEventListener('click', function (e) {
    var star = e.target.closest && e.target.closest('.pc-star');
    if (!star) return;
    e.preventDefault();
    var id = star.getAttribute('data-pin'), list = allowed(), pins = pinsFor(list), i = pins.indexOf(id);
    if (i >= 0) pins.splice(i, 1);
    else if (pins.slice(0, maxPins()).length < maxPins()) pins = pins.slice(0, maxPins()).concat(id);
    else {
      var hint = document.getElementById('dockHint');
      if (hint) {
        hint.classList.add('warn');
        hint.innerHTML = ICON.star + '<span>نوار پایین جای بیشتر از ' + faN(maxPins()) + ' بخش ندارد؛ ابتدا ستارهٔ یکی را بردارید.</span>';
        clearTimeout(warnTimer);
        warnTimer = setTimeout(function () { hint.classList.remove('warn'); decorateHome(); }, 3500);
      }
      return;
    }
    savePins(pins); render();
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
  window.addEventListener('storage', function (e) { if (e.key === 'ms-role' || e.key === KEY) render(); });
  if (mqDock.addEventListener) mqDock.addEventListener('change', render);
  window.MSDock = { render: render, maxPins: maxPins };
})();

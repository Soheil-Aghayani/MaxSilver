// Search across the portal: sections the person may open, catalog products, and academy lessons of their own track.
// Opens with Ctrl+K, with "/" outside a text box, from the search bar on the home page, or from the magnifier in the wide-screen top bar.
// Only for signed-in people (the same sections the dock shows); products and lessons load the first time the box is opened.
(function (w) {
  'use strict';
  var KEEP = 8;
  function role() { try { return localStorage.getItem('ms-role') || ''; } catch (e) { return ''; } }
  function signed() { return !!role(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Persian and Arabic letters and digits compare equal, case and the half-space are ignored
  function norm(s) {
    return String(s == null ? '' : s).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; })
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏ً-ْ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>';

  // extra words people may type for a section
  var WORDS = {
    customers: 'مشتری مشتریان بانک اطلاعات مشتری', catalog: 'کاتالوگ محصول محصولات دستگاه', invoices: 'پیش فاکتور فاکتور', prices: 'قیمت قیمت‌ها لیست قیمت', warehouse: 'انبار موجودی',
    academy: 'آموزش درس کلاس دوره اسکریپت فروش', install: 'نصب اپ اپلیکیشن برنامه اندروید موبایل', tickets: 'گفت‌وگو چت پیام', crm: 'درخواست خرید', fairs: 'نمایشگاه فستیوال',
    events: 'مناسبت رویداد', process: 'نقشه فروش فرایند', panel: 'حساب پروفایل رمز عبور', assistant: 'آریا دستیار هوش مصنوعی', backup: 'پشتیبان', banks: 'حساب بانکی شبا'
  };

  var items = null, loading = null, ui = null, active = -1, shown = [];

  function pageItems() {
    var D = w.MSDock; if (!D || !D.list) return [];
    return D.list().filter(function (it) { return it.id !== 'contact'; }).map(function (it) {
      return { kind: 'بخش', title: it.label, href: it.href, hay: norm(it.label + ' ' + (WORDS[it.id] || '')), rank: 0 };
    });
  }
  function loadJson(url) { return fetch(url, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function loadScript(src) {
    return new Promise(function (ok) { var s = document.createElement('script'); s.src = src; s.onload = function () { ok(true); }; s.onerror = function () { ok(false); }; document.head.appendChild(s); });
  }
  function stamp() { var m = (document.currentScript && document.currentScript.src || '').match(/v=([0-9]+)/); return m ? m[1] : ''; }
  var V = stamp();
  function q(u) { return u + (V ? '?v=' + V : ''); }

  function academyItems() {
    var A = w.MS_ACADEMY, R = w.MSRoles, r = R ? R.norm(role()) : role(), all = r === 'manager' || r === 'ceo', out = [];
    if (!A || !A.tracks) return out;
    A.tracks.forEach(function (t) {
      if (!all && (t.roles || []).indexOf(r) < 0) return;
      (t.days || []).forEach(function (d) {
        (d.lessons || []).forEach(function (l) {
          out.push({ kind: 'آموزش', title: l.t, sub: t.title + ' › روز ' + d.n + ': ' + d.title, href: './academy.html', hay: norm(l.t + ' ' + d.title + ' ' + t.title), rank: 2 });
        });
      });
    });
    return out;
  }
  function productItems(cat) {
    if (!cat || !cat.items) return [];
    return cat.items.map(function (p) {
      return { kind: 'محصول', title: p.name, sub: [p.code, p.cat, p.grp].filter(Boolean).join(' · '), href: './product-catalog.html?q=' + encodeURIComponent(p.code || p.name), hay: norm([p.name, p.code, p.cat, p.grp, (p.sec || []).join(' ')].join(' ')), rank: 1 };
    });
  }
  function ensure() {
    if (items) return Promise.resolve(items);
    if (loading) return loading;
    var R = w.MSRoles, canAcademy = !R || R.can(role(), 'academy');
    loading = Promise.all([
      loadJson('./assets/catalog.json'),
      canAcademy ? (w.MS_ACADEMY ? Promise.resolve(true) : loadScript(q('./assets/academy-data.js'))) : Promise.resolve(false)
    ]).then(function (res) {
      items = pageItems().concat(productItems(res[0]), res[1] ? academyItems() : []);
      return items;
    });
    return loading;
  }

  function search(text) {
    var toks = norm(text).split(' ').filter(Boolean);
    if (!toks.length) return [];
    var out = [];
    (items || []).forEach(function (it) {
      var ok = toks.every(function (t) { return it.hay.indexOf(t) >= 0; });
      if (!ok) return;
      var title = norm(it.title), score = title.indexOf(toks[0]) === 0 ? 0 : title.indexOf(toks[0]) > 0 ? 1 : 2;
      out.push({ it: it, s: it.rank * 10 + score });
    });
    out.sort(function (a, b) { return a.s - b.s; });
    // at most KEEP of each kind so a long product list does not push sections and lessons out
    var per = {}, res = [];
    out.forEach(function (x) { per[x.it.kind] = (per[x.it.kind] || 0) + 1; if (per[x.it.kind] <= KEEP) res.push(x.it); });
    return res;
  }

  function build() {
    if (ui) return ui;
    var st = document.createElement('style');
    st.textContent =
      '.ms-sr{position:fixed;inset:0;z-index:2147481000;display:grid;align-items:start;justify-items:center;padding:8vh 12px 12px;background:rgba(7,27,54,.55);backdrop-filter:blur(3px)}.ms-sr[hidden]{display:none}' +
      '.ms-sr-box{width:min(620px,100%);max-height:78vh;display:flex;flex-direction:column;border-radius:20px;background:#fff;box-shadow:0 24px 70px rgba(0,0,0,.35);overflow:hidden}' +
      '.ms-sr-in{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #e3e8f0}.ms-sr-in svg{width:22px;height:22px;flex:none;color:#5b6b82}' +
      '.ms-sr-in input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:16px;color:#071b36;background:transparent}' +
      '.ms-sr-in kbd{padding:2px 7px;border:1px solid #cfd8e6;border-radius:7px;font:12px inherit;color:#5b6b82}' +
      '.ms-sr-list{margin:0;padding:6px;list-style:none;overflow-y:auto;overflow-x:hidden}.ms-sr-list li{margin:0}' +
      '.ms-sr-list a{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:10px 12px;border-radius:12px;color:#071b36;text-decoration:none}' +
      '.ms-sr-list a:hover,.ms-sr-list a.on{background:#eef3fb}.ms-sr-k{grid-row:span 2;align-self:center;padding:2px 9px;border-radius:999px;background:#ffc800;color:#071b36;font:700 11px inherit}' +
      '.ms-sr-t{font-weight:700;font-size:14px}.ms-sr-s{font-size:12px;color:#5b6b82}.ms-sr-empty{padding:22px 16px;text-align:center;color:#5b6b82;font-size:14px}' +
      '.ms-sr-btn{display:flex;align-items:center;gap:10px;width:100%;margin:0 0 14px;padding:13px 16px;border:1px solid #d5deec;border-radius:16px;background:#fff;color:#5b6b82;font:inherit;font-size:14px;cursor:pointer;text-align:start}' +
      '.ms-sr-btn:hover{border-color:#ffc800;box-shadow:0 4px 14px rgba(7,27,54,.08)}.ms-sr-btn svg{width:20px;height:20px;flex:none}.ms-sr-btn kbd{margin-inline-start:auto;padding:2px 7px;border:1px solid #cfd8e6;border-radius:7px;font:12px inherit}' +
      '.ms-nav-search button{display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:14px;background:transparent;color:inherit;cursor:pointer}.ms-nav-search svg{width:21px;height:21px}' +
      '@media (max-width:1099px){.ms-nav-search{display:none}.ms-sr-btn kbd{display:none}}';
    document.head.appendChild(st);
    var d = document.createElement('div');
    d.className = 'ms-sr'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'جست‌وجو');
    d.innerHTML = '<div class="ms-sr-box"><div class="ms-sr-in">' + ICON + '<input type="search" autocomplete="off" placeholder="جست‌وجوی بخش‌ها، محصولات و درس‌های آموزش…" aria-label="جست‌وجو"><kbd>Esc</kbd></div><ul class="ms-sr-list"></ul></div>';
    document.body.appendChild(d);
    ui = { root: d, input: d.querySelector('input'), list: d.querySelector('ul') };
    d.addEventListener('click', function (e) { if (e.target === d) close(); });
    ui.input.addEventListener('input', paint);
    ui.input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Enter') { var a = ui.list.querySelector('a.on') || ui.list.querySelector('a'); if (a) { e.preventDefault(); location.href = a.getAttribute('href'); } }
      else if (e.key === 'Escape') close();
    });
    return ui;
  }
  function move(dir) {
    var as = ui.list.querySelectorAll('a'); if (!as.length) return;
    active = (active + dir + as.length) % as.length;
    Array.prototype.forEach.call(as, function (a, i) { a.classList.toggle('on', i === active); });
    as[active].scrollIntoView({ block: 'nearest' });
  }
  function paint() {
    var t = ui.input.value;
    if (!norm(t)) { shown = []; ui.list.innerHTML = '<li class="ms-sr-empty">نام یک بخش، محصول یا درس را بنویسید.</li>'; return; }
    if (!items) { ui.list.innerHTML = '<li class="ms-sr-empty">در حال آماده‌سازی…</li>'; ensure().then(paint); return; }
    shown = search(t); active = -1;
    ui.list.innerHTML = shown.length ? shown.map(function (it) {
      return '<li><a href="' + esc(it.href) + '"><span class="ms-sr-k">' + esc(it.kind) + '</span><span class="ms-sr-t">' + esc(it.title) + '</span>' + (it.sub ? '<span class="ms-sr-s">' + esc(it.sub) + '</span>' : '<span class="ms-sr-s"></span>') + '</a></li>';
    }).join('') : '<li class="ms-sr-empty">چیزی پیدا نشد. با نوشتهٔ کوتاه‌تر یا کد کالا امتحان کنید.</li>';
  }
  function open() {
    if (!signed()) return;
    build(); ui.root.hidden = false; ui.input.value = ''; paint(); ui.input.focus();
    ensure().then(function () { if (!ui.root.hidden) paint(); });
  }
  function close() { if (ui) ui.root.hidden = true; }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { if (signed()) { e.preventDefault(); open(); } return; }
    var el = document.activeElement, typing = el && /^(input|textarea|select)$/i.test(el.tagName) || (el && el.isContentEditable);
    if (e.key === '/' && !typing && signed() && !(ui && !ui.root.hidden)) { e.preventDefault(); open(); }
    else if (e.key === 'Escape') close();
  });
  document.addEventListener('click', function (e) { if (e.target.closest('[data-ms-search]')) { e.preventDefault(); open(); } });

  // the entry points: a bar above the sections on the home page, and a magnifier in the wide-screen top bar
  function mount() {
    if (!signed()) return;
    var nav = document.querySelector('.ms-sitebar .ms-nav-links');
    if (nav && !nav.querySelector('.ms-nav-search')) {
      var li = document.createElement('li'); li.className = 'ms-nav-search';
      li.innerHTML = '<button type="button" data-ms-search aria-label="جست‌وجو" title="جست‌وجو (Ctrl+K)">' + ICON + '</button>';
      nav.appendChild(li);
    }
    var grid = document.querySelector('main .portal-grid:not(.anon)');
    if (grid && !document.querySelector('.ms-sr-btn') && /index\.html$|\/$/.test(location.pathname)) {
      build();
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ms-sr-btn'; b.setAttribute('data-ms-search', '');
      b.innerHTML = ICON + '<span>جست‌وجو در بخش‌ها، محصولات و آموزش</span><kbd>Ctrl K</kbd>';
      grid.parentNode.insertBefore(b, grid);
    }
  }
  function watch() {
    mount();
    var nav = document.querySelector('.ms-sitebar .ms-nav-links');
    // the dock redraws its own list now and then; the magnifier is put back each time
    if (nav && w.MutationObserver) new MutationObserver(function () { if (!nav.querySelector('.ms-nav-search')) mount(); }).observe(nav, { childList: true });
  }
  w.addEventListener('ms-role-change', mount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  w.MSSearch = { open: open, close: close, norm: norm, search: function (t) { return ensure().then(function () { return search(t); }); } };
})(window);

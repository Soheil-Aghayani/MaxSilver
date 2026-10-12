(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ICON = {
    ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 17 14-14 4 4L7 21zM7 13l2 2m1-5 2 2m1-5 2 2"/></svg>',
    weight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 20h12l2-11H4zM9 9a3 3 0 1 1 6 0"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
    open: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    cube: '<svg class="ph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7.5 4.3 9 5.2M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8ZM3.3 7 12 12l8.7-5M12 22V12"/></svg>'
  };
  var MAX_COMPARE = 4, PAGE = 48;
  var fa = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
  var faInt = new Intl.NumberFormat('fa-IR');
  var data = null, items = [], byId = {}, filtered = [], shown = PAGE;
  var state = { q: '', src: '', grp: '', sec: '', sort: 'name' };
  var compare = [];

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200f]/g, ' ')
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 1776); })
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 1632); })
      .replace(/\s+/g, ' ').trim();
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function srcLabel(key) { var s = data.sources.filter(function (x) { return x.key === key; })[0]; return s ? s.label : key; }
  function dimsText(it) { return it.dims && it.dims.l && it.dims.w && it.dims.h ? [it.dims.l, it.dims.w, it.dims.h].map(function (n) { return fa.format(n); }).join(' × ') + ' cm' : ''; }
  function volume(it) { return it.dims && it.dims.l && it.dims.w && it.dims.h ? it.dims.l * it.dims.w * it.dims.h : -1; }
  function power(it) { var p = it.specs.filter(function (s) { return s[0] === 'توان مصرفی'; })[0]; return p ? p[1] : ''; }

  function build() {
    items.forEach(function (it) { it.hay = norm([it.name, it.code, it.cat, it.grp, srcLabel(it.src), it.sec.join(' '), it.specs.map(function (s) { return s[1]; }).join(' ')].join(' ')); byId[it.id] = it; });
    var src = $('catSources'), counts = {};
    items.forEach(function (it) { counts[it.src] = (counts[it.src] || 0) + 1; });
    var order = [['', 'همه', items.length]].concat(data.sources.map(function (s) { return [s.key, s.label, counts[s.key] || 0]; }));
    src.innerHTML = order.map(function (o) { return '<button type="button" data-src="' + o[0] + '" aria-pressed="' + (o[0] === state.src) + '">' + esc(o[1]) + '<small>' + faInt.format(o[2]) + '</small></button>'; }).join('');
    $('catGroup').innerHTML = '<option value="">همه گروه‌ها</option>' + data.groups.map(function (g) { return '<option>' + esc(g) + '</option>'; }).join('');
    $('catSector').innerHTML = '<option value="">همه صنف‌ها</option>' + data.sectors.map(function (g) { return '<option>' + esc(g) + '</option>'; }).join('');
  }

  function apply() {
    var q = norm(state.q), words = q ? q.split(' ') : [];
    filtered = items.filter(function (it) {
      if (state.src && it.src !== state.src) return false;
      if (state.grp && it.grp !== state.grp) return false;
      if (state.sec && it.sec.indexOf(state.sec) < 0) return false;
      for (var i = 0; i < words.length; i++) if (it.hay.indexOf(words[i]) < 0) return false;
      return true;
    });
    var by = state.sort;
    filtered.sort(function (a, b) {
      if (by === 'code') return String(a.code || '~').localeCompare(String(b.code || '~'), 'en', { numeric: true });
      if (by === 'size') return volume(b) - volume(a);
      return a.name.localeCompare(b.name, 'fa');
    });
    shown = PAGE; render();
  }

  function card(it) {
    var d = dimsText(it), p = power(it), inCmp = compare.indexOf(it.id) >= 0;
    var specs = (d ? '<span>' + ICON.ruler + esc(d) + '</span>' : '') + (it.wt ? '<span>' + ICON.weight + esc(fa.format(it.wt)) + ' kg</span>' : '') + (p ? '<span>' + ICON.bolt + esc(p) + '</span>' : '');
    return '<article class="pc" data-id="' + esc(it.id) + '">' +
      '<button type="button" class="pc-img' + (it.img ? '' : ' noimg') + '" data-open="' + esc(it.id) + '" aria-label="جزئیات ' + esc(it.name) + '">' +
        (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + ICON.cube +
        '<span class="pc-brand" data-brand="' + esc(it.src) + '"><i></i>' + esc(srcLabel(it.src)) + '</span></button>' +
      '<div class="pc-body"><h2 class="pc-name">' + esc(it.name) + '</h2>' +
        '<div class="pc-meta">' + (it.code ? '<span class="pc-code">' + esc(it.code) + '</span>' : '') + (it.cat ? '<span class="pc-chip">' + esc(it.cat) + '</span>' : '') + '</div>' +
        (specs ? '<div class="pc-spec">' + specs + '</div>' : '') + '</div>' +
      '<div class="pc-foot"><button type="button" class="pc-btn" data-cmp="' + esc(it.id) + '" aria-pressed="' + inCmp + '" aria-label="مقایسه">' + (inCmp ? ICON.check : ICON.plus) + '</button>' +
        '<button type="button" class="pc-btn" data-open="' + esc(it.id) + '" aria-label="جزئیات">' + ICON.open + '</button></div></article>';
  }

  function render() {
    var grid = $('catGrid');
    grid.innerHTML = filtered.slice(0, shown).map(card).join('');
    $('catCount').textContent = faInt.format(filtered.length) + ' / ' + faInt.format(items.length);
    $('catEmpty').hidden = filtered.length > 0;
    var more = filtered.length - shown;
    $('catMore').hidden = more <= 0;
    $('catMoreText').textContent = more > 0 ? faInt.format(more) : '';
    // broken images fall back to the placeholder icon
    grid.querySelectorAll('.pc-img img').forEach(function (img) {
      img.addEventListener('error', function () { img.parentNode.classList.add('noimg'); }, { once: true });
    });
  }

  function trayRender() {
    var tray = $('cmpTray');
    tray.hidden = compare.length === 0;
    $('cmpThumbs').innerHTML = compare.map(function (id) { var it = byId[id]; return '<span style="background-image:url(\'' + esc(it.img) + '\')" title="' + esc(it.name) + '"></span>'; }).join('');
    $('cmpCount').textContent = faInt.format(compare.length);
    $('cmpOpen').disabled = compare.length < 2;
  }
  function toggleCompare(id) {
    var i = compare.indexOf(id);
    if (i >= 0) compare.splice(i, 1);
    else { if (compare.length >= MAX_COMPARE) compare.shift(); compare.push(id); }
    trayRender();
    document.querySelectorAll('[data-cmp]').forEach(function (b) {
      var on = compare.indexOf(b.getAttribute('data-cmp')) >= 0;
      b.setAttribute('aria-pressed', String(on)); b.innerHTML = on ? ICON.check : ICON.plus;
    });
  }

  var dialog = $('catDialog');
  function openDialog(html) {
    dialog.innerHTML = html;
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  }
  function detail(id) {
    var it = byId[id]; if (!it) return;
    var rows = [];
    if (it.code) rows.push(['کد', '<span dir="ltr">' + esc(it.code) + '</span>']);
    if (it.grp) rows.push(['گروه', esc(it.grp)]);
    if (it.cat) rows.push(['دسته', esc(it.cat)]);
    var d = dimsText(it); if (d) rows.push(['ابعاد (طول × عرض × ارتفاع)', '<span dir="ltr">' + esc(d) + '</span>']);
    if (it.wt) rows.push(['وزن', '<span dir="ltr">' + esc(fa.format(it.wt)) + ' kg</span>']);
    it.specs.forEach(function (s) { rows.push([esc(s[0]), esc(s[1])]); });
    var on = compare.indexOf(it.id) >= 0;
    openDialog(
      '<div class="dlg-bar"><h2 id="dlgName">' + esc(it.name) + '</h2><button type="button" class="dlg-x" data-close aria-label="بستن">' + ICON.close + '</button></div>' +
      '<div class="dlg-body"><div><div class="dlg-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" referrerpolicy="no-referrer">' : ICON.cube) + '</div></div>' +
      '<div><div class="dlg-tags"><span class="pc-brand" data-brand="' + esc(it.src) + '" style="position:static"><i></i>' + esc(srcLabel(it.src)) + '</span>' + it.sec.map(function (s) { return '<span class="pc-chip">' + esc(s) + '</span>'; }).join('') + '</div>' +
      '<table class="dlg-specs"><tbody>' + rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>'; }).join('') + '</tbody></table>' +
      (it.desc ? '<p class="dlg-desc">' + esc(it.desc) + '</p>' : '') +
      '<div class="dlg-actions"><button type="button" data-cmp-dlg="' + esc(it.id) + '" class="alt" aria-label="مقایسه">' + (on ? ICON.check : ICON.plus) + '</button>' +
      (it.url ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener" aria-label="صفحه محصول در سایت">' + ICON.open + '</a>' : '') + '</div></div></div>');
  }
  function compareView() {
    var list = compare.map(function (id) { return byId[id]; });
    var keys = [];
    list.forEach(function (it) { it.specs.forEach(function (s) { if (keys.indexOf(s[0]) < 0) keys.push(s[0]); }); });
    var fixed = [
      ['برند', function (it) { return srcLabel(it.src); }], ['کد', function (it) { return it.code; }], ['گروه', function (it) { return it.grp; }], ['دسته', function (it) { return it.cat; }],
      ['ابعاد (cm)', function (it) { return dimsText(it).replace(' cm', ''); }], ['وزن (kg)', function (it) { return it.wt ? fa.format(it.wt) : ''; }]
    ].concat(keys.map(function (k) { return [k, function (it) { var s = it.specs.filter(function (x) { return x[0] === k; })[0]; return s ? s[1] : ''; }]; }));
    var head = '<tr><th></th>' + list.map(function (it) { return '<th>' + (it.img ? '<img src="' + esc(it.img) + '" alt="" referrerpolicy="no-referrer">' : '') + '<div>' + esc(it.name) + '</div></th>'; }).join('') + '</tr>';
    var body = fixed.map(function (f) {
      var vals = list.map(f[1]);
      if (!vals.some(Boolean)) return '';
      var diff = new Set(vals.map(String)).size > 1;
      return '<tr><th>' + esc(f[0]) + '</th>' + vals.map(function (v) { return '<td' + (diff ? ' class="diff"' : '') + '>' + (v ? esc(v) : '—') + '</td>'; }).join('') + '</tr>';
    }).join('');
    openDialog('<div class="dlg-bar"><h2 id="dlgName">مقایسه محصولات</h2><button type="button" class="dlg-x" data-close aria-label="بستن">' + ICON.close + '</button></div>' +
      '<div class="cmp-wrap"><table class="cmp-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>');
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-cmp],[data-cmp-dlg],[data-close],[data-src]');
    if (e.target === dialog) { dialog.close(); return; }
    if (!t) return;
    if (t.hasAttribute('data-open')) detail(t.getAttribute('data-open'));
    else if (t.hasAttribute('data-cmp')) toggleCompare(t.getAttribute('data-cmp'));
    else if (t.hasAttribute('data-cmp-dlg')) { toggleCompare(t.getAttribute('data-cmp-dlg')); detail(t.getAttribute('data-cmp-dlg')); }
    else if (t.hasAttribute('data-close')) dialog.close();
    else if (t.closest('#catSources')) {
      state.src = t.getAttribute('data-src');
      $('catSources').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-src') === state.src)); });
      apply();
    }
  });
  var timer = 0;
  $('catSearch').addEventListener('input', function (e) { clearTimeout(timer); timer = setTimeout(function () { state.q = e.target.value; apply(); }, 120); });
  $('catGroup').addEventListener('change', function (e) { state.grp = e.target.value; apply(); });
  $('catSector').addEventListener('change', function (e) { state.sec = e.target.value; apply(); });
  $('catSort').addEventListener('change', function (e) { state.sort = e.target.value; apply(); });
  $('catReset').addEventListener('click', function () {
    state = { q: '', src: '', grp: '', sec: '', sort: 'name' };
    $('catSearch').value = ''; $('catGroup').value = ''; $('catSector').value = ''; $('catSort').value = 'name';
    $('catSources').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-src') === '')); });
    apply();
  });
  $('catMore').addEventListener('click', function () { shown += PAGE; render(); });
  $('cmpOpen').addEventListener('click', compareView);
  $('cmpClear').addEventListener('click', function () { compare.slice().forEach(toggleCompare); });

  fetch('./assets/catalog.json?v=20261019', { cache: 'default' }).then(function (r) { return r.json(); }).then(function (json) {
    data = json; items = json.items; build(); apply();
  }).catch(function () { $('catEmpty').hidden = false; });
})();
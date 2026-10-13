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
    compare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3m8-18h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 2v20"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6M7 18H4v-7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v7h-3M7 14h10v7H7z"/></svg>',
    cube: '<svg class="ph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7.5 4.3 9 5.2M21 8v8a2 2 0 0 1-1 1.7l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8ZM3.3 7 12 12l8.7-5M12 22V12"/></svg>'
  };
  var MAX_COMPARE = 4, PAGE = 48;
  var fa = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
  var faInt = new Intl.NumberFormat('fa-IR');
  var data = null, items = [], byId = {}, filtered = [], shown = PAGE;
  var state = { q: '', src: '', grp: '', sec: '', sort: 'name' };
  var compare = [];
  var STORE = 'ms-proforma-v1';
  var inv = { lines: [], docNo: '', issuer: '', customer: '', discount: 0, discMode: 'pct', tax: 10, unit: 'تومان' };
  var invDate = '';
  try { var saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && Array.isArray(saved.lines)) inv = Object.assign(inv, saved); } catch (e) { /* storage unavailable: the draft lives for this visit only */ }
  function invSave() { try { localStorage.setItem(STORE, JSON.stringify(inv)); } catch (e) { /* ignore */ } }
  function invLine(id) { return inv.lines.filter(function (l) { return l.id === id; })[0]; }
  function parseNum(v) {
    return Number(String(v == null ? '' : v).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; })
      .replace(/٫/g, '.').replace(/[^0-9.]/g, '')) || 0;
  }

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
    var gridIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
    src.innerHTML = order.map(function (o) {
      var share = items.length ? Math.round(o[2] / items.length * 100) : 0;
      return '<button type="button" class="bt" data-src="' + o[0] + '" data-brand="' + (o[0] || 'all') + '" aria-pressed="' + (o[0] === state.src) + '" aria-label="' + esc(o[1]) + ' ' + faInt.format(o[2]) + '">' +
        '<span class="bt-ico">' + (o[0] ? '<i></i>' : gridIcon) + '</span>' +
        '<span class="bt-name"' + (o[0] ? ' dir="ltr"' : '') + '>' + esc(o[1]) + '</span>' +
        '<b class="bt-n">' + faInt.format(o[2]) + '</b>' +
        '<span class="bt-bar"><span style="width:' + share + '%"></span></span></button>';
    }).join('');
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
    document.body.setAttribute('data-brand', state.src);
    if (!state.src) document.body.removeAttribute('data-brand');
    shown = PAGE; render();
  }

  function card(it) {
    var d = dimsText(it), p = power(it), inCmp = compare.indexOf(it.id) >= 0, inInv = !!invLine(it.id);
    var specs = (d ? '<span>' + ICON.ruler + esc(d) + '</span>' : '') + (it.wt ? '<span>' + ICON.weight + esc(fa.format(it.wt)) + ' kg</span>' : '') + (p ? '<span>' + ICON.bolt + esc(p) + '</span>' : '');
    return '<article class="pc" data-id="' + esc(it.id) + '">' +
      '<button type="button" class="pc-img' + (it.img ? '' : ' noimg') + '" data-open="' + esc(it.id) + '" aria-label="جزئیات ' + esc(it.name) + '">' +
        (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + ICON.cube +
        '<span class="pc-brand" data-brand="' + esc(it.src) + '"><i></i>' + esc(srcLabel(it.src)) + '</span></button>' +
      '<div class="pc-body"><h2 class="pc-name">' + esc(it.name) + '</h2>' +
        '<div class="pc-meta">' + (it.code ? '<span class="pc-code">' + esc(it.code) + '</span>' : '') + (it.cat ? '<span class="pc-chip">' + esc(it.cat) + '</span>' : '') + '</div>' +
        (specs ? '<div class="pc-spec">' + specs + '</div>' : '') + '</div>' +
      '<div class="pc-foot"><button type="button" class="pc-btn" data-inv="' + esc(it.id) + '" aria-pressed="' + inInv + '" aria-label="افزودن به پیش‌فاکتور" title="افزودن به پیش‌فاکتور">' + (inInv ? ICON.check : ICON.plus) + '</button>' +
        '<button type="button" class="pc-btn" data-cmp="' + esc(it.id) + '" aria-pressed="' + inCmp + '" aria-label="مقایسه" title="مقایسه">' + ICON.compare + '</button>' +
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
    tray.hidden = compare.length === 0 && inv.lines.length === 0;
    $('cmpGroup').hidden = compare.length === 0;
    $('invOpen').hidden = inv.lines.length === 0;
    $('invCount').textContent = faInt.format(inv.lines.length);
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
      b.setAttribute('aria-pressed', String(compare.indexOf(b.getAttribute('data-cmp')) >= 0));
    });
  }
  function toggleInvoice(id) {
    var l = invLine(id);
    if (l) inv.lines.splice(inv.lines.indexOf(l), 1); else inv.lines.push({ id: id, qty: 1, price: 0 });
    invSave(); trayRender(); invButtons();
  }
  function invButtons() {
    document.querySelectorAll('[data-inv]').forEach(function (b) {
      var on = !!invLine(b.getAttribute('data-inv'));
      b.setAttribute('aria-pressed', String(on)); b.innerHTML = on ? ICON.check : ICON.plus;
    });
  }

  var dialog = $('catDialog');
  function openDialog(html, cls) {
    dialog.className = 'cat-dialog' + (cls ? ' ' + cls : '');
    dialog.innerHTML = html;
    if (dialog.open) return;
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
      '<div class="dlg-actions"><button type="button" data-inv-dlg="' + esc(it.id) + '" aria-pressed="' + !!invLine(it.id) + '">' + (invLine(it.id) ? ICON.check : ICON.plus) + '<span>' + (invLine(it.id) ? 'در پیش‌فاکتور' : 'افزودن به پیش‌فاکتور') + '</span></button>' +
      '<button type="button" data-cmp-dlg="' + esc(it.id) + '" class="alt" aria-label="مقایسه" aria-pressed="' + on + '">' + ICON.compare + '</button>' +
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

  var UNITS = ['تومان', 'ریال'];
  function totals() {
    var sub = 0;
    inv.lines.forEach(function (l) { sub += (l.qty || 0) * (l.price || 0); });
    var disc = inv.discMode === 'pct' ? sub * Math.min(inv.discount || 0, 100) / 100 : Math.min(inv.discount || 0, sub);
    var net = sub - disc, tax = net * (inv.tax || 0) / 100;
    return { sub: sub, disc: disc, net: net, tax: tax, total: net + tax };
  }
  function money(n) { return faInt.format(Math.round(n)) + ' ' + inv.unit; }
  function today() { try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return ''; } }
  function invTotalsRender() {
    var t = totals();
    Object.keys(t).forEach(function (k) { var el = dialog.querySelector('[data-t=' + k + ']'); if (el) el.textContent = money(t[k]); });
    Array.prototype.forEach.call(dialog.querySelectorAll('.inv-row'), function (row) {
      var l = inv.lines[Number(row.getAttribute('data-i'))];
      if (l) row.querySelector('[data-sum]').textContent = money((l.qty || 0) * (l.price || 0));
    });
  }
  function invoiceView() {
    if (!invDate) invDate = today();
    var rows = inv.lines.map(function (l, i) {
      var it = byId[l.id];
      return '<li class="inv-row" data-i="' + i + '"><div class="inv-item"><b>' + esc(it.name) + '</b>' + (it.code ? '<small dir="ltr">' + esc(it.code) + '</small>' : '') + '</div>' +
        '<button type="button" class="dlg-x" data-inv-rm="' + i + '" aria-label="حذف از پیش‌فاکتور">' + ICON.trash + '</button>' +
        '<label>تعداد<input type="text" inputmode="numeric" data-f="qty" value="' + esc(faInt.format(l.qty || 0)) + '"></label>' +
        '<label>قیمت واحد<input type="text" inputmode="numeric" data-f="price" placeholder="۰" value="' + (l.price ? esc(faInt.format(l.price)) : '') + '"></label>' +
        '<output class="inv-sum" data-sum></output></li>';
    }).join('');
    var has = inv.lines.length > 0;
    var body = has ? '<ul class="inv-list">' + rows + '</ul>' +
      '<div class="inv-adj"><label>تخفیف<span class="inv-pair"><input type="text" inputmode="decimal" data-f="discount" placeholder="۰" value="' + (inv.discount ? esc(fa.format(inv.discount)) : '') + '">' +
        '<select data-f="discMode" aria-label="نوع تخفیف"><option value="pct"' + (inv.discMode === 'pct' ? ' selected' : '') + '>٪</option><option value="amt"' + (inv.discMode === 'amt' ? ' selected' : '') + '>مبلغ</option></select></span></label>' +
        '<label>مالیات بر ارزش افزوده (٪)<input type="text" inputmode="decimal" data-f="tax" value="' + esc(fa.format(inv.tax || 0)) + '"></label></div>' +
      '<dl class="inv-totals"><div><dt>جمع کل</dt><dd data-t="sub"></dd></div><div><dt>تخفیف</dt><dd data-t="disc"></dd></div><div><dt>پس از تخفیف</dt><dd data-t="net"></dd></div>' +
        '<div><dt>مالیات</dt><dd data-t="tax"></dd></div></dl>'
      : '<p class="inv-empty">پیش‌فاکتور خالی است. با دکمهٔ + روی هر محصول، آن را اضافه کنید.</p>';
    var foot = has ? '<div class="inv-foot"><div class="inv-pay"><span>مبلغ قابل پرداخت</span><b data-t="total"></b></div>' +
      '<div class="inv-actions"><button type="button" class="inv-clear" data-inv-clear aria-label="پاک‌کردن پیش‌فاکتور" title="پاک‌کردن پیش‌فاکتور">' + ICON.trash + '</button>' +
      '<button type="button" class="inv-pdf" data-inv-print>' + ICON.print + '<span>دریافت PDF</span></button></div></div>' : '';
    openDialog('<div class="dlg-bar"><h2 id="dlgName">پیش‌فاکتور</h2><button type="button" class="dlg-x" data-close aria-label="بستن">' + ICON.close + '</button></div>' +
      '<div class="inv-body"><div class="inv-meta">' +
        '<label class="wide">صادرکننده (ویزیتور)<input type="text" data-f="issuer" value="' + esc(inv.issuer) + '" autocomplete="name" placeholder="نام و نام خانوادگی"></label>' +
        '<label class="wide">مشتری<input type="text" data-f="customer" value="' + esc(inv.customer) + '" autocomplete="off" placeholder="نام مشتری"></label>' +
        '<label>شماره سند<input type="text" inputmode="text" dir="ltr" data-f="docNo" value="' + esc(inv.docNo) + '" placeholder="خودکار" autocomplete="off"></label>' +
        '<label>تاریخ<input type="text" data-f="date" value="' + esc(invDate) + '"></label>' +
        '<label>واحد پول<select data-f="unit">' + UNITS.map(function (u) { return '<option' + (u === inv.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label></div>' + body + '</div>' + foot, 'inv-sheet');
    invTotalsRender();
  }
  var ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  var TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  var HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  var SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'هزار میلیارد'];
  function words3(n) {
    var p = [], h = Math.floor(n / 100), r = n % 100;
    if (h) p.push(HUNDREDS[h]);
    if (r < 20) { if (r) p.push(ONES[r]); } else { p.push(TENS[Math.floor(r / 10)]); if (r % 10) p.push(ONES[r % 10]); }
    return p.join(' و ');
  }
  function numWords(n) {
    n = Math.round(n);
    if (!n) return 'صفر';
    var groups = [];
    for (var i = 0; n > 0 && i < SCALES.length; i++, n = Math.floor(n / 1000)) {
      var g = n % 1000;
      if (g) groups.unshift(i === 0 ? words3(g) : (g === 1 && i === 1 ? '' : words3(g) + ' ') + SCALES[i]);
    }
    return groups.join(' و ');
  }
  // PF-<yymmdd Jalali>-<running number>; assigned once per invoice and kept until the draft is cleared
  function nextDocNo() {
    var parts = [], seq = 1;
    try { parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); } catch (e) { /* fall back to a timestamp */ }
    var part = function (type) { var x = parts.filter(function (p) { return p.type === type; })[0]; return x ? x.value.replace(/\D/g, '') : ''; };
    var ymd = (part('year').slice(-2) + part('month') + part('day')) || String(Date.now()).slice(-6);
    try { seq = (Number(localStorage.getItem('ms-proforma-seq')) || 0) + 1; localStorage.setItem('ms-proforma-seq', String(seq)); } catch (e) { /* ignore */ }
    return 'PF-' + ymd + '-' + ('00' + seq).slice(-3);
  }
  function invPrint() {
    if (!inv.docNo) { inv.docNo = nextDocNo(); invSave(); var field = dialog.querySelector('[data-f=docNo]'); if (field) field.value = inv.docNo; }
    var t = totals();
    var rows = inv.lines.map(function (l, i) {
      var it = byId[l.id];
      return '<tr><td>' + faInt.format(i + 1) + '</td><td dir="ltr">' + esc(it.code) + '</td><td class="ip-name">' + esc(it.name) + '</td><td>' + esc(srcLabel(it.src)) + '</td><td>' + faInt.format(l.qty || 0) + '</td><td>' + faInt.format(l.price || 0) + '</td><td>' + faInt.format(Math.round((l.qty || 0) * (l.price || 0))) + '</td></tr>';
    }).join('');
    var date = esc(invDate || today());
    $('invPrint').innerHTML = '<table class="ip-frame"><thead><tr><td>' +
        '<div class="ip-top"><div class="ip-brand"><img src="./assets/branding/maxsilver-logo.svg" alt="مکث سیلور · MAX SILVER" width="175" height="30"></div>' +
        '<dl class="ip-ref"><div><dt>شماره سند:</dt><dd dir="ltr">' + esc(inv.docNo) + '</dd></div><div><dt>تاریخ:</dt><dd>' + date + '</dd></div></dl></div>' +
      '</td></tr></thead><tbody><tr><td>' +
        '<h1>پیش‌فاکتور</h1>' +
        '<p class="ip-line"><strong>مشتری:</strong> ' + esc(inv.customer || '—') + '</p>' +
        '<p class="ip-line"><strong>صادرکننده (ویزیتور):</strong> ' + esc(inv.issuer || '—') + '</p>' +
        '<table class="ip-items"><thead><tr><th>ردیف</th><th>کد</th><th>شرح کالا</th><th>برند</th><th>تعداد</th><th>قیمت واحد (' + esc(inv.unit) + ')</th><th>قیمت کل (' + esc(inv.unit) + ')</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<table class="ip-totals"><tbody><tr><td>جمع کل</td><td>' + money(t.sub) + '</td></tr><tr><td>تخفیف</td><td>' + money(t.disc) + '</td></tr><tr><td>مبلغ پس از تخفیف</td><td>' + money(t.net) + '</td></tr>' +
        '<tr><td>مالیات بر ارزش افزوده (' + esc(fa.format(inv.tax || 0)) + '٪)</td><td>' + money(t.tax) + '</td></tr><tr class="grand"><td>مبلغ قابل پرداخت</td><td>' + money(t.total) + '</td></tr></tbody></table>' +
        '<p class="ip-words"><strong>مبلغ به حروف:</strong> ' + esc(numWords(t.total)) + ' ' + esc(inv.unit) + '</p>' +
        '<div class="ip-sign"><div><b>امضا و تاریخ صادرکننده</b></div><div><b>امضا و تاریخ مشتری</b></div></div>' +
      '</td></tr></tbody><tfoot><tr><td><div class="ip-foot">پیش‌فاکتور | مکث سیلور' + (inv.docNo ? ' | ' + esc(inv.docNo) : '') + '</div></td></tr></tfoot></table>';
    document.body.classList.add('inv-print');
    window.print();
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('inv-print'); });
  // live Persian digits + thousands separators while typing; the caret stays after the same digit
  function liveFormat(input) {
    var raw = input.value, pos = input.selectionStart == null ? raw.length : input.selectionStart;
    var ascii = function (t) {
      return t.replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[٫,]/g, '.');
    };
    var keep = function (t) { return ascii(t).replace(/[^0-9.]/g, ''); };
    var before = keep(raw.slice(0, pos)).length;
    var clean = keep(raw), dot = clean.indexOf('.');
    var intPart = (dot < 0 ? clean : clean.slice(0, dot)).replace(/\./g, ''), frac = dot < 0 ? null : clean.slice(dot + 1).replace(/\./g, '');
    var grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
    var out = (grouped + (frac === null ? '' : '٫' + frac)).replace(/[0-9]/g, function (d) { return String.fromCharCode(1776 + Number(d)); });
    if (out === raw) return;
    var idx = 0, seen = 0;
    while (idx < out.length && seen < before) { if (/[۰-۹٫]/.test(out[idx])) seen++; idx++; }
    input.value = out;
    try { input.setSelectionRange(idx, idx); } catch (err) { /* not supported for this input */ }
  }
  dialog.addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f'); if (!f) return;
    if (e.target.tagName === 'INPUT' && /^(qty|price|discount|tax)$/.test(f)) liveFormat(e.target);
    var row = e.target.closest('.inv-row'), l = row && inv.lines[Number(row.getAttribute('data-i'))];
    if (l && (f === 'qty' || f === 'price')) l[f] = parseNum(e.target.value);
    else if (f === 'docNo' || f === 'issuer' || f === 'customer' || f === 'unit' || f === 'discMode') inv[f] = e.target.value;
    else if (f === 'date') invDate = e.target.value;
    else if (f === 'discount' || f === 'tax') inv[f] = parseNum(e.target.value);
    invSave(); invTotalsRender();
  });
  dialog.addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f');
    if (f === 'price' || f === 'qty') { var v = parseNum(e.target.value); e.target.value = v ? faInt.format(v) : ''; }
    if (f === 'unit' || f === 'discMode') { inv[f] = e.target.value; invSave(); invTotalsRender(); }
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-cmp],[data-cmp-dlg],[data-inv],[data-inv-dlg],[data-inv-rm],[data-inv-print],[data-inv-clear],[data-close],[data-src]');
    if (e.target === dialog) { dialog.close(); return; }
    if (!t) return;
    if (t.hasAttribute('data-open')) detail(t.getAttribute('data-open'));
    else if (t.hasAttribute('data-cmp')) toggleCompare(t.getAttribute('data-cmp'));
    else if (t.hasAttribute('data-cmp-dlg')) { toggleCompare(t.getAttribute('data-cmp-dlg')); detail(t.getAttribute('data-cmp-dlg')); }
    else if (t.hasAttribute('data-inv')) toggleInvoice(t.getAttribute('data-inv'));
    else if (t.hasAttribute('data-inv-dlg')) { toggleInvoice(t.getAttribute('data-inv-dlg')); detail(t.getAttribute('data-inv-dlg')); }
    else if (t.hasAttribute('data-inv-rm')) { inv.lines.splice(Number(t.getAttribute('data-inv-rm')), 1); invSave(); trayRender(); invButtons(); invoiceView(); }
    else if (t.hasAttribute('data-inv-print')) invPrint();
    else if (t.hasAttribute('data-inv-clear')) { if (window.confirm('همهٔ ردیف‌های پیش‌فاکتور پاک شود؟')) { inv.lines = []; inv.docNo = ''; invSave(); trayRender(); invButtons(); invoiceView(); } }
    else if (t.hasAttribute('data-close')) dialog.close();
    else if (t.closest('#catSources')) {
      state.src = t.getAttribute('data-src');
      $('catSources').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-src') === state.src)); });
      apply();
    }
  });
  // Estedad dropdowns: the native <select> popup ignores page fonts, so each select is mirrored by a styled listbox
  var menus = [];
  function openMenu(m, on) {
    menus.forEach(function (x) { if (x !== m || !on) { x.list.hidden = true; x.btn.setAttribute('aria-expanded', 'false'); } });
    if (on) { m.list.hidden = false; m.btn.setAttribute('aria-expanded', 'true'); var cur = m.list.querySelector('[aria-selected=true]'); if (cur) cur.scrollIntoView({ block: 'nearest' }); }
  }
  function syncMenu(m) {
    var o = m.sel.options[m.sel.selectedIndex];
    m.label.textContent = o ? o.textContent : '';
    Array.prototype.forEach.call(m.list.children, function (li) { li.setAttribute('aria-selected', String(li.getAttribute('data-v') === m.sel.value)); });
  }
  function enhance(sel) {
    var wrap = sel.parentNode, btn = document.createElement('button'), list = document.createElement('ul'), label = document.createElement('span');
    btn.type = 'button'; btn.className = 'cs-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', sel.getAttribute('aria-label') || '');
    label.className = 'cs-label'; btn.appendChild(label);
    btn.insertAdjacentHTML('beforeend', '<svg class="cs-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>');
    list.className = 'cs-list'; list.setAttribute('role', 'listbox'); list.hidden = true;
    list.innerHTML = Array.prototype.map.call(sel.options, function (o) { return '<li role="option" tabindex="-1" data-v="' + esc(o.value) + '">' + esc(o.textContent) + '</li>'; }).join('');
    sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
    wrap.appendChild(btn); wrap.appendChild(list);
    var m = { sel: sel, btn: btn, list: list, label: label }; menus.push(m); syncMenu(m);
    btn.addEventListener('click', function (e) { e.preventDefault(); openMenu(m, list.hidden); });
    list.addEventListener('click', function (e) {
      var li = e.target.closest('li'); if (!li) return;
      sel.value = li.getAttribute('data-v'); sel.dispatchEvent(new Event('change', { bubbles: true })); syncMenu(m); openMenu(m, false); btn.focus();
    });
    list.addEventListener('keydown', function (e) {
      var li = document.activeElement, n = null;
      if (e.key === 'ArrowDown') n = li.nextElementSibling || li; else if (e.key === 'ArrowUp') n = li.previousElementSibling || li;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); return; }
      else if (e.key === 'Escape') { openMenu(m, false); btn.focus(); return; }
      if (n) { e.preventDefault(); n.focus(); }
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu(m, true); (list.querySelector('[aria-selected=true]') || list.firstChild).focus(); }
      else if (e.key === 'Escape') openMenu(m, false);
    });
  }
  document.addEventListener('click', function (e) { if (!e.target.closest('.cat-select')) openMenu(null, false); });
  function syncMenus() { menus.forEach(syncMenu); }

  var timer = 0;
  $('catSearch').addEventListener('input', function (e) { clearTimeout(timer); timer = setTimeout(function () { state.q = e.target.value; apply(); }, 120); });
  $('catGroup').addEventListener('change', function (e) { state.grp = e.target.value; apply(); });
  $('catSector').addEventListener('change', function (e) { state.sec = e.target.value; apply(); });
  $('catSort').addEventListener('change', function (e) { state.sort = e.target.value; apply(); });
  $('catReset').addEventListener('click', function () {
    state = { q: '', src: '', grp: '', sec: '', sort: 'name' };
    $('catSearch').value = ''; $('catGroup').value = ''; $('catSector').value = ''; $('catSort').value = 'name'; syncMenus();
    $('catSources').querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-src') === '')); });
    apply();
  });
  $('catMore').addEventListener('click', function () { shown += PAGE; render(); });
  $('cmpOpen').addEventListener('click', compareView);
  $('invOpen').addEventListener('click', invoiceView);
  $('cmpClear').addEventListener('click', function () { compare.slice().forEach(toggleCompare); });

  fetch('./assets/catalog.json?v=20261106', { cache: 'default' }).then(function (r) { return r.json(); }).then(function (json) {
    data = json; items = json.items; build();
    inv.lines = inv.lines.filter(function (l) { return byId[l.id]; });
    trayRender();
    ['catGroup', 'catSector', 'catSort'].forEach(function (id) { enhance($(id)); });
    apply();
  }).catch(function () { $('catEmpty').hidden = false; });
})();
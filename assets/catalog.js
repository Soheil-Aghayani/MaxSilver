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
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
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
  var inv = { lines: [], docNo: '', issuer: '', customer: '', discount: 0, discMode: 'pct', tax: 10, unit: 'تومان', pay: { mode: 'cash', cashVal: 50, cashUnit: 'pct', count: 1, cheques: [], custom: false } };
  var invDate = '';
  try { var saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && Array.isArray(saved.lines)) inv = Object.assign(inv, saved); } catch (e) { /* storage unavailable: the draft lives for this visit only */ }
  function invSave() { try { localStorage.setItem(STORE, JSON.stringify(inv)); } catch (e) { /* ignore */ } }
  var ARCH_KEY = 'ms-proforma-archive-v1', PRICE_KEY = 'ms-proforma-prices-v1';
  function loadJson(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function saveJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  var archive = loadJson(ARCH_KEY, []);
  if (!Array.isArray(archive)) archive = [];
  var prices = loadJson(PRICE_KEY, {});
  var foreign = []; // other visitors' proformas, visible to managers once signed in; never persisted locally
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
    var sb = $('catSearchBtn');
    if (sb) sb.classList.toggle('has-filter', !!(state.q || state.src || state.grp || state.sec));
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
    if (l) inv.lines.splice(inv.lines.indexOf(l), 1); else inv.lines.push({ id: id, qty: 1, price: prices[id] || 0 });
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
  function totalsOf(d) { return window.MSMath.totals(d); }
  function totals() { return totalsOf(inv); }
  function money(n, unit) { return faInt.format(Math.round(n)) + ' ' + (unit || inv.unit); }
  function today() { try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return ''; } }
  // ----- payment terms (cash / cheque / mixed) with Jalali due dates
  var JD = function () { return window.MSJDate; };
  function ensurePay() {
    if (!inv.pay || typeof inv.pay !== 'object' || !Array.isArray(inv.pay.cheques)) inv.pay = { mode: 'cash', cashVal: 50, cashUnit: 'pct', count: 1, cheques: [], custom: false };
    return inv.pay;
  }
  function paySplit() { return window.MSMath.payment(inv); }
  function payNormalize() {
    var p = ensurePay();
    if (p.mode === 'cash') return;
    var n = Math.max(1, Math.min(12, Math.round(p.count || 1))), s = paySplit(), J = JD();
    p.count = n;
    while (p.cheques.length < n) p.cheques.push({ amount: 0, date: '', dateSet: false });
    p.cheques.length = n;
    var base = J && J.parse(invDate) ? J.latin(invDate) : (J ? J.today() : '');
    p.cheques.forEach(function (c, i) { if (!c.dateSet && J) c.date = J.persian(J.addDays(base, 30 * (i + 1))); });
    if (!p.custom) {
      var each = Math.floor(s.cheque / n);
      p.cheques.forEach(function (c, i) { c.amount = i === n - 1 ? s.cheque - each * (n - 1) : each; });
    }
  }
  function payCopy() {
    var p = ensurePay();
    return { mode: p.mode, cashVal: p.cashVal || 0, cashUnit: p.cashUnit, count: p.count || 1, custom: !!p.custom,
      cheques: p.mode === 'cash' ? [] : p.cheques.map(function (c) { return { amount: c.amount || 0, date: c.date || '', dateSet: true }; }) };
  }
  function chequeCheck() {
    var p = ensurePay(), s = paySplit(), sum = 0;
    p.cheques.forEach(function (c) { sum += c.amount || 0; });
    var diff = s.cheque - sum;
    return diff === 0
      ? '<p class="pay-ok">مجموع چک‌ها با سهم چکی برابر است.</p>'
      : '<p class="pay-warn">مجموع چک‌ها ' + money(sum) + ' است و ' + money(Math.abs(diff)) + (diff > 0 ? ' کمتر' : ' بیشتر') + ' از سهم چکی (' + money(s.cheque) + ') است.' +
        ' <button type="button" class="pay-link" data-pay-equal>تقسیم مساوی</button></p>';
  }
  function payHtml() {
    var p = ensurePay(), s = paySplit(), isMixed = p.mode === 'mixed', hasCheque = p.mode !== 'cash';
    var seg = [['cash', 'نقدی'], ['cheque', 'چکی'], ['mixed', 'نقد و چک']].map(function (m) {
      return '<label><input type="radio" name="payMode" value="' + m[0] + '" data-pay-mode' + (p.mode === m[0] ? ' checked' : '') + '><span>' + m[1] + '</span></label>';
    }).join('');
    var h = '<h3>شرایط پرداخت</h3><div class="pay-seg" role="radiogroup" aria-label="نوع پرداخت">' + seg + '</div>';
    if (!hasCheque) return h + '<p class="pay-note">کل مبلغ <b>' + money(s.total) + '</b> نقداً پرداخت می‌شود.</p>';
    if (isMixed) {
      h += '<div class="pay-cash"><label>سهم نقد<input type="text" inputmode="decimal" data-f="cashVal" value="' + (p.cashVal ? esc((p.cashUnit === 'amt' ? faInt : fa).format(p.cashVal)) : '') + '" placeholder="۰"></label>' +
        '<div class="pay-seg small" role="radiogroup" aria-label="واحد سهم نقد">' +
        '<label><input type="radio" name="payUnit" value="pct" data-pay-unit' + (p.cashUnit !== 'amt' ? ' checked' : '') + '><span>درصد</span></label>' +
        '<label><input type="radio" name="payUnit" value="amt" data-pay-unit' + (p.cashUnit === 'amt' ? ' checked' : '') + '><span>' + esc(inv.unit) + '</span></label></div></div>';
    }
    h += '<p class="pay-sum" data-pay-sum>' + (isMixed ? 'نقد <b>' + money(s.cash) + '</b> · ' : '') + 'چک <b>' + money(s.cheque) + '</b></p>';
    h += '<div class="pay-count"><span>تعداد فقره چک</span><div class="pay-step"><button type="button" data-pay-count="-1" aria-label="کمتر">−</button><b>' + faInt.format(p.count) + '</b><button type="button" data-pay-count="1" aria-label="بیشتر">+</button></div></div>';
    h += '<ul class="pay-cheques">' + p.cheques.map(function (c, i) {
      return '<li><span class="pay-n">چک ' + faInt.format(i + 1) + '</span>' +
        '<label>مبلغ<input type="text" inputmode="numeric" data-f="chAmount" data-i="' + i + '" value="' + (c.amount ? esc(faInt.format(c.amount)) : '') + '" placeholder="۰"></label>' +
        '<label>تاریخ سررسید<input type="text" data-f="chDate" data-i="' + i + '" data-jdate readonly inputmode="none" value="' + esc(c.date || '') + '" placeholder="انتخاب تاریخ"></label></li>';
    }).join('') + '</ul><div data-pay-check>' + chequeCheck() + '</div>';
    return h;
  }
  function payRender() {
    var box = dialog.querySelector('#payBox');
    if (box) box.innerHTML = payHtml();
  }
  // keep amounts, dates and the summary in step without rebuilding the fields (the user may be typing in one of them)
  function payRefresh() {
    var box = dialog.querySelector('#payBox');
    if (!box) return;
    var p = ensurePay();
    payNormalize();
    if (p.mode === 'cash') { box.innerHTML = payHtml(); return; }
    var s = paySplit(), sum = box.querySelector('[data-pay-sum]');
    if (sum) sum.innerHTML = (p.mode === 'mixed' ? 'نقد <b>' + money(s.cash) + '</b> · ' : '') + 'چک <b>' + money(s.cheque) + '</b>';
    Array.prototype.forEach.call(box.querySelectorAll('[data-f=chAmount]'), function (el) {
      var c = p.cheques[Number(el.getAttribute('data-i'))];
      if (c && document.activeElement !== el) el.value = c.amount ? faInt.format(c.amount) : '';
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-f=chDate]'), function (el) {
      var c = p.cheques[Number(el.getAttribute('data-i'))];
      if (c) el.value = c.date || '';
    });
    var chk = box.querySelector('[data-pay-check]');
    if (chk) chk.innerHTML = chequeCheck();
  }
  function invTotalsRender() {
    var t = totals();
    Object.keys(t).forEach(function (k) { var el = dialog.querySelector('[data-t=' + k + ']'); if (el) el.textContent = money(t[k]); });
    Array.prototype.forEach.call(dialog.querySelectorAll('.inv-row'), function (row) {
      var l = inv.lines[Number(row.getAttribute('data-i'))];
      if (l) row.querySelector('[data-sum]').textContent = money((l.qty || 0) * (l.price || 0));
    });
    payRefresh();
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
        '<div><dt>مالیات</dt><dd data-t="tax"></dd></div></dl>' +
      '<section class="pay" id="payBox">' + (payNormalize(), payHtml()) + '</section>'
      : '<p class="inv-empty">پیش‌فاکتور خالی است. با دکمهٔ + روی هر محصول، آن را اضافه کنید.</p>';
    var foot = has ? '<div class="inv-foot"><p class="inv-msg" id="invMsg" role="status" hidden></p><div class="inv-pay"><span>مبلغ قابل پرداخت</span><b data-t="total"></b></div>' +
      '<div class="inv-actions"><button type="button" class="inv-clear" data-inv-clear aria-label="پاک‌کردن پیش‌فاکتور" title="پاک‌کردن پیش‌فاکتور">' + ICON.trash + '</button>' +
      '<button type="button" class="inv-pdf alt" data-inv-print>' + ICON.print + '<span>دریافت PDF</span></button>' +
      '<button type="button" class="inv-pdf" data-inv-share>' + ICON.share + '<span>ارسال</span></button></div></div>' : '';
    openDialog('<div class="dlg-bar"><h2 id="dlgName">پیش‌فاکتور</h2><button type="button" class="dlg-link" data-arc-open>سوابق</button><button type="button" class="dlg-x" data-close aria-label="بستن">' + ICON.close + '</button></div>' +
      '<div class="inv-body"><div class="inv-meta">' +
        '<label class="wide">صادرکننده (ویزیتور)<input type="text" data-f="issuer" value="' + esc(inv.issuer) + '" autocomplete="name" placeholder="نام و نام خانوادگی"></label>' +
        '<label class="wide">مشتری<input type="text" data-f="customer" list="custList" value="' + esc(inv.customer) + '" autocomplete="off" placeholder="نام مشتری"></label>' +
        '<datalist id="custList">' + customerNames().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
        '<label>شماره سند<input type="text" inputmode="text" dir="ltr" data-f="docNo" value="' + esc(inv.docNo) + '" placeholder="خودکار" autocomplete="off"></label>' +
        '<label>تاریخ<input type="text" data-f="date" data-jdate readonly inputmode="none" value="' + esc(invDate) + '"></label>' +
        '<label>واحد پول<select data-f="unit">' + UNITS.map(function (u) { return '<option' + (u === inv.unit ? ' selected' : '') + '>' + u + '</option>'; }).join('') + '</select></label></div>' + body + '</div>' + foot, 'inv-sheet');
    invTotalsRender();
    if (has) loadH2C().then(null, function () { /* offline: share falls back to print */ });
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
    var owner = window.MSSync ? window.MSSync.code() : '';
    return 'PF-' + ymd + (owner ? '-' + owner : '') + '-' + ('00' + seq).slice(-3);
  }
  function snapshot() {
    return {
      docNo: inv.docNo, date: invDate || today(), createdAt: Date.now(), customer: inv.customer, issuer: inv.issuer, unit: inv.unit,
      tax: inv.tax, discount: inv.discount, discMode: inv.discMode, pay: payCopy(),
      lines: inv.lines.filter(function (l) { return byId[l.id]; }).map(function (l) {
        var it = byId[l.id];
        return { id: l.id, name: it.name, code: it.code, brand: srcLabel(it.src), qty: l.qty || 0, price: l.price || 0 };
      })
    };
  }
  function payPrint(doc) {
    var p = doc.pay || { mode: 'cash' }, s = window.MSMath.payment(doc), u = doc.unit, rows = '';
    var pct = s.total ? Math.round(s.cash / s.total * 1000) / 10 : 0;
    var title = p.mode === 'cheque' ? 'چکی (' + faInt.format((p.cheques || []).length) + ' فقره)'
      : p.mode === 'mixed' ? faInt.format(pct) + '٪ نقد و ' + faInt.format(Math.round((100 - pct) * 10) / 10) + '٪ چک (' + faInt.format((p.cheques || []).length) + ' فقره)' : 'نقدی';
    if (p.mode !== 'cheque') rows += '<tr><td>نقد</td><td>' + faInt.format(s.cash) + '</td><td>—</td></tr>';
    if (p.mode !== 'cash') (p.cheques || []).forEach(function (c, i) { rows += '<tr><td>چک ' + faInt.format(i + 1) + '</td><td>' + faInt.format(c.amount || 0) + '</td><td>' + esc(c.date || '—') + '</td></tr>'; });
    return '<p class="ip-line ip-payline"><strong>نحوهٔ پرداخت:</strong> ' + title + '</p>' +
      '<table class="ip-pay"><thead><tr><th>پرداخت</th><th>مبلغ (' + esc(u) + ')</th><th>تاریخ سررسید</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function docHtml(doc) {
    var t = totalsOf(doc), u = doc.unit;
    var rows = doc.lines.map(function (l, i) {
      return '<tr><td>' + faInt.format(i + 1) + '</td><td dir="ltr">' + esc(l.code) + '</td><td class="ip-name">' + esc(l.name) + '</td><td>' + esc(l.brand) + '</td><td>' + faInt.format(l.qty || 0) + '</td><td>' + faInt.format(l.price || 0) + '</td><td>' + faInt.format(Math.round((l.qty || 0) * (l.price || 0))) + '</td></tr>';
    }).join('');
    return '<table class="ip-frame"><thead><tr><td>' +
        '<div class="ip-top"><div class="ip-brand"><img src="./assets/branding/maxsilver-logo.svg" alt="مکث سیلور · MAX SILVER" width="175" height="30"></div>' +
        '<dl class="ip-ref"><div><dt>شماره سند:</dt><dd dir="ltr">' + esc(doc.docNo) + '</dd></div><div><dt>تاریخ:</dt><dd>' + esc(doc.date) + '</dd></div></dl></div>' +
      '</td></tr></thead><tbody><tr><td>' +
        '<h1>پیش‌فاکتور</h1>' +
        '<p class="ip-line"><strong>مشتری:</strong> ' + esc(doc.customer || '—') + '</p>' +
        '<p class="ip-line"><strong>صادرکننده (ویزیتور):</strong> ' + esc(doc.issuer || '—') + '</p>' +
        '<table class="ip-items"><thead><tr><th>ردیف</th><th>کد</th><th>شرح کالا</th><th>برند</th><th>تعداد</th><th>قیمت واحد (' + esc(u) + ')</th><th>قیمت کل (' + esc(u) + ')</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<table class="ip-totals"><tbody><tr><td>جمع کل</td><td>' + money(t.sub, u) + '</td></tr><tr><td>تخفیف</td><td>' + money(t.disc, u) + '</td></tr><tr><td>مبلغ پس از تخفیف</td><td>' + money(t.net, u) + '</td></tr>' +
        '<tr><td>مالیات بر ارزش افزوده (' + esc(fa.format(doc.tax || 0)) + '٪)</td><td>' + money(t.tax, u) + '</td></tr><tr class="grand"><td>مبلغ قابل پرداخت</td><td>' + money(t.total, u) + '</td></tr></tbody></table>' +
        '<p class="ip-words"><strong>مبلغ به حروف:</strong> ' + esc(numWords(t.total)) + ' ' + esc(u) + '</p>' + payPrint(doc) +
        '<div class="ip-sign"><div><b>امضا و تاریخ صادرکننده</b></div><div><b>امضا و تاریخ مشتری</b></div></div>' +
      '</td></tr></tbody><tfoot><tr><td><div class="ip-foot">پیش‌فاکتور | مکث سیلور' + (doc.docNo ? ' | ' + esc(doc.docNo) : '') + '</div></td></tr></tfoot></table>';
  }
  function printDoc(doc) {
    $('invPrint').innerHTML = docHtml(doc);
    document.body.classList.add('inv-print');
    window.print();
  }
  function commitDoc() {
    if (!inv.docNo) { inv.docNo = nextDocNo(); invSave(); var field = dialog.querySelector('[data-f=docNo]'); if (field) field.value = inv.docNo; }
    var doc = snapshot();
    doc.updatedAt = Date.now();
    doc.synced = false;
    archive = archive.filter(function (d) { return d.docNo !== doc.docNo; });
    archive.unshift(doc);
    archive = archive.slice(0, 500);
    saveJson(ARCH_KEY, archive);
    if (window.MSSync) window.MSSync.push();
    return doc;
  }
  function invPrint() { printDoc(commitDoc()); }

  // ----- share / save the proforma as a real PDF file (one JPEG per A4 page inside a minimal PDF container)
  var H2C = './assets/vendor/html2canvas-1.4.1.min.js', PAGE_W = 794, PAGE_H = 1123, MARGIN = 45, SCALE = 2;
  var shareCache = { key: '', file: null }, sharing = false;
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = H2C; s.onload = function () { resolve(window.html2canvas); }; s.onerror = function () { reject(new Error('html2canvas')); };
      document.head.appendChild(s);
    });
  }
  function toJpeg(canvas) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) { if (!b) { reject(new Error('jpeg')); return; } b.arrayBuffer().then(function (ab) { resolve({ data: new Uint8Array(ab), w: canvas.width, h: canvas.height }); }); }, 'image/jpeg', 0.92);
    });
  }
  function buildPdf(pages) {
    var enc = new TextEncoder(), chunks = [], offs = [], pos = 0, total = 2 + pages.length * 3;
    var put = function (x) { var b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); pos += b.length; };
    var obj = function (n, parts) { offs[n] = pos; put(n + ' 0 obj\n'); parts.forEach(put); put('\nendobj\n'); };
    var kids = pages.map(function (_, i) { return (3 + i * 3) + ' 0 R'; }).join(' ');
    put('%PDF-1.4\n');
    obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
    obj(2, ['<< /Type /Pages /Count ' + pages.length + ' /Kids [' + kids + '] >>']);
    pages.forEach(function (p, i) {
      var page = 3 + i * 3, content = 4 + i * 3, img = 5 + i * 3, stream = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
      obj(page, ['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ' + img + ' 0 R >> >> /Contents ' + content + ' 0 R >>']);
      obj(content, ['<< /Length ' + stream.length + ' >>\nstream\n', stream, '\nendstream']);
      obj(img, ['<< /Type /XObject /Subtype /Image /Width ' + p.w + ' /Height ' + p.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + p.data.length + ' >>\nstream\n', p.data, '\nendstream']);
    });
    var xref = pos;
    put('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
    for (var i = 1; i <= total; i++) put(('0000000000' + offs[i]).slice(-10) + ' 00000 n \n');
    put('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
    return new Blob(chunks, { type: 'application/pdf' });
  }
  // draws the printed document off-screen, cuts the body at row boundaries into A4 pages, repeats header and footer on each
  function renderPages(doc) {
    return Promise.all([loadH2C(), document.fonts ? document.fonts.ready : null]).then(function () {
      var host = document.createElement('div');
      host.className = 'ip-cap';
      host.innerHTML = docHtml(doc);
      document.body.appendChild(host);
      var frame = host.querySelector('.ip-frame'), base = host.getBoundingClientRect().top;
      var rel = function (el) { var b = el.getBoundingClientRect(); return { t: b.top - base, b: b.bottom - base }; };
      var head = rel(frame.querySelector('thead')), foot = rel(frame.querySelector('tfoot')), cuts = [];
      Array.prototype.forEach.call(frame.querySelectorAll(':scope > tbody > tr > td > *, .ip-items tbody tr'), function (el) { if (!el.classList.contains('ip-payline')) cuts.push(rel(el).b); }); // a heading never ends a page
      var headH = head.b - head.t, footH = foot.b - foot.t, cap = PAGE_H - 2 * MARGIN - headH - footH, ranges = [], y = head.b, end = foot.t;
      if (end - y <= cap) ranges.push([y, end]);
      else {
        while (y < end - 0.5) {
          var lim = y + cap, cut = 0;
          if (end <= lim) cut = end;
          else { cuts.forEach(function (c) { if (c > y + 20 && c <= lim && c > cut) cut = c; }); if (!cut) cut = lim; }
          ranges.push([y, cut]); y = cut;
        }
      }
      return window.html2canvas(host, { scale: SCALE, backgroundColor: '#ffffff', logging: false, width: PAGE_W, windowWidth: PAGE_W }).then(function (canvas) {
        host.remove();
        var s = canvas.width / PAGE_W;
        return Promise.all(ranges.map(function (rg) {
          var c = document.createElement('canvas'), x;
          c.width = Math.round(PAGE_W * s); c.height = Math.round(PAGE_H * s);
          x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
          var draw = function (sy, sh, dy) { if (sh > 0) x.drawImage(canvas, 0, Math.round(sy * s), canvas.width, Math.round(sh * s), 0, Math.round(dy * s), canvas.width, Math.round(sh * s)); };
          draw(head.t, headH, MARGIN);
          draw(rg[0], rg[1] - rg[0], MARGIN + headH);
          draw(foot.t, footH, PAGE_H - MARGIN - footH);
          return toJpeg(c);
        }));
      }, function (e) { host.remove(); throw e; });
    }).then(buildPdf);
  }
  function pdfFile(doc) {
    var key = docHtml(doc);
    if (shareCache.key === key && shareCache.file) return Promise.resolve(shareCache.file);
    return renderPages(doc).then(function (blob) {
      var name = 'proforma-' + String(doc.docNo || 'draft').replace(/[^A-Za-z0-9._-]+/g, '_') + '.pdf';
      var file = new File([blob], name, { type: 'application/pdf' });
      shareCache = { key: key, file: file };
      return file;
    });
  }
  function saveFile(file) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function shareMsg(text, bad) {
    var m = dialog.querySelector('#invMsg');
    if (!m) return;
    m.textContent = text || ''; m.hidden = !text; m.className = 'inv-msg' + (bad ? ' bad' : '');
  }
  function shareDoc(doc, btn) {
    if (sharing) return;
    sharing = true;
    var label = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span>در حال ساخت PDF…</span>'; }
    shareMsg('');
    pdfFile(doc).then(function (file) {
      var data = { files: [file], title: 'پیش‌فاکتور ' + doc.docNo, text: 'پیش‌فاکتور مکث سیلور · ' + doc.docNo };
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        return navigator.share(data).then(null, function (e) {
          if (e && e.name === 'AbortError') return;
          if (e && e.name === 'NotAllowedError') { shareMsg('فایل آماده است؛ یک بار دیگر «ارسال» را بزنید.'); return; }
          saveFile(file); shareMsg('ارسال مستقیم ممکن نشد؛ فایل PDF روی دستگاه ذخیره شد.');
        });
      }
      saveFile(file); shareMsg('فایل PDF روی دستگاه ذخیره شد. می‌توانید آن را از پوشهٔ دانلودها ارسال کنید.');
    }).then(null, function () {
      shareMsg('ساخت PDF انجام نشد (برای بار اول به اینترنت نیاز است). از «دریافت PDF» استفاده کنید.', true);
    }).then(function () {
      sharing = false;
      if (btn) { btn.disabled = false; btn.innerHTML = label; }
    });
  }

  // ----- archive: saved proformas, customers and a portable backup of everything kept on this device
  var BACKUP_KEYS = [STORE, ARCH_KEY, PRICE_KEY, 'ms-proforma-seq', 'ms-ig-v1'];
  function customerNames() {
    var seen = {}, out = [];
    var me = window.MSSync ? window.MSSync.uid() : '';
    archive.forEach(function (d) { var n = (d.customer || '').trim(); if (n && !seen[n] && !(me && d.ownerUid && d.ownerUid !== me)) { seen[n] = 1; out.push(n); } });
    return out;
  }
  function archiveView() {
    var me = window.MSSync ? window.MSSync.uid() : '';
    var cards = archive.map(function (d, i) {
      if (me && d.ownerUid && d.ownerUid !== me) return ''; // another account's local copy on this shared device
      var t = totalsOf(d);
      return '<li class="arc-card" data-q="' + esc(norm([d.docNo, d.customer, d.issuer, d.date].join(' '))) + '">' +
        '<div class="arc-head"><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(d.date) + '</span></div>' +
        '<div class="arc-cust">' + esc(d.customer || 'بدون نام مشتری') + (d.issuer ? ' <small>· ' + esc(d.issuer) + '</small>' : '') + '</div>' +
        '<div class="arc-meta"><span>' + faInt.format(d.lines.length) + ' ردیف</span><b>' + money(t.total, d.unit) + '</b></div>' +
        '<div class="arc-actions"><button type="button" data-arc-edit="' + i + '">ویرایش</button><button type="button" data-arc-copy="' + i + '">کپی</button>' +
        '<button type="button" data-arc-pdf="' + i + '">PDF</button><button type="button" data-arc-share="' + i + '">ارسال</button><button type="button" class="danger" data-arc-del="' + i + '" aria-label="حذف">' + ICON.trash + '</button></div></li>';
    }).join('');
    var fcards = foreign.map(function (d, i) {
      var t = totalsOf(d);
      return '<li class="arc-card" data-q="' + esc(norm([d.docNo, d.customer, d.issuer, d.ownerName, d.date].join(' '))) + '">' +
        '<div class="arc-head"><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(d.date) + '</span></div>' +
        '<div class="arc-cust">' + esc(d.customer || 'بدون نام مشتری') + ' <small>· ' + esc(d.ownerName || d.issuer || '') + '</small></div>' +
        '<div class="arc-meta"><span>' + faInt.format(d.lines.length) + ' ردیف</span><b>' + money(t.total, d.unit) + '</b></div>' +
        '<div class="arc-actions two"><button type="button" data-arc-fcopy="' + i + '">کپی</button><button type="button" data-arc-fpdf="' + i + '">PDF</button><button type="button" data-arc-fshare="' + i + '">ارسال</button></div></li>';
    }).join('');
    openDialog('<div class="dlg-bar"><h2 id="dlgName">پیش‌فاکتورهای ذخیره‌شده</h2><button type="button" class="dlg-link" data-inv-open>پیش‌نویس</button>' +
      '<button type="button" class="dlg-x" data-close aria-label="بستن">' + ICON.close + '</button></div>' +
      '<div class="inv-body">' + (archive.length
        ? '<label class="arc-search">جست‌وجو<input type="search" data-arc-q placeholder="شماره سند یا نام مشتری"></label><ul class="arc-list">' + cards + '</ul>'
        : '<p class="inv-empty">هنوز پیش‌فاکتوری ذخیره نشده است. هر بار «دریافت PDF» بزنید، یک نسخه اینجا نگه‌داری می‌شود.</p>') +
        (foreign.length ? '<h3 class="arc-h">پیش‌فاکتورهای سایر ویزیتورها</h3><ul class="arc-list">' + fcards + '</ul>' : '') +
        '<p class="arc-note">پیش‌فاکتورها روی همین دستگاه ذخیره می‌شوند و با ورود به حساب (دکمهٔ کاربر بالای صفحه) بین دستگاه‌ها همگام می‌شوند. پشتیبان‌گیری هم همیشه ممکن است.</p></div>' +
      '<div class="inv-foot"><div class="inv-actions"><button type="button" class="arc-close" data-close aria-label="بستن">' + ICON.close + '</button><button type="button" class="inv-pdf" data-arc-backup>' + ICON.print.replace(/<path d="[^"]*"\/>/, '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/>') + '<span>پشتیبان‌گیری</span></button>' +
      '<label class="arc-restore">بازیابی<input type="file" accept=".json,application/json" data-arc-restore hidden></label></div></div>', 'inv-sheet');
  }
  function loadDraft(d, keepNo) {
    var kept = d.lines.filter(function (l) { return byId[l.id]; });
    inv.lines = kept.map(function (l) { return { id: l.id, qty: l.qty, price: l.price }; });
    inv.docNo = keepNo ? d.docNo : '';
    inv.customer = d.customer; inv.issuer = d.issuer || inv.issuer; inv.unit = d.unit; inv.tax = d.tax; inv.discount = d.discount; inv.discMode = d.discMode;
    inv.pay = d.pay ? JSON.parse(JSON.stringify(d.pay)) : { mode: 'cash', cashVal: 50, cashUnit: 'pct', count: 1, cheques: [], custom: false };
    invDate = keepNo ? d.date : today();
    invSave(); trayRender(); invButtons(); invoiceView();
    if (kept.length < d.lines.length) window.alert(faInt.format(d.lines.length - kept.length) + ' ردیف دیگر در کاتالوگ نیست و اضافه نشد.');
  }
  function downloadBackup() {
    var out = { app: 'maxsilver-portal', version: 1, exported: new Date().toISOString(), data: {} };
    BACKUP_KEYS.forEach(function (k) { try { var v = localStorage.getItem(k); if (v != null) out.data[k] = v; } catch (e) { /* ignore */ } });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
    a.download = 'maxsilver-backup-' + out.exported.slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function restoreBackup(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var o = JSON.parse(r.result);
        if (!o || o.app !== 'maxsilver-portal' || typeof o.data !== 'object') throw new Error('format');
        BACKUP_KEYS.forEach(function (k) { if (typeof o.data[k] === 'string') JSON.parse(o.data[k]); });
        if (!window.confirm('داده‌های فعلی این دستگاه با فایل پشتیبان جایگزین شود؟')) return;
        BACKUP_KEYS.forEach(function (k) { if (typeof o.data[k] === 'string') localStorage.setItem(k, o.data[k]); });
        location.reload();
      } catch (e) { window.alert('فایل پشتیبان معتبر نیست.'); }
    };
    r.readAsText(file);
  }
  window.MSArchive = {
    list: function () { return archive; },
    prices: function () { return prices; },
    replace: function (docs, priceMap) { archive = docs.slice(0, 500); prices = priceMap || prices; saveJson(ARCH_KEY, archive); saveJson(PRICE_KEY, prices); },
    save: function () { saveJson(ARCH_KEY, archive); saveJson(PRICE_KEY, prices); },
    setForeign: function (list) { foreign = list || []; },
    setIssuer: function (name) {
      var last = '';
      try { last = localStorage.getItem('ms-profile-name') || ''; localStorage.setItem('ms-profile-name', name || ''); } catch (e) { /* ignore */ }
      if (name && (!inv.issuer || inv.issuer === last) && inv.issuer !== name) { inv.issuer = name; invSave(); }
    }
  };
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
    if (e.target.tagName === 'INPUT' && /^(qty|price|discount|tax|cashVal|chAmount)$/.test(f)) liveFormat(e.target);
    var row = e.target.closest('.inv-row'), l = row && inv.lines[Number(row.getAttribute('data-i'))];
    if (l && (f === 'qty' || f === 'price')) {
      l[f] = parseNum(e.target.value);
      if (f === 'price' && l.price > 0) { prices[l.id] = l.price; saveJson(PRICE_KEY, prices); }
    }
    else if (f === 'docNo' || f === 'issuer' || f === 'customer' || f === 'unit' || f === 'discMode') inv[f] = e.target.value;
    else if (f === 'date') invDate = e.target.value;
    else if (f === 'discount' || f === 'tax') inv[f] = parseNum(e.target.value);
    else if (f === 'cashVal') ensurePay().cashVal = parseNum(e.target.value);
    else if (f === 'chAmount') { var pc = ensurePay().cheques[Number(e.target.getAttribute('data-i'))]; if (pc) { pc.amount = parseNum(e.target.value); inv.pay.custom = true; } }
    else if (f === 'chDate') { var pd = ensurePay().cheques[Number(e.target.getAttribute('data-i'))]; if (pd) { pd.date = e.target.value; pd.dateSet = true; } }
    invSave();
    if (f === 'chAmount' || f === 'chDate') { var chk = dialog.querySelector('[data-pay-check]'); if (chk) chk.innerHTML = chequeCheck(); } else invTotalsRender();
  });
  dialog.addEventListener('input', function (e) {
    if (!e.target.hasAttribute('data-arc-q')) return;
    var q = norm(e.target.value);
    Array.prototype.forEach.call(dialog.querySelectorAll('.arc-card'), function (c) { c.hidden = q && c.getAttribute('data-q').indexOf(q) < 0; });
  });
  dialog.addEventListener('change', function (e) {
    if (e.target.hasAttribute('data-arc-restore') && e.target.files[0]) { restoreBackup(e.target.files[0]); return; }
    var f = e.target.getAttribute('data-f');
    if (f === 'price' || f === 'qty') { var v = parseNum(e.target.value); e.target.value = v ? faInt.format(v) : ''; }
    if (f === 'unit' || f === 'discMode') { inv[f] = e.target.value; invSave(); invTotalsRender(); }
    var pp = ensurePay();
    if (e.target.hasAttribute('data-pay-mode')) {
      pp.mode = e.target.value;
      if (pp.mode === 'mixed' && !pp.cashVal) { pp.cashVal = 50; pp.cashUnit = 'pct'; }
      pp.custom = false; payNormalize(); invSave(); payRender();
    } else if (e.target.hasAttribute('data-pay-unit')) {
      var sp = paySplit(), toAmt = e.target.value === 'amt';
      pp.cashUnit = e.target.value;
      pp.cashVal = toAmt ? sp.cash : (sp.total ? Math.round(sp.cash / sp.total * 1000) / 10 : 50);
      pp.custom = false; payNormalize(); invSave(); payRender();
    }
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-cmp],[data-cmp-dlg],[data-inv],[data-inv-dlg],[data-inv-rm],[data-inv-print],[data-inv-clear],[data-arc-open],[data-inv-open],[data-arc-edit],[data-arc-copy],[data-arc-pdf],[data-arc-del],[data-arc-fcopy],[data-arc-fpdf],[data-arc-share],[data-arc-fshare],[data-inv-share],[data-arc-backup],[data-pay-count],[data-pay-equal],[data-close],[data-src]');
    if (e.target === dialog) { dialog.close(); return; }
    if (!t) return;
    if (t.hasAttribute('data-open')) detail(t.getAttribute('data-open'));
    else if (t.hasAttribute('data-cmp')) toggleCompare(t.getAttribute('data-cmp'));
    else if (t.hasAttribute('data-cmp-dlg')) { toggleCompare(t.getAttribute('data-cmp-dlg')); detail(t.getAttribute('data-cmp-dlg')); }
    else if (t.hasAttribute('data-inv')) toggleInvoice(t.getAttribute('data-inv'));
    else if (t.hasAttribute('data-inv-dlg')) { toggleInvoice(t.getAttribute('data-inv-dlg')); detail(t.getAttribute('data-inv-dlg')); }
    else if (t.hasAttribute('data-inv-rm')) { inv.lines.splice(Number(t.getAttribute('data-inv-rm')), 1); invSave(); trayRender(); invButtons(); invoiceView(); }
    else if (t.hasAttribute('data-pay-count')) { var pq = ensurePay(); pq.count = Math.max(1, Math.min(12, (pq.count || 1) + Number(t.getAttribute('data-pay-count')))); pq.custom = false; payNormalize(); invSave(); payRender(); }
    else if (t.hasAttribute('data-pay-equal')) { ensurePay().custom = false; payNormalize(); invSave(); payRender(); }
    else if (t.hasAttribute('data-inv-share')) shareDoc(commitDoc(), t);
    else if (t.hasAttribute('data-arc-share')) shareDoc(archive[Number(t.getAttribute('data-arc-share'))], t);
    else if (t.hasAttribute('data-arc-fshare')) shareDoc(foreign[Number(t.getAttribute('data-arc-fshare'))], t);
    else if (t.hasAttribute('data-inv-print')) invPrint();
    else if (t.hasAttribute('data-arc-open')) archiveView();
    else if (t.hasAttribute('data-inv-open')) invoiceView();
    else if (t.hasAttribute('data-arc-edit')) loadDraft(archive[Number(t.getAttribute('data-arc-edit'))], true);
    else if (t.hasAttribute('data-arc-copy')) loadDraft(archive[Number(t.getAttribute('data-arc-copy'))], false);
    else if (t.hasAttribute('data-arc-pdf')) printDoc(archive[Number(t.getAttribute('data-arc-pdf'))]);
    else if (t.hasAttribute('data-arc-del')) { if (window.confirm('این پیش‌فاکتور از سوابق حذف شود؟')) { var gone = archive.splice(Number(t.getAttribute('data-arc-del')), 1)[0]; saveJson(ARCH_KEY, archive); if (window.MSSync && gone) window.MSSync.remove(gone.docNo); archiveView(); } }
    else if (t.hasAttribute('data-arc-fcopy')) loadDraft(foreign[Number(t.getAttribute('data-arc-fcopy'))], false);
    else if (t.hasAttribute('data-arc-fpdf')) printDoc(foreign[Number(t.getAttribute('data-arc-fpdf'))]);
    else if (t.hasAttribute('data-arc-backup')) downloadBackup();
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
  $('invArchive').addEventListener('click', archiveView);
  $('cmpClear').addEventListener('click', function () { compare.slice().forEach(toggleCompare); });

  // ----- search console: on phones/tablets it folds into a button next to the QR icon once you scroll past it
  (function () {
    var slot = $('catSlot'), tools = slot && slot.querySelector('.cat-tools'), shareBtn = $('msShare'), mq = window.matchMedia('(max-width:1100px)');
    if (!slot || !tools || !shareBtn) return;
    var box = document.createElement('div'), btn = document.createElement('button');
    box.className = 'ms-actions';
    shareBtn.parentNode.insertBefore(box, shareBtn);
    box.appendChild(btn); box.appendChild(shareBtn);
    btn.type = 'button'; btn.id = 'catSearchBtn'; btn.className = 'ms-search-btn'; btn.hidden = true;
    btn.setAttribute('aria-label', 'جست‌وجو و فیلتر'); btn.setAttribute('aria-expanded', 'false'); btn.title = 'جست‌وجو و فیلتر';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
    var away = false, open = false, openedAt = 0, lastY = 0;
    function close() {
      if (!open) return;
      open = false; tools.classList.remove('float'); slot.style.height = ''; btn.setAttribute('aria-expanded', 'false'); openMenu(null, false);
    }
    function show() {
      if (!mq.matches || !away || open) return;
      slot.style.height = tools.offsetHeight + 'px';
      tools.classList.add('float'); open = true; openedAt = Date.now(); lastY = window.scrollY;
      btn.setAttribute('aria-expanded', 'true');
      try { $('catSearch').focus({ preventScroll: true }); } catch (e) { $('catSearch').focus(); }
    }
    function setAway(v) {
      away = v && mq.matches;
      btn.hidden = !away;
      if (!away) close();
    }
    var barH = function () { var h = document.querySelector('.ms-sitebar'); return h ? h.getBoundingClientRect().height : 60; };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        var r = entries[0];
        setAway(!r.isIntersecting && r.boundingClientRect.bottom <= barH() + 12);
      }, { rootMargin: '-' + Math.round(barH()) + 'px 0px 0px 0px' });
      io.observe(slot);
    }
    btn.addEventListener('click', function () { if (open) close(); else show(); });
    // any real scrolling folds the console back into the bar; touches inside the console itself do not
    var fold = function (e) { if (open && !(e.target instanceof Node && tools.contains(e.target))) close(); };
    window.addEventListener('wheel', fold, { passive: true });
    window.addEventListener('touchmove', fold, { passive: true });
    window.addEventListener('scroll', function () {
      if (open && Date.now() - openedAt > 900 && Math.abs(window.scrollY - lastY) > 60) close();
    }, { passive: true });
    document.addEventListener('click', function (e) { if (open && !tools.contains(e.target) && !btn.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    mq.addEventListener && mq.addEventListener('change', function () { setAway(false); });
  })();

  // ----- the (i) note: tap to read (hover tooltips do not exist on touch screens)
  (function () {
    var b = $('catNote'), p = $('catNoteText');
    if (!b || !p) return;
    b.addEventListener('click', function (e) { e.stopPropagation(); var on = p.hidden; p.hidden = !on; b.setAttribute('aria-expanded', String(on)); });
    document.addEventListener('click', function (e) { if (!p.hidden && !p.contains(e.target)) { p.hidden = true; b.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !p.hidden) { p.hidden = true; b.setAttribute('aria-expanded', 'false'); b.focus(); } });
  })();

  fetch('./assets/catalog.json?v=20261207', { cache: 'default' }).then(function (r) { return r.json(); }).then(function (json) {
    data = json; items = json.items; build();
    inv.lines = inv.lines.filter(function (l) { return byId[l.id]; });
    trayRender();
    ['catGroup', 'catSector', 'catSort'].forEach(function (id) { enhance($(id)); });
    apply();
  }).catch(function () { $('catEmpty').hidden = false; });
})();
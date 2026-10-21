// Price panel: sales management, management and organizational technology edit the list prices of the catalog (toman).
// An edit is a document in Firestore (list_prices/<product id>) that wins over the price list file; «بازگشت به لیست» deletes it.
// The same people take a product code out of use («کنار گذاشتن کد», Firestore item_status/<product id>), with an optional replacement code.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('pr'), P = window.MSPrices, ST8 = window.MSStatus;
  var VER = (document.currentScript && /[?&]v=(\d+)/.exec(document.currentScript.src) || [])[1] || '';
  if (!root) return;
  if (!cfg || !window.firebase || !P || !ST8) { root.innerHTML = '<p class="pr-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var faInt = new Intl.NumberFormat('fa-IR'), faDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' });
  var BR = { 'max-silver': 'مکث‌سیلور', wintora: 'وینتورا', 'torbo-max': 'توربومکس' };
  var ST = [['p', 'نقدی'], ['i', 'استعلام'], ['r', 'شارژ'], ['n', 'توافقی']];
  var S = { user: null, profile: null, loading: true, error: '', msg: '', items: [], q: '', brand: 'all', flt: 'all', shown: 60, draft: {}, busy: '', ret: '', repIn: '', noteIn: '', pGrp: '', pCat: '', pBr: 'all', pPct: '', pRound: '0', editors: { uids: [], names: {} }, team: [], pick1: '', pick2: '' };
  var I = {
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    ban: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>',
    csv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v3h16v-3"/></svg>'
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function latin(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); }
  function norm(s) { return latin(String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, ' ').replace(/\s+/g, ' ').trim()).toLowerCase(); }
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ ذخیرهٔ قیمت را ندارید (یا قوانین پایگاه داده هنوز منتشر نشده است).';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  var can = function (area) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, area)); };
  // only the (at most two) people named by management change prices; everyone else with a pricing role sees them read-only
  var isEditor = function () { return !!(S.user && S.editors.uids.indexOf(S.user.uid) >= 0); };
  var canEdit = function () { return can('pricesEdit') && isEditor(); };
  var myName = function () { return (S.profile && S.profile.name) || (S.user && S.user.email) || ''; };
  function cur(id) { return P.get(id); }
  function dval(it) { var d = S.draft[it.id], c = cur(it.id); return { p: d && d.p != null ? d.p : (c && c.s === 'p' && c.p ? c.p : 0), s: d && d.s ? d.s : (c ? c.s : 'p') }; }

  function filtered() {
    var q = norm(S.q);
    return S.items.filter(function (it) {
      if (S.brand !== 'all' && it.src !== S.brand) return false;
      var c = cur(it.id);
      if (S.flt === 'priced' && !(c && c.s === 'p' && c.p > 0)) return false;
      if (S.flt === 'none' && c) return false;
      if (S.flt === 'inquiry' && !(c && c.s === 'i')) return false;
      if (S.flt === 'restock' && !(c && c.s === 'r')) return false;
      if (S.flt === 'nego' && !(c && c.s === 'n')) return false;
      if (S.flt === 'edited' && !(c && c.edited)) return false;
      if (S.flt === 'retired' && !ST8.retired(it.id)) return false;
      return !q || norm(it.name + ' ' + (it.code || '') + ' ' + (it.cat || '')).indexOf(q) >= 0;
    });
  }
  function counts() {
    var n = { priced: 0, none: 0, inquiry: 0, restock: 0, edited: 0, retired: 0 };
    S.items.forEach(function (it) {
      if (ST8.retired(it.id)) n.retired++;
      var c = cur(it.id);
      if (!c) n.none++; else { if (c.s === 'p' && c.p > 0) n.priced++; else if (c.s === 'i') n.inquiry++; else if (c.s === 'r') n.restock++; if (c.edited) n.edited++; }
    });
    return n;
  }
  // ---------- one percentage for a whole group (e.g. +10 % on every priced product of «تجهیزات پخت»)
  function pctHtml() {
    if (!canEdit()) return '';
    var grps = {}, cats = {};
    S.items.forEach(function (it) { if (it.grp) { grps[it.grp] = true; if (!S.pGrp || it.grp === S.pGrp) cats[it.cat] = true; } });
    var opt = function (v, t, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    return '<details class="pr-pct"' + (S.pPct || S.pGrp ? ' open' : '') + '><summary>تغییر درصدی قیمت یک گروه</summary>' +
      '<p class="pr-lead">یک درصد برای همهٔ کالاهای قیمت‌دارِ گروه (یا نوع کالا). اول پیش‌نمایش می‌بینید؛ چیزی تا «اعمال» نزنید تغییر نمی‌کند. کالاهای «استعلام» و «شارژ» دست نمی‌خورند.</p>' +
      '<div class="pr-pform"><label>گروه<select id="prGrp">' + opt('', 'همهٔ گروه‌ها', !S.pGrp) + Object.keys(grps).sort().map(function (g) { return opt(g, g, S.pGrp === g); }).join('') + '</select></label>' +
      '<label>نوع کالا<select id="prCat">' + opt('', 'همهٔ انواع', !S.pCat) + Object.keys(cats).sort().map(function (c) { return opt(c, c, S.pCat === c); }).join('') + '</select></label>' +
      '<label>برند<select id="prPBr">' + opt('all', 'همهٔ برندها', S.pBr === 'all') + Object.keys(BR).map(function (k) { return opt(k, BR[k], S.pBr === k); }).join('') + '</select></label>' +
      '<label>درصد (برای کاهش منفی بنویسید)<input id="prPct" type="text" inputmode="decimal" dir="ltr" autocomplete="off" placeholder="مثلاً 10 یا -5" value="' + esc(S.pPct) + '"></label>' +
      '<label>گرد کردن<select id="prRound">' + opt('0', 'بدون گرد کردن', S.pRound === '0') + opt('1000', 'به نزدیک‌ترین ۱٬۰۰۰ تومان', S.pRound === '1000') + opt('10000', 'به نزدیک‌ترین ۱۰٬۰۰۰ تومان', S.pRound === '10000') + opt('100000', 'به نزدیک‌ترین ۱۰۰٬۰۰۰ تومان', S.pRound === '100000') + '</select></label>' +
      '<button type="button" class="pr-btn" data-pctgo>پیش‌نمایش تغییر</button></div></details>';
  }
  function previewPct() {
    var raw = latin(S.pPct).replace(/[٫,]/g, '.').replace(/٪|%|\s/g, ''), pct = parseFloat(raw);
    S.error = ''; S.msg = '';
    if (!raw || isNaN(pct)) { S.error = 'درصد را بنویسید؛ مثلاً 10 برای ده درصد افزایش یا -5 برای پنج درصد کاهش.'; render(); return; }
    if (pct <= -90 || pct > 200) { S.error = 'درصد باید بین ۸۹- و ۲۰۰ باشد.'; render(); return; }
    var step = Number(S.pRound) || 0, m = { name: '', title: '', changes: [], same: 0, errs: [] }, scope = 0;
    S.items.forEach(function (it) {
      if (S.pGrp && it.grp !== S.pGrp) return;
      if (S.pCat && it.cat !== S.pCat) return;
      if (S.pBr !== 'all' && it.src !== S.pBr) return;
      if (ST8.retired(it.id)) return;
      var c = cur(it.id); if (!c || c.s !== 'p' || !(c.p > 0)) return;
      scope++;
      var np = c.p * (1 + pct / 100);
      np = step ? Math.round(np / step) * step : Math.round(np);
      if (np < 1) np = 1;
      if (np === c.p) { m.same++; return; }
      var nw = { p: np, s: 'p' };
      if (c.c > 0) nw.c = step ? Math.round(c.c * (1 + pct / 100) / step) * step : Math.round(c.c * (1 + pct / 100));
      m.changes.push({ it: it, old: c, nw: nw, note: '' });
    });
    m.title = 'تغییر ' + (pct > 0 ? '+' : '') + faInt.format(pct) + '٪ · ' + (S.pCat || S.pGrp || 'همهٔ گروه‌ها') + (S.pBr !== 'all' ? ' · ' + BR[S.pBr] : '') + ' · ' + faInt.format(scope) + ' کالای قیمت‌دار';
    if (!scope) m.errs.push('کالای قیمت‌داری در این گروه و برند نیست.');
    S.imp = m; render();
    var el = root.querySelector('.pr-imp'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }
  function editorsHtml() {
    var names = S.editors.uids.map(function (u) { return esc(S.editors.names[u] || u); });
    var who = names.length ? names.join(' و ') : 'هنوز کسی تعیین نشده است';
    var out = '<section class="pr-who"><p><b>تغییر قیمت فقط با:</b> ' + who + (canEdit() ? ' <i class="pr-me">شما</i>' : '') + '</p>' +
      (!canEdit() && can('pricesEdit') ? '<p class="pr-lead">شما قیمت‌ها را می‌بینید ولی تغییرشان با دو نفر تعیین‌شده است.</p>' : '');
    if (can('roleAdmin')) {
      var opts = function (sel) { return '<option value="">— انتخاب —</option>' + S.team.map(function (u) { return '<option value="' + esc(u.id) + '"' + (sel === u.id ? ' selected' : '') + '>' + esc(u.name || u.email || u.id) + ' · ' + esc(window.MSRoles ? window.MSRoles.label(u.role) : u.role) + '</option>'; }).join(''); };
      out += '<details class="pr-pct"><summary>تعیین مسئولان تغییر قیمت (حداکثر دو نفر)</summary><div class="pr-pform"><label>نفر اول<select id="prEd1">' + opts(S.pick1) + '</select></label><label>نفر دوم<select id="prEd2">' + opts(S.pick2) + '</select></label>' +
        '<button type="button" class="pr-btn" data-edsave>ذخیرهٔ مسئولان</button></div><p class="pr-lead">این بخش فقط برای تکنولوژی ارتباطات سازمانی است. مدیریت، CEO و مدیر فروش که حساب فعال دارند در فهرست می‌آیند. تا دو نفر تعیین نشوند کسی قیمت را تغییر نمی‌دهد.</p></details>';
    }
    return out + '</section>';
  }
  function saveEditors() {
    var u = [S.pick1, S.pick2].filter(function (x, i, a) { return x && a.indexOf(x) === i; });
    if (!u.length) { S.error = 'دست‌کم یک نفر را انتخاب کنید.'; S.msg = ''; render(); return; }
    var names = {}; u.forEach(function (id) { var x = S.team.filter(function (t) { return t.id === id; })[0]; names[id] = x ? (x.name || x.email || id) : id; });
    var doc = { uids: u, names: names, at: Date.now(), by: S.user.uid, byName: myName() };
    S.error = ''; S.msg = '';
    db.collection('settings').doc('price_editors').set(doc).then(function () { S.editors = { uids: u, names: names }; S.msg = 'مسئولان تغییر قیمت ذخیره شد.'; }, function (e) { S.error = errText(e); }).then(render);
  }
  // ---------- cheque price = cash + a percentage
  function markupHtml() {
    if (!canEdit()) return '';
    var mk = P.markup(), grps = {};
    S.items.forEach(function (it) { if (it.grp) grps[it.grp] = true; });
    var inp = function (id, v) { return '<input type="text" inputmode="decimal" dir="ltr" autocomplete="off" data-mk="' + esc(id) + '" value="' + (v == null ? '' : esc(String(v))) + '" placeholder="پیش‌فرض">'; };
    return '<details class="pr-pct"><summary>قیمت اعتباری (چکی): درصد بیشتر از نقدی</summary><p class="pr-lead">قیمت اعتباری (چکی) هر کالا = قیمت نقدی + این درصد (به نزدیک‌ترین ۱٬۰۰۰ تومان). برای هر گروه می‌توانید درصد جدا بگذارید؛ خالی یعنی همان پیش‌فرض. قیمت توافقی عدد ندارد: کارشناس فروش با مشتری توافق می‌کند.</p>' +
      '<div class="pr-pform"><label>پیش‌فرض همهٔ گروه‌ها (٪)<input type="text" inputmode="decimal" dir="ltr" autocomplete="off" id="prMkDef" value="' + esc(String(mk.def || 0)) + '"></label>' +
      Object.keys(grps).sort().map(function (g) { return '<label>' + esc(g) + ' (٪)' + inp(g, typeof mk.byGrp[g] === 'number' ? mk.byGrp[g] : null) + '</label>'; }).join('') +
      '<button type="button" class="pr-btn" data-mksave>ذخیرهٔ درصدها</button></div></details>';
  }
  function saveMarkup() {
    var num = function (v) { var x = parseFloat(latin(String(v)).replace(/[٫,]/g, '.')); return isNaN(x) ? null : x; };
    var def = num(document.getElementById('prMkDef').value), byGrp = {}, bad = false;
    if (def == null || def < 0 || def > 100) { S.error = 'درصد پیش‌فرض باید بین ۰ و ۱۰۰ باشد.'; S.msg = ''; render(); return; }
    Array.prototype.forEach.call(root.querySelectorAll('[data-mk]'), function (i) {
      if (!String(i.value).trim()) return;
      var x = num(i.value); if (x == null || x < 0 || x > 100) { bad = true; return; } byGrp[i.getAttribute('data-mk')] = x;
    });
    if (bad) { S.error = 'درصد هر گروه باید بین ۰ و ۱۰۰ باشد.'; S.msg = ''; render(); return; }
    var doc = { def: def, byGrp: byGrp, at: Date.now(), by: S.user.uid, byName: myName() };
    S.error = ''; S.msg = '';
    db.collection('settings').doc('cheque_markup').set(doc).then(function () { P.setMarkup(doc); S.msg = 'درصد قیمت اعتباری ذخیره شد.'; }, function (e) { S.error = errText(e); }).then(render);
  }
  function chip(attr, val, on, text, n) { return '<button type="button" class="pr-chip" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + text + (n != null ? ' <b>' + faInt.format(n) + '</b>' : '') + '</button>'; }

  function byCode(code) {
    var k = norm(code); if (!k) return null;
    return S.items.filter(function (x) { return x.code && norm(x.code) === k; })[0] || null;
  }
  function itemById(id) { return S.items.filter(function (x) { return x.id === id; })[0] || null; }
  function retLine(it) {
    var s = ST8.get(it.id); if (!s) return '';
    var r = s.rep ? itemById(s.rep) : null;
    return '<small class="pr-retline">کنار گذاشته‌شده' + (r ? ' · جایگزین: ' + esc(r.name) + (r.code ? ' (' + esc(r.code) + ')' : '') : '') + (s.note ? ' · ' + esc(s.note) : '') + (s.by ? ' · ' + esc(s.by) : '') + '</small>';
  }
  function retForm(it) {
    return '<div class="pr-retform"><label>کد کالای جایگزین (اختیاری)<input type="text" dir="ltr" data-rep value="' + esc(S.repIn) + '" autocomplete="off" placeholder="مثلاً 103342"></label>' +
      '<label>یادداشت (اختیاری)<input type="text" data-note maxlength="200" value="' + esc(S.noteIn) + '" autocomplete="off"></label>' +
      '<div class="pr-retbtn"><button type="button" class="pr-more" data-retok>کنار گذاشتن این کد</button><button type="button" class="pr-more" data-retno>انصراف</button></div></div>';
  }
  function chequeLine(it, c) {
    if (!c || c.s !== 'p' || !(c.p > 0)) return '';
    var ch = P.cheque(c, it.grp);
    return '<small class="pr-chq">اعتباری: <b>' + faInt.format(ch) + '</b>' + (c.c > 0 ? ' (قیمت جدا)' : ch !== c.p ? ' (' + faInt.format(P.pct(it.grp)) + '٪ بیشتر)' : '') + '</small>';
  }
  function row(it) {
    var c = cur(it.id), d = dval(it), dirty = !!S.draft[it.id], rt = ST8.retired(it.id);
    var src = c ? (c.edited ? 'ویرایش' + (c.by ? ' ' + esc(c.by) : '') + (c.at ? '<i class="ms-sep" aria-hidden="true"></i>' + faDate.format(new Date(c.at)) : '') : 'لیست ' + esc(P.date())) : 'بدون قیمت';
    return '<article class="pr-row' + (dirty ? ' dirty' : '') + (rt ? ' retired' : '') + '" data-id="' + esc(it.id) + '">' +
      '<div class="pr-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async">' : '') + '</div>' +
      '<div class="pr-name"><b>' + esc(it.name) + '</b><span>' + (it.code ? '<code>' + esc(it.code) + '</code>' : '') + '<i class="pr-br" data-b="' + esc(it.src) + '">' + esc(BR[it.src] || '') + '</i></span><small>' + src + '</small>' + chequeLine(it, c) + retLine(it) + '</div>' +
      '<div class="pr-roprice">' + esc(P.label(c) || 'بدون قیمت') + '</div>' +
      '<div class="pr-edit"><label class="pr-field"><input class="pr-in" type="text" inputmode="numeric" autocomplete="off" data-in value="' + (d.s === 'p' && d.p ? esc(faInt.format(d.p)) : '') + '" placeholder="۰"' + (d.s === 'p' ? '' : ' disabled') + ' aria-label="قیمت ' + esc(it.name) + '"><span>تومان</span></label>' +
      '<div class="pr-st" role="radiogroup" aria-label="وضعیت">' + ST.map(function (x) { return '<button type="button" role="radio" data-st="' + x[0] + '" aria-checked="' + (d.s === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="pr-act"><button type="button" class="pr-ic" data-save aria-label="ذخیره" title="ذخیره"' + (dirty ? '' : ' disabled') + '>' + I.save + '</button>' +
      '<button type="button" class="pr-ic" data-reset aria-label="بازگشت به لیست" title="بازگشت به قیمت لیست"' + (c && c.edited ? '' : ' disabled') + '>' + I.undo + '</button>' +
      (rt ? '<button type="button" class="pr-ic" data-unret aria-label="بازگرداندن کد به استفاده" title="بازگرداندن کد به استفاده">' + I.back + '</button>' : '<button type="button" class="pr-ic" data-ret aria-label="کنار گذاشتن کد" title="کنار گذاشتن کد">' + I.ban + '</button>') + '</div>' +
      (S.ret === it.id ? retForm(it) : '') + '</article>';
  }
  function listHtml() {
    var list = filtered(), n = counts();
    return '<div class="pr-bar"><input id="prQ" type="search" placeholder="جست‌وجوی نام، کد، دسته…" value="' + esc(S.q) + '" autocomplete="off">' +
      '<button type="button" class="pr-ic wide" data-csv title="دانلود قیمت‌ها (CSV)" aria-label="دانلود قیمت‌ها">' + I.csv + '</button></div>' +
      '<div class="pr-tools"><button type="button" class="pr-btn" data-tpl>' + I.csv + 'دانلود قالب بازبینی قیمت (Excel)</button>' +
      (canEdit() ? '<label class="pr-btn alt">بارگذاری قیمت‌های بازبینی‌شده<input type="file" id="prFile" accept=".xlsx,.xls" hidden></label>' : '') + '</div>' + markupHtml() + pctHtml() + impHtml() +
      '<div class="pr-chips" role="group" aria-label="برند">' + chip('data-brand', 'all', S.brand === 'all', 'همه برندها') + Object.keys(BR).map(function (k) { return chip('data-brand', k, S.brand === k, BR[k]); }).join('') + '</div>' +
      '<div class="pr-chips" role="group" aria-label="وضعیت قیمت">' +
      chip('data-flt', 'all', S.flt === 'all', 'همه') + chip('data-flt', 'priced', S.flt === 'priced', 'قیمت‌دار', n.priced) + chip('data-flt', 'none', S.flt === 'none', 'بدون قیمت', n.none) +
      chip('data-flt', 'inquiry', S.flt === 'inquiry', 'استعلام', n.inquiry) + chip('data-flt', 'restock', S.flt === 'restock', 'شارژ', n.restock) + chip('data-flt', 'nego', S.flt === 'nego', 'توافقی') + chip('data-flt', 'edited', S.flt === 'edited', 'ویرایش‌شده', n.edited) + chip('data-flt', 'retired', S.flt === 'retired', 'کنار گذاشته', n.retired) + '</div>' +
      '<div class="pr-list" id="prList">' + list.slice(0, S.shown).map(row).join('') + '</div>' +
      (list.length > S.shown ? '<button type="button" class="pr-more" data-more>نمایش بیشتر (' + faInt.format(list.length - S.shown) + ')</button>' : '') +
      (list.length ? '' : '<p class="pr-note ms-empty"><img class="ms-empty-img" src="./assets/art/tiles/no-results.webp" alt="" width="96" height="96" decoding="async"><span>محصولی پیدا نشد.</span></p>');
  }

  // ---------- history of every price change (collection price_log). Written after a price is saved; a failure here never blocks the price itself.
  var faDT = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
  function logChanges(list, src) {
    try {
      var b = db.batch(), now = Date.now();
      list.forEach(function (x) {
        b.set(db.collection('price_log').doc(), { id: x.it.id, name: String(x.it.name || '').slice(0, 120), code: String(x.it.code || '').slice(0, 30), brand: x.it.src || '',
          old: x.old && x.old.p ? x.old.p : 0, oldS: x.old ? (x.old.s || 'p') : '', p: x.nw.p || 0, s: x.nw.s || 'p', at: x.at || now, by: S.user.uid, byName: myName(), src: src });
      });
      b.commit().then(function () { S.log = null; if (S.histOpen) loadLog(); }, function () { /* the log is optional until the rules are published */ });
    } catch (e) { /* ignore */ }
  }
  function loadLog() {
    S.logBusy = true; S.logErr = '';
    db.collection('price_log').orderBy('at', 'desc').limit(300).get().then(function (q) { var l = []; q.forEach(function (s) { l.push(s.data()); }); S.log = l; },
      function () { S.log = []; S.logErr = 'تاریخچه هنوز در دسترس نیست (قاعده‌های پایگاه داده باید منتشر شوند) یا اجازه ندارید.'; }).then(function () { S.logBusy = false; render(); });
  }
  function histHtml() {
    var open = !!S.histOpen;
    var h = '<section class="pr-hist"><button type="button" class="pr-btn" data-hist aria-expanded="' + open + '">' + (open ? 'بستن' : 'تاریخچهٔ تغییر قیمت‌ها') + '</button>';
    if (open) {
      if (S.logBusy || S.log == null) h += '<p class="pr-note">در حال بارگذاری…</p>';
      else if (S.logErr) h += '<p class="pr-err">' + esc(S.logErr) + '</p>';
      else if (!S.log.length) h += '<p class="pr-note">هنوز تغییری ثبت نشده است. هر تغییر قیمت از این پس با تاریخ، قیمت قبل و بعد و نام تغییردهنده اینجا می‌آید.</p>';
      else {
        var f = function (p, s) { return s && s !== 'p' ? STT[s] : (p ? faInt.format(p) : 'بدون قیمت'); };
        h += '<div class="pr-tools"><button type="button" class="pr-btn alt" data-histx>' + I.csv + 'دانلود تاریخچه (Excel)</button></div><div class="pr-tw"><table class="pr-tbl"><thead><tr><th>تاریخ</th><th>کالا</th><th>قبل</th><th>بعد</th><th>تغییردهنده</th></tr></thead><tbody>' +
          S.log.map(function (x) { return '<tr><td>' + esc(faDT.format(new Date(x.at))) + '</td><td>' + esc(x.name) + (x.code ? ' <code>' + esc(x.code) + '</code>' : '') + '</td><td>' + f(x.old, x.oldS) + '</td><td>' + f(x.p, x.s) + '</td><td>' + esc(x.byName || '') + (x.src === 'excel' ? ' (Excel)' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
    }
    return h + '</section>';
  }
  function exportLog() {
    var rows = [['تاریخ', 'کد کالا', 'نام کالا', 'قیمت قبل (تومان)', 'قیمت بعد (تومان)', 'تغییردهنده', 'روش']];
    (S.log || []).forEach(function (x) { rows.push([faDT.format(new Date(x.at)), x.code || '', x.name, x.oldS && x.oldS !== 'p' ? STT[x.oldS] : (x.old || ''), x.s !== 'p' ? STT[x.s] : (x.p || ''), x.byName || '', x.src === 'excel' ? 'Excel' : 'سایت']); });
    window.MSXlsx.save(window.MSXlsx.blob([{ name: 'تاریخچه', rows: rows, widths: [20, 14, 50, 18, 18, 22, 10], freeze: true, filter: true }]), 'Max_Silver_Price_History.xlsx');
  }
  function view() {
    if (S.loading) return (window.MSSkel ? window.MSSkel() : '<p class="pr-note">در حال بارگذاری…</p>');
    if (!S.user) return '<p class="pr-note">برای ویرایش قیمت‌ها ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="pr-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('pricesAudit')) return '<p class="pr-note">ویرایش قیمت فقط برای مدیر فروش، مدیریت و تکنولوژی ارتباطات سازمانی است. قیمت‌ها را در کاتالوگ می‌بینید.</p>';
    return '<h1>قیمت‌ها</h1><p class="pr-lead">قیمت لیست محصولات به تومان (نقدی، اعتباری (چکی) و توافقی). قیمتی که اینجا ذخیره کنید جای قیمت لیست پایه (مکث‌سیلور، وینتورا و توربومکس، ' + esc(P.date()) + ') را می‌گیرد و در کاتالوگ و پیش‌فاکتور برای همه دیده می‌شود. کدی را که دیگر استفاده نمی‌شود با دکمهٔ ⊘ کنار بگذارید (کد جایگزین اختیاری است).</p>' +
      (S.error ? '<p class="pr-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.msg ? '<p class="pr-ok" role="status">' + esc(S.msg) + '</p>' : '') + editorsHtml() + histHtml() + listHtml();
  }
  function render() {
    var a = document.activeElement, keepQ = a && a.id === 'prQ' ? a.selectionStart : null;
    root.innerHTML = view();
    root.classList.toggle('pr-ro', !canEdit());
    if (window.MSGate) window.MSGate.apply();
    if (keepQ !== null) { var q = document.getElementById('prQ'); if (q) { q.focus(); try { q.setSelectionRange(keepQ, keepQ); } catch (e) { /* ignore */ } } }
  }

  // ---------- data
  function load() {
    S.loading = true; render();
    var catalog = fetch('./assets/catalog.json' + (VER ? '?v=' + VER : '')).then(function (r) { return r.json(); });
    db.collection('users').doc(S.user.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('pricesAudit')) return null;
      var team = can('roleAdmin') ? db.collection('users').get().then(function (q) { var l = []; q.forEach(function (s) { var d = s.data(); if (d.active !== false && /^(manager|ceo|sales_manager)$/.test(window.MSRoles ? window.MSRoles.norm(d.role) : d.role)) l.push({ id: s.id, name: d.name, email: d.email, role: d.role }); }); return l; }, function () { return []; }) : Promise.resolve([]);
      var ed = db.collection('settings').doc('price_editors').get().then(function (s) { return s.exists ? s.data() : null; }, function () { return null; });
      var mk = db.collection('settings').doc('cheque_markup').get().then(function (s) { return s; }, function () { return null; });
      return Promise.all([catalog, P.load(), db.collection('list_prices').get(), db.collection('item_status').get(), team, ed, mk]).then(function (res) {
        S.team = res[4]; var e0 = res[5]; S.editors = e0 && Array.isArray(e0.uids) ? { uids: e0.uids.slice(0, 2), names: e0.names || {} } : { uids: [], names: {} }; S.pick1 = S.editors.uids[0] || ''; S.pick2 = S.editors.uids[1] || '';
        S.items = res[0].items;
        var m = {};
        res[2].forEach(function (s) { var d = s.data(); m[s.id] = { p: d.p || 0, s: d.s || 'p', c: d.c || 0, at: d.at || 0, by: d.byName || '' }; });
        P.setEdits(m);
        if (res[6] && res[6].exists) P.setMarkup(res[6].data());
        var sm = {};
        res[3].forEach(function (s) { var d = s.data(); sm[s.id] = { rep: d.rep || '', note: d.note || '', at: d.at || 0, by: d.byName || '' }; });
        ST8.setAll(sm);
      });
    }).then(null, function (e) { S.error = errText(e); }).then(function () { S.loading = false; render(); });
  }
  function save(id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0], d = dval(it), c = cur(id);
    if (d.s === 'p' && !(d.p > 0)) { S.error = 'قیمت را بنویسید یا وضعیت «استعلام» یا «شارژ» را بزنید.'; S.msg = ''; render(); return; }
    var doc = { p: d.s === 'p' ? d.p : 0, s: d.s, at: Date.now(), by: S.user.uid, byName: myName(), prev: c && c.p ? c.p : 0 };
    if (d.s === 'p' && c && c.c > 0) doc.c = c.c;
    S.error = ''; S.msg = '';
    db.collection('list_prices').doc(id).set(doc).then(function () {
      P.setOne(id, { p: doc.p, s: doc.s, c: doc.c || 0, at: doc.at, by: doc.byName });
      logChanges([{ it: it, old: c, nw: { p: doc.p, s: doc.s }, at: doc.at }], 'site');
      delete S.draft[id];
      S.msg = 'ذخیره شد: ' + it.name;
    }, function (e) { S.error = errText(e); }).then(render);
  }
  function reset(id) {
    S.error = ''; S.msg = '';
    db.collection('list_prices').doc(id).delete().then(function () {
      P.setOne(id, null); delete S.draft[id];
      S.msg = 'قیمت لیست پایه برگشت.';
    }, function (e) { S.error = errText(e); }).then(render);
  }
  // the ids of the retired products, readable without sign-in, for the public planner
  function publishRetired() {
    db.collection('public_config').doc('retired').set({ ids: Object.keys(ST8.all()).slice(0, 500), at: Date.now() }).then(null, function () { /* the staff list still works; the public list updates on the next change */ });
  }
  function retire(id) {
    var it = itemById(id), code = S.repIn.trim(), rep = '';
    if (code) {
      var r = byCode(code);
      if (!r) { S.error = 'کدی با این شماره در کاتالوگ نیست: ' + code; S.msg = ''; render(); return; }
      if (r.id === id) { S.error = 'کد جایگزین نمی‌تواند خود همین کالا باشد.'; S.msg = ''; render(); return; }
      if (ST8.retired(r.id)) { S.error = 'کد جایگزین خودش کنار گذاشته شده است.'; S.msg = ''; render(); return; }
      rep = r.id;
    }
    var doc = { rep: rep, note: S.noteIn.trim().slice(0, 200), at: Date.now(), by: S.user.uid, byName: myName() };
    S.error = ''; S.msg = '';
    db.collection('item_status').doc(id).set(doc).then(function () {
      ST8.setOne(id, { rep: doc.rep, note: doc.note, at: doc.at, by: doc.byName });
      publishRetired();
      S.ret = ''; S.repIn = ''; S.noteIn = '';
      S.msg = 'کد کنار گذاشته شد: ' + it.name;
    }, function (e) { S.error = errText(e); }).then(render);
  }
  function unretire(id) {
    S.error = ''; S.msg = '';
    db.collection('item_status').doc(id).delete().then(function () {
      ST8.setOne(id, null); publishRetired(); S.msg = 'کد دوباره در استفاده است.';
    }, function (e) { S.error = errText(e); }).then(render);
  }
  function csv() {
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = [['کد', 'نام', 'برند', 'قیمت نقدی (تومان)', 'قیمت اعتباری (تومان)', 'وضعیت', 'منبع', 'وضعیت کد'].map(q).join(',')];
    S.items.forEach(function (it) {
      var c = cur(it.id);
      rows.push([it.code || '', it.name, BR[it.src] || '', c && c.s === 'p' && c.p ? c.p : '', c && c.s === 'p' && c.p ? P.cheque(c, it.grp) : '', c ? { p: 'قیمت دارد', i: 'استعلام بگیرید', r: 'درحال شارژ', n: 'توافقی' }[c.s] : '', c ? (c.edited ? 'ویرایش' : 'لیست ' + P.date()) : '', ST8.retired(it.id) ? 'کنار گذاشته' : ''].map(q).join(','));
    });
    var blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'Max_Silver_List_Prices.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  // ---------- price template: finance audits the prices in an Excel file; the sales manager (or management) uploads it and the prices update
  var TPL_HEAD = ['شناسه برنامه (تغییر ندهید)', 'کد کالا', 'نام کالا', 'برند', 'دسته', 'قیمت (تومان)', 'توضیح (اختیاری)'];   // one price column, edited in place
  var STT = { p: 'نقدی', i: 'استعلام', r: 'شارژ', n: 'توافقی' };
  function parseStatus(v) {
    var k = norm(v).replace(/\s+/g, '');
    if (!k) return '';
    if (k === 'p' || k.indexOf('قیمت') === 0 || k.indexOf('نقد') === 0) return 'p';
    if (k === 'n' || k.indexOf('توافق') === 0) return 'n';
    if (k === 'i' || k.indexOf('استعلام') === 0) return 'i';
    if (k === 'r' || k.indexOf('شارژ') === 0 || k.indexOf('مجدد') >= 0) return 'r';
    return '?';
  }
  function downloadTemplate() {
    var rows = [TPL_HEAD];
    S.items.filter(function (it) { return !ST8.retired(it.id); }).forEach(function (it) {
      var c = cur(it.id);
      rows.push([it.id, it.code || '', it.name, BR[it.src] || '', it.cat || '', c ? (c.s === 'p' ? (c.p || '') : STT[c.s]) : '', '']);
    });
    var guide = [['راهنمای بازبینی قیمت'],
      ['این فایل در Google Sheets هم باز می‌شود: آن را در Google Drive بارگذاری کنید، با Google Sheets باز و ویرایش کنید، سپس از «File ← Download ← Microsoft Excel (.xlsx)» دانلود کنید و همین‌جا بارگذاری کنید.'],
      ['۱. فقط یک ستون قیمت هست: «قیمت (تومان)». قیمت نقدی فعلی هر کالا در آن نوشته شده؛ برای تغییر، همان خانه را ویرایش کنید. قیمت اعتباری (چکی) را خود سایت با درصد گروه حساب می‌کند.'],
      ['۲. به‌جای عدد می‌توانید یکی از این کلمه‌ها را بنویسید: توافقی، استعلام، شارژ. «توافقی» یعنی عدد ندارد و کارشناس فروش با مشتری توافق می‌کند.'],
      ['۳. قیمت را به تومان و فقط به صورت عدد بنویسید (رقم فارسی یا انگلیسی، با یا بدون جداکننده). خانهٔ خالی یعنی «تغییری نیست»؛ ردیفی که قیمتش عوض نشده نادیده گرفته می‌شود.'],
      ['۴. ستون‌های دیگر (به‌ویژه ستون اول، شناسه برنامه) را تغییر ندهید؛ «توضیح» اختیاری است.'],
      ['۵. فایل بازبینی‌شده را فقط افراد مجاز به تغییر قیمت در بخش «قیمت‌ها ← بارگذاری قیمت‌های بازبینی‌شده» می‌دهند؛ پیش‌نمایش تغییرات نشان داده می‌شود و فقط پس از تأیید اعمال می‌شود.'],
      ['۶. این قالب قیمت لیست فعلی (پایه یا ویرایش‌شده) را نشان می‌دهد. کالاهای کنار گذاشته‌شده در قالب نیستند.']];
    window.MSXlsx.save(window.MSXlsx.blob([
      { name: 'قیمت‌ها', rows: rows, widths: [24, 14, 46, 14, 22, 20, 30], freeze: true, filter: true, inputCols: [6, 7] },
      { name: 'راهنما', rows: guide, widths: [120], guide: true }
    ]), 'Max_Silver_Price_Template.xlsx');
  }
  function impHtml() {
    var m = S.imp; if (!m) return '';
    var fmt = function (c) { return c ? (c.s === 'p' ? faInt.format(c.p) : STT[c.s]) : 'بدون قیمت'; };
    return '<section class="pr-imp"><h2>' + (m.title ? 'پیش‌نمایش ' + esc(m.title) : 'پیش‌نمایش بارگذاری: ' + esc(m.name)) + '</h2><p class="pr-lead">' + faInt.format(m.changes.length) + ' تغییر قیمت یا وضعیت · ' + faInt.format(m.same) + ' ردیف بدون تغییر' + (m.errs.length ? ' · ' + faInt.format(m.errs.length) + ' ردیف دارای خطا' : '') + '</p>' +
      (m.errs.length ? '<ul class="pr-errs">' + m.errs.slice(0, 30).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + (m.errs.length > 30 ? '<li>…</li>' : '') + '</ul>' : '') +
      (m.changes.length ? '<div class="pr-tw"><table class="pr-tbl"><thead><tr><th>کالا</th><th>قبل</th><th>بعد</th><th>تغییر</th></tr></thead><tbody>' + m.changes.slice(0, 120).map(function (x) {
        var d = x.old && x.old.s === 'p' && x.old.p && x.nw.s === 'p' ? Math.round((x.nw.p - x.old.p) / x.old.p * 1000) / 10 : null;
        return '<tr><td>' + esc(x.it.name) + (x.it.code ? ' <code>' + esc(x.it.code) + '</code>' : '') + '</td><td>' + esc(fmt(x.old)) + '</td><td><b>' + esc(fmt(x.nw)) + '</b></td><td>' + (d == null ? '—' : '<span dir="ltr" class="' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d > 0 ? '+' : '') + faInt.format(d) + '٪</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (m.changes.length > 120 ? '<p class="pr-note">و ' + faInt.format(m.changes.length - 120) + ' تغییر دیگر.</p>' : '') : '') +
      '<div class="pr-acts"><button type="button" class="pr-btn" data-impok' + (m.changes.length && !S.busy ? '' : ' disabled') + '>اعمال ' + faInt.format(m.changes.length) + ' تغییر</button><button type="button" class="pr-btn alt" data-impno>انصراف</button></div></section>';
  }
  // one sheet of a revised price file; the price book has one sheet per brand and every sheet with the «شناسه برنامه» header is read
  function readSheet(rows, m, tag) {
      var pre = tag ? tag + '، ' : '', err = function (s) { m.errs.push(pre + s); };
      var hi = -1, i; for (i = 0; i < Math.min(rows.length, 10); i++) if ((rows[i] || []).some(function (c) { return String(c || '').indexOf('شناسه برنامه') >= 0; })) { hi = i; break; }
      if (hi < 0) return false;
      var H = rows[hi].map(function (c) { return String(c || ''); }), col = function (s) { for (var k = 0; k < H.length; k++) if (H[k].indexOf(s) >= 0) return k; return -1; };
      var cId = col('شناسه برنامه'), cCode = col('کد کالا'), cP = col('قیمت نقدی جدید') >= 0 ? col('قیمت نقدی جدید') : col('قیمت جدید'), cC = col('قیمت اعتباری جدید') >= 0 ? col('قیمت اعتباری جدید') : col('قیمت چکی جدید'), cS = col('وضعیت جدید'), cN = col('توضیح');
      var cNew = col('قیمت جدید (تومان)'), cOne = cNew >= 0 ? cNew : (col('قیمت نقدی (تومان)') >= 0 ? col('قیمت نقدی (تومان)') : col('قیمت (تومان)'));   // one price column (the price book's «Price Changes» sheet or the old template)
      if (cOne >= 0 && (cP < 0 || cNew >= 0)) {
        rows.slice(hi + 1).forEach(function (r, n) {
          var line = hi + n + 2, v = r[cOne], txt = v == null ? '' : String(v).trim();
          if (!txt) return;
          var id = String(r[cId] == null ? '' : r[cId]).trim(), it = itemById(id) || (cCode >= 0 && r[cCode] ? byCode(r[cCode]) : null);
          if (!it) { err('ردیف ' + faInt.format(line) + ': کالا پیدا نشد (شناسه یا کد درست نیست).'); return; }
          var old = cur(it.id), nw, num = /[0-9۰-۹٠-٩]/.test(txt) ? P.parse(txt) : 0;
          if (num > 0) {
            if (num >= 100000000000) { err('ردیف ' + faInt.format(line) + ' (' + it.name + '): قیمت درست نیست.'); return; }
            nw = { p: num, s: 'p' }; if (old && old.c > 0) nw.c = old.c;
          } else {
            var st = parseStatus(txt);
            if (txt.replace(/\s+/g, '') === 'بدونقیمت' || st === 'p') return;
            if (st === '?') { err('ردیف ' + faInt.format(line) + ' (' + it.name + '): «' + txt + '» درست نیست؛ عدد یا یکی از توافقی، استعلام، شارژ بنویسید.'); return; }
            nw = { p: 0, s: st };
          }
          if (old && old.s === nw.s && (old.p || 0) === nw.p && (old.c || 0) === (nw.c || 0)) { m.same++; return; }
          m.changes.push({ it: it, old: old, nw: nw, note: cN >= 0 && r[cN] ? String(r[cN]).slice(0, 200) : '' });
        });
        return true;
      }
      if (cP < 0 || cS < 0) throw new Error('ستون «قیمت (تومان)» در فایل نیست. قالب را از همین صفحه دانلود کنید.');
      rows.slice(hi + 1).forEach(function (r, n) {
        var line = hi + n + 2, pv = r[cP], sv = r[cS], cv = cC >= 0 ? r[cC] : null;
        var hasP = pv != null && String(pv).trim() !== '', hasS = sv != null && String(sv).trim() !== '', hasC = cv != null && String(cv).trim() !== '';
        if (!hasP && !hasS && !hasC) return;
        var id = String(r[cId] == null ? '' : r[cId]).trim(), it = itemById(id) || (cCode >= 0 && r[cCode] ? byCode(r[cCode]) : null);
        if (!it) { err('ردیف ' + faInt.format(line) + ': کالا پیدا نشد (شناسه یا کد درست نیست).'); return; }
        var st = parseStatus(sv), price = P.parse(pv), chq = hasC ? P.parse(cv) : 0;
        if (!hasS && !hasP && hasC) { var oc = cur(it.id); st = oc ? oc.s : 'p'; price = oc && oc.p ? oc.p : 0; }
        if (st === '?') { err('ردیف ' + faInt.format(line) + ' (' + it.name + '): وضعیت «' + sv + '» درست نیست؛ یکی از نقدی، استعلام، شارژ، توافقی.'); return; }
        var nw;
        if (st === 'i' || st === 'r' || st === 'n') nw = { p: 0, s: st };
        else if (price > 0 && price < 100000000000) { nw = { p: price, s: 'p' }; var oc2 = cur(it.id); if (hasC && chq > 0 && chq < 100000000000) nw.c = chq; else if (oc2 && oc2.c > 0) nw.c = oc2.c; }
        else { err('ردیف ' + faInt.format(line) + ' (' + it.name + '): قیمت درست نیست.'); return; }
        var old = cur(it.id);
        if (old && old.s === nw.s && (old.p || 0) === nw.p && (old.c || 0) === (nw.c || 0)) { m.same++; return; }
        m.changes.push({ it: it, old: old, nw: nw, note: cN >= 0 && r[cN] ? String(r[cN]).slice(0, 200) : '' });
      });
      return true;
  }
  function readTemplate(file) {
    S.error = ''; S.msg = ''; S.imp = null;
    window.MSXlsx.readAll(file).then(function (sheets) {
      var m = { name: file.name, changes: [], same: 0, errs: [] }, found = 0;
      sheets.forEach(function (sh) { if (readSheet(sh.rows, m, sheets.length > 1 ? sh.name : '')) found++; });
      if (!found) throw new Error('این فایل قالب بازبینی قیمت نیست (ستون «شناسه برنامه» پیدا نشد). قالب یا کتاب قیمت را از همین‌جا یا از مدیر بگیرید.');
      S.imp = m;
    }).then(null, function (e) { S.error = e && e.message ? e.message : errText(e); }).then(render);
  }
  function applyImport() {
    var m = S.imp; if (!m || !m.changes.length || S.busy) return;
    if (!window.confirm(faInt.format(m.changes.length) + ' قیمت یا وضعیت تغییر کند؟')) return;
    S.busy = 'imp'; S.error = ''; S.msg = ''; render();
    var now = Date.now(), list = m.changes.slice(), done = 0;
    function next() {
      if (!list.length) return Promise.resolve();
      var chunk = list.splice(0, 400), b = db.batch();
      chunk.forEach(function (x) { var dd = { p: x.nw.p, s: x.nw.s, at: now, by: S.user.uid, byName: myName(), prev: x.old && x.old.p ? x.old.p : 0 }; if (x.nw.c > 0) dd.c = x.nw.c; b.set(db.collection('list_prices').doc(x.it.id), dd); });
      return b.commit().then(function () { chunk.forEach(function (x) { P.setOne(x.it.id, { p: x.nw.p, s: x.nw.s, c: x.nw.c || 0, at: now, by: myName() }); }); logChanges(chunk.map(function (x) { return { it: x.it, old: x.old, nw: x.nw, at: now }; }), 'excel'); done += chunk.length; return next(); });
    }
    next().then(function () { S.msg = faInt.format(done) + ' قیمت به‌روز شد.'; S.imp = null; }, function (e) { S.error = errText(e) + (done ? ' (' + faInt.format(done) + ' مورد قبل از خطا اعمال شد.)' : ''); }).then(function () { S.busy = ''; render(); });
  }

  // ---------- events
  function rowOf(el) { var r = el.closest('.pr-row'); return r ? r.getAttribute('data-id') : ''; }
  function markDirty(r) { if (r) { r.classList.add('dirty'); var b = r.querySelector('[data-save]'); if (b) b.disabled = false; } }
  root.addEventListener('click', function (e) {
    var t, id;
    if ((t = e.target.closest('[data-brand]'))) { S.brand = t.getAttribute('data-brand'); S.shown = 60; render(); return; }
    if ((t = e.target.closest('[data-flt]'))) { S.flt = t.getAttribute('data-flt'); S.shown = 60; render(); return; }
    if (e.target.closest('[data-more]')) { S.shown += 60; render(); return; }
    if (e.target.closest('[data-hist]')) { S.histOpen = !S.histOpen; if (S.histOpen && S.log == null) loadLog(); else render(); return; }
    if (e.target.closest('[data-histx]')) { exportLog(); return; }
    if (e.target.closest('[data-csv]')) { csv(); return; }
    if (e.target.closest('[data-tpl]')) { downloadTemplate(); return; }
    if (e.target.closest('[data-edsave]')) { saveEditors(); return; }
    if (e.target.closest('[data-mksave]')) { saveMarkup(); return; }
    if (e.target.closest('[data-pctgo]')) { previewPct(); return; }
    if (e.target.closest('[data-impok]')) { applyImport(); return; }
    if (e.target.closest('[data-impno]')) { S.imp = null; render(); return; }
    if ((t = e.target.closest('[data-st]'))) {
      id = rowOf(t); var s = t.getAttribute('data-st');
      S.draft[id] = S.draft[id] || {}; S.draft[id].s = s; if (s !== 'p') S.draft[id].p = 0;
      var r = t.closest('.pr-row'), inp = r.querySelector('[data-in]');
      r.querySelectorAll('[data-st]').forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); });
      inp.disabled = s !== 'p'; if (s !== 'p') inp.value = ''; else inp.focus();
      markDirty(r); return;
    }
    if ((t = e.target.closest('[data-ret]'))) { S.ret = rowOf(t); S.repIn = ''; S.noteIn = ''; render(); var ri = root.querySelector('[data-rep]'); if (ri) ri.focus(); return; }
    if (e.target.closest('[data-retno]')) { S.ret = ''; render(); return; }
    if ((t = e.target.closest('[data-retok]'))) { retire(rowOf(t)); return; }
    if ((t = e.target.closest('[data-unret]'))) { if (window.confirm('این کد دوباره در کاتالوگ و پیش‌فاکتور فعال شود؟')) unretire(rowOf(t)); return; }
    if ((t = e.target.closest('[data-save]'))) { save(rowOf(t)); return; }
    if ((t = e.target.closest('[data-reset]'))) { if (window.confirm('قیمت ویرایش‌شده حذف شود و قیمت لیست پایه برگردد؟')) reset(rowOf(t)); }
  });
  root.addEventListener('change', function (e) {
    if (e.target.id === 'prFile' && e.target.files[0]) { readTemplate(e.target.files[0]); return; }
    if (e.target.id === 'prEd1') { S.pick1 = e.target.value; return; }
    if (e.target.id === 'prEd2') { S.pick2 = e.target.value; return; }
    if (e.target.id === 'prGrp') { S.pGrp = e.target.value; S.pCat = ''; render(); return; }
    if (e.target.id === 'prCat') { S.pCat = e.target.value; return; }
    if (e.target.id === 'prPBr') { S.pBr = e.target.value; return; }
    if (e.target.id === 'prRound') { S.pRound = e.target.value; return; }
  });
  root.addEventListener('input', function (e) {
    if (e.target.id === 'prQ') { S.q = e.target.value; S.shown = 60; var l = document.getElementById('prList'); if (l) { render(); } return; }
    if (e.target.id === 'prPct') { S.pPct = e.target.value; return; }
    if (e.target.matches('[data-rep]')) { S.repIn = e.target.value; return; }
    if (e.target.matches('[data-note]')) { S.noteIn = e.target.value; return; }
    if (e.target.matches('[data-in]')) {
      var id = rowOf(e.target), v = P.parse(e.target.value);
      S.draft[id] = S.draft[id] || {}; S.draft[id].p = v; S.draft[id].s = 'p';
      var shown = v ? faInt.format(v) : '';
      if (e.target.value !== shown) e.target.value = shown;
      var r = e.target.closest('.pr-row');
      r.querySelectorAll('[data-st]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-st') === 'p')); });
      markDirty(r);
    }
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('[data-in]')) { e.preventDefault(); save(rowOf(e.target)); }
    if (e.key === 'Enter' && e.target.matches('[data-rep],[data-note]')) { e.preventDefault(); retire(rowOf(e.target)); }
  });
  ST8.onChange(function () { if (S.user && S.profile && !document.activeElement.matches('[data-in],[data-rep],[data-note]')) render(); });
  P.onChange(function () { if (S.user && S.profile && !document.activeElement.matches('[data-in]')) render(); });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.items = [];
    if (!u) { S.loading = false; render(); return; }
    load();
  });
  render();
})();

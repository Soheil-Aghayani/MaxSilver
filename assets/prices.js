// Price panel: sales management, management and organizational technology edit the list prices of the catalog (toman).
// An edit is a document in Firestore (list_prices/<product id>) that wins over the price list file; «بازگشت به لیست» deletes it.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('pr'), P = window.MSPrices;
  var VER = (document.currentScript && /[?&]v=(\d+)/.exec(document.currentScript.src) || [])[1] || '';
  if (!root) return;
  if (!cfg || !window.firebase || !P) { root.innerHTML = '<p class="pr-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var faInt = new Intl.NumberFormat('fa-IR'), faDate = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short' });
  var BR = { 'max-silver': 'مکث‌سیلور', wintora: 'وینتورا', 'torbo-max': 'توربومکس' };
  var ST = [['p', 'قیمت'], ['i', 'استعلام'], ['r', 'شارژ']];
  var S = { user: null, profile: null, loading: true, error: '', msg: '', items: [], q: '', brand: 'all', flt: 'all', shown: 60, draft: {}, busy: '' };
  var I = {
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
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
      if (S.flt === 'edited' && !(c && c.edited)) return false;
      return !q || norm(it.name + ' ' + (it.code || '') + ' ' + (it.cat || '')).indexOf(q) >= 0;
    });
  }
  function counts() {
    var n = { priced: 0, none: 0, inquiry: 0, restock: 0, edited: 0 };
    S.items.forEach(function (it) {
      var c = cur(it.id);
      if (!c) n.none++; else { if (c.s === 'p' && c.p > 0) n.priced++; else if (c.s === 'i') n.inquiry++; else if (c.s === 'r') n.restock++; if (c.edited) n.edited++; }
    });
    return n;
  }
  function chip(attr, val, on, text, n) { return '<button type="button" class="pr-chip" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + text + (n != null ? ' <b>' + faInt.format(n) + '</b>' : '') + '</button>'; }

  function row(it) {
    var c = cur(it.id), d = dval(it), dirty = !!S.draft[it.id];
    var src = c ? (c.edited ? 'ویرایش' + (c.by ? ' ' + esc(c.by) : '') + (c.at ? ' · ' + faDate.format(new Date(c.at)) : '') : 'لیست ' + esc(P.date())) : 'بدون قیمت';
    return '<article class="pr-row' + (dirty ? ' dirty' : '') + '" data-id="' + esc(it.id) + '">' +
      '<div class="pr-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async">' : '') + '</div>' +
      '<div class="pr-name"><b>' + esc(it.name) + '</b><span>' + (it.code ? '<code>' + esc(it.code) + '</code>' : '') + '<i class="pr-br" data-b="' + esc(it.src) + '">' + esc(BR[it.src] || '') + '</i></span><small>' + src + '</small></div>' +
      '<div class="pr-edit"><label class="pr-field"><input class="pr-in" type="text" inputmode="numeric" autocomplete="off" data-in value="' + (d.s === 'p' && d.p ? esc(faInt.format(d.p)) : '') + '" placeholder="۰"' + (d.s === 'p' ? '' : ' disabled') + ' aria-label="قیمت ' + esc(it.name) + '"><span>تومان</span></label>' +
      '<div class="pr-st" role="radiogroup" aria-label="وضعیت">' + ST.map(function (x) { return '<button type="button" role="radio" data-st="' + x[0] + '" aria-checked="' + (d.s === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="pr-act"><button type="button" class="pr-ic" data-save aria-label="ذخیره" title="ذخیره"' + (dirty ? '' : ' disabled') + '>' + I.save + '</button>' +
      '<button type="button" class="pr-ic" data-reset aria-label="بازگشت به لیست" title="بازگشت به قیمت لیست"' + (c && c.edited ? '' : ' disabled') + '>' + I.undo + '</button></div></article>';
  }
  function listHtml() {
    var list = filtered(), n = counts();
    return '<div class="pr-bar"><input id="prQ" type="search" placeholder="جست‌وجوی نام، کد، دسته…" value="' + esc(S.q) + '" autocomplete="off">' +
      '<button type="button" class="pr-ic wide" data-csv title="دانلود قیمت‌ها (Excel)" aria-label="دانلود قیمت‌ها">' + I.csv + '</button></div>' +
      '<div class="pr-chips" role="group" aria-label="برند">' + chip('data-brand', 'all', S.brand === 'all', 'همه برندها') + Object.keys(BR).map(function (k) { return chip('data-brand', k, S.brand === k, BR[k]); }).join('') + '</div>' +
      '<div class="pr-chips" role="group" aria-label="وضعیت قیمت">' +
      chip('data-flt', 'all', S.flt === 'all', 'همه') + chip('data-flt', 'priced', S.flt === 'priced', 'قیمت‌دار', n.priced) + chip('data-flt', 'none', S.flt === 'none', 'بدون قیمت', n.none) +
      chip('data-flt', 'inquiry', S.flt === 'inquiry', 'استعلام', n.inquiry) + chip('data-flt', 'restock', S.flt === 'restock', 'شارژ', n.restock) + chip('data-flt', 'edited', S.flt === 'edited', 'ویرایش‌شده', n.edited) + '</div>' +
      '<div class="pr-list" id="prList">' + list.slice(0, S.shown).map(row).join('') + '</div>' +
      (list.length > S.shown ? '<button type="button" class="pr-more" data-more>نمایش بیشتر (' + faInt.format(list.length - S.shown) + ')</button>' : '') +
      (list.length ? '' : '<p class="pr-note">محصولی پیدا نشد.</p>');
  }
  function view() {
    if (S.loading) return '<p class="pr-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="pr-note">برای ویرایش قیمت‌ها ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="pr-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('pricesEdit')) return '<p class="pr-note">ویرایش قیمت فقط برای مدیر فروش، مدیریت و تکنولوژی سازمانی است. قیمت‌ها را در کاتالوگ می‌بینید.</p>';
    return '<h1>قیمت‌ها</h1><p class="pr-lead">قیمت لیست محصولات به تومان. قیمتی که اینجا ذخیره کنید جای قیمت لیست پایه (توربومکس، ' + esc(P.date()) + ') را می‌گیرد و در کاتالوگ و پیش‌فاکتور برای همه دیده می‌شود.</p>' +
      (S.error ? '<p class="pr-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.msg ? '<p class="pr-ok" role="status">' + esc(S.msg) + '</p>' : '') + listHtml();
  }
  function render() {
    var a = document.activeElement, keepQ = a && a.id === 'prQ' ? a.selectionStart : null;
    root.innerHTML = view();
    if (window.MSGate) window.MSGate.apply();
    if (keepQ !== null) { var q = document.getElementById('prQ'); if (q) { q.focus(); try { q.setSelectionRange(keepQ, keepQ); } catch (e) { /* ignore */ } } }
  }

  // ---------- data
  function load() {
    S.loading = true; render();
    var catalog = fetch('./assets/catalog.json' + (VER ? '?v=' + VER : '')).then(function (r) { return r.json(); });
    db.collection('users').doc(S.user.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('pricesEdit')) return null;
      return Promise.all([catalog, P.load(), db.collection('list_prices').get()]).then(function (res) {
        S.items = res[0].items;
        var m = {};
        res[2].forEach(function (s) { var d = s.data(); m[s.id] = { p: d.p || 0, s: d.s || 'p', at: d.at || 0, by: d.byName || '' }; });
        P.setEdits(m);
      });
    }).then(null, function (e) { S.error = errText(e); }).then(function () { S.loading = false; render(); });
  }
  function save(id) {
    var it = S.items.filter(function (x) { return x.id === id; })[0], d = dval(it), c = cur(id);
    if (d.s === 'p' && !(d.p > 0)) { S.error = 'قیمت را بنویسید یا وضعیت «استعلام» یا «شارژ» را بزنید.'; S.msg = ''; render(); return; }
    var doc = { p: d.s === 'p' ? d.p : 0, s: d.s, at: Date.now(), by: S.user.uid, byName: myName(), prev: c && c.p ? c.p : 0 };
    S.error = ''; S.msg = '';
    db.collection('list_prices').doc(id).set(doc).then(function () {
      P.setOne(id, { p: doc.p, s: doc.s, at: doc.at, by: doc.byName });
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
  function csv() {
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = [['کد', 'نام', 'برند', 'قیمت (تومان)', 'وضعیت', 'منبع'].map(q).join(',')];
    S.items.forEach(function (it) {
      var c = cur(it.id);
      rows.push([it.code || '', it.name, BR[it.src] || '', c && c.s === 'p' && c.p ? c.p : '', c ? { p: 'قیمت دارد', i: 'استعلام بگیرید', r: 'درحال شارژ' }[c.s] : '', c ? (c.edited ? 'ویرایش' : 'لیست ' + P.date()) : ''].map(q).join(','));
    });
    var blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'Max_Silver_List_Prices.csv'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  // ---------- events
  function rowOf(el) { var r = el.closest('.pr-row'); return r ? r.getAttribute('data-id') : ''; }
  function markDirty(r) { if (r) { r.classList.add('dirty'); var b = r.querySelector('[data-save]'); if (b) b.disabled = false; } }
  root.addEventListener('click', function (e) {
    var t, id;
    if ((t = e.target.closest('[data-brand]'))) { S.brand = t.getAttribute('data-brand'); S.shown = 60; render(); return; }
    if ((t = e.target.closest('[data-flt]'))) { S.flt = t.getAttribute('data-flt'); S.shown = 60; render(); return; }
    if (e.target.closest('[data-more]')) { S.shown += 60; render(); return; }
    if (e.target.closest('[data-csv]')) { csv(); return; }
    if ((t = e.target.closest('[data-st]'))) {
      id = rowOf(t); var s = t.getAttribute('data-st');
      S.draft[id] = S.draft[id] || {}; S.draft[id].s = s; if (s !== 'p') S.draft[id].p = 0;
      var r = t.closest('.pr-row'), inp = r.querySelector('[data-in]');
      r.querySelectorAll('[data-st]').forEach(function (b) { b.setAttribute('aria-checked', String(b === t)); });
      inp.disabled = s !== 'p'; if (s !== 'p') inp.value = ''; else inp.focus();
      markDirty(r); return;
    }
    if ((t = e.target.closest('[data-save]'))) { save(rowOf(t)); return; }
    if ((t = e.target.closest('[data-reset]'))) { if (window.confirm('قیمت ویرایش‌شده حذف شود و قیمت لیست پایه برگردد؟')) reset(rowOf(t)); }
  });
  root.addEventListener('input', function (e) {
    if (e.target.id === 'prQ') { S.q = e.target.value; S.shown = 60; var l = document.getElementById('prList'); if (l) { render(); } return; }
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
  });
  P.onChange(function () { if (S.user && S.profile && !document.activeElement.matches('[data-in]')) render(); });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.items = [];
    if (!u) { S.loading = false; render(); return; }
    load();
  });
  render();
})();

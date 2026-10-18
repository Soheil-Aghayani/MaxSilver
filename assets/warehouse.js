// Warehouse and inventory (انبار و موجودی). The warehouse (role operations) types the stock of a product or loads it from an Excel template;
// every change reaches the account manager at once (Firestore live listeners). Stock has three numbers: on hand (qty), claimed (reserved,
// held for an order by the account manager) and free (qty - reserved). Only the account manager claims or releases stock.
//   inventory/<product id>          { qty, reserved, loc, serials, note, updatedAt, updatedBy, updatedByName }
//   inventory_claims/<auto id>      { pid, qty, ref, customer, note, status: active | released | shipped, at, by, byName }
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('wh');
  var VER = (document.currentScript && /[?&]v=(\d+)/.exec(document.currentScript.src) || [])[1] || '';
  if (!root) return;
  if (!cfg || !window.firebase || !window.MSXlsx) { root.innerHTML = '<p class="wh-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var faInt = new Intl.NumberFormat('fa-IR');
  var BR = { 'max-silver': 'مکث‌سیلور', wintora: 'وینتورا', 'torbo-max': 'توربومکس' };
  var S = { user: null, profile: null, loading: true, items: [], inv: {}, claims: [], q: '', brand: 'all', flt: 'all', shown: 50, draft: {}, claim: '', cIn: { qty: '1', ref: '' }, msg: '', error: '', imp: null, busy: '' };
  var unsubInv = null, unsubCl = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function latin(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); }
  function norm(s) { return latin(String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, ' ').replace(/\s+/g, ' ').trim()).toLowerCase(); }
  function num(s) { var t = latin(s).replace(/[^\d]/g, ''); return t === '' ? null : Number(t); }
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ این کار را ندارید (یا قوانین پایگاه داده هنوز منتشر نشده است، یا موجودی از مقدار رزرو کمتر شده است).';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  var can = function (a) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, a)); };
  var myName = function () { return (S.profile && S.profile.name) || (S.user && S.user.email) || ''; };
  function itemById(id) { return S.items.filter(function (x) { return x.id === id; })[0] || null; }
  function byCode(code) { var k = norm(code); return k ? S.items.filter(function (x) { return x.code && norm(x.code) === k; })[0] || null : null; }
  function stock(id) { var d = S.inv[id]; return d ? { qty: d.qty || 0, res: d.reserved || 0, free: Math.max(0, (d.qty || 0) - (d.reserved || 0)), loc: d.loc || '', serials: d.serials || '', note: d.note || '', at: d.updatedAt || 0, by: d.updatedByName || '' } : null; }
  function when(ms) { try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(ms)); } catch (e) { return ''; } }

  // ---------- list
  function filtered() {
    var q = norm(S.q);
    return S.items.filter(function (it) {
      if (S.brand !== 'all' && it.src !== S.brand) return false;
      var s = stock(it.id);
      if (S.flt === 'stock' && !(s && s.qty > 0)) return false;
      if (S.flt === 'free' && !(s && s.free > 0)) return false;
      if (S.flt === 'claimed' && !(s && s.res > 0)) return false;
      if (S.flt === 'none' && s && s.qty > 0) return false;
      return !q || norm(it.name + ' ' + (it.code || '') + ' ' + (it.cat || '')).indexOf(q) >= 0;
    });
  }
  function counts() {
    var n = { stock: 0, free: 0, claimed: 0, none: 0 };
    S.items.forEach(function (it) { var s = stock(it.id); if (s && s.qty > 0) { n.stock++; if (s.free > 0) n.free++; if (s.res > 0) n.claimed++; } else n.none++; });
    return n;
  }
  function chip(attr, val, on, text, n) { return '<button type="button" class="wh-chip" ' + attr + '="' + val + '" aria-pressed="' + on + '">' + text + (n != null ? ' <b>' + faInt.format(n) + '</b>' : '') + '</button>'; }
  function claimForm(it, s) {
    return '<div class="wh-claim"><label>تعداد (حداکثر ' + faInt.format(s ? s.free : 0) + ')<input type="text" inputmode="numeric" data-cq value="' + esc(S.cIn.qty) + '" autocomplete="off"></label>' +
      '<label>شمارهٔ سفارش یا مشتری<input type="text" data-cr value="' + esc(S.cIn.ref) + '" maxlength="60" autocomplete="off" placeholder="مثلاً CON-TEH-051025-4827"></label>' +
      '<div class="wh-cb"><button type="button" class="wh-btn" data-claimok>ثبت رزرو</button><button type="button" class="wh-btn alt" data-claimno>انصراف</button></div></div>';
  }
  function row(it) {
    var s = stock(it.id), d = S.draft[it.id] || {}, edit = can('warehouseEdit'), dirty = !!S.draft[it.id];
    var v = function (k, base) { return d[k] != null ? d[k] : base; };
    return '<article class="wh-row' + (dirty ? ' dirty' : '') + '" data-id="' + esc(it.id) + '"><div class="wh-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async">' : '') + '</div>' +
      '<div class="wh-name"><b>' + esc(it.name) + '</b><span>' + (it.code ? '<code>' + esc(it.code) + '</code>' : '') + '<i class="wh-br">' + esc(BR[it.src] || '') + '</i></span>' +
      (s && (s.loc || s.serials) ? '<small>' + (s.loc ? 'مکان: ' + esc(s.loc) : '') + (s.serials ? (s.loc ? ' · ' : '') + 'سریال: ' + esc(s.serials.slice(0, 60)) + (s.serials.length > 60 ? '…' : '') : '') + '</small>' : '') +
      (s && s.at ? '<small class="wh-up">به‌روز: ' + esc(when(s.at)) + (s.by ? ' · ' + esc(s.by) : '') + '</small>' : '') + '</div>' +
      '<div class="wh-nums" aria-label="موجودی"><span class="wh-n"><small>موجود</small><b data-v="qty">' + faInt.format(s ? s.qty : 0) + '</b></span><span class="wh-n res"><small>رزرو</small><b data-v="res">' + faInt.format(s ? s.res : 0) + '</b></span><span class="wh-n free' + (s && s.free > 0 ? ' on' : '') + '"><small>آزاد</small><b data-v="free">' + faInt.format(s ? s.free : 0) + '</b></span></div>' +
      (edit ? '<div class="wh-edit"><label>موجودی<input class="wh-in" type="text" inputmode="numeric" data-f="qty" autocomplete="off" value="' + esc(v('qty', s ? faInt.format(s.qty) : '')) + '"></label>' +
        '<label>مکان<input class="wh-in" type="text" data-f="loc" maxlength="60" autocomplete="off" value="' + esc(v('loc', s ? s.loc : '')) + '"></label>' +
        '<label class="wide">سریال‌ها (با ویرگول)<input class="wh-in" type="text" data-f="serials" maxlength="2000" autocomplete="off" value="' + esc(v('serials', s ? s.serials : '')) + '"></label>' +
        '<button type="button" class="wh-ic" data-save aria-label="ذخیره" title="ذخیره"' + (dirty ? '' : ' disabled') + '>ذخیره</button></div>' : '') +
      (can('warehouseClaim') && s && s.free > 0 ? '<div class="wh-act"><button type="button" class="wh-btn alt" data-claim>رزرو برای سفارش</button></div>' : '') +
      (S.claim === it.id ? claimForm(it, s) : '') + '</article>';
  }
  function claimsHtml() {
    var list = S.claims.filter(function (c) { return c.status === 'active'; });
    if (!list.length) return '';
    return '<section class="wh-cl"><h2>رزروهای فعال <small>' + faInt.format(list.length) + '</small></h2><ul>' + list.slice(0, 60).map(function (c) {
      var it = itemById(c.pid);
      return '<li><div><b>' + esc(it ? it.name : c.pid) + '</b><span>' + faInt.format(c.qty) + ' عدد' + (c.ref ? ' · ' + esc(c.ref) : '') + ' · ' + esc(c.byName || '') + ' · ' + esc(when(c.at)) + '</span></div>' +
        (can('warehouseClaim') ? '<span class="wh-cb"><button type="button" class="wh-btn alt" data-rel="' + esc(c.id) + '">آزادسازی</button><button type="button" class="wh-btn" data-ship="' + esc(c.id) + '">ارسال شد</button></span>' : '') + '</li>';
    }).join('') + '</ul></section>';
  }
  function impHtml() {
    var m = S.imp; if (!m) return '';
    return '<section class="wh-imp"><h2>پیش‌نمایش بارگذاری: ' + esc(m.name) + '</h2><p class="wh-lead">' + faInt.format(m.rows.length) + ' کالا تغییر می‌کند · ' + faInt.format(m.same) + ' بدون تغییر' + (m.errs.length ? ' · ' + faInt.format(m.errs.length) + ' ردیف دارای خطا' : '') + '</p>' +
      (m.errs.length ? '<ul class="wh-errs">' + m.errs.slice(0, 30).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (m.rows.length ? '<div class="wh-tw"><table class="wh-tbl"><thead><tr><th>کالا</th><th>موجودی قبل</th><th>موجودی بعد</th><th>مکان</th></tr></thead><tbody>' + m.rows.slice(0, 120).map(function (x) {
        return '<tr><td>' + esc(x.it.name) + '</td><td>' + faInt.format(x.old ? x.old.qty : 0) + '</td><td><b>' + faInt.format(x.doc.qty) + '</b></td><td>' + esc(x.doc.loc || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '') + '<div class="wh-cb"><button type="button" class="wh-btn" data-impok' + (m.rows.length && !S.busy ? '' : ' disabled') + '>اعمال</button><button type="button" class="wh-btn alt" data-impno>انصراف</button></div></section>';
  }
  function listHtml() {
    var list = filtered(), n = counts(), edit = can('warehouseEdit');
    return '<div class="wh-sum"><div><b>' + faInt.format(n.stock) + '</b><span>کالای موجود</span></div><div><b>' + faInt.format(n.free) + '</b><span>دارای موجودی آزاد</span></div><div><b>' + faInt.format(n.claimed) + '</b><span>دارای رزرو</span></div><div><b>' + faInt.format(n.none) + '</b><span>بدون موجودی</span></div></div>' +
      '<div class="wh-bar"><input id="whQ" type="search" placeholder="جست‌وجوی نام، کد، دسته…" value="' + esc(S.q) + '" autocomplete="off"></div>' +
      '<div class="wh-chips" role="group" aria-label="برند">' + chip('data-brand', 'all', S.brand === 'all', 'همه برندها') + Object.keys(BR).map(function (k) { return chip('data-brand', k, S.brand === k, BR[k]); }).join('') + '</div>' +
      '<div class="wh-chips" role="group" aria-label="وضعیت موجودی">' + chip('data-flt', 'all', S.flt === 'all', 'همه') + chip('data-flt', 'stock', S.flt === 'stock', 'موجود', n.stock) + chip('data-flt', 'free', S.flt === 'free', 'آزاد', n.free) + chip('data-flt', 'claimed', S.flt === 'claimed', 'رزرو‌شده', n.claimed) + chip('data-flt', 'none', S.flt === 'none', 'بدون موجودی', n.none) + '</div>' +
      '<div class="wh-tools"><button type="button" class="wh-btn alt" data-tpl>دانلود قالب Excel انبار</button>' + (edit ? '<label class="wh-btn">بارگذاری قالب پرشده<input type="file" id="whFile" accept=".xlsx,.xls" hidden></label>' : '') + '</div>' + impHtml() + claimsHtml() +
      '<div class="wh-list" id="whList">' + list.slice(0, S.shown).map(row).join('') + '</div>' +
      (list.length > S.shown ? '<button type="button" class="wh-more" data-more>نمایش بیشتر (' + faInt.format(list.length - S.shown) + ')</button>' : '') + (list.length ? '' : '<p class="wh-note">محصولی پیدا نشد.</p>');
  }
  function view() {
    if (S.loading) return '<p class="wh-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="wh-note">برای دیدن موجودی ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="wh-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('warehouse')) return '<p class="wh-note">این بخش برای انبار، اکانت منیجر و مدیریت است.</p>';
    return '<h1>انبار و موجودی</h1><p class="wh-lead">موجودی لحظه‌ای هر کالا. انبار موجودی را وارد می‌کند و اکانت منیجر همان لحظه می‌بیند چه مقدار «آزاد» (رزرو‌نشده) است و می‌تواند برای سفارش رزرو کند. ' +
      '<span class="wh-live" id="whLive">زنده</span></p>' + (S.error ? '<p class="wh-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.msg ? '<p class="wh-ok" role="status">' + esc(S.msg) + '</p>' : '') + listHtml();
  }
  function render() {
    var a = document.activeElement, keep = null;
    if (a && root.contains(a) && (a.id === 'whQ' || a.hasAttribute('data-f') || a.hasAttribute('data-cq') || a.hasAttribute('data-cr'))) {
      var r = a.closest('.wh-row'); keep = { id: a.id, f: a.getAttribute('data-f'), cq: a.hasAttribute('data-cq'), cr: a.hasAttribute('data-cr'), pid: r ? r.getAttribute('data-id') : '', at: a.selectionStart };
    }
    root.innerHTML = view();
    root.classList.toggle('wh-ro', !can('warehouseEdit'));
    if (window.MSGate) window.MSGate.apply();
    if (keep) {
      var el = keep.id ? document.getElementById(keep.id) : root.querySelector('.wh-row[data-id="' + (window.CSS && CSS.escape ? CSS.escape(keep.pid) : keep.pid) + '"] ' + (keep.f ? '[data-f="' + keep.f + '"]' : keep.cq ? '[data-cq]' : '[data-cr]'));
      if (el) { el.focus(); try { el.setSelectionRange(keep.at, keep.at); } catch (e) { /* ignore */ } }
    }
  }

  // ---------- writes
  function save(id) {
    var d = S.draft[id]; if (!d) return;
    var s = stock(id), qty = d.qty != null ? num(d.qty) : (s ? s.qty : 0);
    if (qty == null) qty = 0;
    if (s && qty < s.res) { S.error = 'موجودی از مقدار رزرو‌شده (' + faInt.format(s.res) + ') کمتر نمی‌شود؛ ابتدا رزرو را آزاد کنید.'; S.msg = ''; render(); return; }
    var doc = { qty: qty, reserved: s ? s.res : 0, loc: String(d.loc != null ? d.loc : (s ? s.loc : '')).trim().slice(0, 60), serials: String(d.serials != null ? d.serials : (s ? s.serials : '')).trim().slice(0, 2000), note: s ? s.note : '', updatedAt: Date.now(), updatedBy: S.user.uid, updatedByName: myName() };
    S.error = ''; S.msg = '';
    db.collection('inventory').doc(id).set(doc).then(function () { delete S.draft[id]; S.msg = 'ذخیره شد: ' + (itemById(id) || {}).name; }, function (e) { S.error = errText(e); }).then(render);
  }
  function claimStock(pid) {
    var qty = num(S.cIn.qty), ref = S.cIn.ref.trim();
    if (!(qty > 0)) { S.error = 'تعداد را بنویسید.'; render(); return; }
    var invRef = db.collection('inventory').doc(pid), cl = db.collection('inventory_claims').doc();
    S.error = ''; S.msg = '';
    db.runTransaction(function (tx) {
      return tx.get(invRef).then(function (snap) {
        var d = snap.exists ? snap.data() : null, free = d ? (d.qty || 0) - (d.reserved || 0) : 0;
        if (!d || qty > free) throw { code: 'not-enough', free: free };
        tx.update(invRef, { reserved: (d.reserved || 0) + qty, updatedAt: Date.now(), updatedBy: S.user.uid, updatedByName: myName() });
        tx.set(cl, { pid: pid, qty: qty, ref: ref.slice(0, 60), customer: '', note: '', status: 'active', at: Date.now(), by: S.user.uid, byName: myName() });
      });
    }).then(function () { S.claim = ''; S.cIn = { qty: '1', ref: '' }; S.msg = 'رزرو ثبت شد.'; },
      function (e) { S.error = e && e.code === 'not-enough' ? 'موجودی آزاد کافی نیست (فعلاً ' + faInt.format(e.free) + ' عدد آزاد است).' : errText(e); }).then(render);
  }
  function closeClaim(cid, status) {
    var c = S.claims.filter(function (x) { return x.id === cid; })[0]; if (!c || c.status !== 'active') return;
    var invRef = db.collection('inventory').doc(c.pid), ref = db.collection('inventory_claims').doc(cid);
    S.error = ''; S.msg = '';
    db.runTransaction(function (tx) {
      return tx.get(invRef).then(function (snap) {
        var d = snap.exists ? snap.data() : null;
        if (d) {
          var u = { reserved: Math.max(0, (d.reserved || 0) - c.qty), updatedAt: Date.now(), updatedBy: S.user.uid, updatedByName: myName() };
          tx.update(invRef, u);
        }
        tx.update(ref, { status: status, releasedAt: Date.now() });
      });
    }).then(function () { S.msg = status === 'shipped' ? 'ثبت شد: ارسال شد.' : 'رزرو آزاد شد.'; }, function (e) { S.error = errText(e); }).then(render);
  }

  // ---------- Excel template
  var HEAD = ['شناسه برنامه (تغییر ندهید)', 'کد کالا', 'نام کالا', 'برند', 'موجودی فعلی', 'رزرو‌شده', 'موجودی جدید', 'مکان (اختیاری)', 'سریال‌ها (اختیاری، با ویرگول)', 'توضیح (اختیاری)'];
  function downloadTemplate() {
    var rows = [HEAD];
    S.items.forEach(function (it) { var s = stock(it.id); rows.push([it.id, it.code || '', it.name, BR[it.src] || '', s ? s.qty : 0, s ? s.res : 0, '', s ? s.loc : '', s ? s.serials : '', s ? s.note : '']); });
    var guide = [['راهنمای قالب انبار'],
      ['۱. فقط ستون‌های زردرنگ را پر کنید: «موجودی جدید»، «مکان»، «سریال‌ها» و «توضیح». ستون اول (شناسه برنامه) کلید کالاست و تغییر نمی‌کند.'],
      ['۲. «موجودی جدید» تعداد واقعی کالا در انبار است (عدد کامل، رقم فارسی یا انگلیسی)، نه مقدار اضافه‌شده. خانهٔ خالی یعنی «موجودی تغییر نمی‌کند».'],
      ['۳. موجودی جدید نمی‌تواند از «رزرو‌شده» کمتر باشد؛ رزرو را اکانت منیجر آزاد می‌کند.'],
      ['۴. «مکان» و «سریال‌ها» فقط وقتی نوشته شده باشند جایگزین مقدار قبلی می‌شوند. سریال‌ها را با ویرگول جدا کنید.'],
      ['۵. فایل را در «انبار و موجودی ← بارگذاری قالب پرشده» بدهید؛ پیش‌نمایش را ببینید و اعمال کنید. اکانت منیجر همان لحظه موجودی را می‌بیند.']];
    window.MSXlsx.save(window.MSXlsx.blob([
      { name: 'موجودی', rows: rows, widths: [24, 14, 46, 14, 14, 12, 16, 18, 34, 28], freeze: true, filter: true, inputCols: [6, 7, 8, 9] },
      { name: 'راهنما', rows: guide, widths: [120], guide: true }
    ]), 'Max_Silver_Warehouse_Template.xlsx');
  }
  function readTemplate(file) {
    S.error = ''; S.msg = ''; S.imp = null;
    window.MSXlsx.read(file).then(function (rows) {
      var hi = -1, i; for (i = 0; i < Math.min(rows.length, 10); i++) if ((rows[i] || []).some(function (c) { return String(c || '').indexOf('شناسه برنامه') >= 0; })) { hi = i; break; }
      if (hi < 0) throw new Error('این فایل قالب انبار نیست (ستون «شناسه برنامه» پیدا نشد). قالب را از همین صفحه دانلود کنید.');
      var H = rows[hi].map(function (c) { return String(c || ''); }), col = function (s) { for (var k = 0; k < H.length; k++) if (H[k].indexOf(s) >= 0) return k; return -1; };
      var cId = col('شناسه برنامه'), cCode = col('کد کالا'), cQ = col('موجودی جدید'), cL = col('مکان'), cS = col('سریال'), cN = col('توضیح');
      if (cQ < 0) throw new Error('ستون «موجودی جدید» در فایل نیست.');
      var m = { name: file.name, rows: [], same: 0, errs: [] };
      rows.slice(hi + 1).forEach(function (r, n) {
        var line = hi + n + 2, qv = r[cQ], hasQ = qv != null && String(qv).trim() !== '';
        var loc = cL >= 0 && r[cL] != null ? String(r[cL]).trim() : '', ser = cS >= 0 && r[cS] != null ? String(r[cS]).trim() : '', note = cN >= 0 && r[cN] != null ? String(r[cN]).trim() : '';
        if (!hasQ && !loc && !ser && !note) return;
        var id = String(r[cId] == null ? '' : r[cId]).trim(), it = itemById(id) || (cCode >= 0 && r[cCode] ? byCode(r[cCode]) : null);
        if (!it) { m.errs.push('ردیف ' + faInt.format(line) + ': کالا پیدا نشد.'); return; }
        var old = stock(it.id), qty = hasQ ? num(qv) : (old ? old.qty : 0);
        if (hasQ && (qty == null || qty > 1000000)) { m.errs.push('ردیف ' + faInt.format(line) + ' (' + it.name + '): موجودی درست نیست.'); return; }
        if (old && qty < old.res) { m.errs.push('ردیف ' + faInt.format(line) + ' (' + it.name + '): موجودی از رزرو (' + faInt.format(old.res) + ') کمتر است.'); return; }
        var doc = { qty: qty, reserved: old ? old.res : 0, loc: (loc || (old ? old.loc : '')).slice(0, 60), serials: (ser || (old ? old.serials : '')).slice(0, 2000), note: (note || (old ? old.note : '')).slice(0, 200) };
        if (old && old.qty === doc.qty && old.loc === doc.loc && old.serials === doc.serials && old.note === doc.note) { m.same++; return; }
        m.rows.push({ it: it, old: old, doc: doc });
      });
      S.imp = m;
    }).then(null, function (e) { S.error = e && e.message ? e.message : errText(e); }).then(render);
  }
  function applyImport() {
    var m = S.imp; if (!m || !m.rows.length || S.busy) return;
    S.busy = 'imp'; S.error = ''; S.msg = ''; render();
    var now = Date.now(), list = m.rows.slice(), done = 0;
    function next() {
      if (!list.length) return Promise.resolve();
      var chunk = list.splice(0, 400), b = db.batch();
      chunk.forEach(function (x) { b.set(db.collection('inventory').doc(x.it.id), Object.assign({}, x.doc, { updatedAt: now, updatedBy: S.user.uid, updatedByName: myName() })); });
      return b.commit().then(function () { done += chunk.length; return next(); });
    }
    next().then(function () { S.msg = faInt.format(done) + ' کالا به‌روز شد.'; S.imp = null; }, function (e) { S.error = errText(e) + (done ? ' (' + faInt.format(done) + ' مورد قبل از خطا اعمال شد.)' : ''); }).then(function () { S.busy = ''; render(); });
  }

  // ---------- events
  function rowId(el) { var r = el.closest('.wh-row'); return r ? r.getAttribute('data-id') : ''; }
  root.addEventListener('click', function (e) {
    var t, id;
    if ((t = e.target.closest('[data-brand]'))) { S.brand = t.getAttribute('data-brand'); S.shown = 50; render(); return; }
    if ((t = e.target.closest('[data-flt]'))) { S.flt = t.getAttribute('data-flt'); S.shown = 50; render(); return; }
    if (e.target.closest('[data-more]')) { S.shown += 50; render(); return; }
    if (e.target.closest('[data-tpl]')) { downloadTemplate(); return; }
    if (e.target.closest('[data-impok]')) { applyImport(); return; }
    if (e.target.closest('[data-impno]')) { S.imp = null; render(); return; }
    if ((t = e.target.closest('[data-save]'))) { save(rowId(t)); return; }
    if ((t = e.target.closest('[data-claim]'))) { S.claim = rowId(t); S.cIn = { qty: '1', ref: '' }; render(); return; }
    if (e.target.closest('[data-claimno]')) { S.claim = ''; render(); return; }
    if ((t = e.target.closest('[data-claimok]'))) { claimStock(rowId(t)); return; }
    if ((t = e.target.closest('[data-rel]'))) { if (window.confirm('این رزرو آزاد شود؟')) closeClaim(t.getAttribute('data-rel'), 'released'); return; }
    if ((t = e.target.closest('[data-ship]'))) { if (window.confirm('این رزرو «ارسال شد» ثبت شود؟')) closeClaim(t.getAttribute('data-ship'), 'shipped'); }
  });
  root.addEventListener('change', function (e) { if (e.target.id === 'whFile' && e.target.files[0]) readTemplate(e.target.files[0]); });
  root.addEventListener('input', function (e) {
    var el = e.target;
    if (el.id === 'whQ') { S.q = el.value; S.shown = 50; render(); return; }
    if (el.hasAttribute('data-cq')) { S.cIn.qty = el.value; return; }
    if (el.hasAttribute('data-cr')) { S.cIn.ref = el.value; return; }
    if (el.hasAttribute('data-f')) {
      var id = rowId(el), f = el.getAttribute('data-f');
      S.draft[id] = S.draft[id] || {};
      if (f === 'qty') { var n = num(el.value); S.draft[id].qty = n == null ? '' : faInt.format(n); if (el.value !== S.draft[id].qty) el.value = S.draft[id].qty; }
      else S.draft[id][f] = el.value;
      var r = el.closest('.wh-row'); r.classList.add('dirty'); var b = r.querySelector('[data-save]'); if (b) b.disabled = false;
    }
  });
  root.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.hasAttribute('data-f')) { e.preventDefault(); save(rowId(e.target)); } });

  // ---------- data: the catalog once, stock and claims live
  function listen() {
    if (unsubInv) unsubInv(); if (unsubCl) unsubCl();
    unsubInv = db.collection('inventory').onSnapshot(function (snap) {
      var m = {}; snap.forEach(function (s) { m[s.id] = s.data(); });
      S.inv = m; if (!S.loading) render();
    }, function (e) { S.error = errText(e); render(); });
    unsubCl = db.collection('inventory_claims').where('status', '==', 'active').onSnapshot(function (snap) {
      var l = []; snap.forEach(function (s) { var d = s.data(); d.id = s.id; l.push(d); }); l.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      S.claims = l; if (!S.loading) render();
    }, function () { /* the claims list stays empty */ });
  }
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.items = []; S.inv = {}; S.claims = [];
    if (unsubInv) { unsubInv(); unsubInv = null; } if (unsubCl) { unsubCl(); unsubCl = null; }
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    var catalog = fetch('./assets/catalog.json' + (VER ? '?v=' + VER : '')).then(function (r) { return r.json(); });
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('warehouse')) { S.loading = false; render(); return; }
      return catalog.then(function (c) { S.items = c.items; S.loading = false; listen(); render(); });
    }).then(null, function (e) { S.loading = false; S.error = errText(e); render(); });
  });
  render();
})();

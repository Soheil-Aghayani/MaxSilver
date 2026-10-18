// Sales follow-up of purchase requests (the Chef Market sheet sent from the public planner).
// Sales management, management and organizational technology see every request and give it to a salesperson; a salesperson sees
// the ones given to them. Each request carries a decision: call first, or it may go to the warehouse or to production.
// Every call, note and decision is appended to requests/<code>/log.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('cr'), RQ = window.MSRequests, OF = window.MSOrder;
  if (!root) return;
  if (!cfg || !window.firebase || !RQ || !OF) { root.innerHTML = '<p class="cr-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var faInt = new Intl.NumberFormat('fa-IR');
  var S = { user: null, profile: null, loading: true, error: '', msg: '', list: [], team: [], inv: {}, ful: null, edit: null, cat: null, addQ: '', q: '', flt: 'all', sel: '', log: [], busy: false, shown: 40 };
  var unsub = null, unsubLog = null, unsubInv = null, unsubFul = null;
  var STATUS = RQ.STATUS, ROUTE = RQ.ROUTE;
  var I = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.500 4.500 4.500L19 7.500"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6"/></svg>'
  };

  var SEP = '<i class="ms-sep" aria-hidden="true"></i>';   // a coloured bar instead of a dot between words and numbers
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return RQ.latin(String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, ' ').replace(/\s+/g, ' ').trim()).toLowerCase(); }
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ این کار را ندارید (یا قوانین پایگاه داده هنوز منتشر نشده است).';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  var can = function (area) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, area)); };
  var lead = function () { return !!(S.profile && window.MSRoles && ['manager', 'ceo', 'sales_manager'].indexOf(window.MSRoles.norm(S.profile.role)) >= 0); };
  var isAM = function () { return !!(S.profile && window.MSRoles && window.MSRoles.norm(S.profile.role) === 'account_manager'); };
  var stg = function (x) { return OF.stageOf(x); };
  var myName = function () { return (S.profile && S.profile.name) || (S.user && S.user.email) || ''; };
  function when(ms) {
    if (!ms) return '';
    var d = new Date(ms), j = window.MSEvents ? window.MSEvents.toJ(d) : null, p = function (n) { return (n < 10 ? '0' : '') + n; };
    var t = p(d.getHours()) + ':' + p(d.getMinutes());
    return j ? window.MSEvents.fa(j.jy + '/' + p(j.jm) + '/' + p(j.jd) + ' ' + t) : t;
  }
  function byId(id) { return S.list.filter(function (x) { return x.id === id; })[0] || null; }
  function openStates(x) { return OF.CLOSED.indexOf(stg(x)) < 0; }

  // ---------- filters
  var FILTERS = [['all', 'در جریان'], ['new', 'جدید'], ['call', 'نیاز به تماس'], ['pre', 'پیش‌فاکتور'], ['rej', 'رد شده'], ['acc', 'تأیید شده'], ['ful', 'انبار و تولید'], ['out', 'ارسال و تحویل'], ['end', 'مرجوع و لغو'], ['free', 'بدون مسئول']];
  var EXTRA = [['warehouse', ''], ['production', '']];
  var GROUP = { pre: ['preinvoice'], rej: ['rejected'], acc: ['accepted'], ful: ['warehouse', 'production', 'ready'], out: ['shipped', 'delivered'], end: ['returned', 'cancelled'] };
  function match(x, f) {
    if (f === 'all') return openStates(x);
    if (f === 'new') return x.status === 'new' && stg(x) === 'request';
    if (f === 'call') return x.route === 'call' && openStates(x) && ['request', 'confirmed'].indexOf(stg(x)) >= 0;
    if (f === 'warehouse' || f === 'production') return x.route === f && openStates(x);
    if (f === 'free') return !x.assignee && openStates(x);
    return GROUP[f] ? GROUP[f].indexOf(stg(x)) >= 0 : true;
  }
  function counts() { var n = {}; FILTERS.concat(EXTRA).forEach(function (f) { n[f[0]] = S.list.filter(function (x) { return match(x, f[0]); }).length; }); return n; }
  function filtered() {
    var q = norm(S.q);
    return S.list.filter(function (x) {
      if (!match(x, S.flt)) return false;
      return !q || norm([x.code, x.customer && x.customer.name, x.customer && x.customer.phone, x.customer && x.customer.city, x.assigneeName].join(' ')).indexOf(q) >= 0;
    });
  }

  // ---------- list
  function chip(f, n) { return '<button type="button" class="cr-chip" data-flt="' + f[0] + '" aria-pressed="' + (S.flt === f[0]) + '">' + f[1] + ' <b>' + faInt.format(n[f[0]] || 0) + '</b></button>'; }
  function badges(x) {
    return '<span class="cr-b sg-' + esc(stg(x)) + '">' + esc(OF.LABEL[stg(x)]) + '</span><span class="cr-b rt-' + esc(x.route) + '">' + esc(ROUTE[x.route] || x.route) + '</span>';
  }
  function card(x) {
    var c = x.customer || {}, p = x.plan || {}, done = !openStates(x);
    return '<article class="cr-card' + (x.status === 'new' ? ' fresh' : '') + (done ? ' done' : '') + '" data-id="' + esc(x.id) + '"><button type="button" class="cr-open" data-open aria-label="باز کردن ' + esc(x.code) + '">' +
      '<div class="cr-top"><b dir="ltr">' + esc(x.code) + '</b><span class="cr-time">' + esc(when(x.createdAt)) + '</span></div>' +
      '<div class="cr-who"><b>' + esc(c.name || '—') + '</b><span>' + esc(c.city || '') + '</span></div>' +
      '<div class="cr-meta"><span>' + esc(p.concept || '') + (p.size ? ' ' + esc(p.size) : '') + '</span><span>' + faInt.format((x.lines || []).length) + ' قلم کالا</span></div>' +
      '<div class="cr-bs">' + badges(x) + '</div></button>' +
      '<div class="cr-foot"><span class="cr-who2' + (x.assignee ? '' : ' free') + '">' + (x.assignee ? 'مسئول پیگیری: <b>' + esc(x.assigneeName || '') + '</b>' : 'بدون مسئول') + '</span>' +
      '<span class="cr-fa">' + (c.phone ? '<a class="cr-call" href="tel:' + esc(c.phone) + '" aria-label="تماس با ' + esc(c.name || '') + '" title="تماس">' + I.phone + '<span dir="ltr">' + esc(RQ.fa(c.phone)) + '</span></a>' : '') +
      (done ? '' : '<button type="button" class="cr-fin" data-fin title="پایان خرید؛ کارت از فهرست بیرون می‌رود">' + I.check + 'خرید انجام شد</button>') + '</span></div></article>';
  }
  function listHtml() {
    var list = filtered(), n = counts();
    var tiles = isAM() ? [['pre', 'منتظر بررسی شما'], ['acc', 'تأییدشده'], ['ful', 'انبار و تولید'], ['out', 'ارسال و تحویل']] : [['new', 'جدید'], ['call', 'نیاز به تماس'], ['warehouse', 'ارسال به انبار'], ['production', 'ارسال به تولید']];
    return '<div class="cr-sum">' + tiles.map(function (k) { return '<div><b>' + faInt.format(n[k[0]] || 0) + '</b><span>' + k[1] + '</span></div>'; }).join('') + '</div>' +
      '<div class="cr-bar"><input id="crQ" type="search" placeholder="جست‌وجوی کد، نام، موبایل، شهر…" value="' + esc(S.q) + '" autocomplete="off"></div>' +
      '<div class="cr-chips" role="group" aria-label="وضعیت">' + FILTERS.filter(function (f) { return f[0] !== 'free' || lead(); }).filter(function (f) { return !isAM() || ['all', 'pre', 'rej', 'acc', 'ful', 'out', 'end'].indexOf(f[0]) >= 0; }).map(function (f) { return chip(f, n); }).join('') + '</div>' +
      '<div class="cr-list">' + list.slice(0, S.shown).map(card).join('') + '</div>' +
      (list.length > S.shown ? '<button type="button" class="cr-more" data-more>نمایش بیشتر (' + faInt.format(list.length - S.shown) + ')</button>' : '') +
      (list.length ? '' : '<p class="cr-note">درخواستی پیدا نشد.</p>');
  }
  function view() {
    if (S.loading) return '<p class="cr-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="cr-note">برای دیدن درخواست‌ها ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="cr-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('crm')) return '<p class="cr-note">این بخش برای فروش، اکانت منیجر و مدیریت است.</p>';
    if (isAM()) return '<h1>سفارش‌ها</h1><p class="cr-lead">سفارش‌هایی که از درخواست مشتری ساخته شده‌اند. پیش‌فاکتور را در «پنل ← پیش‌فاکتورها» تأیید یا با دلیل رد کنید؛ پس از تأیید، مسیر انبار یا تولید را شما تعیین می‌کنید و مرحلهٔ سفارش (آماده، ارسال، تحویل، مرجوع) را شما ثبت می‌کنید. موجودی آزاد انبار لحظه‌ای نشان داده می‌شود.</p>' +
      (S.error ? '<p class="cr-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.msg ? '<p class="cr-ok" role="status">' + esc(S.msg) + '</p>' : '') + listHtml();
    return '<h1>درخواست‌های خرید</h1><p class="cr-lead">درخواست مشتریانی که از «طراحی کافه و رستوران» ثبت شده است. شمارهٔ موبایل تأیید نشده؛ مشتری را با تماس بشناسید، سپس تصمیم بگیرید که درخواست به انبار یا تولید برود.</p>' +
      (S.error ? '<p class="cr-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.msg ? '<p class="cr-ok" role="status">' + esc(S.msg) + '</p>' : '') + listHtml();
  }
  function render() {
    var a = document.activeElement, keepQ = a && a.id === 'crQ' ? a.selectionStart : null;
    var prevChips = window.MSMorph ? window.MSMorph.snapAll(root, '.cr-chips', '.cr-chip', '[aria-pressed=true]') : null;
    root.innerHTML = view();
    if (window.MSMorph) window.MSMorph.playAll(root, '.cr-chips', '.cr-chip', '[aria-pressed=true]', prevChips, { cls: 'chip' });
    if (window.MSGate) window.MSGate.apply();
    if (keepQ !== null) { var q = document.getElementById('crQ'); if (q) { q.focus(); try { q.setSelectionRange(keepQ, keepQ); } catch (e) { /* ignore */ } } }
  }

  // ---------- one request
  var dlg = document.createElement('dialog');
  dlg.className = 'cr-dialog';
  document.body.appendChild(dlg);
  function row(k, v, ltr) { return '<div><dt>' + k + '</dt><dd' + (ltr ? ' dir="ltr"' : '') + '>' + (v ? esc(v) : '—') + '</dd></div>'; }
  // ---------- editing the items (before the pre-invoice): the specialist, or sales management
  var BRAND = { 'max-silver': 'مکث‌سیلور', wintora: 'وینتورا', 'torbo-max': 'توربومکس' };
  function canEditLines(x) { return ['request', 'confirmed'].indexOf(stg(x)) >= 0 && (lead() || (S.user && x.assignee === S.user.uid && !isAM())); }
  function loadCatalog() {
    if (S.cat) return Promise.resolve();
    return Promise.all([fetch('./assets/catalog.json').then(function (r) { return r.json(); }), db.collection('public_config').doc('retired').get().then(function (s) { return s.exists ? (s.data().ids || []) : []; }, function () { return []; })])
      .then(function (r) { var gone = {}; r[1].forEach(function (id) { gone[id] = true; }); S.cat = r[0].items.filter(function (it) { return !gone[it.id]; }); }, function () { S.cat = []; });
  }
  function editHtml(x) {
    var e = S.edit, q = norm(S.addQ), res = [];
    if (q && S.cat) res = S.cat.filter(function (it) { return norm(it.name + ' ' + (it.code || '') + ' ' + (it.cat || '')).indexOf(q) >= 0 && !e.lines.some(function (l) { return l.id === it.id; }); }).slice(0, 8);
    return '<section class="cr-edit"><h3>ویرایش کالاها</h3><p class="cr-hint">با مشتری هماهنگ کنید، سپس تعداد را عوض کنید، کالایی را بردارید یا کالای تازه اضافه کنید. پس از ثبت پیش‌فاکتور دیگر از اینجا ویرایش نمی‌شود.</p>' +
      '<ul class="cr-el">' + e.lines.map(function (l, i) {
        return '<li><div><b>' + esc(l.name) + '</b><span dir="ltr">' + esc(l.code || '') + '</span></div><input type="text" inputmode="numeric" data-eq="' + i + '" value="' + esc(RQ.fa(l.qty)) + '" aria-label="تعداد"><button type="button" class="cr-mini danger" data-rm-line="' + i + '">حذف</button></li>';
      }).join('') + '</ul>' +
      '<label class="cr-add">افزودن کالا<input type="search" data-add-q value="' + esc(S.addQ) + '" placeholder="جست‌وجوی نام یا کد…" autocomplete="off"></label>' +
      (q ? '<ul class="cr-ar">' + (res.length ? res.map(function (it) { return '<li><span>' + esc(it.name) + (it.code ? ' <code>' + esc(it.code) + '</code>' : '') + '</span><button type="button" class="cr-mini" data-add-item="' + esc(it.id) + '">افزودن</button></li>'; }).join('') : '<li class="cr-hint">کالایی پیدا نشد.</li>') + '</ul>' : '') +
      '<div class="cr-acts"><button type="button" class="cr-btn" data-save-lines>ذخیرهٔ کالاها</button><button type="button" class="cr-btn alt" data-cancel-lines>انصراف</button></div></section>';
  }
  function saveLines(x) {
    var e = S.edit, old = x.lines || [], i;
    if (!e || !e.lines.length) { S.error = 'دست‌کم یک کالا باید بماند.'; showDetail(); return; }
    for (i = 0; i < e.lines.length; i++) if (!(e.lines[i].qty >= 1 && e.lines[i].qty <= 99)) { S.error = 'تعداد هر کالا بین ۱ و ۹۹ باشد.'; showDetail(); return; }
    var oldBy = {}, nowBy = {}, parts = [];
    old.forEach(function (l) { oldBy[l.id] = l; }); e.lines.forEach(function (l) { nowBy[l.id] = l; });
    e.lines.forEach(function (l) { if (!oldBy[l.id]) parts.push('افزوده شد: ' + l.name + ' × ' + l.qty); else if ((oldBy[l.id].qty || 0) !== l.qty) parts.push(l.name + ': ' + (oldBy[l.id].qty || 0) + ' ← ' + l.qty); });
    old.forEach(function (l) { if (!nowBy[l.id]) parts.push('حذف شد: ' + l.name); });
    if (!parts.length) { S.edit = null; showDetail(); return; }
    var lines = e.lines.map(function (l) { return { id: l.id, code: String(l.code || '').slice(0, 20), name: String(l.name || '').slice(0, 120), brand: String(l.brand || '').slice(0, 40), qty: l.qty }; });
    S.edit = null;
    change(x.id, { lines: lines }, 'note', ('کالاها ویرایش شد: ' + parts.join('؛ ')).slice(0, 400));
  }

  // ---------- the stage of an order
  function stockOf(id) { var d = S.inv[id]; return d ? { qty: d.qty || 0, res: d.reserved || 0, free: Math.max(0, (d.qty || 0) - (d.reserved || 0)) } : null; }
  function stageActions(x) {
    var cur = stg(x), all = OF.STAGES.map(function (s) { return s[0]; });
    if (lead()) return all.filter(function (k) { return k !== cur; });
    if (isAM()) {
      var next = { accepted: ['warehouse', 'production', 'cancelled'], warehouse: ['ready', 'cancelled'], production: ['ready', 'cancelled'], ready: ['shipped', 'cancelled'], shipped: ['delivered', 'returned', 'cancelled'], delivered: ['returned'] };
      return next[cur] || [];
    }
    if (S.user && x.assignee === S.user.uid) return cur === 'request' ? ['confirmed', 'cancelled'] : cur === 'confirmed' ? ['cancelled'] : [];
    return [];
  }
  function stageFields(k) {
    var f = { stage: k };
    if (k === 'warehouse' || k === 'production') f.route = k;
    if (!isAM() && OF.STATUS_FOR[k]) f.status = OF.STATUS_FOR[k];
    return f;
  }
  function stageSection(x) {
    var cur = stg(x), path = ['request', 'confirmed', 'preinvoice', 'accepted', cur === 'production' ? 'production' : 'warehouse', 'ready', 'shipped', 'delivered'], idx = path.indexOf(cur);
    var steps = path.map(function (k, i) { return '<li class="cr-step' + (idx >= 0 && i < idx ? ' done' : '') + (k === cur ? ' on' : '') + '"><i></i><span>' + OF.LABEL[k] + '</span></li>'; }).join('');
    var side = ['rejected', 'returned', 'cancelled'].indexOf(cur) >= 0 ? '<p class="cr-side sg-' + cur + '">' + OF.LABEL[cur] + (cur === 'rejected' && x.rejectReason ? ': ' + esc(x.rejectReason) : '') + '</p>' : '';
    var codes = x.orderCode || x.proformaNo ? '<dl class="cr-facts">' + row('شمارهٔ پیش‌فاکتور', x.proformaNo, true) + row('کد سفارش', x.orderCode, true) + '</dl>' : '';
    var acts = stageActions(x), hint = '';
    if (isAM() && (cur === 'preinvoice' || cur === 'rejected')) hint = '<p class="cr-hint">برای تأیید یا رد با دلیل، پیش‌فاکتور را در <a href="./panel.html#invoices">پنل ← پیش‌فاکتورها</a> باز کنید.</p>';
    else if (isAM() && !acts.length && cur !== 'delivered' && cur !== 'cancelled' && cur !== 'returned') hint = '<p class="cr-hint">این درخواست هنوز به مرحلهٔ شما نرسیده است.</p>';
    var rep = S.ful && (cur === 'warehouse' || cur === 'production' || cur === 'ready') ? '<p class="cr-rep' + (S.ful.ready ? ' ok' : '') + '">' + (S.ful.route === 'production' ? 'تولید' : 'انبار') + (S.ful.ready ? ' اعلام کرد: سفارش آماده است' + (S.ful.readyByName ? ' · ' + esc(S.ful.readyByName) : '') + (S.ful.readyAt ? SEP + esc(when(S.ful.readyAt)) : '') + '. مرحله را به «آمادهٔ ارسال» ببرید.' : ' هنوز آماده‌بودن را اعلام نکرده است.') + (S.ful.note ? '<br>' + esc(S.ful.note) : '') + '</p>' : '';
    return '<section><h3>مرحلهٔ سفارش</h3><ol class="cr-steps">' + steps + '</ol>' + side + codes + rep + hint +
      (acts.length ? '<div class="cr-seg" role="group" aria-label="تغییر مرحله">' + acts.map(function (k) { return '<button type="button" data-stage="' + k + '">' + OF.LABEL[k] + '</button>'; }).join('') + '</div>' : '') + '</section>';
  }
  // routing to the warehouse or production hands the lines and the delivery contact to that team; later stages keep their copy in step
  function fulfilSync(x, k) {
    if (!isAM() && !lead()) return;
    var now = Date.now(), ref = db.collection('fulfilment').doc(x.id), c = x.customer || {}, r = x.receiver || {}, self = r.self !== false;
    if (k === 'warehouse' || k === 'production') {
      ref.set({ code: x.code, orderCode: x.orderCode || '', route: k, stage: k, lines: (x.lines || []).map(function (l) { return { id: l.id, code: l.code || '', name: l.name || '', brand: l.brand || '', qty: l.qty || 1 }; }),
        customer: String(c.name || '').slice(0, 80), recipient: String(self ? c.name : r.name || '').slice(0, 80), phone: String(self ? c.phone : r.phone || '').slice(0, 20), city: String(c.city || '').slice(0, 40), address: String(c.address || '').slice(0, 300),
        ready: false, note: '', updatedAt: now, by: S.user.uid, byName: myName() }).then(null, function () { /* rules not published yet */ });
    } else if (x.route === 'warehouse' || x.route === 'production') {
      ref.update({ stage: k, updatedAt: now }).then(null, function () { /* no copy for this order */ });
    }
  }
  function claimLine(x, i) {
    var l = (x.lines || [])[i]; if (!l || !isAM() || S.busy) return;
    var qty = l.qty || 1, invRef = db.collection('inventory').doc(l.id), cl = db.collection('inventory_claims').doc(), ref = (x.orderCode || x.code || '').slice(0, 60);
    S.busy = true; S.error = '';
    db.runTransaction(function (tx) {
      return tx.get(invRef).then(function (snap) {
        var d = snap.exists ? snap.data() : null, free = d ? (d.qty || 0) - (d.reserved || 0) : 0;
        if (!d || qty > free) throw { code: 'not-enough', free: free };
        tx.update(invRef, { reserved: (d.reserved || 0) + qty, updatedAt: Date.now(), updatedBy: S.user.uid, updatedByName: myName() });
        tx.set(cl, { pid: l.id, qty: qty, ref: ref, customer: ((x.customer || {}).name || '').slice(0, 80), note: '', status: 'active', at: Date.now(), by: S.user.uid, byName: myName() });
      });
    }).then(function () { S.busy = false; return change(x.id, {}, 'note', 'رزرو انبار: ' + l.name + ' × ' + qty); },
      function (e) { S.busy = false; S.error = e && e.code === 'not-enough' ? 'موجودی آزاد کافی نیست (فعلاً ' + faInt.format(e.free) + ' عدد).' : errText(e); showDetail(); });
  }
  function detailHtml(x) {
    var c = x.customer || {}, r = x.receiver || {}, p = x.plan || {};
    var team = S.team.map(function (u) { return '<button type="button" role="radio" data-assign="' + esc(u.id) + '" aria-checked="' + (x.assignee === u.id) + '">' + esc(u.name) + '</button>'; }).join('');
    var showInv = isAM() || lead(), canClaim = isAM() && ['accepted', 'warehouse', 'production', 'ready'].indexOf(stg(x)) >= 0;
    var lines = (x.lines || []).map(function (l, i) {
      var s = stockOf(l.id), q = l.qty || 1;
      return '<tr><td>' + faInt.format(i + 1) + '</td><td dir="ltr">' + esc(l.code || '—') + '</td><td class="nm">' + esc(l.name) + '</td><td>' + esc(l.brand || '') + '</td><td>' + faInt.format(l.qty || 0) + '</td>' +
        (showInv ? '<td class="' + (s && s.free >= q ? 'okq' : 'noq') + '">' + (s ? faInt.format(s.free) : '—') + '</td><td>' + (canClaim && s && s.free >= q ? '<button type="button" class="cr-mini" data-claim-line="' + i + '">رزرو</button>' : '') + '</td>' : '') + '</tr>';
    }).join('');
    var log = S.log.map(function (g) { return '<li><b>' + esc(RQ.LOGKIND[g.kind] || g.kind) + '</b> <span>' + esc(g.byName || '') + SEP + esc(when(g.at)) + '</span>' + (g.text ? '<p>' + esc(g.text) + '</p>' : '') + '</li>'; }).join('');
    return '<div class="cr-dbar"><div><h2 dir="ltr">' + esc(x.code) + '</h2><div class="cr-bs">' + badges(x) + '</div></div><button type="button" class="cr-ic" data-close aria-label="بستن">' + I.close + '</button></div>' +
      '<div class="cr-dbody" data-id="' + esc(x.id) + '">' +
      (S.error ? '<p class="cr-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<section><h3>خریدار</h3><dl class="cr-facts">' + row('نام', c.name) + '<div><dt>موبایل</dt><dd>' + (c.phone ? '<a class="cr-tel" href="tel:' + esc(c.phone) + '" dir="ltr">' + I.phone + esc(RQ.fa(c.phone)) + '</a>' : '—') + '</dd></div>' + row('کد ملی', RQ.fa(c.nid), true) + row('شهر', c.city) + row('کد پستی', c.zip === '1111111111' ? 'ندارد' : RQ.fa(c.zip), c.zip !== '1111111111') + row('نشانی', c.address) + '</dl></section>' +
      '<section><h3>تحویل‌گیرنده</h3>' + (r.self ? '<p class="cr-self">خود خریدار تحویل می‌گیرد.</p>' : '<dl class="cr-facts">' + row('نام', r.name) + row('کد ملی', RQ.fa(r.nid), true) + '<div><dt>موبایل</dt><dd>' + (r.phone ? '<a class="cr-tel" href="tel:' + esc(r.phone) + '" dir="ltr">' + I.phone + esc(RQ.fa(r.phone)) + '</a>' : '—') + '</dd></div></dl>') + '</section>' +
      '<section><h3>کالاها <small>' + esc(p.concept || '') + (p.size ? ' ' + esc(p.size) : '') + (p.serve ? SEP + esc(p.serve) : '') + '</small></h3><div class="cr-tw"><table class="cr-lines"><thead><tr><th>ردیف</th><th>کد</th><th>شرح کالا</th><th>برند</th><th>تعداد</th>' + (showInv ? '<th>آزاد در انبار</th><th></th>' : '') + '</tr></thead><tbody>' + lines + '</tbody></table></div>' + (x.note ? '<p class="cr-self">توضیح مشتری: ' + esc(x.note) + '</p>' : '') + (canEditLines(x) && !(S.edit && S.edit.id === x.id) ? '<button type="button" class="cr-btn alt" data-edit-lines>ویرایش کالاها</button>' : '') + '</section>' + (S.edit && S.edit.id === x.id ? editHtml(x) : '') +
      stageSection(x) +
      (isAM() ? '' : '<section><h3>تصمیم</h3><p class="cr-hint">«نیاز به تماس» یعنی هنوز با مشتری صحبت نشده. پس از تماس و اطمینان از خریدار، مشخص کنید درخواست به انبار برود یا به تولید.</p>' +
      '<div class="cr-seg" role="radiogroup" aria-label="تصمیم ارسال">' + Object.keys(ROUTE).map(function (k) { return '<button type="button" role="radio" data-route="' + k + '" aria-checked="' + (x.route === k) + '">' + ROUTE[k] + '</button>'; }).join('') + '</div>' +
      '<h3 class="cr-h2">مسئول پیگیری</h3>' + (lead() ? (team ? '<div class="cr-seg" role="radiogroup" aria-label="مسئول پیگیری">' + team + '</div>' : '<p class="cr-hint">هیچ کارشناس فروش فعالی پیدا نشد.</p>') : '<p class="cr-self">' + esc(x.assigneeName || '—') + '</p>') + '</section>') +
      '<section><h3>ثبت تماس یا یادداشت</h3><textarea data-text rows="3" maxlength="400" placeholder="نتیجهٔ تماس، قول‌وقرار یا یادداشت…"></textarea>' +
      '<div class="cr-acts">' + (isAM() ? '' : '<button type="button" class="cr-btn" data-logcall>ثبت نتیجهٔ تماس</button>') + '<button type="button" class="cr-btn alt" data-lognote>فقط یادداشت</button>' +
      (isAM() ? '' : '<button type="button" class="cr-btn alt" data-proforma>' + I.doc + 'ساخت پیش‌فاکتور مکث‌سیلور</button>') + '</div></section>' +
      '<section><h3>سابقه</h3>' + (log ? '<ul class="cr-log">' + log + '</ul>' : '<p class="cr-hint">هنوز چیزی ثبت نشده است.</p>') + '</section>' + (lead() ? '<section class="cr-danger"><h3>حذف</h3><p class="cr-hint">حذف کامل درخواست از پایگاه داده؛ برگشت ندارد.</p><button type="button" class="cr-btn danger" data-delete>' + I.trash + 'حذف این درخواست</button></section>' : '') + '</div>';
  }
  function showDetail() {
    var x = byId(S.sel); if (!x) { if (dlg.open) dlg.close(); return; }
    var M = window.MSMorph, prev = M ? M.snapAll(dlg, '.cr-seg', 'button', '[aria-checked=true]') : null;
    dlg.innerHTML = detailHtml(x);
    if (M) M.playAll(dlg, '.cr-seg', 'button', '[aria-checked=true]', prev, { cls: 'seg' });
    if (!dlg.open) dlg.showModal();
  }
  function openReq(id) {
    S.sel = id; S.log = []; S.error = ''; dlg.innerHTML = ''; showDetail();
    var xo = byId(id); if (xo && window.MSNotify && window.MSNotify.ack) window.MSNotify.ack(id, stg(xo));
    S.ful = null; if (unsubFul) { unsubFul(); unsubFul = null; }
    if (isAM() || lead()) unsubFul = db.collection('fulfilment').doc(id).onSnapshot(function (s) { S.ful = s.exists ? s.data() : null; if (S.sel === id && !S.edit) showDetail(); }, function () { /* no report */ });
    if (unsubLog) { unsubLog(); unsubLog = null; }
    unsubLog = db.collection('requests').doc(id).collection('log').orderBy('at', 'desc').limit(60).onSnapshot(function (snap) {
      S.log = []; snap.forEach(function (s) { S.log.push(s.data()); });
      if (S.sel === id) { var t = dlg.querySelector('[data-text]'), v = t ? t.value : ''; showDetail(); var t2 = dlg.querySelector('[data-text]'); if (t2 && v) t2.value = v; }
    }, function () { /* the history stays empty */ });
  }
  function closeReq() { S.sel = ''; S.edit = null; if (unsubFul) { unsubFul(); unsubFul = null; } if (unsubLog) { unsubLog(); unsubLog = null; } if (dlg.open) dlg.close(); }

  // ---------- writes: one change plus one history line, together
  function change(id, fields, kind, text) {
    var now = Date.now(), ref = db.collection('requests').doc(id), b = db.batch(), upd = Object.assign({ updatedAt: now }, fields);
    if (text) upd.lastNote = String(text).slice(0, 400);
    b.update(ref, upd);
    b.set(ref.collection('log').doc(), { at: now, by: S.user.uid, byName: myName(), kind: kind, text: String(text || '').slice(0, 400) });
    S.error = ''; S.busy = true;
    return b.commit().then(function () { if (fields && fields.stage) OF.status(db, id, fields.stage); }, function (e) { S.error = errText(e); }).then(function () { S.busy = false; showDetail(); render(); });
  }
  function toProforma(x) {
    var c = x.customer || {}, key = 'ms-proforma-v1', inv = null;
    if (!window.confirm('پیش‌فاکتور فعلی کاتالوگ با کالاها و مشخصات این مشتری جایگزین شود؟')) return;
    try { inv = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { /* ignore */ }
    inv = Object.assign({ unit: 'تومان', docNo: '', discount: 0, discMode: 'pct', tax: 10, pay: { mode: 'cash', cashVal: 50, cashUnit: 'pct', count: 1, cheques: [], custom: false } }, inv || {});
    inv.lines = (x.lines || []).map(function (l) { return { id: l.id, qty: l.qty || 1, price: 0 }; });
    inv.customer = c.name || ''; inv.custCity = c.city || ''; inv.custPhone = c.phone || ''; inv.custAddr = c.address || ''; inv.docNo = ''; inv.requestCode = x.code || '';
    try { localStorage.setItem(key, JSON.stringify(inv)); } catch (e) { /* ignore */ }
    change(x.id, stg(x) === 'request' ? { stage: 'confirmed', status: 'contacted' } : {}, 'status', 'ساخت پیش‌فاکتور مکث‌سیلور از این درخواست').then(function () { location.href = './product-catalog.html'; });
  }

  function removeReq(x) {
    if (!lead() || !window.confirm('درخواست ' + x.code + ' برای همیشه حذف شود؟')) return;
    S.busy = true; S.error = '';
    db.collection('requests').doc(x.id).delete().then(function () { S.msg = 'درخواست ' + x.code + ' حذف شد.'; closeReq(); }, function (e) { S.error = errText(e); }).then(function () { S.busy = false; render(); if (S.sel) showDetail(); });
  }
  // the regional salesperson is given every free request automatically: the one whose provinces include the customer's province (the one with fewest open requests when several do)
  var tried = {};
  function pk(s) { return String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[200cs]/g, ''); }
  function provinceOf(x) {
    var p = x.plan && x.plan.province; if (p) return p;
    var m = /^استانs+([^،]+)،/.exec((x.customer && x.customer.address) || ''); return m ? m[1].trim() : '';
  }
  function autoAssign() {
    if (!lead() || !S.team.length) return;
    var load = {}; S.list.forEach(function (x) { if (x.assignee && openStates(x)) load[x.assignee] = (load[x.assignee] || 0) + 1; });
    S.list.forEach(function (x) {
      if (x.assignee || !openStates(x) || tried[x.id]) return;
      var prov = pk(provinceOf(x)); if (!prov) return;
      var cand = S.team.filter(function (u) { return (u.regions || []).some(function (r) { return pk(r) === prov; }); });
      if (!cand.length) return;
      cand.sort(function (a, b) { return (load[a.id] || 0) - (load[b.id] || 0); });
      var u = cand[0]; tried[x.id] = true; load[u.id] = (load[u.id] || 0) + 1;
      change(x.id, { assignee: u.id, assigneeName: u.name }, 'assign', u.name + ' (خودکار، استان ' + provinceOf(x) + ')');
    });
  }

  // ---------- events
  root.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-flt]'))) { S.flt = t.getAttribute('data-flt'); S.shown = 40; render(); return; }
    if (e.target.closest('[data-more]')) { S.shown += 40; render(); return; }
    if ((t = e.target.closest('[data-fin]'))) { var fx = byId(t.closest('.cr-card').getAttribute('data-id')); if (fx && !S.busy) change(fx.id, { status: 'won' }, 'status', STATUS.won); return; }
    if ((t = e.target.closest('[data-open]'))) { openReq(t.closest('.cr-card').getAttribute('data-id')); }
  });
  root.addEventListener('input', function (e) { if (e.target.id === 'crQ') { S.q = e.target.value; S.shown = 40; render(); } });
  dlg.addEventListener('click', function (e) {
    var t, x = byId(S.sel);
    if (e.target === dlg || e.target.closest('[data-close]')) { closeReq(); return; }
    if (!x || S.busy) return;
    if ((t = e.target.closest('[data-route]'))) { var k = t.getAttribute('data-route'); if (k !== x.route) change(x.id, { route: k }, 'route', ROUTE[k]); return; }
    if ((t = e.target.closest('[data-stage]'))) {
      var sk = t.getAttribute('data-stage');
      if (sk !== stg(x)) { if ((sk === 'cancelled' || sk === 'returned') && !window.confirm('مرحلهٔ «' + OF.LABEL[sk] + '» ثبت شود؟')) return; change(x.id, stageFields(sk), 'status', 'مرحله: ' + OF.LABEL[sk]).then(function () { fulfilSync(x, sk); }); }
      return;
    }
    if (e.target.closest('[data-edit-lines]')) { if (canEditLines(x)) { S.edit = { id: x.id, lines: (x.lines || []).map(function (l) { return { id: l.id, code: l.code, name: l.name, brand: l.brand, qty: l.qty || 1 }; }) }; S.addQ = ''; S.error = ''; loadCatalog().then(showDetail); showDetail(); } return; }
    if (e.target.closest('[data-cancel-lines]')) { S.edit = null; S.addQ = ''; showDetail(); return; }
    if (e.target.closest('[data-save-lines]')) { saveLines(x); return; }
    if ((t = e.target.closest('[data-rm-line]'))) { S.edit.lines.splice(Number(t.getAttribute('data-rm-line')), 1); showDetail(); return; }
    if ((t = e.target.closest('[data-add-item]'))) { var it = (S.cat || []).filter(function (c) { return c.id === t.getAttribute('data-add-item'); })[0]; if (it && S.edit) { S.edit.lines.push({ id: it.id, code: it.code || '', name: it.name, brand: BRAND[it.src] || '', qty: 1 }); S.addQ = ''; showDetail(); } return; }
    if ((t = e.target.closest('[data-claim-line]'))) { claimLine(x, Number(t.getAttribute('data-claim-line'))); return; }
    if ((t = e.target.closest('[data-assign]'))) { var u = S.team.filter(function (m) { return m.id === t.getAttribute('data-assign'); })[0]; if (u && u.id !== x.assignee) change(x.id, { assignee: u.id, assigneeName: u.name }, 'assign', u.name); return; }
    var box = dlg.querySelector('[data-text]'), txt = box ? box.value.trim() : '';
    if (e.target.closest('[data-logcall]')) {
      if (!txt) { S.error = 'نتیجهٔ تماس را بنویسید.'; showDetail(); return; }
      change(x.id, x.status === 'new' ? { status: 'contacted' } : {}, 'call', txt); return;
    }
    if (e.target.closest('[data-lognote]')) { if (!txt) { S.error = 'یادداشت را بنویسید.'; showDetail(); return; } change(x.id, {}, 'note', txt); return; }
    if (e.target.closest('[data-proforma]')) toProforma(x);
    if (e.target.closest('[data-delete]')) removeReq(x);
  });
  dlg.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-eq') && S.edit) { var v = Number(RQ.latin(el.value).replace(/\D/g, '')); S.edit.lines[Number(el.getAttribute('data-eq'))].qty = v; var fa = v ? RQ.fa(v) : ''; if (el.value !== fa) el.value = fa; return; }
    if (el.hasAttribute && el.hasAttribute('data-add-q')) { S.addQ = el.value; var at = el.selectionStart; showDetail(); var n = dlg.querySelector('[data-add-q]'); if (n) { n.focus(); try { n.setSelectionRange(at, at); } catch (x) { /* ignore */ } } }
  });
  dlg.addEventListener('close', function () { S.sel = ''; if (unsubLog) { unsubLog(); unsubLog = null; } });

  // ---------- data
  function listen() {
    if (unsub) { unsub(); unsub = null; }
    var col = db.collection('requests'), q = lead() || isAM() ? col : col.where('assignee', '==', S.user.uid);
    unsub = q.onSnapshot(function (snap) {
      S.list = []; snap.forEach(function (s) { var d = s.data(); d.id = s.id; S.list.push(d); });
      S.list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      S.loading = false; S.error = ''; render(); if (S.sel) showDetail(); autoAssign();
    }, function (e) { S.loading = false; S.error = errText(e); render(); });
  }
  function listenInv() {
    if (unsubInv) { unsubInv(); unsubInv = null; }
    if (!(isAM() || lead())) return;
    unsubInv = db.collection('inventory').onSnapshot(function (snap) {
      var m = {}; snap.forEach(function (s) { m[s.id] = s.data(); }); S.inv = m; if (S.sel && !S.edit) showDetail();
    }, function () { /* no stock column */ });
  }
  function loadTeam() {
    if (!lead()) return Promise.resolve();
    return db.collection('users').get().then(function (snap) {
      S.team = []; snap.forEach(function (s) { var d = s.data(); if (window.MSRoles.norm(d.role) === 'visitor' && d.active !== false) S.team.push({ id: s.id, name: d.name || d.email || s.id, regions: d.regions || [] }); });
      S.team.sort(function (a, b) { return a.name.localeCompare(b.name, 'fa'); });
    }, function () { /* the list of salespeople stays empty */ });
  }
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.list = []; S.team = [];
    if (unsub) { unsub(); unsub = null; }
    if (unsubInv) { unsubInv(); unsubInv = null; }
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('crm')) { S.loading = false; render(); return; }
      if (isAM()) S.flt = 'pre';
      listenInv();
      return loadTeam().then(listen);
    }).then(null, function (e) { S.loading = false; S.error = errText(e); render(); });
  });
  render();
})();

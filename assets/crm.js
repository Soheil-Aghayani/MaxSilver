// Sales follow-up of purchase requests (the Chef Market sheet sent from the public planner).
// Sales management, management and organizational technology see every request and give it to a salesperson; a salesperson sees
// the ones given to them. Each request carries a decision: call first, or it may go to the warehouse or to production.
// Every call, note and decision is appended to requests/<code>/log.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('cr'), RQ = window.MSRequests;
  if (!root) return;
  if (!cfg || !window.firebase || !RQ) { root.innerHTML = '<p class="cr-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var faInt = new Intl.NumberFormat('fa-IR');
  var S = { user: null, profile: null, loading: true, error: '', msg: '', list: [], team: [], q: '', flt: 'all', sel: '', log: [], busy: false, shown: 40 };
  var unsub = null, unsubLog = null;
  var STATUS = RQ.STATUS, ROUTE = RQ.ROUTE;
  var I = {
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
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
  var myName = function () { return (S.profile && S.profile.name) || (S.user && S.user.email) || ''; };
  function when(ms) {
    if (!ms) return '';
    var d = new Date(ms), j = window.MSEvents ? window.MSEvents.toJ(d) : null, p = function (n) { return (n < 10 ? '0' : '') + n; };
    var t = p(d.getHours()) + ':' + p(d.getMinutes());
    return j ? window.MSEvents.fa(j.jy + '/' + p(j.jm) + '/' + p(j.jd) + ' ' + t) : t;
  }
  function byId(id) { return S.list.filter(function (x) { return x.id === id; })[0] || null; }
  function openStates(x) { return x.status !== 'won' && x.status !== 'lost'; }

  // ---------- filters
  var FILTERS = [['all', 'همه'], ['new', 'جدید'], ['call', 'نیاز به تماس'], ['warehouse', 'ارسال به انبار'], ['production', 'ارسال به تولید'], ['quoted', 'پیش‌فاکتور فرستاده شد'], ['won', 'خرید شد'], ['lost', 'منصرف شد'], ['free', 'بدون مسئول']];
  function match(x, f) {
    if (f === 'all') return true;
    if (f === 'new') return x.status === 'new';
    if (f === 'call') return x.route === 'call' && openStates(x);
    if (f === 'warehouse' || f === 'production') return x.route === f && openStates(x);
    if (f === 'free') return !x.assignee && openStates(x);
    return x.status === f;
  }
  function counts() { var n = {}; FILTERS.forEach(function (f) { n[f[0]] = S.list.filter(function (x) { return match(x, f[0]); }).length; }); return n; }
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
    return '<span class="cr-b st-' + esc(x.status) + '">' + esc(STATUS[x.status] || x.status) + '</span><span class="cr-b rt-' + esc(x.route) + '">' + esc(ROUTE[x.route] || x.route) + '</span>';
  }
  function card(x) {
    var c = x.customer || {}, p = x.plan || {};
    return '<article class="cr-card' + (x.status === 'new' ? ' fresh' : '') + '" data-id="' + esc(x.id) + '"><button type="button" class="cr-open" data-open aria-label="باز کردن ' + esc(x.code) + '">' +
      '<div class="cr-top"><b dir="ltr">' + esc(x.code) + '</b><span class="cr-time">' + esc(when(x.createdAt)) + '</span></div>' +
      '<div class="cr-who"><b>' + esc(c.name || '—') + '</b><span>' + esc(c.city || '') + '</span></div>' +
      '<div class="cr-meta"><span>' + esc(p.concept || '') + (p.size ? ' ' + esc(p.size) : '') + '</span><span>' + faInt.format((x.lines || []).length) + ' قلم کالا</span>' +
      '<span class="' + (x.assignee ? '' : 'cr-free') + '">' + (x.assignee ? 'مسئول: ' + esc(x.assigneeName || '') : 'بدون مسئول') + '</span></div>' +
      '<div class="cr-bs">' + badges(x) + '</div></button>' +
      (c.phone ? '<a class="cr-call" href="tel:' + esc(c.phone) + '" aria-label="تماس با ' + esc(c.name || '') + '" title="تماس">' + I.phone + '<span dir="ltr">' + esc(c.phone) + '</span></a>' : '') + '</article>';
  }
  function listHtml() {
    var list = filtered(), n = counts();
    return '<div class="cr-sum"><div><b>' + faInt.format(n.new) + '</b><span>جدید</span></div><div><b>' + faInt.format(n.call) + '</b><span>نیاز به تماس</span></div><div><b>' + faInt.format(n.warehouse) + '</b><span>ارسال به انبار</span></div><div><b>' + faInt.format(n.production) + '</b><span>ارسال به تولید</span></div></div>' +
      '<div class="cr-bar"><input id="crQ" type="search" placeholder="جست‌وجوی کد، نام، موبایل، شهر…" value="' + esc(S.q) + '" autocomplete="off"></div>' +
      '<div class="cr-chips" role="group" aria-label="وضعیت">' + FILTERS.filter(function (f) { return f[0] !== 'free' || lead(); }).map(function (f) { return chip(f, n); }).join('') + '</div>' +
      '<div class="cr-list">' + list.slice(0, S.shown).map(card).join('') + '</div>' +
      (list.length > S.shown ? '<button type="button" class="cr-more" data-more>نمایش بیشتر (' + faInt.format(list.length - S.shown) + ')</button>' : '') +
      (list.length ? '' : '<p class="cr-note">درخواستی پیدا نشد.</p>');
  }
  function view() {
    if (S.loading) return '<p class="cr-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="cr-note">برای دیدن درخواست‌ها ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="cr-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('crm')) return '<p class="cr-note">این بخش برای فروش و مدیریت است.</p>';
    return '<h1>درخواست‌های خرید</h1><p class="cr-lead">درخواست مشتریانی که از «طراحی کافه و رستوران» ثبت شده است. شمارهٔ موبایل تأیید نشده؛ مشتری را با تماس بشناسید، سپس تصمیم بگیرید که درخواست به انبار یا تولید برود.</p>' +
      (S.error ? '<p class="cr-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.msg ? '<p class="cr-ok" role="status">' + esc(S.msg) + '</p>' : '') + listHtml();
  }
  function render() {
    var a = document.activeElement, keepQ = a && a.id === 'crQ' ? a.selectionStart : null;
    root.innerHTML = view();
    if (window.MSGate) window.MSGate.apply();
    if (keepQ !== null) { var q = document.getElementById('crQ'); if (q) { q.focus(); try { q.setSelectionRange(keepQ, keepQ); } catch (e) { /* ignore */ } } }
  }

  // ---------- one request
  var dlg = document.createElement('dialog');
  dlg.className = 'cr-dialog';
  document.body.appendChild(dlg);
  function row(k, v, ltr) { return '<div><dt>' + k + '</dt><dd' + (ltr ? ' dir="ltr"' : '') + '>' + (v ? esc(v) : '—') + '</dd></div>'; }
  function detailHtml(x) {
    var c = x.customer || {}, r = x.receiver || {}, p = x.plan || {};
    var team = S.team.map(function (u) { return '<button type="button" role="radio" data-assign="' + esc(u.id) + '" aria-checked="' + (x.assignee === u.id) + '">' + esc(u.name) + '</button>'; }).join('');
    var lines = (x.lines || []).map(function (l, i) { return '<tr><td>' + faInt.format(i + 1) + '</td><td dir="ltr">' + esc(l.code || '—') + '</td><td class="nm">' + esc(l.name) + '</td><td>' + esc(l.brand || '') + '</td><td>' + faInt.format(l.qty || 0) + '</td></tr>'; }).join('');
    var log = S.log.map(function (g) { return '<li><b>' + esc(RQ.LOGKIND[g.kind] || g.kind) + '</b> <span>' + esc(g.byName || '') + SEP + esc(when(g.at)) + '</span>' + (g.text ? '<p>' + esc(g.text) + '</p>' : '') + '</li>'; }).join('');
    return '<div class="cr-dbar"><div><h2 dir="ltr">' + esc(x.code) + '</h2><div class="cr-bs">' + badges(x) + '</div></div><button type="button" class="cr-ic" data-close aria-label="بستن">' + I.close + '</button></div>' +
      '<div class="cr-dbody" data-id="' + esc(x.id) + '">' +
      (S.error ? '<p class="cr-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<section><h3>خریدار</h3><dl class="cr-facts">' + row('نام', c.name) + '<div><dt>موبایل</dt><dd>' + (c.phone ? '<a class="cr-tel" href="tel:' + esc(c.phone) + '" dir="ltr">' + I.phone + esc(c.phone) + '</a>' : '—') + '</dd></div>' + row('کد ملی', c.nid, true) + row('شهر', c.city) + row('کد پستی', c.zip === '1111111111' ? 'ندارد' : c.zip, c.zip !== '1111111111') + row('نشانی', c.address) + '</dl></section>' +
      '<section><h3>تحویل‌گیرنده</h3>' + (r.self ? '<p class="cr-self">خود خریدار تحویل می‌گیرد.</p>' : '<dl class="cr-facts">' + row('نام', r.name) + row('کد ملی', r.nid, true) + '<div><dt>موبایل</dt><dd>' + (r.phone ? '<a class="cr-tel" href="tel:' + esc(r.phone) + '" dir="ltr">' + I.phone + esc(r.phone) + '</a>' : '—') + '</dd></div></dl>') + '</section>' +
      '<section><h3>کالاها <small>' + esc(p.concept || '') + (p.size ? ' ' + esc(p.size) : '') + (p.serve ? SEP + esc(p.serve) : '') + '</small></h3><div class="cr-tw"><table class="cr-lines"><thead><tr><th>ردیف</th><th>کد</th><th>شرح کالا</th><th>برند</th><th>تعداد</th></tr></thead><tbody>' + lines + '</tbody></table></div>' + (x.note ? '<p class="cr-self">توضیح مشتری: ' + esc(x.note) + '</p>' : '') + '</section>' +
      '<section><h3>تصمیم</h3><p class="cr-hint">«نیاز به تماس» یعنی هنوز با مشتری صحبت نشده. پس از تماس و اطمینان از خریدار، مشخص کنید درخواست به انبار برود یا به تولید.</p>' +
      '<div class="cr-seg" role="radiogroup" aria-label="تصمیم ارسال">' + Object.keys(ROUTE).map(function (k) { return '<button type="button" role="radio" data-route="' + k + '" aria-checked="' + (x.route === k) + '">' + ROUTE[k] + '</button>'; }).join('') + '</div>' +
      '<h3 class="cr-h2">وضعیت</h3><div class="cr-seg" role="radiogroup" aria-label="وضعیت">' + Object.keys(STATUS).map(function (k) { return '<button type="button" role="radio" data-status="' + k + '" aria-checked="' + (x.status === k) + '">' + STATUS[k] + '</button>'; }).join('') + '</div>' +
      '<h3 class="cr-h2">مسئول پیگیری</h3>' + (lead() ? (team ? '<div class="cr-seg" role="radiogroup" aria-label="مسئول پیگیری">' + team + '</div>' : '<p class="cr-hint">کارشناس فروش فعالی پیدا نشد.</p>') : '<p class="cr-self">' + esc(x.assigneeName || '—') + '</p>') + '</section>' +
      '<section><h3>ثبت تماس یا یادداشت</h3><textarea data-text rows="3" maxlength="400" placeholder="نتیجهٔ تماس، قول‌وقرار یا یادداشت…"></textarea>' +
      '<div class="cr-acts"><button type="button" class="cr-btn" data-logcall>ثبت نتیجهٔ تماس</button><button type="button" class="cr-btn alt" data-lognote>فقط یادداشت</button>' +
      '<button type="button" class="cr-btn alt" data-proforma>' + I.doc + 'ساخت پیش‌فاکتور مکث‌سیلور</button></div></section>' +
      '<section><h3>سابقه</h3>' + (log ? '<ul class="cr-log">' + log + '</ul>' : '<p class="cr-hint">هنوز چیزی ثبت نشده است.</p>') + '</section></div>';
  }
  function showDetail() { var x = byId(S.sel); if (!x) { if (dlg.open) dlg.close(); return; } dlg.innerHTML = detailHtml(x); if (!dlg.open) dlg.showModal(); }
  function openReq(id) {
    S.sel = id; S.log = []; S.error = ''; showDetail();
    if (unsubLog) { unsubLog(); unsubLog = null; }
    unsubLog = db.collection('requests').doc(id).collection('log').orderBy('at', 'desc').limit(60).onSnapshot(function (snap) {
      S.log = []; snap.forEach(function (s) { S.log.push(s.data()); });
      if (S.sel === id) { var t = dlg.querySelector('[data-text]'), v = t ? t.value : ''; showDetail(); var t2 = dlg.querySelector('[data-text]'); if (t2 && v) t2.value = v; }
    }, function () { /* the history stays empty */ });
  }
  function closeReq() { S.sel = ''; if (unsubLog) { unsubLog(); unsubLog = null; } if (dlg.open) dlg.close(); }

  // ---------- writes: one change plus one history line, together
  function change(id, fields, kind, text) {
    var now = Date.now(), ref = db.collection('requests').doc(id), b = db.batch(), upd = Object.assign({ updatedAt: now }, fields);
    if (text) upd.lastNote = String(text).slice(0, 400);
    b.update(ref, upd);
    b.set(ref.collection('log').doc(), { at: now, by: S.user.uid, byName: myName(), kind: kind, text: String(text || '').slice(0, 400) });
    S.error = ''; S.busy = true;
    return b.commit().then(null, function (e) { S.error = errText(e); }).then(function () { S.busy = false; showDetail(); render(); });
  }
  function toProforma(x) {
    var c = x.customer || {}, key = 'ms-proforma-v1', inv = null;
    if (!window.confirm('پیش‌فاکتور فعلی کاتالوگ با کالاها و مشخصات این مشتری جایگزین شود؟')) return;
    try { inv = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { /* ignore */ }
    inv = Object.assign({ unit: 'تومان', docNo: '', discount: 0, discMode: 'pct', tax: 10, pay: { mode: 'cash', cashVal: 50, cashUnit: 'pct', count: 1, cheques: [], custom: false } }, inv || {});
    inv.lines = (x.lines || []).map(function (l) { return { id: l.id, qty: l.qty || 1, price: 0 }; });
    inv.customer = c.name || ''; inv.custCity = c.city || ''; inv.custPhone = c.phone || ''; inv.custAddr = c.address || ''; inv.docNo = '';
    try { localStorage.setItem(key, JSON.stringify(inv)); } catch (e) { /* ignore */ }
    change(x.id, x.status === 'new' || x.status === 'contacted' ? { status: 'quoted' } : {}, 'status', 'ساخت پیش‌فاکتور مکث‌سیلور از این درخواست').then(function () { location.href = './product-catalog.html'; });
  }

  // ---------- events
  root.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-flt]'))) { S.flt = t.getAttribute('data-flt'); S.shown = 40; render(); return; }
    if (e.target.closest('[data-more]')) { S.shown += 40; render(); return; }
    if ((t = e.target.closest('[data-open]'))) { openReq(t.closest('.cr-card').getAttribute('data-id')); }
  });
  root.addEventListener('input', function (e) { if (e.target.id === 'crQ') { S.q = e.target.value; S.shown = 40; render(); } });
  dlg.addEventListener('click', function (e) {
    var t, x = byId(S.sel);
    if (e.target === dlg || e.target.closest('[data-close]')) { closeReq(); return; }
    if (!x || S.busy) return;
    if ((t = e.target.closest('[data-route]'))) { var k = t.getAttribute('data-route'); if (k !== x.route) change(x.id, { route: k }, 'route', ROUTE[k]); return; }
    if ((t = e.target.closest('[data-status]'))) { var s = t.getAttribute('data-status'); if (s !== x.status) change(x.id, { status: s }, 'status', STATUS[s]); return; }
    if ((t = e.target.closest('[data-assign]'))) { var u = S.team.filter(function (m) { return m.id === t.getAttribute('data-assign'); })[0]; if (u && u.id !== x.assignee) change(x.id, { assignee: u.id, assigneeName: u.name }, 'assign', u.name); return; }
    var box = dlg.querySelector('[data-text]'), txt = box ? box.value.trim() : '';
    if (e.target.closest('[data-logcall]')) {
      if (!txt) { S.error = 'نتیجهٔ تماس را بنویسید.'; showDetail(); return; }
      change(x.id, x.status === 'new' ? { status: 'contacted' } : {}, 'call', txt); return;
    }
    if (e.target.closest('[data-lognote]')) { if (!txt) { S.error = 'یادداشت را بنویسید.'; showDetail(); return; } change(x.id, {}, 'note', txt); return; }
    if (e.target.closest('[data-proforma]')) toProforma(x);
  });
  dlg.addEventListener('close', function () { S.sel = ''; if (unsubLog) { unsubLog(); unsubLog = null; } });

  // ---------- data
  function listen() {
    if (unsub) { unsub(); unsub = null; }
    var col = db.collection('requests'), q = lead() ? col : col.where('assignee', '==', S.user.uid);
    unsub = q.onSnapshot(function (snap) {
      S.list = []; snap.forEach(function (s) { var d = s.data(); d.id = s.id; S.list.push(d); });
      S.list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      S.loading = false; S.error = ''; render(); if (S.sel) showDetail();
    }, function (e) { S.loading = false; S.error = errText(e); render(); });
  }
  function loadTeam() {
    if (!lead()) return Promise.resolve();
    return db.collection('users').get().then(function (snap) {
      S.team = []; snap.forEach(function (s) { var d = s.data(); if (window.MSRoles.norm(d.role) === 'visitor' && d.active !== false) S.team.push({ id: s.id, name: d.name || d.email || s.id }); });
      S.team.sort(function (a, b) { return a.name.localeCompare(b.name, 'fa'); });
    }, function () { /* the list of salespeople stays empty */ });
  }
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.list = []; S.team = [];
    if (unsub) { unsub(); unsub = null; }
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('crm')) { S.loading = false; render(); return; }
      return loadTeam().then(listen);
    }).then(null, function (e) { S.loading = false; S.error = errText(e); render(); });
  });
  render();
})();

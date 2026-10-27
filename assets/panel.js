(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, M = window.MSMath, root = document.getElementById('panel');
  var faInt = new Intl.NumberFormat('fa-IR');

  // Same sales regions as the CEO dashboard (assets/ceo-dashboard.js); validate_portal.mjs keeps the two in sync.
  var REGIONS = {
    'منطقه ۱': ['آذربایجان شرقی', 'آذربایجان غربی', 'اردبیل', 'زنجان', 'قزوین', 'کردستان', 'همدان', 'کرمانشاه'],
    'منطقه ۲': ['اصفهان', 'چهارمحال و بختیاری', 'مرکزی', 'لرستان', 'ایلام', 'خوزستان', 'کهگیلویه و بویراحمد', 'فارس', 'بوشهر'],
    'منطقه ۳': ['گیلان', 'مازندران', 'گلستان', 'سمنان'],
    'منطقه ۴': ['تهران', 'البرز', 'قم'],
    'منطقه ۵': ['خراسان شمالی', 'خراسان رضوی', 'خراسان جنوبی'],
    'منطقه ۶': ['سیستان و بلوچستان', 'یزد', 'کرمان', 'هرمزگان']
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function errText(e) {
    var c = e && e.code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'ایمیل یا رمز عبور درست نیست.';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'سرور پاسخ نداد. اینترنت را بررسی کنید و اگر VPN روشن است آن را خاموش کنید؛ سپس دوباره امتحان کنید. اگر مشکل ماند، چند دقیقه بعد دوباره بیایید.';
    if (/permission-denied/.test(c)) return 'اجازهٔ انجام این کار را ندارید.';
    if (/too-many-requests/.test(c)) return 'تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید.';
    if (/requires-recent-login/.test(c)) return 'برای امنیت یک بار خارج شوید، دوباره وارد شوید و تکرار کنید.';
    if (/weak-password/.test(c)) return 'رمز جدید ضعیف است؛ دست‌کم ۸ نویسه بگذارید.';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  function monthKey(ms) {
    try {
      var p = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit' }).formatToParts(new Date(ms));
      return p.filter(function (x) { return x.type === 'year' || x.type === 'month'; }).map(function (x) { return x.value.replace(/\D/g, ''); }).join('-');
    } catch (e) { return ''; }
  }
  var faDate = function (ms) { try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; } };

  if (!cfg || !window.firebase || !M) { root.innerHTML = '<p class="pn-note">سرویس حساب در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();

  var S = { user: null, profile: null, loading: true, busy: false, msg: '', error: '', docs: [], team: [] };
  var dlg = document.createElement('dialog');
  dlg.className = 'pn-dialog';
  document.body.appendChild(dlg);

  var can = function (area) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, area)); };
  var active = function () { return !!(S.profile && S.profile.active !== false); };

  function u_email() { return S.user && S.user.email ? String(S.user.email).toLowerCase() : ''; }

  // ----- data
  function load() {
    S.loading = true; S.error = ''; render();
    var uid = S.user.uid;
    var timeout = new Promise(function (_, rej) { setTimeout(function () { rej({ code: 'timeout' }); }, 15000); });
    Promise.race([db.collection('users').doc(uid).get(), timeout]).then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (S.profile && !S.profile.email && u_email()) { db.collection('users').doc(uid).update({ email: u_email() }).then(function () { S.profile.email = u_email(); }, function () { /* the rules may not be published yet */ }); }
      try { localStorage.setItem('ms-role', active() ? (S.profile.role || '') : ''); } catch (x) { /* ignore */ }
      if (window.MSGate) window.MSGate.apply();
      if (!active()) return null;
      var q = can('invoices') ? db.collection('invoices') : db.collection('invoices').where('ownerUid', '==', uid);
      return Promise.race([Promise.all([q.get(), can('team') ? db.collection('users').get() : null]), timeout]).then(function (res) {
        S.docs = [];
        res[0].forEach(function (s) { S.docs.push(s.data()); });
        S.docs.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        S.team = [];
        if (res[1]) res[1].forEach(function (s) { var d = s.data(); d.id = s.id; S.team.push(d); });
      });
    }).then(null, function (e) {
      S.error = errText(e);
      // offline or no VPN: fall back to the identity cached by the catalog so name, role and regions still show
      if (!S.profile) {
        try { var c = JSON.parse(localStorage.getItem('ms-profile-v1') || 'null'); if (c && c.uid === uid) S.profile = c.profile; } catch (x) { /* ignore */ }
      }
    }).then(function () { S.loading = false; render(); loadComm(); loadTickets(); loadPublic(); loadPrefs(); loadPersonal(); loadArchive(); needProfiles([S.user.uid]); if (window.MSNotify) window.MSNotify.refresh(true); });
  }
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.docs = []; S.team = []; S.msg = ''; S.busy = false;
    if (!u) { if (!(window.MSApi && window.MSApi.signedIn())) { try { if (localStorage.getItem('ms-show') !== '1') localStorage.removeItem('ms-role'); } catch (x) { /* ignore */ } } if (window.MSGate) window.MSGate.apply(); S.loading = false; render(); return; }
    load();
  });

  // ----- views
  function chips(p) {
    var regs = (p.regions || []).map(function (r) { return '<span class="pn-chip">' + esc(r) + '</span>'; }).join('');
    var cities = p.cities ? '<p class="pn-note">' + esc(p.cities) + '</p>' : '';
    return (regs || cities) ? '<div class="pn-chips">' + regs + '</div>' + cities : '<p class="pn-note">منطقه‌ای برای شما ثبت نشده است. مدیر آن را تعیین می‌کند.</p>';
  }
  var faOne = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  function areaView(p) {
    var regs = p.regions || [], A = window.MS_AREA;
    if (!regs.length) return '<p class="pn-note">وقتی مدیر استان‌های شما را تعیین کند، نقشه و فروش منطقه اینجا نمایش داده می‌شود.</p>';
    if (!A) return '<p class="pn-note">داده‌های فروش بارگذاری نشد.</p>';
    var sales = {};
    A.rows.forEach(function (r) { (sales[r.province] = sales[r.province] || {})[r.year] = r.sales; });
    var tot = {};
    var body = regs.map(function (name) {
      return '<tr><td>' + esc(name) + '</td>' + A.years.map(function (y) {
        var v = sales[name] && sales[name][y];
        tot[y] = (tot[y] || 0) + (v || 0);
        return '<td>' + (v == null ? '—' : faOne.format(v)) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="pn-map" id="pnMap" role="img" aria-label="نقشهٔ استان‌های منطقهٔ فعالیت من"></div>' +
      '<div class="pn-scroll"><table class="pn-table"><thead><tr><th>استان</th>' + A.years.map(function (y) { return '<th>' + faInt.format(y) + '</th>'; }).join('') + '</tr></thead>' +
      '<tbody>' + body + '</tbody><tfoot><tr><td>جمع منطقهٔ من</td>' + A.years.map(function (y) { return '<td>' + faOne.format(tot[y] || 0) + '</td>'; }).join('') + '</tr></tfoot></table></div>' +
      '<p class="pn-note">فروش شرکت در هر استان، به میلیارد تومان.</p>';
  }
  var mapSvg = null;
  function paintMap() {
    var host = document.getElementById('pnMap');
    if (!host || !S.profile) return;
    var allowed = {};
    (S.profile.regions || []).forEach(function (n) { allowed[n] = true; });
    var draw = function (text) {
      host.innerHTML = text;
      var svg = host.querySelector('svg');
      if (!svg) return;
      svg.removeAttribute('width'); svg.removeAttribute('height');
      var paths = [].slice.call(svg.querySelectorAll('path[id^="IR-"]')), box = null;
      paths.forEach(function (path) {
        var name = window.MS_AREA.isoToProvince[path.id], on = !!allowed[name];
        path.setAttribute('fill', on ? '#FFCC2A' : '#E6EAF0');
        path.setAttribute('stroke', on ? '#071b36' : '#ffffff');
        path.setAttribute('stroke-width', on ? '1.4' : '.8');
        path.removeAttribute('title');
        var t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        t.textContent = name || '';
        path.appendChild(t);
      });
      try {
        paths.forEach(function (path) {
          var b = path.getBBox();
          box = box ? { x1: Math.min(box.x1, b.x), y1: Math.min(box.y1, b.y), x2: Math.max(box.x2, b.x + b.width), y2: Math.max(box.y2, b.y + b.height) } : { x1: b.x, y1: b.y, x2: b.x + b.width, y2: b.y + b.height };
        });
        if (box) svg.setAttribute('viewBox', (box.x1 - 8) + ' ' + (box.y1 - 8) + ' ' + (box.x2 - box.x1 + 16) + ' ' + (box.y2 - box.y1 + 16));
      } catch (e) { svg.setAttribute('viewBox', '0 0 654.5 593.7'); }
    };
    if (mapSvg) { draw(mapSvg); return; }
    fetch('./assets/iran-map.svg').then(function (r) { return r.text(); }).then(function (t) { mapSvg = t; draw(t); }, function () { host.textContent = 'نقشه بارگذاری نشد.'; });
  }
  function money(n, u) { return faInt.format(Math.round(n)) + ' ' + (u || 'تومان'); }
  function monthTotals(docs) {
    var now = monthKey(Date.now()), by = {};
    docs.forEach(function (d) { if (monthKey(d.createdAt || 0) === now) by[d.unit || 'تومان'] = (by[d.unit || 'تومان'] || 0) + M.totals(d).total; });
    var keys = Object.keys(by);
    return keys.length ? keys.map(function (u) { return money(by[u], u); }).join(' + ') : '—';
  }
  // ----- commission: rates by region and year (finance drafts, sales manager reviews, CEO approves). The income base is the
  // yearly regional sales already in this page's data (MS_AREA); the rates and results live only in Firestore behind the rules.
  var faTwo = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var faPct = new Intl.NumberFormat('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  var RATE_MIN = 0.5, RATE_MAX = 1.5;
  var COMM_LABEL = { none: 'ثبت نشده', draft: 'پیش‌نویس مالی', reviewed: 'بررسی‌شدهٔ مدیر فروش', approved: 'تأییدشدهٔ مدیرعامل' };
  S.comm = { year: '', month: '', doc: null, results: [], mdoc: null, mall: {}, mres: [], loading: false, busy: false, msg: '', error: '' };
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function provinceToRegion() {
    var m = {};
    Object.keys(REGIONS).forEach(function (g) { REGIONS[g].forEach(function (p) { m[p] = g; }); });
    return m;
  }
  function regionsOf(provinces) {
    var m = provinceToRegion(), seen = {}, out = [];
    (provinces || []).forEach(function (p) { var g = m[p]; if (g && !seen[g]) { seen[g] = true; out.push(g); } });
    return out;
  }
  function commYears() { return window.MS_AREA && window.MS_AREA.years ? window.MS_AREA.years.slice() : []; }
  function regionIncome(year) {
    var out = {}, m = provinceToRegion();
    Object.keys(REGIONS).forEach(function (g) { out[g] = 0; });
    if (window.MS_AREA) window.MS_AREA.rows.forEach(function (r) { if (String(r.year) === String(year) && m[r.province]) out[m[r.province]] += r.sales || 0; });
    return out;
  }
  function commOwnRegions() { return (S.profile && S.profile.commissionRegions) || []; }
  function loadComm() {
    if (!S.profile || !active() || !S.user) return;
    var yrs = commYears();
    if (!yrs.length) return;
    if (!S.comm.year) S.comm.year = String(yrs[yrs.length - 1]);
    if (!S.comm.month) {
      var jp = {};                                        // current Jalali month when the year matches, else the first
      try {
        new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit' }).formatToParts(new Date()).forEach(function (x) { jp[x.type] = x.value.replace(/\D/g, ''); });
      } catch (x) { /* ignore */ }
      S.comm.month = jp.year === S.comm.year && jp.month ? jp.month : '01';
    }
    var y = S.comm.year, mm = S.comm.month, p = null;
    var names = Object.keys(REGIONS);
    if (can('commission')) {
      p = Promise.all([
        db.collection('commission_rates').doc(y).get().then(function (s) { S.comm.doc = s.exists ? s.data() : null; }),
        db.collection('commission_months').get().then(function (qs) {
          S.comm.mall = {};
          qs.forEach(function (s) { S.comm.mall[s.id] = s.data(); });
          S.comm.mdoc = S.comm.mall[y + '_' + mm] || null;
        })
      ]);
    } else if (commOwnRegions().length) {
      // one document per region (and month), read by id: a rule that depends on the caller's profile cannot be proven for a query
      var get = function (col, id) { return db.collection(col).doc(id).get().then(function (s) { return s.exists ? s.data() : null; }, function () { return null; }); };
      var annual = Promise.all(commOwnRegions().map(function (g) {
        var i = names.indexOf(g);
        return i < 0 ? null : get('commission_results', y + '_' + (i + 1));
      })).then(function (list) { S.comm.results = list.filter(Boolean); });
      var months = [];
      commOwnRegions().forEach(function (g) {
        var i = names.indexOf(g);
        if (i < 0) return;
        for (var m = 1; m <= 12; m++) months.push(get('commission_month_results', y + '_' + pad2(m) + '_' + (i + 1)));
      });
      p = Promise.all([annual, Promise.all(months).then(function (list) {
        S.comm.mres = list.filter(Boolean).sort(function (a, b) { return a.month < b.month ? -1 : (a.month > b.month ? 1 : 0); });
      })]);
    }
    if (!p) return;
    S.comm.loading = true; S.comm.error = ''; render();
    p.then(null, function (e) { S.comm.error = errText(e); }).then(function () { S.comm.loading = false; render(); if (window.MSNotify) window.MSNotify.refresh(true); });
  }
  function commYearChips() {
    return '<div class="pn-chips pn-years" role="group" aria-label="سال">' + commYears().map(function (y) {
      return '<button type="button" class="pn-year" data-comm-year="' + y + '" aria-pressed="' + (String(y) === S.comm.year) + '">' + faInt.format(y).replace(/٬/g, '') + '</button>';
    }).join('') + '</div>';
  }
  function commissionView() {
    if (!commYears().length) return '';
    return annualView() + (can('commission') ? monthView() : ownMonthView());
  }
  function annualView() {
    var C = S.comm;
    if (!commYears().length) return '';
    if (!can('commission')) {
      if (!commOwnRegions().length) return '';
      var mine = C.results.filter(function (r) { return r.status === 'approved'; });
      return '<section class="pn-card pn-comm"><h2>پورسانت من</h2>' + commYearChips() +
        (C.error ? '<p class="pn-err" role="alert">' + esc(C.error) + '</p>' : '') +
        (mine.length ? '<div class="pn-scroll"><table class="pn-table"><thead><tr><th>منطقه</th><th>درآمد سالانه (میلیارد تومان)</th><th>نرخ</th><th>پورسانت (میلیارد تومان)</th></tr></thead><tbody>' +
          mine.map(function (r) { return '<tr><td>' + esc(r.region) + '</td><td>' + faOne.format(r.income) + '</td><td>' + faPct.format(r.rate) + '٪</td><td>' + faTwo.format(r.commission) + '</td></tr>'; }).join('') +
          '</tbody></table></div>' : '<p class="pn-note">' + (C.loading ? 'در حال بارگذاری…' : 'برای این سال نتیجهٔ تأییدشده‌ای برای منطقهٔ شما منتشر نشده است.') + '</p>') + '</section>';
    }
    var doc = C.doc, rates = (doc && doc.rates) || {}, status = doc ? doc.status : 'none', inc = regionIncome(C.year);
    var editable = can('commissionEdit') && status !== 'approved';
    var tot = 0, totInc = 0;
    var rows = Object.keys(REGIONS).map(function (g) {
      var r = rates[g], cm = r == null ? null : inc[g] * r / 100;
      totInc += inc[g]; if (cm != null) tot += cm;
      return '<tr><td>' + esc(g) + '</td><td>' + faOne.format(inc[g]) + '</td><td>' +
        (editable ? '<input type="number" inputmode="decimal" dir="ltr" data-rate="' + esc(g) + '" min="' + RATE_MIN + '" max="' + RATE_MAX + '" step="0.05" value="' + (r == null ? '' : r) + '" aria-label="نرخ ' + esc(g) + '">'
          : (r == null ? '—' : faPct.format(r) + '٪')) + '</td><td>' + (cm == null ? '—' : faTwo.format(cm)) + '</td></tr>';
    }).join('');
    var acts = '';
    if (editable) acts += '<button type="button" class="pn-secondary" data-comm-act="save"' + (C.busy ? ' disabled' : '') + '>ذخیرهٔ پیش‌نویس</button>';
    if (can('commissionReview') && status === 'draft') acts += '<button type="button" class="pn-primary" data-comm-act="review"' + (C.busy ? ' disabled' : '') + '>تأیید بررسی</button>';
    if (can('commissionApprove') && status === 'reviewed') acts += '<button type="button" class="pn-primary" data-comm-act="approve"' + (C.busy ? ' disabled' : '') + '>تأیید نهایی و انتشار</button>';
    return '<section class="pn-card pn-comm" id="commission"><h2>پورسانت مناطق</h2>' + commYearChips() +
      '<p class="pn-note"><span class="pn-chip">' + esc(COMM_LABEL[status] || COMM_LABEL.none) + '</span> مبنا: درآمد سالانهٔ هر منطقه؛ نرخ بین ' + faPct.format(RATE_MIN) + ' تا ' + faPct.format(RATE_MAX) + ' درصد.</p>' +
      '<div class="pn-scroll"><table class="pn-table"><thead><tr><th>منطقه</th><th>درآمد (میلیارد تومان)</th><th>نرخ ٪</th><th>پورسانت (میلیارد تومان)</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td>جمع</td><td>' + faOne.format(totInc) + '</td><td>—</td><td>' + faTwo.format(tot) + '</td></tr></tfoot></table></div>' +
      (C.msg ? '<p class="pn-ok" role="status">' + esc(C.msg) + '</p>' : '') + (C.error ? '<p class="pn-err" role="alert">' + esc(C.error) + '</p>' : '') +
      (acts ? '<div class="pn-actions">' + acts + '</div>' : '') +
      '<p class="pn-note">فقط مالی نرخ را وارد می‌کند، مدیر فروش بررسی و مدیرعامل تأیید می‌کند. کارشناس فروش فقط نتیجهٔ منطقهٔ خودش را می‌بیند.</p></section>';
  }
  var SEASONS = [
    { key: 'spring', name: 'بهار', icon: '<path d="M12 21v-8M12 13c0-4 3-6 7-6 0 4-3 6-7 6zM12 15c0-3-2-5-6-5 0 3 2 5 6 5z"/>' },
    { key: 'summer', name: 'تابستان', icon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.900 4.900l1.400 1.400m11.400 11.400 1.400 1.400M2 12h2m16 0h2M4.900 19.100l1.400-1.400m11.400-11.400 1.400-1.400"/>' },
    { key: 'autumn', name: 'پاییز', icon: '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8"/>' },
    { key: 'winter', name: 'زمستان', icon: '<path d="M12 2v20M4 6.500l16 11M20 6.500l-16 11"/>' }
  ];
  function monthChips() {
    var C = S.comm;
    return '<div class="pn-seasons" role="group" aria-label="ماه">' + SEASONS.map(function (s, si) {
      return '<div class="pn-season ' + s.key + '"><div class="pn-season-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + s.icon + '</svg><span>' + s.name + '</span></div>' +
        [0, 1, 2].map(function (k) {
          var i = si * 3 + k, mm = pad2(i + 1), d = C.mall[C.year + '_' + mm], st = d ? d.status : 'none';
          return '<button type="button" class="pn-m" data-comm-month="' + mm + '" data-st="' + st + '" aria-pressed="' + (mm === C.month) + '" title="' + esc(COMM_LABEL[st] || COMM_LABEL.none) + '">' +
            '<i aria-hidden="true"></i><span>' + esc(MONTHS[i]) + '</span></button>';
        }).join('') + '</div>';
    }).join('') + '</div>' +
      '<p class="pn-legend"><span><i data-st="draft"></i>پیش‌نویس</span><span><i data-st="reviewed"></i>بررسی‌شده</span><span><i data-st="approved"></i>تأییدشده</span></p>';
  }
  function monthView() {
    var C = S.comm;
    if (!commYears().length) return '';
    var md = C.mdoc, st = md ? md.status : 'none', items = (md && md.items) || {}, annual = (C.doc && C.doc.rates) || {};
    var editable = can('commissionEdit') && st !== 'approved';
    var totBase = 0, totCom = 0;
    var rows = Object.keys(REGIONS).map(function (g) {
      var it = items[g] || {}, rate = it.rate != null ? it.rate : annual[g], base = it.base;
      var com = (base != null && rate != null) ? base * rate / 100 * 1000 : null;     // billion toman to million toman
      if (base != null) totBase += base; if (com != null) totCom += com;
      return '<tr><td>' + esc(g) + '</td><td>' +
        (editable ? '<input type="number" inputmode="decimal" dir="ltr" data-mbase="' + esc(g) + '" min="0" step="0.01" value="' + (base == null ? '' : base) + '" aria-label="مبنای ' + esc(g) + '">'
          : (base == null ? '—' : faTwo.format(base))) + '</td><td>' +
        (editable ? '<input type="number" inputmode="decimal" dir="ltr" data-mrate="' + esc(g) + '" min="' + RATE_MIN + '" max="' + RATE_MAX + '" step="0.05" value="' + (rate == null ? '' : rate) + '" aria-label="نرخ ' + esc(g) + '">'
          : (rate == null ? '—' : faPct.format(rate) + '٪')) + '</td><td>' + (com == null ? '—' : faOne.format(com)) + '</td></tr>';
    }).join('');
    var acts = '';
    if (editable) acts += '<button type="button" class="pn-secondary" data-comm-act="m-save"' + (C.busy ? ' disabled' : '') + '>ذخیرهٔ پیش‌نویس ماه</button>';
    if (can('commissionReview') && st === 'draft') acts += '<button type="button" class="pn-primary" data-comm-act="m-review"' + (C.busy ? ' disabled' : '') + '>تأیید بررسی ماه</button>';
    if (can('commissionApprove') && st === 'reviewed') acts += '<button type="button" class="pn-primary" data-comm-act="m-approve"' + (C.busy ? ' disabled' : '') + '>تأیید نهایی و انتشار ماه</button>';
    return '<section class="pn-card pn-comm"><h2>پایهٔ ماهانه</h2>' + commYearChips() + monthChips() +
      '<p class="pn-note"><span class="pn-chip">' + esc(COMM_LABEL[st] || COMM_LABEL.none) + '</span> فروش تأییدشدهٔ ماه هر منطقه را به میلیارد تومان وارد کنید. نرخ از جدول سالانه پیش‌فرض می‌شود و در صورت نیاز برای همین ماه تغییر می‌کند.</p>' +
      '<div class="pn-scroll"><table class="pn-table"><thead><tr><th>منطقه</th><th>فروش ماه (میلیارد تومان)</th><th>نرخ ٪</th><th>پورسانت (میلیون تومان)</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td>جمع</td><td>' + faTwo.format(totBase) + '</td><td>—</td><td>' + faOne.format(totCom) + '</td></tr></tfoot></table></div>' +
      (C.msg ? '<p class="pn-ok" role="status">' + esc(C.msg) + '</p>' : '') + (C.error ? '<p class="pn-err" role="alert">' + esc(C.error) + '</p>' : '') +
      (acts ? '<div class="pn-actions">' + acts + '</div>' : '') +
      '<p class="pn-note">فقط مالی و حسابداری وارد می‌کند، مدیر فروش بررسی و مدیرعامل تأیید می‌کند.</p></section>';
  }
  function ownMonthView() {
    var C = S.comm;
    if (!commOwnRegions().length || !commYears().length) return '';
    var list = C.mres.filter(function (r) { return r.status === 'approved'; });
    if (!list.length) return '';
    return '<section class="pn-card pn-comm"><h2>پورسانت ماهانهٔ من</h2><div class="pn-scroll"><table class="pn-table"><thead><tr><th>ماه</th><th>منطقه</th><th>فروش (میلیارد تومان)</th><th>نرخ</th><th>پورسانت (میلیون تومان)</th></tr></thead><tbody>' +
      list.map(function (r) {
        return '<tr><td>' + esc(MONTHS[parseInt(r.month, 10) - 1] || r.month) + '</td><td>' + esc(r.region) + '</td><td>' + faTwo.format(r.base) + '</td><td>' + faPct.format(r.rate) + '٪</td><td>' + faOne.format(r.commission) + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }
  function mAct(kind) {
    var C = S.comm, y = C.year, mm = C.month, uid = S.user.uid, now = Date.now();
    var ref = db.collection('commission_months').doc(y + '_' + mm);
    C.msg = ''; C.error = '';
    var names = Object.keys(REGIONS), annual = (C.doc && C.doc.rates) || {}, items = {}, bad = '', filled = 0;
    var bases = root.querySelectorAll('input[data-mbase]');
    if (bases.length) {
      Array.prototype.forEach.call(bases, function (el) {
        var g = el.getAttribute('data-mbase'), raw = el.value.trim();
        var rateEl = root.querySelector('input[data-mrate="' + g + '"]'), rraw = rateEl ? rateEl.value.trim() : '';
        if (raw === '') return;
        var b = parseFloat(raw), r = rraw === '' ? annual[g] : parseFloat(rraw);
        if (!(b >= 0)) { bad = 'مبلغ ' + g + ' درست نیست.'; return; }
        if (!(r >= RATE_MIN && r <= RATE_MAX)) { bad = 'نرخ ' + g + ' باید بین ' + faPct.format(RATE_MIN) + ' تا ' + faPct.format(RATE_MAX) + ' درصد باشد (یا ابتدا نرخ سالانه را ثبت کنید).'; return; }
        items[g] = { base: b, rate: r }; filled++;
      });
    } else { items = (C.mdoc && C.mdoc.items) || {}; filled = Object.keys(items).length; }
    var done = function (m) { C.busy = false; if (m) C.msg = m; render(); loadComm(); };
    var fail = function (e) { C.busy = false; C.error = errText(e); render(); };
    if (kind === 'm-save') {
      if (bad) { C.error = bad; render(); return; }
      if (!filled) { C.error = 'دست‌کم مبلغ یک منطقه را وارد کنید.'; render(); return; }
      C.busy = true; render();
      ref.set({ year: y, month: mm, items: items, status: 'draft', updatedBy: uid, updatedAt: now }).then(function () { done('پیش‌نویس ماه ذخیره شد.'); }, fail);
    } else if (kind === 'm-review') {
      if (Object.keys(items).length < names.length) { C.error = 'برای بررسی باید مبلغ و نرخ هر شش منطقه ثبت شده باشد.'; render(); return; }
      C.busy = true; render();
      ref.update({ status: 'reviewed', reviewedBy: uid, reviewedAt: now }).then(function () { done('بررسی ماه ثبت شد؛ منتظر تأیید مدیرعامل.'); }, fail);
    } else if (kind === 'm-approve') {
      if (Object.keys(items).length < names.length) { C.error = 'مبلغ و نرخ هر شش منطقه باید ثبت شده باشد.'; render(); return; }
      C.busy = true; render();
      var batch = db.batch();
      batch.update(ref, { status: 'approved', approvedBy: uid, approvedAt: now });
      names.forEach(function (g, i) {
        var it = items[g];
        batch.set(db.collection('commission_month_results').doc(y + '_' + mm + '_' + (i + 1)), {
          year: y, month: mm, region: g, base: it.base, rate: it.rate, commission: it.base * it.rate / 100 * 1000,
          status: 'approved', approvedBy: uid, approvedAt: now
        });
      });
      batch.commit().then(function () { done('پایهٔ ماه تأیید و نتیجهٔ مناطق منتشر شد.'); }, fail);
    }
  }
  function commAct(kind) {
    if (kind.indexOf('m-') === 0) { mAct(kind); return; }
    var C = S.comm, y = C.year, uid = S.user.uid, ref = db.collection('commission_rates').doc(y), now = Date.now();
    C.msg = ''; C.error = '';
    var rates = {}, bad = false, filled = 0;
    var inputs = root.querySelectorAll('input[data-rate]');
    if (inputs.length) {
      Array.prototype.forEach.call(inputs, function (el) {
        var raw = el.value.trim();
        if (raw === '') return;
        var v = parseFloat(raw);
        if (!(v >= RATE_MIN && v <= RATE_MAX)) { bad = true; return; }
        rates[el.getAttribute('data-rate')] = v; filled++;
      });
    } else { rates = (C.doc && C.doc.rates) || {}; filled = Object.keys(rates).length; }
    var all = Object.keys(REGIONS).length;
    var done = function (m) { C.busy = false; if (m) C.msg = m; render(); loadComm(); };
    var fail = function (e) { C.busy = false; C.error = errText(e); render(); };
    if (kind === 'save') {
      if (bad) { C.error = 'نرخ هر منطقه باید بین ' + faPct.format(RATE_MIN) + ' تا ' + faPct.format(RATE_MAX) + ' درصد باشد.'; render(); return; }
      if (!filled) { C.error = 'دست‌کم نرخ یک منطقه را وارد کنید.'; render(); return; }
      C.busy = true; render();
      ref.set({ year: y, rates: rates, status: 'draft', updatedBy: uid, updatedAt: now }).then(function () { done('پیش‌نویس ذخیره شد.'); }, fail);
    } else if (kind === 'review') {
      if (Object.keys(rates).length < all) { C.error = 'برای بررسی باید نرخ هر شش منطقه ثبت شده باشد.'; render(); return; }
      C.busy = true; render();
      ref.update({ status: 'reviewed', reviewedBy: uid, reviewedAt: now }).then(function () { done('بررسی ثبت شد؛ منتظر تأیید مدیرعامل.'); }, fail);
    } else if (kind === 'approve') {
      if (Object.keys(rates).length < all) { C.error = 'نرخ هر شش منطقه باید ثبت شده باشد.'; render(); return; }
      C.busy = true; render();
      var inc = regionIncome(y), batch = db.batch();
      batch.update(ref, { status: 'approved', approvedBy: uid, approvedAt: now });
      Object.keys(REGIONS).forEach(function (g, i) {
        batch.set(db.collection('commission_results').doc(y + '_' + (i + 1)), {
          year: y, region: g, income: inc[g], rate: rates[g], commission: inc[g] * rates[g] / 100,
          status: 'approved', approvedBy: uid, approvedAt: now
        });
      });
      batch.commit().then(function () { done('نرخ‌ها تأیید و نتیجهٔ مناطق منتشر شد.'); }, fail);
    }
  }

  // ----- tickets: a conversation between people and departments. A message is immutable; a ticket has an audience
  // (the sender, the addressee person or role). Account removals open one automatically so management is told to also
  // delete the sign-in account, which only the Firebase console can do.
  var TK_TARGETS = ['sales_manager', 'account_manager', 'finance', 'operations', 'production', 'service', 'marketing', 'hr', 'ceo', 'manager'];
  S.tk = { list: [], loading: false, error: '', msgs: [], open: null, busy: false };
  function myRole() { return MSRoles.norm(S.profile && S.profile.role); }
  function myName() { return (S.profile && S.profile.name) || (S.user && S.user.email) || ''; }
  function loadTickets() {
    if (!S.profile || !active() || !S.user) return;
    var col = db.collection('tickets'), uid = S.user.uid, qs;
    if (myRole() === 'manager') qs = [col.get()];
    else qs = [col.where('audience', 'array-contains', 'uid:' + uid).get(), col.where('audience', 'array-contains', 'role:' + myRole()).get()];
    S.tk.loading = true; S.tk.error = ''; render();
    Promise.all(qs).then(function (res) {
      var by = {};
      res.forEach(function (snap) { snap.forEach(function (s) { var d = s.data(); d.id = s.id; by[d.id] = d; }); });
      S.tk.list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      var ids = [S.user.uid]; S.tk.list.forEach(function (x) { ids.push(x.fromUid, x.toUid); }); needProfiles(ids);
    }).then(null, function (e) { S.tk.error = errText(e); }).then(function () { S.tk.loading = false; render(); if (window.MSNotify) window.MSNotify.refresh(true); });
  }
  function createTicket(o) {
    var me = S.user.uid, now = Date.now(), ref = db.collection('tickets').doc();
    var aud = ['uid:' + me];
    aud.push(o.toUid ? 'uid:' + o.toUid : 'role:' + o.toRole);
    var head = {
      title: o.title, fromUid: me, fromName: myName(), fromRole: myRole(), toRole: o.toRole, toUid: o.toUid || '', toName: o.toName || '',
      kind: o.kind || 'message', status: 'open', createdAt: now, updatedAt: now, lastText: String(o.text).slice(0, 140), lastBy: me, lastByName: myName(), audience: aud
    };
    var b = db.batch();
    b.set(ref, head);
    b.set(ref.collection('messages').doc(), { uid: me, name: myName(), role: myRole(), text: o.text, at: now });
    return b.commit();
  }
  // a conversation opened on this device is not «waiting» any more until a newer message arrives
  function seenHere(x) { return !!(window.MSNotify && window.MSNotify.readOf && window.MSNotify.readOf(x.id) >= (x.updatedAt || 0)); }
  function tkWaiting() {
    var mine = ['uid:' + S.user.uid, 'role:' + myRole()];   // general management reads everything but is only asked about its own
    return S.tk.list.filter(function (x) {
      return x.status === 'open' && x.lastBy !== S.user.uid && (x.audience || []).some(function (a) { return mine.indexOf(a) >= 0; }) && !seenHere(x);
    }).length;
  }
  // phone numbers: digits only, no country code
  function cleanPhone(v) {
    var s = String(v || '').replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); })
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }).replace(/\D/g, '');
    if (s.indexOf('0098') === 0) s = s.slice(4); else if (s.indexOf('98') === 0 && s.length >= 12) s = s.slice(2);
    if (s.length === 10 && s.charAt(0) !== '0') s = '0' + s;
    return s.slice(0, 11);
  }
  function tkWhen(ms) { try { return new Intl.DateTimeFormat('fa-IR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; } }
  // ----- the conversation list and the messenger window
  function hue(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  // each person's look: a picture or a colour, stored in profiles/{uid} (readable by people of the company)
  var PROFILE_COLORS = ['#071b36', '#2456d8', '#0f766e', '#14804a', '#6b7a1a', '#b7791f', '#c2410c', '#b42318', '#be185d', '#6b3fc0', '#475467'];
  var PROFILES = {}, profilePending = {}, profileTimer = 0;
  function profOf(uid) { return uid ? PROFILES[uid] || null : null; }
  function needProfiles(list) {
    (list || []).forEach(function (uid) {
      if (!uid || PROFILES[uid] !== undefined || profilePending[uid]) return;
      profilePending[uid] = 1;
      db.collection('profiles').doc(uid).get().then(function (s) { PROFILES[uid] = s.exists ? s.data() : null; }, function () { PROFILES[uid] = null; })
        .then(function () {
          delete profilePending[uid];
          clearTimeout(profileTimer);
          profileTimer = setTimeout(function () { render(); repaintChatLooks(); }, 60);
        });
    });
  }
  function colorOf(uid, name) { var p = profOf(uid); return p && p.color ? p.color : ''; }
  function avatar(name, px, uid) {
    var p = profOf(uid), size = px || 40;
    if (p && p.photo) return '<span class="pn-av photo" style="--px:' + size + 'px" aria-hidden="true"><img src="' + esc(p.photo) + '" alt="" width="' + size + '" height="' + size + '"></span>';
    var ch = String(name || '').trim().charAt(0) || '؟';
    var st = p && p.color ? '--c:' + p.color : '--h:' + hue(name);
    return '<span class="pn-av' + (p && p.color ? ' tint' : '') + '" style="' + st + ';--px:' + size + 'px" aria-hidden="true">' + esc(ch) + '</span>';
  }
  // pictures that arrive while a conversation is open
  function repaintChatLooks() {
    if (!S.tk || !S.tk.open || !dlg.open) return;
    var x = (S.tk.list || []).filter(function (k) { return k.id === S.tk.open; })[0];
    if (!x) return;
    var head = dlg.querySelector('.pn-chat-head .pn-av');
    if (head) head.outerHTML = avatar(otherParty(x), 44, otherUidOf(x));
    lastSig = ''; paintFeed(false);
  }
  function tkTime(ms) { try { return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; } }
  function tkDay(ms) { try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; } }
  // a presence line only makes sense when the other side is one person
  function otherUidOf(x) { return x.fromUid === S.user.uid ? (x.toUid || '') : (x.fromUid || ''); }
  function otherParty(x) { return x.fromUid === S.user.uid ? (x.toName || MSRoles.label(x.toRole)) : (x.fromName || '—'); }
  var CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  var SEND_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.400 20.400 21 12 3.400 3.600l-.1 6.500L15 12l-11.700 1.900z"/></svg>';
  var CHEV_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  // a drop-down that follows the site font (the browser's own list does not); the value lives in a hidden input
  function dropdown(name, label, groups, selected) {
    var flat = []; groups.forEach(function (g) { g.options.forEach(function (o) { flat.push(o); }); });
    var cur = flat.filter(function (o) { return o.v === selected; })[0] || flat[0] || { v: '', t: '' };
    var lis = groups.map(function (g) {
      return (g.label ? '<li class="pn-dd-group" role="presentation">' + esc(g.label) + '</li>' : '') + g.options.map(function (o) {
        return '<li role="option" tabindex="-1" data-dd-v="' + esc(o.v) + '" aria-selected="' + (o.v === cur.v) + '">' + esc(o.t) + '</li>';
      }).join('');
    }).join('');
    return '<div class="pn-dd"><span class="pn-dd-label">' + esc(label) + '</span><input type="hidden" name="' + name + '" value="' + esc(cur.v) + '">' +
      '<button type="button" class="pn-dd-btn" data-dd-btn aria-haspopup="listbox" aria-expanded="false"><span>' + esc(cur.t) + '</span>' + CHEV_SVG + '</button>' +
      '<ul class="pn-dd-list" role="listbox" hidden>' + lis + '</ul></div>';
  }

  function matchQ(x, other) {
    var q = (S.tk.q || '').trim().toLowerCase(); if (!q) return true;
    return [x.title, other, x.lastText].join(' ').toLowerCase().indexOf(q) >= 0;
  }
  function ticketsView() {
    var T = S.tk, wait = tkWaiting();
    var rows = T.list.map(function (x) {
      var other = otherParty(x), mineLast = x.lastBy === S.user.uid, waiting = !mineLast && x.status === 'open' && !seenHere(x);
      return '<li' + (matchQ(x, other) ? '' : ' hidden') + '><button type="button" class="pn-chat' + (x.status === 'closed' ? ' off' : '') + (waiting ? ' wait' : '') + '" data-tk-open="' + esc(x.id) + '">' +
        avatar(other, 46, otherUidOf(x)) +
        '<span class="pn-chat-main"><span class="pn-chat-top"><b>' + esc(x.title) + '</b><time>' + esc(tkTime(x.updatedAt)) + '</time></span>' +
        '<span class="pn-chat-sub">' + esc(other) + (x.kind === 'account-removal' ? ' · خودکار' : '') + (x.status === 'closed' ? ' · بسته' : '') + '</span>' +
        '<span class="pn-chat-last">' + (mineLast ? '<i class="pn-you">شما:</i> ' : '') + esc(x.lastText || '') + '</span></span>' +
        (waiting ? '<i class="pn-unread" aria-label="منتظر پاسخ شما"></i>' : '') + '</button></li>';
    }).join('');
    return '<section class="pn-card pn-tickets" id="tickets" data-no-reveal><div class="pn-tk-head"><h2>گفت‌وگوها' + (wait ? ' <span class="pn-badge" aria-label="منتظر پاسخ شما">' + faInt.format(wait) + '</span>' : '') + '</h2>' +
      '</div>' +
      '<input type="search" id="tkSearch" class="pn-tk-search" placeholder="جست‌وجو در گفت‌وگوها" aria-label="جست‌وجو در گفت‌وگوها" value="' + esc(T.q) + '">' +
      (T.error ? '<p class="pn-err" role="alert">' + esc(T.error) + '</p>' : '') +
      (rows ? '<ul class="pn-chats">' + rows + '</ul>' : '<p class="pn-note">' + (T.loading ? 'در حال بارگذاری…' : 'گفت‌وگویی نیست. برای پیام به فروش، مالی، مدیریت یا هر واحد دیگر دکمهٔ مداد را بزنید.') + '</p>') + '<button type="button" class="pn-fab" data-tk-new aria-label="گفت‌وگوی تازه" title="گفت‌وگوی تازه"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>' + '</section>';
  }
  function tkNewForm() {
    var groups = [{ label: 'واحد', options: TK_TARGETS.map(function (r) { return { v: 'role:' + r, t: MSRoles.label(r) }; }) }];
    if (can('team')) {
      var people = S.team.filter(function (u) { return u.id !== S.user.uid && u.active !== false; }).map(function (u) { return { v: 'uid:' + u.id, t: (u.name || '—') + ' · ' + MSRoles.label(u.role) }; });
      if (people.length) groups.push({ label: 'یک نفر', options: people });
    }
    return '<div class="pn-bar"><h2 id="dlgName">گفت‌وگوی تازه</h2><div class="pn-bar-actions"><button type="button" class="pn-x" data-close aria-label="بستن">' + CLOSE_SVG + '</button></div></div>' +
      '<form id="tkNewForm" class="pn-edit">' + dropdown('to', 'به', groups, 'role:' + TK_TARGETS[0]) +
      '<label>موضوع<input type="text" name="title" maxlength="120" required></label>' +
      '<label>پیام<textarea name="text" rows="5" maxlength="2000" required></textarea></label>' +
      (S.tk.error ? '<p class="pn-err" role="alert">' + esc(S.tk.error) + '</p>' : '') +
      '<button type="submit" class="pn-primary">ارسال</button></form>';
  }

  // Telegram-style receipts: one tick sent, two ticks received on the other side, two blue ticks seen
  function ticks(at) {
    var c = S.tk.cur || {}, me = S.user.uid, recv = 0, read = 0;
    Object.keys(c).forEach(function (k) {
      if (k.indexOf('recv_') === 0 && k !== 'recv_' + me) recv = Math.max(recv, c[k] || 0);
      if (k.indexOf('read_') === 0 && k !== 'read_' + me) read = Math.max(read, c[k] || 0);
    });
    var st = read >= at ? 'seen' : (recv >= at || read >= at ? 'recv' : 'sent');
    var one = '<svg viewBox="0 0 18 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.800 5.300 9 12.500 1.500"/></svg>';
    var two = '<svg viewBox="0 0 18 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1.500 5.800 4.800 9 12 1.500"/><path d="M7 8.200 8.300 9.300 15.500 1.500"/></svg>';
    var label = st === 'seen' ? 'دیده شد' : (st === 'recv' ? 'دریافت شد' : 'ارسال شد');
    return '<span class="pn-tick" data-s="' + st + '" title="' + label + '" aria-label="' + label + '">' + (st === 'sent' ? one : two) + '</span>';
  }
  function feedHtml() {
    var me = S.user.uid, out = '', prev = null;
    var msgs = S.tk.msgs;
    if (!msgs.length) return '<li class="pn-feed-empty">در حال بارگذاری…</li>';
    msgs.forEach(function (m, i) {
      var next = msgs[i + 1];
      var newDay = !prev || tkDay(prev.at) !== tkDay(m.at);
      var joinPrev = prev && !newDay && prev.uid === m.uid && m.at - prev.at < 5 * 60000;
      var joinNext = next && next.uid === m.uid && tkDay(next.at) === tkDay(m.at) && next.at - m.at < 5 * 60000;
      var mine = m.uid === me;
      if (newDay) out += '<li class="pn-day"><span>' + esc(tkDay(m.at)) + '</span></li>';
      out += '<li class="pn-row ' + (mine ? 'mine' : 'other') + (joinPrev ? '' : ' first') + (joinNext ? '' : ' last') + '" data-mid="' + esc(m.id || '') + '">' +
        (mine ? '' : '<span class="pn-row-av">' + (joinNext ? '' : avatar(m.name, 34, m.uid)) + '</span>') +
        '<div class="pn-bubble"' + (mine && colorOf(me) ? ' style="background:' + colorOf(me) + '"' : '') + '>' +
        (!mine && !joinPrev ? '<b class="pn-from"' + (colorOf(m.uid) ? ' style="color:' + colorOf(m.uid) + '"' : '') + '>' + esc(m.name || '—') + '</b>' : '') +
        msgBody(m) + '<span class="pn-meta">' + (m.editedAt && !m.deleted ? '<i class="pn-ed">ویرایش‌شده</i>' : '') + '<time>' + esc(tkTime(m.at)) + '</time>' + (mine && !m.deleted ? ticks(m.at) : '') + '</span>' +
        (m.deleted ? '' : '<button type="button" class="pn-more" data-more="' + esc(m.id || '') + '" aria-label="گزینه‌های پیام">' + DOTS_SVG + '</button>') + '</div></li>';
      prev = m;
    });
    return out;
  }
  function tkThread(id) {
    var x = S.tk.list.filter(function (k) { return k.id === id; })[0];
    if (!x) return '';
    var other = otherParty(x), open = x.status === 'open';
    var toggle = '<button type="button" class="pn-ico" data-tk-status="' + (open ? 'closed' : 'open') + '" data-id="' + esc(x.id) + '" aria-label="' + (open ? 'بستن گفت‌وگو' : 'بازکردن دوباره') + '" title="' + (open ? 'بستن گفت‌وگو' : 'بازکردن دوباره') + '">' +
      (open ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.500 3 3 5-6"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.700L3 8m0-5v5h5"/></svg>') + '</button>';
    return '<div class="pn-chat-head"><button type="button" class="pn-x" data-close aria-label="بستن">' + CLOSE_SVG + '</button>' +
      avatar(other, 44, otherUidOf(x)) + '<div class="pn-chat-who"><b id="dlgName">' + esc(x.title) + '</b><span>' + esc(x.fromName || '—') + ' ← ' + esc(x.toName || MSRoles.label(x.toRole)) + (x.kind === 'account-removal' ? ' · خودکار' : '') + '</span>' +
      (otherUidOf(x) ? '<span class="pn-presence" id="tkPresence" hidden></span>' : '') + '</div>' + toggle + '</div>' +
      '<ul class="pn-feed" id="tkFeed">' + feedHtml() + '</ul>' +
      '<p class="pn-err" id="tkErr" role="alert"' + (S.tk.error ? '' : ' hidden') + '>' + esc(S.tk.error) + '</p>' +
      (open ? '<div id="tkBars" class="pn-bars">' + barsHtml() + '</div><div class="pn-emoji" id="tkEmoji" hidden>' + emojiHtml() + '</div>' +
        '<form id="tkReplyForm" class="pn-composer" data-id="' + esc(x.id) + '"><input type="file" id="tkFile" multiple hidden accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,.rar,.7z">' +
        (canAttach() ? '<button type="button" class="pn-ci" data-attach aria-label="پیوست" title="پیوست عکس یا فایل">' + CLIP_SVG + '</button>' : '') +
        '<button type="button" class="pn-ci" data-emoji aria-label="شکلک" title="شکلک">' + SMILE_SVG + '</button>' +
        '<textarea name="text" rows="1" maxlength="2000" placeholder="پیام…" aria-label="پیام"></textarea>' +
        '<button type="submit" class="pn-send" aria-label="ارسال" title="ارسال" disabled>' + SEND_SVG + '</button></form>'
        : '<div class="pn-closed"><span>این گفت‌وگو بسته است.</span><button type="button" class="pn-secondary" data-tk-status="open" data-id="' + esc(x.id) + '">بازکردن دوباره</button></div>');
  }
  var unsubFeed = null;
  function stopFeed() { if (unsubFeed) { try { unsubFeed(); } catch (e) { /* ignore */ } unsubFeed = null; } }
  var paintQueued = false, paintFirst = false, lastSig = '';
  function feedSig() {
    var c = S.tk.cur || {}, recv = 0, read = 0, me = S.user.uid;
    Object.keys(c).forEach(function (k) {
      if (k.indexOf('recv_') === 0 && k !== 'recv_' + me) recv = Math.max(recv, c[k] || 0);
      if (k.indexOf('read_') === 0 && k !== 'read_' + me) read = Math.max(read, c[k] || 0);
    });
    var last = S.tk.msgs[S.tk.msgs.length - 1];
    return S.tk.msgs.length + ':' + (last ? last.at : 0) + ':' + recv + ':' + read + ':' + S.tk.msgs.reduce(function (a, m) { return a + (m.editedAt || 0) + (m.deleted ? 1 : 0); }, 0);
  }
  // both listeners (messages and the ticket) can fire together: one repaint per frame, and none when nothing changed
  function paintFeed(first) {
    paintFirst = paintFirst || !!first;
    if (paintQueued) return;
    paintQueued = true;
    requestAnimationFrame(function () {
      paintQueued = false;
      var feed = document.getElementById('tkFeed');
      if (!feed) { paintFirst = false; return; }
      var sig = feedSig();
      if (!paintFirst && sig === lastSig) return;
      var near = paintFirst || feed.scrollHeight - feed.scrollTop - feed.clientHeight < 90;
      var last = S.tk.msgs[S.tk.msgs.length - 1];
      feed.innerHTML = feedHtml();
      hydrateFeed();
      lastSig = sig; paintFirst = false;
      if (near || (last && last.uid === S.user.uid)) feed.scrollTop = feed.scrollHeight;
    });
  }
  // typing signal: written at most every 2.5 s while the composer is used, cleared on send or close
  var typingAt = 0;
  function signalTyping(id) {
    var now = Date.now();
    if (now - typingAt < 2500 || !S.user) return;
    typingAt = now;
    db.collection('presence').doc(S.user.uid).set({ typingIn: id, typingAt: now }, { merge: true }).then(null, function () { /* ignore */ });
  }
  function clearTyping() {
    if (!S.user || !typingAt) return;
    typingAt = 0;
    db.collection('presence').doc(S.user.uid).set({ typingIn: '', typingAt: 0 }, { merge: true }).then(null, function () { /* ignore */ });
  }
  // keep the composer above the on-screen keyboard (iPhone does not resize the page for it)
  function fitKeyboard() {
    var vv = window.visualViewport;
    if (!vv || !dlg.classList.contains('pn-chatdlg') || !dlg.open) return;
    dlg.style.height = vv.height + 'px'; dlg.style.top = vv.offsetTop + 'px';
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', fitKeyboard); window.visualViewport.addEventListener('scroll', fitKeyboard); }
  function openThread(id) {
    stopFeed();
    S.tk.open = id; S.tk.msgs = []; S.tk.error = '';
    S.tk.pending.forEach(function (p) { if (p.url) URL.revokeObjectURL(p.url); });
    S.tk.pending = []; S.tk.reply = null; S.tk.edit = null;
    window.__msFast = true;       // refresh every 2.5 s instead of 6 s while a conversation is open
    dlg.className = 'pn-dialog pn-chatdlg' + (dockWide() ? ' dock' : '');
    dlg.innerHTML = tkThread(id);
    if (!dlg.open) { if (dockWide()) dlg.show(); else dlg.showModal(); }
    var first = true;
    // live: a reply from the other side appears without a refresh
    var ref = db.collection('tickets').doc(id), offMsgs = null, offDoc = null, lastStatus = '';
    S.tk.cur = (S.tk.list.filter(function (k) { return k.id === id; })[0]) || {};
    offMsgs = ref.collection('messages').orderBy('at').onSnapshot(function (qs) {
      S.tk.msgs = []; qs.forEach(function (s) { var d = s.data(); d.id = s.id; S.tk.msgs.push(d); });
      needProfiles(S.tk.msgs.map(function (m) { return m.uid; }));
      paintFeed(first); first = false;
      markSeen(id);
      if (window.MSNotify && window.MSNotify.read) window.MSNotify.read(id, Math.max((S.tk.cur && S.tk.cur.updatedAt) || 0, S.tk.msgs.length ? (S.tk.msgs[S.tk.msgs.length - 1].at || 0) : 0) || Date.now());
    }, function (e) { S.tk.error = errText(e); dlg.innerHTML = tkThread(id); });
    offDoc = ref.onSnapshot(function (s) {
      if (!s.exists) return;
      var d = s.data(); d.id = id; S.tk.cur = d;
      var i = S.tk.list.map(function (k) { return k.id; }).indexOf(id); if (i >= 0) S.tk.list[i] = d;
      if (lastStatus && lastStatus !== d.status) dlg.innerHTML = tkThread(id); else paintFeed(false);
      lastStatus = d.status;
      markSeen(id);
      if (window.MSNotify && window.MSNotify.read) window.MSNotify.read(id, d.updatedAt || Date.now());
    }, function () { /* the messages listener reports errors */ });
    var otherUid = otherUidOf(S.tk.cur || {}), pres = null, offPres = null, presTimer = 0;
    function paintPresence() {
      var el = document.getElementById('tkPresence');
      if (!el || !otherUid) return;
      if (!pres) { el.hidden = true; return; }
      var now = Date.now(), typing = pres.typingIn === id && now - (pres.typingAt || 0) < 5000, online = pres.online === true && now - (pres.lastSeen || 0) < 130000;
      el.hidden = false; el.className = 'pn-presence' + (typing ? ' typing' : (online ? ' on' : ''));
      el.innerHTML = typing ? '<span class="pn-typing" aria-hidden="true"><i></i><i></i><i></i></span>در حال تایپ…'
        : online ? '<i class="pn-pdot" aria-hidden="true"></i>آنلاین' : (pres.lastSeen ? 'آخرین بازدید ' + esc(tkWhen(pres.lastSeen)) : '');
    }
    if (otherUid) {
      offPres = db.collection('presence').doc(otherUid).onSnapshot(function (s) { pres = s.exists ? s.data() : null; paintPresence(); }, function () { /* ignore */ });
      presTimer = setInterval(paintPresence, 3000);
    }
    typingAt = 0; lastSig = '';
    fitKeyboard();
    unsubFeed = function () { if (offMsgs) offMsgs(); if (offDoc) offDoc(); if (offPres) offPres(); clearInterval(presTimer); clearTyping(); };
  }
  // the window is open on this conversation and the other side wrote last: record "seen"
  function markSeen(id) {
    var c = S.tk.cur;
    if (S.tk.open !== id || !c || c.lastBy === S.user.uid || !dlg.open) return;
    if ((c['read_' + S.user.uid] || 0) >= (c.updatedAt || 0)) return;
    var u = {}; u['read_' + S.user.uid] = Date.now(); u['recv_' + S.user.uid] = Math.max(c.updatedAt || 0, c['recv_' + S.user.uid] || 0);
    c['read_' + S.user.uid] = u['read_' + S.user.uid];
    db.collection('tickets').doc(id).update(u).then(null, function () { /* ignore */ });
  }
  dlg.addEventListener('close', function () {
    window.__msFast = false;
    stopFeed(); S.tk.open = null; S.tk.cur = null; dlg.className = 'pn-dialog'; dlg.style.height = ''; dlg.style.top = '';
    S.tk.pending.forEach(function (p) { if (p.url) URL.revokeObjectURL(p.url); });
    S.tk.pending = []; S.tk.reply = null; S.tk.edit = null;
  });
  function tkTouch(id, extra) {
    var now = Date.now(), data = { updatedAt: now };
    Object.keys(extra).forEach(function (k) { data[k] = extra[k]; });
    return db.collection('tickets').doc(id).update(data);
  }

  // ---- conversations: pictures, files, replies, edits and deletes (the picture and file parts need the Max Silver server)
  S.tk.pending = []; S.tk.reply = null; S.tk.edit = null; S.tk.q = '';
  var CF = {};                       // file id (+ ':t' for the small copy) -> promise of an object URL of the downloaded picture
  var FILE_OK = /\.(jpe?g|png|gif|webp|pdf|docx?|xlsx?|pptx?|csv|txt|zip|rar|7z)$/i, MAX_FILE = 10 * 1024 * 1024, MAX_FILES = 5;
  var faSize = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 });
  function canAttach() { return !!(window.MSApi && window.MSApi.enabled() && window.MSApi.signedIn()); }
  function fmtSize(n) { return n >= 1048576 ? faSize.format(n / 1048576) + ' مگابایت' : faSize.format(Math.max(1, Math.round(n / 1024))) + ' کیلوبایت'; }
  function isImgFile(f) { return /^image\//.test(f.mime || ''); }
  function chatBlob(fid, thumb) {
    var k = fid + (thumb ? ':t' : '');
    if (!CF[k]) CF[k] = window.MSApi.fetchBlob('chat/files/' + encodeURIComponent(fid) + (thumb ? '?thumb=1' : '')).then(function (b) { return URL.createObjectURL(b); }, function (e) { delete CF[k]; throw e; });
    return CF[k];
  }
  // the pictures are protected, so they are fetched with the session and shown from memory
  function hydrateFeed() {
    Array.prototype.forEach.call(document.querySelectorAll('#tkFeed img[data-fid]:not([src])'), function (img) {
      chatBlob(img.getAttribute('data-fid'), img.getAttribute('data-thumb') === '1').then(function (u) { img.src = u; img.classList.add('ok'); }, function () { img.classList.add('bad'); });
    });
  }
  var DOTS_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';
  var CLIP_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21 11-8.600 8.600a5 5 0 0 1-7-7L14 4a3.500 3.500 0 0 1 5 5l-8.600 8.600a2 2 0 0 1-3-3L15 7"/></svg>';
  var SMILE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.500 14.500a4.500 4.500 0 0 0 7 0M9 9.500h.01M15 9.500h.01"/></svg>';
  var DL_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"/></svg>';
  var EMOJI = '😀 😃 😄 😁 😆 😅 😂 🤣 😊 🙂 😉 😍 🥰 😘 😎 🤩 🥳 😇 🤔 😐 😴 😢 😭 😡 🤯 😱 🙏 👍 👎 👏 🙌 💪 🤝 👌 ✌️ 🤞 👋 ❤️ 🧡 💛 💚 💙 💜 🔥 ✨ ⭐ 🎉 🎂 🎁 ☕ 🍕 🍔 🍟 ✅ ❌ ⚠️ ❓ ❗ 📎 📷 📞 💡 📌'.split(' ');
  // a message's body: quote, pictures, files, text
  function msgBody(m) {
    if (m.deleted) return '<p class="pn-gone">این پیام حذف شد</p>';
    var h = '', files = m.files || [], imgs = files.filter(isImgFile), others = files.filter(function (f) { return !isImgFile(f); });
    if (m.replyTo) h += '<button type="button" class="pn-quote" data-goto="' + esc(m.replyTo.id) + '"><b>' + esc(m.replyTo.name || '') + '</b><span>' + esc(m.replyTo.text || '') + '</span></button>';
    if (imgs.length) h += '<div class="pn-imgs n' + Math.min(imgs.length, 4) + '">' + imgs.map(function (f) {
      return '<button type="button" class="pn-img" data-view="' + esc(f.id) + '" data-name="' + esc(f.name) + '" aria-label="باز کردن عکس"><img data-fid="' + esc(f.id) + '" data-thumb="' + (f.thumb ? '1' : '0') + '" alt="" width="' + (f.w || 4) + '" height="' + (f.h || 3) + '"></button>';
    }).join('') + '</div>';
    others.forEach(function (f) {
      var ext = (String(f.name).split('.').pop() || '').slice(0, 4).toUpperCase();
      h += '<button type="button" class="pn-file" data-dl="' + esc(f.id) + '" data-name="' + esc(f.name) + '"><span class="pn-fi">' + esc(ext) + '</span><span class="pn-fn"><b>' + esc(f.name) + '</b><small>' + esc(fmtSize(f.size || 0)) + '</small></span>' + DL_SVG + '</button>';
    });
    if (m.text) h += '<p>' + esc(m.text) + '</p>';
    if (!h) h = '<p class="pn-gone">پیامی بدون متن</p>';
    return h;
  }
  // the strip above the composer: what is being replied to or edited, and the files waiting to be sent
  function barsHtml() {
    var T = S.tk, h = '';
    if (T.reply) h += '<div class="pn-bar2"><span class="pn-bar2-t"><b>پاسخ به ' + esc(T.reply.name || '') + '</b><span>' + esc(T.reply.text) + '</span></span><button type="button" class="pn-ico" data-bar-cancel aria-label="لغو">' + CLOSE_SVG + '</button></div>';
    if (T.edit) h += '<div class="pn-bar2"><span class="pn-bar2-t"><b>ویرایش پیام</b><span>' + esc(T.edit.text.slice(0, 80)) + '</span></span><button type="button" class="pn-ico" data-bar-cancel aria-label="لغو">' + CLOSE_SVG + '</button></div>';
    if (T.pending.length) h += '<div class="pn-pend">' + T.pending.map(function (p, i) {
      return '<span class="pn-chip2' + (p.err ? ' bad' : '') + '">' + (p.url ? '<img src="' + esc(p.url) + '" alt="">' : '<i class="pn-fi">' + esc((p.file.name.split('.').pop() || '').slice(0, 4).toUpperCase()) + '</i>') +
        '<span>' + esc(p.file.name) + '<small>' + (p.err ? esc(p.err) : esc(fmtSize(p.file.size)) + (p.busy ? ' · در حال ارسال…' : '')) + '</small></span>' +
        (p.busy ? '' : '<button type="button" class="pn-ico" data-pend-x="' + i + '" aria-label="حذف">' + CLOSE_SVG + '</button>') + '</span>';
    }).join('') + '</div>';
    return h;
  }
  function paintBars() {
    var el = document.getElementById('tkBars'); if (el) el.innerHTML = barsHtml();
    syncSend();
  }
  function syncSend() {
    var f = document.getElementById('tkReplyForm'); if (!f) return;
    var sb = f.querySelector('.pn-send'); if (sb && !sb.classList.contains('sending')) sb.disabled = !(f.elements.text.value.trim() || S.tk.pending.length);
  }
  function addFiles(list) {
    if (!canAttach()) { S.tk.error = 'فرستادن عکس و فایل فقط روی سرور مکث‌سیلور ممکن است.'; return; }
    var added = false, refused = false;
    S.tk.error = '';
    Array.prototype.forEach.call(list || [], function (file) {
      if (S.tk.pending.length >= MAX_FILES) { S.tk.error = 'در هر پیام حداکثر ' + faInt.format(MAX_FILES) + ' فایل.'; refused = true; return; }
      if (!FILE_OK.test(file.name || 'image.png')) { S.tk.error = 'این نوع فایل پذیرفته نمی‌شود: ' + file.name; refused = true; return; }
      if (file.size > MAX_FILE) { S.tk.error = 'فایل «' + file.name + '» از ۱۰ مگابایت بزرگ‌تر است.'; refused = true; return; }
      S.tk.pending.push({ file: file, url: /^image\//.test(file.type) ? URL.createObjectURL(file) : '', busy: false, err: '' });
      added = true;
    });
    void refused; void added;
    paintBars();
    var er = document.getElementById('tkErr'); if (er) { er.hidden = !S.tk.error; er.textContent = S.tk.error; }
  }
  // a picture is shrunk before it is sent (long side 1600 px) and gets a small copy for the conversation
  function prepImage(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var W = img.naturalWidth, H = img.naturalHeight, k = Math.min(1, 1600 / Math.max(W, H));
        function cv(s, q) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(W * s)); c.height = Math.max(1, Math.round(H * s)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return new Promise(function (r) { c.toBlob(r, 'image/jpeg', q); }); }
        var keep = file.type === 'image/gif' || (k === 1 && file.size <= 1.5 * 1048576);
        Promise.all([keep ? Promise.resolve(file) : cv(k, 0.85), cv(Math.min(1, 360 / Math.max(W, H)), 0.7)]).then(function (r) {
          URL.revokeObjectURL(url);
          resolve({ main: r[0], thumb: r[1], w: W, h: H, name: keep ? file.name : (file.name.replace(/\.[^.]+$/, '') || 'image') + '.jpg' });
        });
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }
  function uploadOne(tid, p) {
    var isImg = /^image\//.test(p.file.type), job = isImg ? prepImage(p.file) : Promise.resolve(null);
    return job.then(function (pi) {
      var fd = new FormData();
      if (pi && pi.main) { fd.append('file', pi.main, pi.name); if (pi.thumb) fd.append('thumb', pi.thumb, 't.jpg'); fd.append('w', pi.w); fd.append('h', pi.h); }
      else fd.append('file', p.file, p.file.name);
      return window.MSApi.raw('POST', 'chat/' + encodeURIComponent(tid) + '/files', fd);
    }).then(function (m) { return { id: m.id, name: m.name, mime: m.mime, size: m.size, w: m.w || undefined, h: m.h || undefined, thumb: !!m.thumb }; });
  }
  function cleanMeta(o) { var r = {}; Object.keys(o).forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return r; }
  function sendMessage(f, tid, txt) {
    var T = S.tk, pend = T.pending.slice(), sb = f.querySelector('.pn-send'), metas = [];
    if (sb) { sb.disabled = true; sb.classList.add('sending'); }
    pend.forEach(function (p) { p.busy = true; p.err = ''; }); paintBars();
    var chain = Promise.resolve(), sent = null;
    pend.forEach(function (p) { chain = chain.then(function () { return uploadOne(tid, p).then(function (m) { metas.push(cleanMeta(m)); }, function (e) { p.busy = false; p.err = (e && e.message) || 'ارسال نشد'; throw e; }); }); });
    chain.then(function () {
      var now = Date.now(), rref = db.collection('tickets').doc(tid), nb = db.batch(), msg = { uid: S.user.uid, name: myName(), role: myRole(), text: txt, at: now };
      if (metas.length) msg.files = metas;
      if (T.reply) msg.replyTo = { id: T.reply.id, name: String(T.reply.name || '').slice(0, 80), text: String(T.reply.text || '').slice(0, 160) };
      var mref = rref.collection('messages').doc();
      nb.set(mref, msg);
      sent = cleanMeta(Object.assign({}, msg, { id: mref.id }));
      var last = txt ? txt.slice(0, 140) : (metas.length ? (metas.some(isImgFile) ? 'عکس' : 'فایل: ' + metas[0].name) : '');
      nb.update(rref, { updatedAt: now, lastText: last, lastBy: S.user.uid, lastByName: myName() });
      clearTyping();
      return nb.commit();
    }).then(function () {
      T.pending.forEach(function (p) { if (p.url) URL.revokeObjectURL(p.url); });
      T.pending = []; T.reply = null; T.error = '';
      f.elements.text.value = ''; f.elements.text.style.height = '';
      if (sb) sb.classList.remove('sending');
      if (sent && T.open === tid) { T.msgs.push(sent); lastSig = ''; paintFeed(false); }      // shown at once; the next refresh brings the stored copy
      paintBars(); loadTickets();
    }, function (err) {
      T.error = errText(err);
      if (sb) sb.classList.remove('sending');
      pend.forEach(function (p) { p.busy = false; });
      paintBars();
      var er = document.getElementById('tkErr'); if (er) { er.hidden = false; er.textContent = T.error; }
    });
  }
  // the little menu of a message
  function closeMenu() { var m = document.getElementById('tkMenu'); if (m) m.remove(); }
  function openMenu(btn) {
    closeMenu();
    var id = btn.getAttribute('data-more'), m = S.tk.msgs.filter(function (x) { return x.id === id; })[0];
    if (!m || m.deleted) return;
    var mine = m.uid === S.user.uid, young = Date.now() - (m.at || 0) < 48 * 3600000, open = (S.tk.cur || {}).status === 'open', items = [];
    if (open) items.push(['reply', 'پاسخ']);
    if (m.text) items.push(['copy', 'کپی متن']);
    if (open && mine && young) items.push(['edit', 'ویرایش']);
    if (open && mine) items.push(['del', 'حذف برای همه']);
    if (!items.length) return;
    var menu = document.createElement('div'); menu.id = 'tkMenu'; menu.className = 'pn-menu'; menu.setAttribute('role', 'menu');
    menu.innerHTML = items.map(function (it) { return '<button type="button" role="menuitem" data-act="' + it[0] + '" data-mid="' + esc(id) + '"' + (it[0] === 'del' ? ' class="danger"' : '') + '>' + it[1] + '</button>'; }).join('');
    btn.closest('.pn-bubble').appendChild(menu);
  }
  function doAction(act, id) {
    var m = S.tk.msgs.filter(function (x) { return x.id === id; })[0], tid = S.tk.open; closeMenu();
    if (!m || !tid) return;
    var ta = document.querySelector('#tkReplyForm textarea');
    if (act === 'reply') {
      S.tk.edit = null;
      S.tk.reply = { id: id, name: m.name || '', text: m.text ? m.text.slice(0, 120) : (m.files && m.files.length ? (m.files.some(isImgFile) ? 'عکس' : 'فایل') : '') };
      paintBars(); if (ta) ta.focus();
    } else if (act === 'copy') {
      try { navigator.clipboard.writeText(m.text); } catch (e) { /* ignore */ }
    } else if (act === 'edit') {
      S.tk.reply = null; S.tk.edit = { id: id, text: m.text || '' };
      if (ta) { ta.value = m.text || ''; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; ta.focus(); }
      paintBars();
    } else if (act === 'del') {
      if (!window.confirm('این پیام برای همه حذف شود؟')) return;
      var rref = db.collection('tickets').doc(tid), last = S.tk.msgs[S.tk.msgs.length - 1];
      rref.collection('messages').doc(id).update({ deleted: true, deletedAt: Date.now(), text: '', files: [] }).then(function () {
        if (last && last.id === id) return rref.update({ updatedAt: Date.now(), lastText: 'این پیام حذف شد', lastBy: S.user.uid, lastByName: myName() });
      }).then(function () { m.deleted = true; m.text = ''; m.files = []; lastSig = ''; paintFeed(false); loadTickets(); }, function (err) { S.tk.error = errText(err); var er = document.getElementById('tkErr'); if (er) { er.hidden = false; er.textContent = S.tk.error; } });
    }
  }
  // a picture opens full size in a viewer
  var viewer = null;
  function openViewer(fid, name) {
    if (!viewer) {
      viewer = document.createElement('dialog'); viewer.className = 'pn-viewer';
      viewer.innerHTML = '<div class="pn-viewer-bar"><span></span><a class="pn-ico" data-v-dl aria-label="دانلود" title="دانلود">' + DL_SVG + '</a><button type="button" class="pn-ico" data-v-x aria-label="بستن">' + CLOSE_SVG + '</button></div><div class="pn-viewer-box"><img alt=""><i class="pn-spin2"></i></div>';
      document.body.appendChild(viewer);
      viewer.addEventListener('click', function (e) { if (e.target === viewer || e.target.closest('[data-v-x]') || e.target.classList.contains('pn-viewer-box')) viewer.close(); });
    }
    var img = viewer.querySelector('img'), a = viewer.querySelector('[data-v-dl]');
    img.removeAttribute('src'); img.classList.remove('ok'); viewer.querySelector('span').textContent = name || '';
    a.removeAttribute('href'); a.setAttribute('download', name || 'image.jpg');
    if (!viewer.open) viewer.showModal();
    chatBlob(fid, false).then(function (u) { img.src = u; img.classList.add('ok'); a.href = u; }, function () { viewer.querySelector('span').textContent = 'عکس باز نشد.'; });
  }
  function downloadFile(fid, name) {
    chatBlob(fid, false).then(function (u) { var a = document.createElement('a'); a.href = u; a.download = name || 'file'; document.body.appendChild(a); a.click(); a.remove(); }, function () { S.tk.error = 'فایل دانلود نشد.'; var er = document.getElementById('tkErr'); if (er) { er.hidden = false; er.textContent = S.tk.error; } });
  }
  function emojiHtml() { return EMOJI.map(function (e) { return '<button type="button" data-emo="' + e + '" aria-label="' + e + '">' + e + '</button>'; }).join(''); }
  function dockWide() { return !!(window.matchMedia && window.matchMedia('(min-width:1100px)').matches); }


  // ---- listeners of the conversation window
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest || !S.tk) return;
    if (!t.closest('.pn-menu') && !t.closest('[data-more]')) closeMenu();
    if (!t.closest('#tkEmoji') && !t.closest('[data-emoji]')) { var em0 = document.getElementById('tkEmoji'); if (em0) em0.hidden = true; }
    var b = t.closest('[data-attach]'); if (b) { var fi = document.getElementById('tkFile'); if (fi) fi.click(); return; }
    b = t.closest('[data-emoji]'); if (b) { var em = document.getElementById('tkEmoji'); if (em) em.hidden = !em.hidden; return; }
    b = t.closest('[data-emo]'); if (b) {
      var ta = document.querySelector('#tkReplyForm textarea');
      if (ta) { var p = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, p) + b.getAttribute('data-emo') + ta.value.slice(ta.selectionEnd || p); ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true })); }
      return;
    }
    b = t.closest('[data-more]'); if (b) { var had = document.getElementById('tkMenu'); if (had && had.parentNode === b.closest('.pn-bubble')) closeMenu(); else openMenu(b); return; }
    b = t.closest('#tkMenu [data-act]'); if (b) { doAction(b.getAttribute('data-act'), b.getAttribute('data-mid')); return; }
    b = t.closest('[data-bar-cancel]'); if (b) { S.tk.reply = null; if (S.tk.edit) { S.tk.edit = null; var ta2 = document.querySelector('#tkReplyForm textarea'); if (ta2) { ta2.value = ''; ta2.style.height = ''; } } paintBars(); return; }
    b = t.closest('[data-pend-x]'); if (b) { var pi = +b.getAttribute('data-pend-x'), pp = S.tk.pending[pi]; if (pp && pp.url) URL.revokeObjectURL(pp.url); S.tk.pending.splice(pi, 1); paintBars(); return; }
    b = t.closest('[data-view]'); if (b) { openViewer(b.getAttribute('data-view'), b.getAttribute('data-name')); return; }
    b = t.closest('[data-dl]'); if (b) { downloadFile(b.getAttribute('data-dl'), b.getAttribute('data-name')); return; }
    b = t.closest('[data-goto]'); if (b) {
      var row = document.querySelector('#tkFeed [data-mid="' + b.getAttribute('data-goto').replace(/"/g, '') + '"]');
      if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); row.classList.add('flash'); setTimeout(function () { row.classList.remove('flash'); }, 1600); }
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'tkFile') { addFiles(e.target.files); e.target.value = ''; }
  });
  document.addEventListener('paste', function (e) {
    var ta = e.target;
    if (!ta || ta.tagName !== 'TEXTAREA' || !ta.form || ta.form.id !== 'tkReplyForm' || !e.clipboardData) return;
    var files = []; Array.prototype.forEach.call(e.clipboardData.items || [], function (it) { if (it.kind === 'file') { var f = it.getAsFile(); if (f) files.push(f); } });
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  dlg.addEventListener('dragover', function (e) { if (S.tk.open && e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) { e.preventDefault(); dlg.classList.add('drag'); } });
  dlg.addEventListener('dragleave', function (e) { if (e.target === dlg) dlg.classList.remove('drag'); });
  dlg.addEventListener('drop', function (e) {
    if (!S.tk.open || !e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault(); dlg.classList.remove('drag'); addFiles(e.dataTransfer.files);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dlg.open && dlg.classList.contains('dock')) dlg.close(); });
  document.addEventListener('input', function (e) {
    var q = e.target;
    if (!q || q.id !== 'tkSearch') return;
    S.tk.q = q.value;
    Array.prototype.forEach.call(document.querySelectorAll('#tickets .pn-chats > li'), function (li) {
      var t = (li.innerText || '').toLowerCase(), k = (S.tk.q || '').trim().toLowerCase();
      li.hidden = !!k && t.indexOf(k) < 0;
    });
  });

  // ----- outside messages (the contact page writes them)
  var PUB = { sales: 'فروش و توسعه بازار', service: 'خدمات پس از فروش', management: 'مدیریت' };
  // messages from outside, for the roles that answer them
  S.pub = { list: [], loading: false, error: '' };
  function pubReader() { var r = myRole(); return r === 'manager' || r === 'ceo' || r === 'sales_manager' || r === 'service'; }
  function loadPublic() {
    if (!S.profile || !active() || !S.user || !pubReader()) return;
    var col = db.collection('public_requests'), r = myRole();
    var q = (r === 'sales_manager') ? col.where('to', '==', 'sales') : (r === 'service' ? col.where('to', '==', 'service') : col);
    q.get().then(function (qs) {
      S.pub.list = [];
      qs.forEach(function (s) { var d = s.data(); d.id = s.id; S.pub.list.push(d); });
      S.pub.list.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    }).then(null, function (e) { S.pub.error = errText(e); }).then(function () { render(); if (window.MSNotify) window.MSNotify.refresh(true); });
  }
  function publicView() {
    if (!pubReader()) return '';
    var open = S.pub.list.filter(function (x) { return x.status !== 'closed'; });
    var rows = open.map(function (x) {
      return '<li class="pn-tk"><div class="pn-pub"><b>' + esc(x.name) + ' <span class="pn-chip">' + esc(PUB[x.to] || x.to) + '</span></b>' +
        '<span class="pn-tk-meta" dir="ltr">' + esc(x.contact) + ' · ' + esc(tkWhen(x.createdAt)) + '</span>' +
        '<p>' + esc(x.text) + '</p><button type="button" class="pn-secondary" data-pub-close="' + esc(x.id) + '">انجام شد</button></div></li>';
    }).join('');
    if (!rows && !S.pub.error) return '';
    return '<section class="pn-card pn-tickets" id="public"><h2>پیام‌های بیرونی <span class="pn-badge">' + faInt.format(open.length) + '</span></h2>' +
      (S.pub.error ? '<p class="pn-err" role="alert">' + esc(S.pub.error) + '</p>' : '') + '<ul class="pn-tk-list">' + rows + '</ul></section>';
  }

  function notifyView() {
    var list = window.MSNotify ? window.MSNotify.items() : [];
    var rows = list.map(function (x) {
      return '<li><a href="' + (x.href ? esc(x.href) : '#' + esc(x.target)) + '"><span class="pn-dot" aria-hidden="true"></span>' + esc(x.text) + '</a></li>';
    }).join('');
    return '<section class="pn-card pn-notify' + (list.length ? ' has' : '') + '" aria-live="polite"><h2>اعلان‌ها</h2>' +
      (rows ? '<ul>' + rows + '</ul>' : '<p class="pn-note">فعلاً چیزی منتظر شما نیست.</p>') + '</section>';
  }
  window.addEventListener('ms-notify', function () { if (S.profile) render(); });

  // ---- birthdays of colleagues: the next two weeks, for the technology lead, management and HR (the server shows birthdays to nobody else)
  function birthdayView() {
    var r = myRole(), E = window.MSEvents;
    if (!(r === 'manager' || r === 'ceo' || r === 'hr') || !E || !E.fromJ || !E.toJ || !S.team) return '';
    var now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), jy = E.toJ(t0).jy, out = [];
    // the date a person typed about themselves, or the one management/HR keep in the personal record (read by the manager and HR only)
    if (S.personalB === undefined && (r === 'manager' || r === 'hr')) {
      S.personalB = null;
      db.collection('personal').get().then(function (qs) { var o = {}; qs.forEach(function (d) { var b = d.data().birthday; if (b) o[d.id] = b; }); S.personalB = o; render(); }, function () { S.personalB = {}; });
    }
    S.team.forEach(function (u) {
      var m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(u.birthday || (S.personalB && S.personalB[u.id]) || '');
      if (!m || u.active === false) return;
      var next = null;
      [jy, jy + 1].forEach(function (y) { if (next) return; var d = E.fromJ(y, +m[2], +m[3]); if (d >= t0) next = d; });
      if (!next) return;
      var days = Math.round((next - t0) / 86400000);
      if (days <= 14) out.push({ name: u.name || u.email || '', days: days, jm: +m[2], jd: +m[3] });
    });
    if (!out.length) return '';
    out.sort(function (a, b) { return a.days - b.days; });
    var cake = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 21h16v-7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3z"/><path d="M4 16c2 1.500 3 1.500 4 0s2.500-1.500 4 0 3 1.500 4 0 2-1.500 4 0M12 11V7M12 7c-1-1-1-2 0-3 1 1 1 2 0 3z"/></svg>';
    var MON = E.MONTHS || [];
    return '<section class="pn-card pn-bday"><h2>' + cake + ' تولد همکاران</h2><ul>' + out.map(function (b) {
      return '<li' + (b.days === 0 ? ' class="today"' : '') + '><b>' + esc(b.name) + '</b><span>' + (b.days === 0 ? 'امروز تولدش است؛ کیک یادت نرود' : b.days === 1 ? 'فردا' : faInt.format(b.days) + ' روز دیگر') + ' · ' + faInt.format(b.jd) + ' ' + esc(MON[b.jm - 1] || '') + '</span></li>';
    }).join('') + '</ul></section>';
  }

  // ---- first run: a short form about the person (shown on the home tab until it is saved)
  S.onb = { hide: false, busy: false, err: '' };
  function latinDigits(s) {
    return String(s || '').replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); });
  }
  function onboardView() {
    var p = S.profile;
    if (!p || p.onboarded || S.onb.hide || !S.user) return '';
    var me = S.user.uid, ph = (profOf(me) || {}).photo;
    return '<section class="pn-card pn-onb"><h2>خوش آمدی؛ کمی دربارهٔ خودت بگو</h2>' +
      '<p class="pn-note">فقط چند ثانیه. عکس و جنسیت به ما کمک می‌کند در گفت‌وگوها و پیام‌ها درست خطابت کنیم. تاریخ تولد و آدرس فقط برای تو، مدیریت و منابع انسانی دیده می‌شود.</p>' +
      '<div class="pn-look-row">' + avatar(p.name || S.user.email, 64, me) +
        '<div class="pn-look-actions"><button type="button" class="pn-secondary" data-photo-pick' + (S.look.busy ? ' disabled' : '') + '>' + (ph ? 'تغییر عکس' : 'انتخاب عکس (پیشنهاد می‌کنیم)') + '</button>' +
        '<input type="file" id="photoFile" accept="image/*" hidden></div></div>' +
      '<form id="onbForm" class="pn-onb-form">' +
        '<label>تاریخ تولد (شمسی؛ مثل ۱۳۷۵/۰۳/۱۲)<input name="birthday" dir="ltr" inputmode="numeric" placeholder="۱۳۷۵/۰۳/۱۲" autocomplete="bday" maxlength="10"></label>' +
        '<p class="pn-note pn-joke">نگران نباش؛ فقط می‌خواهیم بدانیم کِی باید برایت جشن بگیریم و کیک سفارش بدهیم. (راستش را بگویی کیک بزرگ‌تر می‌شود.)</p>' +
        '<fieldset class="pn-radios"><legend>جنسیت</legend>' +
          '<label><input type="radio" name="gender" value="male"> آقا</label><label><input type="radio" name="gender" value="female"> خانم</label><label><input type="radio" name="gender" value="na" checked> ترجیح می‌دهم نگویم</label></fieldset>' +
        '<label>آدرس (اختیاری)<textarea name="address" rows="2" maxlength="300" placeholder="شهر، محله، خیابان"></textarea></label>' +
        (S.onb.err ? '<p class="pn-err" role="alert">' + esc(S.onb.err) + '</p>' : '') +
        '<div class="pn-onb-actions"><button type="submit" class="pn-primary"' + (S.onb.busy ? ' disabled' : '') + '>ذخیره</button><button type="button" class="pn-link" data-onb-later>بعداً</button></div>' +
      '</form></section>';
  }

  // ---- my look: picture and colour
  S.look = { busy: false, msg: '' };
  function lookView() {
    var me = S.user.uid, p = profOf(me) || {}, cur = p.color || '';
    var sw = PROFILE_COLORS.map(function (c) {
      return '<button type="button" role="radio" class="pn-sw" data-color="' + c + '" aria-checked="' + (cur === c) + '" aria-label="رنگ ' + c + '" style="--c:' + c + '"></button>';
    }).join('');
    return '<section class="pn-card pn-look"><h2>عکس و رنگ</h2>' +
      '<div class="pn-look-row">' + avatar(S.profile.name || S.user.email, 76, me) +
        '<div class="pn-look-actions"><button type="button" class="pn-secondary" data-photo-pick' + (S.look.busy ? ' disabled' : '') + '>' + (p.photo ? 'تغییر عکس' : 'انتخاب عکس') + '</button>' +
        (p.photo ? '<button type="button" class="pn-ico" data-photo-del aria-label="حذف عکس" title="حذف عکس"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>' : '') +
        '<input type="file" id="photoFile" accept="image/*" hidden></div></div>' +
      '<p class="pn-note">عکس مربع و با چهرهٔ واضح، JPG، PNG یا WebP، حداکثر ۱ مگابایت و دست‌کم ۱۲۸ پیکسل؛ خودکار بُرش، کوچک و به WebP تبدیل می‌شود. رنگ پروفایل روی حباب پیام‌ها و آواتار دیده می‌شود.</p>' +
      '<div class="pn-swatches" role="radiogroup" aria-label="رنگ پروفایل">' + sw + '</div>' +
      (S.look.msg ? '<p class="pn-ok" role="status">' + esc(S.look.msg) + '</p>' : '') + '</section>';
  }
  function saveLook(patch) {
    var me = S.user.uid, cur = profOf(me) || {};
    var doc = { name: String(S.profile.name || '').slice(0, 60), color: cur.color || '', photo: cur.photo || '', updatedAt: Date.now() };
    Object.keys(patch).forEach(function (k) { doc[k] = patch[k]; });
    S.look.busy = true; S.look.msg = ''; render();
    return db.collection('profiles').doc(me).set(doc).then(function () {
      PROFILES[me] = doc; S.look.msg = 'ذخیره شد.';
    }, function (err) { S.look.msg = ''; S.error = errText(err); }).then(function () { S.look.busy = false; render(); repaintChatLooks(); });
  }
  // a photo is cut to a centred square and shrunk to fit comfortably in one database document
  function photoFrom(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var side = Math.min(img.width, img.height), c = document.createElement('canvas'), N = 192;
          if (side < 128) { URL.revokeObjectURL(url); reject(new Error('small')); return; }
          c.width = N; c.height = N;
          c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, N, N);
          var q = 0.8, out = c.toDataURL('image/webp', q);
          while (out.length > 20000 && q > 0.3) { q -= 0.1; out = c.toDataURL('image/webp', q); }
          URL.revokeObjectURL(url); resolve(out);
        } catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('image')); };
      img.src = url;
    });
  }

  // how this person wants to be told: nothing, or a push notification
  S.prefs = { channels: 'push', msg: '', busy: false, err: '' };
  var PREF_CHOICES = [
    { v: 'push', t: 'اعلان', d: 'پیام تازه همان لحظه اعلام می‌شود', icon: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.300 20a2 2 0 0 0 3.400 0"/>' },
    { v: 'none', t: 'بدون اعلان', d: 'فقط عدد قرمز روی آیکن حساب', icon: '<path d="M6 8a6 6 0 0 1 9.800-4.600M18 8c0 7 3 8 3 8h-6M10.300 20a2 2 0 0 0 3.400 0M3 3l18 18"/>' }
  ];
  function loadPrefs() {
    if (!window.MSNotify || !S.user) return;
    S.prefs.channels = window.MSNotify.prefs().channels;
    db.collection('notify_prefs').doc(S.user.uid).get().then(function (s) {
      if (s.exists) { S.prefs.channels = s.data().channels === 'none' ? 'none' : 'push'; window.MSNotify.setPrefs({ channels: S.prefs.channels }); }
      else { savePrefs('push', true); }   // push is the default: write it once so the choice is recorded
      render();
    }, function () { render(); });
  }
  function savePrefs(choice, quiet) {
    S.prefs.channels = choice; S.prefs.err = ''; S.prefs.msg = '';
    if (!quiet) { S.prefs.busy = true; render(); }
    var doc = { role: myRole(), name: myName().slice(0, 60), channels: choice, email: '', updatedAt: Date.now() };
    var asked = choice === 'push' && window.MSNotify && !quiet ? window.MSNotify.askPermission() : Promise.resolve('');
    return asked.then(function () { return db.collection('notify_prefs').doc(S.user.uid).set(doc); }).then(function () {
      if (window.MSNotify) window.MSNotify.setPrefs(doc);
      if (!quiet) S.prefs.msg = 'ذخیره شد.';
    }, function (err) { S.prefs.err = errText(err); }).then(function () { S.prefs.busy = false; if (!quiet) render(); });
  }
  function permLabel() {
    var p = window.MSNotify ? window.MSNotify.permission() : 'unsupported';
    return p === 'granted' ? 'اجازهٔ اعلان در این دستگاه داده شده است.' : p === 'denied' ? 'اعلان در این دستگاه مسدود است؛ از تنظیمات مرورگر باز کنید.'
      : p === 'unsupported' ? 'این مرورگر اعلان سیستمی را پشتیبانی نمی‌کند؛ پیام‌ها داخل برنامه نمایش داده می‌شود (روی iPhone ابتدا برنامه را نصب کنید).' : 'هنوز اجازهٔ اعلان در این دستگاه داده نشده است.';
  }
  function prefsView() {
    var P = S.prefs, perm = window.MSNotify ? window.MSNotify.permission() : 'unsupported';
    return '<section class="pn-card pn-prefs"><h2>اطلاع‌رسانی</h2>' +
      '<div class="pn-pref-choices two" role="radiogroup" aria-label="روش اطلاع‌رسانی">' + PREF_CHOICES.map(function (c) {
        return '<button type="button" role="radio" class="pn-pref" data-pref="' + c.v + '" aria-checked="' + (P.channels === c.v) + '"' + (P.busy ? ' disabled' : '') +
          '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + c.icon + '</svg><span>' + c.t + '</span><small>' + c.d + '</small></button>';
      }).join('') + '</div>' +
      (P.channels === 'push' ? '<p class="pn-note">' + esc(permLabel()) + ' اعلان زمانی نمایش داده می‌شود که برنامه باز یا در پس‌زمینهٔ دستگاه باشد.</p>' +
        (perm === 'default' ? '<button type="button" class="pn-secondary" data-allow-notify>اجازهٔ اعلان را بده</button>' : '') : '') +
      (P.err ? '<p class="pn-err" role="alert">' + esc(P.err) + '</p>' : '') +
      (P.msg ? '<p class="pn-ok" role="status">' + esc(P.msg) + '</p>' : '') + '</section>';
  }

  // ---- national id: ten digits with the official check digit; leading zeros are part of the number
  var FA10 = '۰۱۲۳۴۵۶۷۸۹';
  function faDigitsStr(s) { return String(s).replace(/\d/g, function (d) { return FA10.charAt(d); }); }
  function latinDigits(s) { return String(s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); }
  function validNid(s) {
    if (!/^\d{10}$/.test(s) || /^(\d)\1{9}$/.test(s)) return false;
    var sum = 0, i;
    for (i = 0; i < 9; i++) sum += Number(s.charAt(i)) * (10 - i);
    var r = sum % 11, c = Number(s.charAt(9));
    return r < 2 ? c === r : c === 11 - r;
  }
  function nidHint(inp) {
    var h = inp.parentNode.querySelector('[data-nid-hint]');
    if (!h) return;
    var d = latinDigits(inp.value).replace(/\D/g, ''), cls = '', txt = '۱۰ رقم؛ صفرهای ابتدایی هم نوشته شود';
    if (d.length === 10) { if (validNid(d)) { cls = 'ok'; txt = 'کد ملی معتبر است'; } else { cls = 'bad'; txt = 'کد ملی درست نیست؛ ارقام را دوباره بررسی کنید'; } }
    else if (d.length) txt = faInt.format(d.length) + ' از ۱۰ رقم';
    h.className = 'pn-fh ' + cls; h.textContent = txt;
    inp.classList.toggle('bad', cls === 'bad'); inp.classList.toggle('ok', cls === 'ok');
  }
  function nidInput(inp) {
    var pos = inp.selectionStart, d = latinDigits(inp.value).replace(/\D/g, '').slice(0, 10), shown = faDigitsStr(d);
    if (inp.value !== shown) {
      inp.value = shown;
      try { var p = Math.min(pos == null ? shown.length : pos, shown.length); inp.setSelectionRange(p, p); } catch (x) { /* ignore */ }
    }
    nidHint(inp);
  }
  function formErr(f, msg) {
    var p = f.querySelector('[data-form-err]');
    if (!p) {
      p = document.createElement('p'); p.className = 'pn-err'; p.setAttribute('data-form-err', ''); p.setAttribute('role', 'alert');
      f.insertBefore(p, f.querySelector('button[type=submit]'));
    }
    p.textContent = msg; p.hidden = !msg;
  }

  // ---- private card: national id, written by hr or management only
  S.nid = ''; S.bday = ''; S.tab = 'home'; S.launcher = true;
  function loadPersonal() {
    if (!S.user) return;
    db.collection('personal').doc(S.user.uid).get().then(function (s) { S.nid = s.exists ? String(s.data().nationalId || '') : ''; S.bday = s.exists ? String(s.data().birthday || '') : ''; render(); }, function () { /* rules not published yet */ });
  }
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z"/></svg>';
  function faDigits(s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); }
  function fact(label, val, ltr, digits) {
    return '<div class="pn-fact"><dt>' + label + '</dt><dd' + (ltr ? ' dir="ltr"' : '') + '>' + (val ? esc(digits ? faDigits(val) : val) : '<i>ثبت نشده</i>') + '</dd><span class="pn-lock" title="فقط منابع انسانی یا مدیریت تغییر می‌دهد">' + LOCK + '</span></div>';
  }
  function meView() {
    var p = S.profile;
    return '<section class="pn-card pn-person"><h2>اطلاعات شخصی</h2>' +
      '<dl class="pn-facts">' + fact('نام و نام خانوادگی', p.name) + fact('تلفن تماس', p.phone, true, true) + fact('کد ملی', S.nid, true, true) + fact('تاریخ تولد', S.bday, true, true) + fact('ایمیل ورود', S.user.email, true) + '</dl>' +
      '<p class="pn-note">این موارد قفل است و روی پیش‌فاکتور می‌آید؛ برای اصلاح، با منابع انسانی یا مدیریت تماس بگیرید.</p>' +
      '<form id="meForm"><label>ایمیل من (برای تماس)<input type="email" name="contactEmail" dir="ltr" value="' + esc(p.contactEmail || '') + '" maxlength="80" autocomplete="email" placeholder="name@example.com"></label>' +
      (S.msg ? '<p class="pn-ok" role="status">' + esc(S.msg) + '</p>' : '') + (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<button type="submit" class="pn-primary"' + (S.busy ? ' disabled' : '') + '>ذخیرهٔ ایمیل</button></form></section>' + pwView();
  }
  function pwView() {
    return '<section class="pn-card pn-person"><h2>تغییر رمز عبور</h2>' +
      '<form id="pwForm"><label>رمز فعلی<input type="password" name="cur" dir="ltr" autocomplete="current-password" required></label>' +
      '<label>رمز جدید (دست‌کم ۸ نویسه)<input type="password" name="nw" dir="ltr" autocomplete="new-password" minlength="8" required></label>' +
      '<label>تکرار رمز جدید<input type="password" name="rp" dir="ltr" autocomplete="new-password" minlength="8" required></label>' +
      (S.pwMsg ? '<p class="pn-ok" role="status">' + esc(S.pwMsg) + '</p>' : '') + (S.pwErr ? '<p class="pn-err" role="alert">' + esc(S.pwErr) + '</p>' : '') +
      '<button type="submit" class="pn-primary"' + (S.pwBusy ? ' disabled' : '') + '>' + (S.pwBusy ? 'در حال تغییر…' : 'تغییر رمز') + '</button>' +
      '<button type="button" class="pn-link" data-forgot-me>رمز فعلی را فراموش کرده‌ام؛ پیوند تغییر به ایمیل ورودم برسد</button></form>' +
      (window.MSApi && window.MSApi.enabled() ? '<p class="pn-note">ورود دومرحله‌ای (کد شش‌رقمی از برنامهٔ گوشی): <a href="./backend.html">فعال یا خاموش‌کردن</a></p>' : '') + '</section>';
  }
  var TAB_ICON = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.600 7.100L4 20l1-4.400A8 8 0 1 1 21 12z"/>',
    comm: '<path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/>',
    inv: '<path d="M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6"/>',
    jobs: '<path d="M9 3h6v3H9zM5 6h14v15H5zM9 12h6M9 16h6"/>',
    team: '<circle cx="9" cy="8" r="3.500"/><path d="M2 20c0-3.300 3-6 7-6s7 2.700 7 6M17 5a3.500 3.500 0 0 1 0 7M22 20c0-2.600-1.800-4.700-4.500-5.600"/>',
    me: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'
  };
  var TAB_LABEL = { home: 'خانه', inv: 'پیش‌فاکتورها', chat: 'گفت‌وگوها', comm: 'پورسانت', team: 'تیم', jobs: 'شرح وظایف', me: 'تنظیمات من' };
  var HASH_TAB = { tickets: 'chat', public: 'chat', commission: 'comm', team: 'team', notify: 'home', invoices: 'inv' };

  // ---- phones: the sections of the panel are an app grid (like the home page); a tab strip does not fit a narrow screen
  var NARROW = { matches: true };   // the app grid is used at every width (it was phones only at first)
  var APP_ART = { home: 'overview', inv: 'pro-formas', chat: 'conversations', comm: 'commission', team: 'team', jobs: 'team-job-descriptions', me: 'settings' };
  var APP_TONE = { home: '#3858e9', inv: '#e39c27', chat: '#0891b2', comm: '#0d9488', team: '#7f54b3', jobs: '#ce1f39', me: '#64748b' };
  var APP_NAME = { home: 'نمای کلی', inv: 'پیش‌فاکتورها', chat: 'گفت‌وگوها', comm: 'پورسانت', team: 'تیم', jobs: 'شرح وظایف', me: 'تنظیمات من' };
  function appsHtml(keys, badges) {
    return '<div class="pn-apps" role="list">' + keys.map(function (k) {
      var b = badges[k] ? '<i class="pn-app-n">' + faInt.format(badges[k]) + '</i>' : '';
      return '<button type="button" class="pn-app" role="listitem" data-tab="' + k + '" style="--c:' + APP_TONE[k] + '">' + b +
        '<img src="./assets/art/tiles/' + APP_ART[k] + '.webp" alt="" width="384" height="384" decoding="async" onerror="this.remove()"><span>' + esc(APP_NAME[k]) + '</span></button>';
    }).join('') + '</div>';
  }
  function backBar(k) {
    return '<div class="pn-backbar" style="--c:' + APP_TONE[k] + '"><button type="button" class="pn-back" data-launch aria-label="همهٔ بخش‌ها"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>همهٔ بخش‌ها</button>' +
      '<b>' + esc(APP_NAME[k]) + '</b></div>';
  }
  if (NARROW.addEventListener) NARROW.addEventListener('change', function () { if (S.user && S.profile) render(); });
  function tabFromHash() {
    var h = (location.hash || '').slice(1), k = HASH_TAB[h];
    if (k) { S.tab = k; S.launcher = false; render(); var el = document.getElementById(h); if (el && el.scrollIntoView) el.scrollIntoView(); }
  }
  window.addEventListener('hashchange', tabFromHash);

  // ---- invoices of everyone: for the roles that review proformas. The account manager approves a proforma or refuses it with a
  // written reason (a letter to the sales manager); the sales manager decides: accepting moves the proforma to the archive and
  // removes it everywhere else, declining keeps it valid.
  S.invF = 'all'; S.invQ = ''; S.archDocs = []; S.invOpen = '';
  function tkForDoc(docNo, kind) {
    var best = null;
    S.tk.list.forEach(function (x) {
      if (x.docNo === docNo && (x.kind || 'proforma') === (kind || 'proforma') && (!best || (x.updatedAt || 0) > (best.updatedAt || 0))) best = x;
    });
    return best;
  }
  function invKey(d) { return (d.ownerUid || '') + '_' + (d.docNo || ''); }
  function revStatus(d) { return d.status === 'refused' ? 'archive' : ((d.review && d.review.status) || (d.sentAt ? 'pending' : 'new')); }
  var REV_TEXT = { archive: 'بایگانی‌شده · ردشده', approved: 'تأیید اکانت منیجر', refusal: 'رد شده · منتظر تصمیم مدیر فروش', kept: 'رد اکانت منیجر پذیرفته نشد', pending: 'ارسال شده · منتظر بررسی', 'new': 'ارسال‌نشده' };
  function reviewChip(d) {
    var st = revStatus(d), cls = st === 'approved' ? ' ok' : (st === 'refusal' ? ' warn' : (st === 'archive' ? ' off' : ''));
    return '<span class="pn-chip' + cls + '">' + REV_TEXT[st] + (st === 'pending' && d.sentAt ? ' · ' + esc(tkWhen(d.sentAt)) : '') + '</span>';
  }
  function reviewTxt(d) { var st = revStatus(d); return st === 'new' ? '' : REV_TEXT[st]; }
  function invMatches(d) {
    var f = S.invF, st = revStatus(d);
    if (f !== 'all' && f !== 'archive' && st !== f) return false;
    var q = latinDigits(S.invQ).trim().toLowerCase();
    if (!q) return true;
    return latinDigits([d.docNo, d.customer, d.customerCity, d.ownerName, d.issuer].join(' ')).toLowerCase().indexOf(q) >= 0;
  }
  function invSource() { return S.invF === 'archive' ? S.archDocs : S.docs; }
  function invCard(d) {
    var t = M.totals(d), tk = tkForDoc(d.docNo, 'proforma') || tkForDoc(d.docNo, 'proforma-refusal'), who = d.ownerName || d.issuer || '—';
    return '<li class="pn-inv"><div class="pn-inv-top"><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(faDate(d.createdAt)) + '</span></div>' +
      '<div class="pn-inv-mid"><strong>' + esc(d.customer || 'بدون نام مشتری') + '</strong>' + (d.customerCity ? '<span class="pn-note"> · ' + esc(d.customerCity) + '</span>' : '') + '</div>' +
      '<div class="pn-inv-meta"><span>' + esc(who) + '</span><b>' + money(t.total, d.unit) + '</b></div>' +
      '<div class="pn-inv-foot">' + reviewChip(d) +
      '<span class="pn-inv-act"><button type="button" class="pn-ibtn" data-inv-view="' + esc(invKey(d)) + '" title="جزئیات" aria-label="جزئیات"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg></button>' +
      (tk ? '<button type="button" class="pn-ibtn" data-tk-open="' + esc(tk.id) + '" title="گفت‌وگو" aria-label="گفت‌وگو"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z\"/></svg></button>' : '') + '</span></div></li>';
  }
  function invListHtml() {
    var list = invSource().filter(invMatches);
    return list.length ? list.slice(0, 200).map(invCard).join('') : '<li class="pn-note ms-empty"><img class="ms-empty-img" src="./assets/art/tiles/no-results.webp" alt="" width="96" height="96" decoding="async"><span>پیش‌فاکتوری با این فیلتر پیدا نشد.</span></li>';
  }
  function invoicesView() {
    var n = function (st) { return S.docs.filter(function (d) { return revStatus(d) === st; }).length; };
    var chips = [['all', 'همه', S.docs.length], ['pending', 'منتظر بررسی', n('pending')], ['refusal', 'رد شده', n('refusal')], ['approved', 'تأییدشده', n('approved')],
      ['new', 'ارسال‌نشده', n('new')], ['archive', 'بایگانی', S.archDocs.length]].map(function (c) {
      return '<button type="button" class="pn-fchip" data-inv-f="' + c[0] + '" aria-pressed="' + (S.invF === c[0]) + '">' + c[1] + ' <b>' + faInt.format(c[2]) + '</b></button>';
    }).join('');
    return '<section class="pn-card" id="invoices"><h2>پیش‌فاکتورها <span class="pn-badge">' + faInt.format(S.docs.length) + '</span></h2>' +
      '<p class="pn-note">همهٔ پیش‌فاکتورهای شرکت. اکانت منیجر هر پیش‌فاکتور ارسال‌شده را تأیید می‌کند یا با نوشتن دلیل رد می‌کند؛ رد باید مدیر فروش بپذیرد و تنها پس از آن، پیش‌فاکتور از برنامه برداشته و در «بایگانی» نگه داشته می‌شود.</p>' +
      '<input type="search" class="pn-inv-q" data-inv-q placeholder="جست‌وجو: شماره، مشتری، شهر یا صادرکننده" value="' + esc(S.invQ) + '" autocomplete="off">' +
      '<div class="pn-fchips" role="group" aria-label="فیلتر">' + chips + '</div>' +
      '<ul class="pn-inv-list" id="invList">' + invListHtml() + '</ul></section>';
  }
  function findInv(key) {
    return S.docs.filter(function (x) { return invKey(x) === key; })[0] || S.archDocs.filter(function (x) { return invKey(x) === key; })[0];
  }
  function invDetail(key) {
    var d = findInv(key);
    if (!d) return;
    S.invOpen = key;
    var t = M.totals(d), tk = tkForDoc(d.docNo, 'proforma'), p = d.pay || { mode: 'cash' }, r = d.review || {}, arch = d.status === 'refused';
    var rows = (d.lines || []).map(function (l) {
      return '<tr><td>' + esc(l.name || '') + (l.code ? '<small dir="ltr">' + esc(l.code) + '</small>' : '') + '</td><td>' + faInt.format(l.qty || 0) + '</td><td>' + money(l.price || 0, d.unit) + '</td><td>' + money((l.qty || 0) * (l.price || 0), d.unit) + '</td></tr>';
    }).join('');
    var pay = p.mode === 'cheque' ? 'چکی' : p.mode === 'mixed' ? 'نقد و چک' : 'نقدی';
    var cheques = (p.cheques || []).length ? '<ul class="pn-list">' + p.cheques.map(function (c, i) {
      return '<li><div><b>چک ' + faInt.format(i + 1) + '</b></div><div><span>' + esc(faDigitsStr(c.date || '')) + '</span><b>' + money(c.amount || 0, d.unit) + '</b></div></li>';
    }).join('') + '</ul>' : '';
    var fact = function (l, v, ltr) { return '<div class="pn-fact"><dt>' + l + '</dt><dd' + (ltr ? ' dir="ltr"' : '') + '>' + (v ? esc(v) : '<i>ثبت نشده</i>') + '</dd></div>'; };
    var box = '';
    if (arch) box = '<div class="pn-rv bad"><b>بایگانی‌شده · رد شد</b><p>دلیل اکانت منیجر: ' + esc(r.reason || '—') + '</p>' + (r.decision ? '<p>تصمیم ' + esc(r.decision.byName || '') + ' (' + esc(tkWhen(r.decision.at)) + ')' + (r.decision.note ? ': ' + esc(r.decision.note) : '') + '</p>' : '') + '</div>';
    else if (r.status === 'approved') box = '<div class="pn-rv ok"><b>تأیید اکانت منیجر</b><p>' + esc(r.byName || '') + ' · ' + esc(tkWhen(r.at)) + '</p></div>';
    else if (r.status === 'refusal') box = '<div class="pn-rv bad"><b>رد شده · منتظر تصمیم مدیر فروش</b><p>' + esc(r.byName || '') + ' · ' + esc(tkWhen(r.at)) + '</p><p>دلیل: ' + esc(r.reason || '') + '</p></div>';
    else if (r.status === 'kept') box = '<div class="pn-rv"><b>رد اکانت منیجر پذیرفته نشد</b><p>پیش‌فاکتور معتبر است.' + (r.decision && r.decision.note ? ' ' + esc(r.decision.note) : '') + '</p></div>';
    var actions = '';
    if (!arch && can('invoiceReview') && r.status !== 'refusal') {
      actions = '<div class="pn-rv-actions"><button type="button" class="pn-primary" data-rv-approve>تأیید پیش‌فاکتور</button>' +
        '<button type="button" class="pn-secondary danger" data-rv-refuse>رد با نوشتن دلیل</button></div>' +
        '<div id="rvBox" hidden><label>دلیل رد (به‌صورت نامه برای مدیر فروش فرستاده می‌شود)<textarea id="rvReason" rows="4" maxlength="800" placeholder="دلیل را روشن بنویسید؛ مثلاً قیمت، مبلغ پرداخت یا اطلاعات ناقص"></textarea></label>' +
        '<button type="button" class="pn-primary" data-rv-send>ارسال نامه به مدیر فروش</button></div>';
    } else if (!arch && can('invoiceDecide') && r.status === 'refusal') {
      actions = '<label>یادداشت (اختیاری)<textarea id="dcNote" rows="2" maxlength="500"></textarea></label>' +
        '<div class="pn-rv-actions"><button type="button" class="pn-primary" data-dc-accept>پذیرش رد و انتقال به بایگانی</button>' +
        '<button type="button" class="pn-secondary" data-dc-keep>رد پذیرفته نشد؛ پیش‌فاکتور بماند</button></div>';
    }
    dlg.className = 'pn-dialog';
    dlg.innerHTML = '<div class="pn-bar"><h2 id="dlgName" dir="ltr">' + esc(d.docNo) + '</h2><div class="pn-bar-actions">' +
      '<button type="button" class="pn-x" data-close aria-label="بستن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></div>' +
      '<div class="pn-edit">' + box + '<dl class="pn-facts">' + fact('صادرکننده', d.ownerName || d.issuer) + fact('تاریخ', faDigitsStr(d.date || '')) + fact('مشتری', d.customer) + fact('شهر', d.customerCity) +
      fact('تلفن گیرنده', d.customerPhone ? faDigitsStr(d.customerPhone) : '', true) + fact('نشانی', d.customerAddress) + '</dl>' +
      '<div class="pn-tablewrap"><table class="pn-tbl"><thead><tr><th>کالا</th><th>تعداد</th><th>قیمت واحد</th><th>جمع</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<dl class="pn-facts">' + fact('جمع کل', money(t.sub, d.unit)) + fact('تخفیف', money(t.disc, d.unit)) + fact('مالیات', money(t.tax, d.unit)) + (t.chq > 0 ? fact('افزایش قیمت بخش اعتباری', money(t.chq, d.unit)) : '') + fact('مبلغ قابل پرداخت', money(t.total, d.unit)) + fact('شرایط پرداخت', pay) + '</dl>' + cheques +
      bankHtml(d, r, arch) + actions + '<p class="pn-err" id="rvErr" role="alert" hidden></p>' +
      (tk && !arch ? '<button type="button" class="pn-secondary" data-tk-open="' + esc(tk.id) + '">باز کردن گفت‌وگو</button>' : '') + '</div>';
    if (!dlg.open) dlg.showModal();
  }
  function rvFail(msg) {
    var e = dlg.querySelector('#rvErr');
    if (e) { e.textContent = msg; e.hidden = !msg; }
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-rv-approve],[data-rv-send],[data-dc-accept],[data-dc-keep],[data-rv-refuse]'), function (b) { b.disabled = false; });
  }
  function rvLock() {
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-rv-approve],[data-rv-send],[data-dc-accept],[data-dc-keep],[data-rv-refuse]'), function (b) { b.disabled = true; });
    rvFail('');
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-rv-approve],[data-rv-send],[data-dc-accept],[data-dc-keep],[data-rv-refuse]'), function (b) { b.disabled = true; });
  }
  function reloadInvoices() {
    var uid = S.user.uid, q = can('invoices') ? db.collection('invoices') : db.collection('invoices').where('ownerUid', '==', uid);
    return q.get().then(function (res) {
      S.docs = [];
      res.forEach(function (s) { S.docs.push(s.data()); });
      S.docs.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
    }).then(function () { loadArchive(); loadTickets(); render(); });
  }
  function loadArchive() {
    if (!S.profile || !active() || !S.user) return;
    var col = db.collection('invoice_archive'), q = can('invoices') ? col : col.where('ownerUid', '==', S.user.uid);
    q.get().then(function (qs) {
      S.archDocs = [];
      qs.forEach(function (s) { S.archDocs.push(s.data()); });
      S.archDocs.sort(function (a, b) { return (b.archivedAt || 0) - (a.archivedAt || 0); });
      render();
    }, function () { /* rules not published yet */ });
  }
  // a note inside the conversation that already exists for this proforma, optionally closing it
  function noteTicket(b, tk, text, close) {
    if (!tk) return;
    var now = Date.now(), ref = db.collection('tickets').doc(tk.id);
    b.set(ref.collection('messages').doc(), { uid: S.user.uid, name: myName(), role: myRole(), text: String(text).slice(0, 1900), at: now });
    var upd = { updatedAt: now, lastText: String(text).slice(0, 140), lastBy: S.user.uid, lastByName: myName() };
    if (close) upd.status = 'closed';
    b.update(ref, upd);
  }
  function newTicket(b, o) {
    var me = S.user.uid, now = Date.now(), ref = db.collection('tickets').doc();
    b.set(ref, Object.assign({ fromUid: me, fromName: myName(), fromRole: myRole(), toUid: '', toName: '', status: 'open', createdAt: now, updatedAt: now,
      lastText: String(o.text).slice(0, 140), lastBy: me, lastByName: myName() }, o.head));
    b.set(ref.collection('messages').doc(), { uid: me, name: myName(), role: myRole(), text: String(o.text).slice(0, 1900), at: now });
  }
  // account manager: approve, or refuse with a reason (the reason travels as a letter to the sales manager)
  // the request this pre-invoice was made from follows the review (best effort: the review itself is already saved)
  function stageLink(d, fields, text) {
    if (!d || !d.requestCode || !window.MSOrder || !S.user) return;
    window.MSOrder.link(db, d.requestCode, fields, text, { uid: S.user.uid, name: myName() });
  }
  // finance chooses the bank account that the customer's copy of an approved pre-invoice shows
  function loadBanks() {
    if (S.banks || S.banksBusy) return;
    S.banksBusy = true;
    db.collection('bank_accounts').get().then(function (qs) { var l = []; qs.forEach(function (s) { var x = s.data(); x.id = s.id; if (x.active !== false) l.push(x); }); S.banks = l; }, function () { S.banks = []; })
      .then(function () { S.banksBusy = false; if (S.invOpen && dlg.open) invDetail(S.invOpen); });
  }
  var BANK_KIND = { brand: 'برند', company: 'شرکت', supplier: 'تأمین‌کننده' };
  function bankHtml(d, r, arch) {
    var b = d.bank, show = b ? '<p class="pn-note">' + esc(b.label || '') + ' · ' + esc(b.holder || '') + (b.sheba ? ' · <span dir="ltr">' + esc(b.sheba) + '</span>' : b.account ? ' · <span dir="ltr">' + esc(faDigitsStr(b.account)) + '</span>' : '') + '</p>' : '';
    if (arch || r.status !== 'approved') return b ? '<div class="pn-rv"><b>حساب بانکی پیش‌فاکتور</b>' + show + '</div>' : '';
    if (!can('bankPick')) return b ? '<div class="pn-rv ok"><b>حساب بانکی پیش‌فاکتور (انتخاب مالی)</b>' + show + '</div>' : '<div class="pn-rv"><b>حساب بانکی</b><p>مالی هنوز حسابی انتخاب نکرده است.</p></div>';
    loadBanks();
    if (!S.banks) return '<div class="pn-rv"><b>حساب بانکی پیش‌فاکتور</b><p>در حال بارگذاری…</p></div>';
    if (!S.banks.length) return '<div class="pn-rv"><b>حساب بانکی پیش‌فاکتور</b><p>اکانت منیجر هنوز حسابی ثبت نکرده است (بخش «حساب‌های بانکی»).</p></div>';
    return '<div class="pn-rv ok"><b>حساب بانکی پیش‌فاکتور: کدام حساب روی نسخهٔ مشتری بیاید؟</b><div class="pn-bankopts" role="radiogroup" aria-label="حساب بانکی">' + S.banks.map(function (x) {
      return '<button type="button" role="radio" class="pn-bankopt" data-bank-pick="' + esc(x.id) + '" aria-checked="' + (d.bankId === x.id) + '">' + (window.MSBanks ? window.MSBanks.icon(x.bank, 34) : '') + '<b>' + esc(x.label) + '</b><small>' + esc(x.kind === 'brand' ? (x.brand || 'برند') : BANK_KIND[x.kind] || '') + ' · ' + esc(x.holder || '') + '</small></button>';
    }).join('') + '<button type="button" role="radio" class="pn-bankopt none" data-bank-pick="-" aria-checked="' + (!d.bankId) + '"><b>بدون حساب بانکی</b><small>حساب روی نسخهٔ مشتری نوشته نمی‌شود (اختیاری)</small></button></div></div>';
  }
  function pickBank(id) {
    var d = findInv(S.invOpen), x = (S.banks || []).filter(function (b) { return b.id === id; })[0];
    if (id === '-' && d && S.user) { db.collection('invoices').doc(invKey(d)).update({ bankId: '', bank: null, updatedAt: Date.now() }).then(function () { return reloadInvoices(); }).then(function () { invDetail(S.invOpen); }, function (err) { rvFail(errText(err)); }); return; }
    if (!d || !x || !S.user) return;
    var snap = { label: x.label || '', kind: x.kind || '', brand: x.brand || '', holder: x.holder || '', bank: x.bank || '', account: x.account || '', sheba: x.sheba || '', card: x.card || '', payee: x.payee || '' };
    db.collection('invoices').doc(invKey(d)).update({ bankId: id, bank: snap, updatedAt: Date.now() }).then(function () { return reloadInvoices(); }).then(function () { invDetail(S.invOpen); }, function (err) { rvFail(errText(err)); });
  }
  function reviewDoc(status, reason) {
    var d = findInv(S.invOpen);
    if (!d || !S.user) return;
    var me = S.user.uid, now = Date.now(), t = M.totals(d), b = db.batch();
    var review = { status: status, by: me, byName: myName(), at: now };
    if (reason) review.reason = reason;
    b.update(db.collection('invoices').doc(invKey(d)), { review: review, updatedAt: now });
    var tk = tkForDoc(d.docNo, 'proforma');
    if (status === 'refusal') {
      var letter = 'مدیر فروش گرامی،\n' +
        'پیش‌فاکتور ' + d.docNo + ' (' + (d.customer || '—') + (d.customerCity ? '، ' + d.customerCity : '') + ') به مبلغ ' + money(t.total, d.unit) +
        ' که ' + (d.ownerName || d.issuer || '—') + ' صادر کرده، در بررسی اکانت منیجر (' + myName() + ') رد شد.\n\n' +
        'دلیل رد:\n' + reason + '\n\n' +
        'لطفاً در پنل ← پیش‌فاکتورها ← جزئیات همین پیش‌فاکتور تصمیم بگیرید. با پذیرش رد، پیش‌فاکتور از برنامه حذف و در بایگانی نگه‌داری می‌شود.';
      newTicket(b, { text: letter, head: { title: ('رد پیش‌فاکتور ' + d.docNo + ' · ' + (d.customer || '')).slice(0, 120), toRole: 'sales_manager', kind: 'proforma-refusal',
        docNo: d.docNo, ownerUid: d.ownerUid, audience: ['uid:' + me, 'role:sales_manager'] } });
      noteTicket(b, tk, 'پیش‌فاکتور توسط اکانت منیجر رد شد و برای تصمیم‌گیری به مدیر فروش ارجاع شد.\nدلیل: ' + reason, false);
    } else {
      noteTicket(b, tk, 'پیش‌فاکتور توسط اکانت منیجر تأیید شد.', true);
    }
    rvLock();
    b.commit().then(function () {
      stageLink(d, status === 'refusal' ? { stage: 'rejected', rejectReason: String(reason || '').slice(0, 400) } : { stage: 'accepted' },
        status === 'refusal' ? 'پیش‌فاکتور ' + d.docNo + ' توسط اکانت منیجر رد شد و برای مدیر فروش فرستاده شد: ' + reason : 'پیش‌فاکتور ' + d.docNo + ' توسط اکانت منیجر تأیید شد');
      return reloadInvoices();
    }).then(function () { dlg.close(); }, function (err) { rvFail(errText(err)); });
  }
  // sales manager (or management): accept the refusal (archive and remove everywhere) or decline it (the proforma stays valid)
  function decideRefusal(accept, note) {
    var d = findInv(S.invOpen);
    if (!d || !S.user) return;
    var me = S.user.uid, now = Date.now(), key = invKey(d), r = d.review || {}, b = db.batch();
    var decision = { by: me, byName: myName(), at: now, note: note || '' };
    if (accept) {
      var arch = JSON.parse(JSON.stringify(d));
      arch.status = 'refused'; arch.archivedAt = now; arch.review = Object.assign({}, r, { decision: decision });
      b.set(db.collection('invoice_archive').doc(key), arch);
      b.delete(db.collection('invoices').doc(key));
    } else {
      b.update(db.collection('invoices').doc(key), { review: Object.assign({}, r, { status: 'kept', decision: decision }), updatedAt: now });
    }
    noteTicket(b, tkForDoc(d.docNo, 'proforma-refusal'), accept ? 'رد پیش‌فاکتور پذیرفته شد؛ پیش‌فاکتور از برنامه حذف و بایگانی شد.' : 'رد پیش‌فاکتور پذیرفته نشد؛ پیش‌فاکتور معتبر می‌ماند.', true);
    var owner = S.team.filter(function (u) { return u.id === d.ownerUid; })[0] || {};
    var text = 'تصمیم دربارهٔ پیش‌فاکتور ' + d.docNo + ' (' + (d.customer || '—') + '):\n' +
      (accept ? 'رد اکانت منیجر پذیرفته شد. پیش‌فاکتور از برنامه برداشته و در بایگانی نگه‌داری می‌شود.' : 'رد اکانت منیجر پذیرفته نشد و پیش‌فاکتور معتبر است.') +
      '\nدلیل اکانت منیجر: ' + (r.reason || '—') + (note ? '\nیادداشت ' + myName() + ': ' + note : '');
    newTicket(b, { text: text, head: { title: ((accept ? 'بایگانی پیش‌فاکتور ' : 'ماندن پیش‌فاکتور ') + d.docNo).slice(0, 120), toRole: MSRoles.norm(owner.role || d.ownerRole || 'visitor'),
      toUid: d.ownerUid, toName: d.ownerName || '', kind: 'proforma-decision', docNo: d.docNo, ownerUid: d.ownerUid,
      audience: ['uid:' + me, 'uid:' + d.ownerUid, 'role:account_manager'] } });
    rvLock();
    b.commit().then(function () {
      stageLink(d, accept ? { stage: 'cancelled' } : { stage: 'accepted' }, accept ? 'مدیر فروش رد پیش‌فاکتور ' + d.docNo + ' را پذیرفت؛ سفارش لغو شد' : 'مدیر فروش رد پیش‌فاکتور ' + d.docNo + ' را نپذیرفت؛ پیش‌فاکتور معتبر ماند');
      return reloadInvoices();
    }).then(function () { dlg.close(); }, function (err) { rvFail(errText(err)); });
  }

  // ----- job descriptions (شرح وظایف): everyone reads their own; hr and management edit; every edit is copied to the employee and hr
  var jdFmt = function (ms) { try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ms)); } catch (e) { return ''; } };
  function jdCanEdit(u) {
    if (!u || !S.user || u.id === S.user.uid) return false;
    var me = MSRoles.norm(S.profile.role);
    if (me === 'manager' || me === 'ceo' || me === 'hr') return true;
    return me === 'sales_manager' && MSRoles.norm(u.role) === 'visitor';
  }
  function jdLoad(uid) {
    S.jd = S.jd || {}; S.jdLog = S.jdLog || {}; S.jdBusy = S.jdBusy || {};
    if (S.jdBusy[uid]) return;
    S.jdBusy[uid] = true;
    Promise.all([db.collection('job_descriptions').doc(uid).get(), db.collection('job_description_log').where('uid', '==', uid).get()]).then(function (r) {
      S.jd[uid] = r[0].exists ? r[0].data() : null;
      var l = []; r[1].forEach(function (s) { l.push(s.data()); });
      l.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      S.jdLog[uid] = l.slice(0, 20);
    }, function (e) { S.jd[uid] = null; S.jdLog[uid] = []; S.jdErr = errText(e); }).then(function () {
      S.jdBusy[uid] = false;
      if (S.tab === 'jobs') render();
      var f = dlg.querySelector('#jdForm');
      if (f && f.getAttribute('data-id') === uid && !f.hasAttribute('data-ready')) jdFill(f, uid);
    });
  }
  function jdBody(d) {
    if (!d) return '<p class="pn-note">هنوز شرح وظایف ثبت نشده است.</p>';
    return (d.title ? '<h3 class="pn-sub">' + esc(d.title) + '</h3>' : '') + (d.summary ? '<p class="pn-note">' + esc(d.summary) + '</p>' : '') +
      ((d.duties || []).length ? '<ol class="pn-jd">' + d.duties.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' : '') +
      (d.updatedAt ? '<p class="pn-note">آخرین ویرایش: ' + esc(jdFmt(d.updatedAt)) + (d.updatedByName ? ' · ' + esc(d.updatedByName) : '') + '</p>' : '');
  }
  function jdLogView(uid) {
    var l = (S.jdLog || {})[uid] || [];
    if (!l.length) return '';
    return '<h3 class="pn-sub">تاریخچهٔ تغییرات</h3><ul class="pn-list">' + l.map(function (g) {
      return '<li><div><b>' + esc(g.byName || '') + '</b><span>' + esc(jdFmt(g.at)) + '</span></div><div class="pn-jdch">' + (g.changes || []).map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div></li>';
    }).join('') + '</ul>';
  }
  function jobsView() {
    var uid = S.user.uid; S.jd = S.jd || {};
    if (S.jd[uid] === undefined) jdLoad(uid);
    var out = '<section class="pn-card"><h2>شرح وظایف من</h2>' + (S.jd[uid] === undefined ? '<p class="pn-note">در حال بارگذاری…</p>' : jdBody(S.jd[uid]) + jdLogView(uid)) +
      '<p class="pn-note">شرح وظایف را منابع انسانی و مدیریت بالادستی ویرایش می‌کنند؛ هر تغییر برای شما و منابع انسانی هم فرستاده می‌شود (بخش «گفت‌وگوها»).</p></section>';
    var edit = S.team.filter(jdCanEdit);
    if (edit.length) {
      needProfiles(edit.map(function (u) { return u.id; }));
      out += '<section class="pn-card"><h2>شرح وظایف همکاران</h2><ul class="pn-users">' + edit.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'fa'); }).map(function (u) {
        return '<li class="pn-user' + (u.active === false ? ' off' : '') + '">' + avatar(u.name, 42, u.id) + '<div><b>' + esc(u.name || '—') + '</b><span class="pn-role">' + esc(MSRoles.label(u.role)) + '</span></div>' +
          '<button type="button" class="pn-ibtn" data-jd-edit="' + esc(u.id) + '" title="ویرایش شرح وظایف" aria-label="ویرایش شرح وظایف ' + esc(u.name || '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button></li>';
      }).join('') + '</ul></section>';
    }
    return out;
  }
  function jdForm(u) {
    return '<div class="pn-bar"><h2 id="dlgName">شرح وظایف ' + esc(u.name || '') + '</h2><div class="pn-bar-actions"><button type="button" class="pn-x" data-close aria-label="بستن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></div>' +
      '<form id="jdForm" class="pn-edit" data-id="' + esc(u.id) + '" novalidate><p class="pn-note">با ذخیره، یک نسخه از همهٔ تغییرات برای ' + esc(u.name || 'همکار') + ' و منابع انسانی فرستاده می‌شود.</p>' +
      '<section class="pn-sec"><div class="pn-grid"><label class="full">عنوان شغلی<input type="text" name="title" maxlength="80" disabled></label>' +
      '<label class="full">شرح کوتاه مأموریت<textarea name="summary" rows="3" maxlength="600" disabled></textarea></label>' +
      '<label class="full">وظایف (هر خط یک وظیفه)<textarea name="duties" rows="9" maxlength="6000" disabled></textarea></label></div></section>' +
      (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') + '<button type="submit" class="pn-primary">ذخیره و ارسال نسخه</button></form>';
  }
  function jdFill(f, uid) {
    var d = (S.jd || {})[uid] || { title: '', summary: '', duties: [] };
    f.elements.title.value = d.title || ''; f.elements.summary.value = d.summary || ''; f.elements.duties.value = (d.duties || []).join('\n');
    Array.prototype.forEach.call(f.elements, function (el) { el.disabled = false; });
    f.setAttribute('data-ready', '1');
  }
  function jdOpen(uid) {
    var u = S.team.filter(function (x) { return x.id === uid; })[0]; if (!u || !jdCanEdit(u)) return;
    S.error = ''; dlg.innerHTML = jdForm(u); dlg.showModal();
    S.jd = S.jd || {}; delete S.jd[uid]; S.jdBusy = S.jdBusy || {}; S.jdBusy[uid] = false; jdLoad(uid);
  }
  // what changed, line by line, in plain words
  function jdDiff(a, b) {
    var out = [];
    if ((a.title || '') !== b.title) out.push('عنوان شغلی: «' + (a.title || '—') + '» ← «' + (b.title || '—') + '»');
    if ((a.summary || '') !== b.summary) out.push('شرح مأموریت تغییر کرد: «' + (b.summary || '—') + '»');
    var oldD = a.duties || [];
    b.duties.filter(function (x) { return oldD.indexOf(x) < 0; }).forEach(function (x) { out.push('وظیفهٔ تازه: ' + x); });
    oldD.filter(function (x) { return b.duties.indexOf(x) < 0; }).forEach(function (x) { out.push('وظیفهٔ حذف‌شده: ' + x); });
    return out.map(function (x) { return x.slice(0, 300); }).slice(0, 60);
  }
  function jdSave(f) {
    var uid = f.getAttribute('data-id'), u = S.team.filter(function (x) { return x.id === uid; })[0]; if (!u || !jdCanEdit(u) || S.busy) return;
    if (!f.hasAttribute('data-ready')) return;   // the current text has not arrived yet; saving now would overwrite it
    var old = (S.jd || {})[uid] || { title: '', summary: '', duties: [] };
    var nw = { title: f.elements.title.value.replace(/\s+/g, ' ').trim().slice(0, 80), summary: f.elements.summary.value.trim().slice(0, 600),
      duties: f.elements.duties.value.split('\n').map(function (x) { return x.replace(/\s+/g, ' ').trim().slice(0, 200); }).filter(Boolean).slice(0, 40) };
    var ch = jdDiff(old, nw);
    if (!ch.length) { S.error = 'تغییری وجود ندارد.'; dlg.innerHTML = jdForm(u); jdFill(dlg.querySelector('#jdForm'), uid); return; }
    var me = S.user.uid, now = Date.now(), name = S.profile.name || S.user.email || '', role = MSRoles.norm(S.profile.role), ref = db.collection('tickets').doc();
    var text = ('شرح وظایف ' + (u.name || '') + ' توسط ' + name + ' ویرایش شد.\n' + ch.map(function (c) { return '• ' + c; }).join('\n')).slice(0, 1900);
    var b = db.batch();
    b.set(db.collection('job_descriptions').doc(uid), { title: nw.title, summary: nw.summary, duties: nw.duties, updatedAt: now, updatedBy: me, updatedByName: name });
    b.set(db.collection('job_description_log').doc(), { uid: uid, at: now, by: me, byName: name, changes: ch });
    b.set(ref, { title: ('شرح وظایف ' + (u.name || '')).slice(0, 120), fromUid: me, fromName: name, fromRole: role, toRole: 'hr', toUid: uid, toName: u.name || '', kind: 'jobdesc', status: 'open', createdAt: now, updatedAt: now,
      lastText: text.slice(0, 140), lastBy: me, lastByName: name, audience: ['uid:' + me, 'uid:' + uid, 'role:hr'] });
    b.set(ref.collection('messages').doc(), { uid: me, name: name, role: role, text: text, at: now });
    S.busy = true;
    b.commit().then(function () {
      S.jd[uid] = Object.assign({}, nw, { updatedAt: now, updatedByName: name });
      S.jdLog[uid] = [{ uid: uid, at: now, by: me, byName: name, changes: ch }].concat((S.jdLog || {})[uid] || []);
      dlg.close(); S.msg = 'شرح وظایف ذخیره شد و نسخهٔ تغییرات برای ' + (u.name || 'همکار') + ' و منابع انسانی فرستاده شد.';
    }, function (e) { S.error = errText(e); dlg.innerHTML = jdForm(u); jdFill(dlg.querySelector('#jdForm'), uid); }).then(function () { S.busy = false; render(); });
  }

  function view() {
    if (S.loading) return (window.MSSkel ? window.MSSkel() : '<p class="pn-note">در حال بارگذاری…</p>');
    if (!S.user) {
      return '<form class="pn-card pn-login" id="loginForm"><span class="pn-login-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.500"/><path d="M5 20c0-3.900 3.100-7 7-7s7 3.100 7 7"/></svg></span>' +
        '<h2>ورود به حساب</h2><p class="pn-note">با ایمیل و رمزی که مدیر برای شما ساخته وارد شوید.</p>' +
        '<label>ایمیل<input type="email" name="email" dir="ltr" autocomplete="username" value="' + esc(S.email || lastEmail()) + '" required></label>' +
        '<label>رمز عبور<span class="pn-pw"><input type="password" name="password" dir="ltr" autocomplete="current-password" required><button type="button" class="pn-eye" data-eye aria-label="نمایش رمز" title="نمایش رمز"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button></span></label>' +
        // the code box appears only when the server asks for it (an account with two-step login), so most people never see it
        (S.needCode ? '<label>کد شش‌رقمی برنامهٔ احراز هویت<input type="text" name="code" dir="ltr" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" required autofocus></label>' : '') +
        (window.MSApi && window.MSApi.enabled() ? '<label class="pn-remember"><input type="checkbox" name="remember"' + (S.remember ? ' checked' : '') + '><span>مرا روی این دستگاه به خاطر بسپار (۳۰ روز)</span></label><p class="pn-note pn-remember-note">فقط روی دستگاه شخصی خودتان بزنید؛ در این مدت کد شش‌رقمی و ورود دوباره پرسیده نمی‌شود. با «خروج» از حساب خارج می‌شوید.</p>' : '') +
        (S.enroll ? '<p class="pn-note">ورود دومرحله‌ای برای نقش شما الزامی است. یک بار آن را در <a href="./backend.html">صفحهٔ ورود به سرور</a> فعال کنید و دوباره بیایید.</p>' : '') +
        (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.pwMsg ? '<p class="pn-ok" role="status">' + esc(S.pwMsg) + '</p>' : '') +
        '<button type="submit" class="pn-primary"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'در حال ورود…' : 'ورود') + '</button>' +
        (S.busy ? '<p class="pn-note pn-wait" role="status">در حال اتصال به سرور… تا ۱۵ ثانیه صبر کنید؛ اگر پاسخی نیامد، پیام خطا نشان داده می‌شود.</p>' : '') +
        '<button type="button" class="pn-link" data-forgot>رمز عبور را فراموش کرده‌اید؟</button></form>';
    }
    if (!S.profile || !active()) {
      return '<div class="pn-card"><h2>حساب فعال نیست</h2><p class="pn-note">' +
        (S.profile ? 'این حساب توسط مدیر غیرفعال شده است.' : 'حساب شما هنوز توسط مدیر فعال نشده است. این شناسه را به مدیر بدهید:') + '</p>' +
        '<p class="pn-uid" dir="ltr">' + esc(S.user.uid) + '</p>' + (S.error ? '<p class="pn-err">' + esc(S.error) + '</p>' : '') +
        '<button type="button" class="pn-ico" data-out aria-label="خروج" title="خروج"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button></div>';
    }
    var p = S.profile, mine = S.docs.filter(function (d) { return d.ownerUid === S.user.uid; });
    var out = '';
    out += '<section class="pn-card pn-hero">' + avatar(p.name || S.user.email, 56, S.user.uid).replace('class="pn-av', 'class="pn-av hero') +
      '<div><h2>' + esc(p.name || S.user.email) + '</h2>' +
      '<span class="pn-role">' + esc(MSRoles.label(p.role)) + '</span>' + (p.code ? ' <span class="pn-chip" dir="ltr">' + esc(p.code) + '</span>' : '') + '</div>' +
      '<button type="button" class="pn-ico" data-out aria-label="خروج" title="خروج"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg></button></section>';
    var home = onboardView() + notifyView() + birthdayView();
    if (MSRoles.hasField(p.role, 'territory')) home += '<section class="pn-card"><h2>منطقهٔ فعالیت و فروش من</h2>' + chips(p) + areaView(p) + '</section>';
    if (MSRoles.hasField(p.role, 'proformas')) home += '<section class="pn-card"><h2>پیش‌فاکتورهای من</h2><div class="pn-stats"><div><span>تعداد کل</span><b>' + faInt.format(mine.length) + '</b></div>' +
      '<div><span>مجموع این ماه (شمسی)</span><b>' + monthTotals(mine) + '</b></div></div>' +
      (mine.length ? '<ul class="pn-list">' + mine.slice(0, 6).map(function (d) {
        return '<li><div><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(d.customer || 'بدون نام مشتری') + (reviewTxt(d) ? ' · ' + esc(reviewTxt(d)) : '') + '</span></div><div><span>' + esc(faDate(d.createdAt)) + '</span><b>' + money(M.totals(d).total, d.unit) + '</b></div></li>';
      }).join('') + '</ul>' : '<p class="pn-note">هنوز پیش‌فاکتوری صادر نکرده‌اید.</p>') +
      (S.archDocs.filter(function (d) { return d.ownerUid === S.user.uid; }).length ? '<h3 class="pn-sub">بایگانی‌شده (ردشده)</h3><ul class="pn-list">' + S.archDocs.filter(function (d) { return d.ownerUid === S.user.uid; }).slice(0, 8).map(function (d) {
        return '<li><div><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(d.customer || 'بدون نام مشتری') + '</span></div><div><span>' + esc(d.review && d.review.reason ? d.review.reason.slice(0, 60) : '') + '</span><b>' + money(M.totals(d).total, d.unit) + '</b></div></li>';
      }).join('') + '</ul>' : '') +
      '<a class="pn-link" href="./product-catalog.html">رفتن به کاتالوگ و ساخت پیش‌فاکتور</a></section>';
    if (can('invoices')) {
      var cnt = function (st) { return S.docs.filter(function (d) { return revStatus(d) === st; }).length; };
      var stats = '<div><span>همه</span><b>' + faInt.format(S.docs.length) + '</b></div>';
      if (can('invoiceReview')) stats += '<div><span>منتظر بررسی شما</span><b>' + faInt.format(cnt('pending')) + '</b></div>';
      else if (can('invoiceDecide')) stats += '<div><span>رد شده، منتظر تصمیم شما</span><b>' + faInt.format(cnt('refusal')) + '</b></div>';
      else stats += '<div><span>ارسال‌شده برای بررسی</span><b>' + faInt.format(S.docs.filter(function (d) { return d.sentAt; }).length) + '</b></div>';
      home = '<section class="pn-card"><h2>پیش‌فاکتورها</h2><div class="pn-stats">' + stats + '</div>' +
        '<button type="button" class="pn-primary" data-tab="inv">مشاهدهٔ پیش‌فاکتورها</button></section>' + home;
    }
    var secs = { home: home, inv: can('invoices') ? invoicesView() : '', chat: publicView() + ticketsView(), comm: commissionView(), team: can('team') ? teamView() : '',
      jobs: jobsView(), me: lookView() + meView() + prefsView() };
    var keys = ['home', 'inv', 'chat', 'comm', 'team', 'jobs', 'me'].filter(function (k) { return !!secs[k]; });
    if (keys.indexOf(S.tab) < 0) S.tab = 'home';
    if (NARROW.matches) {
      if (S.launcher) {
        var badges = { chat: tkWaiting() };
        if (can('invoices') && can('invoiceReview')) badges.inv = S.docs.filter(function (d) { return revStatus(d) === 'pending'; }).length;
        return out + appsHtml(keys, badges);
      }
      out += backBar(S.tab);
    } else {
      out += '<nav class="pn-tabs" role="tablist" aria-label="بخش‌های پنل">' + keys.map(function (k) {
        return '<button type="button" role="tab" class="pn-tab" data-tab="' + k + '" aria-selected="' + (S.tab === k) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + TAB_ICON[k] + '</svg><span>' + TAB_LABEL[k] + '</span></button>';
      }).join('') + '</nav>';
    }
    out += '<div class="pn-tabpane" role="tabpanel">' + secs[S.tab] + '</div>';
    return out;
  }
  function teamView() {
    needProfiles(S.team.map(function (u) { return u.id; }));
    var byOwner = {};
    S.docs.forEach(function (d) { (byOwner[d.ownerUid] = byOwner[d.ownerUid] || []).push(d); });
    var rows = S.team.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'fa'); }).map(function (u) {
      var docs = byOwner[u.id] || [];
      return '<li class="pn-user' + (u.active === false ? ' off' : '') + '">' + avatar(u.name, 42, u.id) + '<div><b>' + esc(u.name || '—') + '</b>' +
        '<span class="pn-role">' + esc(MSRoles.label(u.role)) + '</span>' + (u.active === false ? ' <span class="pn-chip off">غیرفعال</span>' : '') +
        (MSRoles.hasField(u.role, 'proformas') ? '<p class="pn-note">' + faInt.format(docs.length) + ' پیش‌فاکتور · این ماه: ' + monthTotals(docs) + '</p>' : '') +
        (can('people') && u.email ? '<p class="pn-note" dir="ltr">' + esc(u.email) + '</p>' : '') +
        (MSRoles.hasField(u.role, 'territory') ? '<div class="pn-chips">' + (u.regions || []).map(function (r) { return '<span class="pn-chip">' + esc(r) + '</span>'; }).join('') + '</div>' +
          (u.cities ? '<p class="pn-note">' + esc(u.cities) + '</p>' : '') : '') + '</div>' +
        '<button type="button" class="pn-ibtn" data-edit="' + esc(u.id) + '" title="ویرایش" aria-label="ویرایش ' + esc(u.name || '') + '"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z\"/></svg></button></li>';
    }).join('');
    return '<section class="pn-card"><h2>تیم</h2><ul class="pn-users">' + rows + '</ul>' +
      (can('roleAdmin') && window.MSApi && window.MSApi.enabled() ? '<p class="pn-note"><a href="./backend.html">ساخت حساب تازه برای کارکنان</a></p>' : can('roleAdmin') ? '<form id="addForm" class="pn-add"><h3>افزودن کاربر</h3>' +
        '<p class="pn-note">ابتدا در Firebase ← Authentication ← Users کاربر را بسازید و «User UID» را اینجا بچسبانید. نقش اولیه کارشناس فروش است؛ پس از افزودن از «ویرایش» تغییر دهید.</p>' +
        '<label>User UID<input type="text" name="uid" dir="ltr" required pattern="[A-Za-z0-9]{10,}" title="فقط حروف و عدد"></label>' +
        '<label>نام و نام خانوادگی<input type="text" name="name" required maxlength="60"></label>' +
        '<label>ایمیل ورود<input type="email" name="email" dir="ltr" required></label>' +
        '<button type="submit" class="pn-primary">افزودن</button></form>' : '') + '</section>';
  }
  function editForm(u) {
    var self = u.id === S.user.uid;
    var regs = Object.keys(REGIONS).map(function (g) {
      return '<fieldset><legend>' + esc(g) + '</legend>' + REGIONS[g].map(function (p) {
        return '<label class="pn-check"><input type="checkbox" name="reg" value="' + esc(p) + '"' + ((u.regions || []).indexOf(p) >= 0 ? ' checked' : '') + '><span>' + esc(p) + '</span></label>';
      }).join('') + '</fieldset>';
    }).join('');
    return '<div class="pn-bar"><h2 id="dlgName">ویرایش ' + esc(u.name || 'کاربر') + '</h2><div class="pn-bar-actions">' +
      (canDelete(u, self) ? '<button type="button" class="pn-trash" data-del="' + esc(u.id) + '" aria-label="حذف کاربر" title="حذف کاربر">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg></button>' : '') +
      '<button type="button" class="pn-x" data-close aria-label="بستن">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div></div>' +
      '<p class="pn-del-note" id="delNote" hidden></p>' +
      '<form id="editForm" class="pn-edit" data-id="' + esc(u.id) + '" novalidate>' +
      '<section class="pn-sec"><h3>اطلاعات شخصی</h3><div class="pn-grid">' +
        '<label class="full">نام و نام خانوادگی<input type="text" name="name" value="' + esc(u.name || '') + '" maxlength="60" required' + (can('people') ? '' : ' disabled') + '></label>' +
        '<label>تلفن<input type="tel" name="phone" dir="ltr" inputmode="numeric" value="' + esc(u.phone || '') + '" maxlength="30"' + (can('people') ? '' : ' disabled') + '></label>' +
        (can('people') ? '<label>کد ملی<input type="text" name="nationalId" dir="ltr" inputmode="numeric" maxlength="10" autocomplete="off" disabled><small class="pn-fh" data-nid-hint>۱۰ رقم؛ صفرهای ابتدایی هم نوشته شود</small></label>' : '') +
        (can('people') ? '<label class="full">تاریخ تولد<input type="text" name="birthday" data-jdate data-jstart="1370" data-jclear data-jmax="today" readonly inputmode="none" placeholder="انتخاب تاریخ" disabled></label>' : '') +
      '</div></section>' +
      '<section class="pn-sec"><h3>حساب</h3><div class="pn-grid">' +
        (can('roleAdmin') && !self ? '<div class="full">' + dropdown('role', 'نقش', [{ label: '', options: MSRoles.ORDER.map(function (r) { return { v: r, t: MSRoles.label(r) }; }) }], MSRoles.norm(u.role)) + '</div>'
          : '<p class="pn-note full">نقش: ' + esc(MSRoles.label(u.role)) + (can('roleAdmin') ? '' : ' (تغییر نقش فقط با مدیرعامل یا تکنولوژی ارتباطات سازمانی است)') + '</p>') +
        // fields that belong to one kind of role only; the block follows the chosen role
        (can('roleAdmin') ? '<div class="full" data-field="code"' + (MSRoles.hasField(u.role, 'code') ? '' : ' hidden') + '><label>کد برای شمارهٔ سند (حروف و عدد لاتین)<input type="text" name="code" dir="ltr" value="' + esc(u.code || '') + '" maxlength="6" pattern="[A-Za-z0-9]*"></label></div>' : '') +
        (can('people') ? '<label class="pn-check full"><input type="checkbox" name="active"' + (u.active === false ? '' : ' checked') + (self ? ' disabled' : '') + '><span>حساب فعال است</span></label>' : '') +
      '</div></section>' +
      (can('territory') ? '<section class="pn-sec" data-field="territory"' + (MSRoles.hasField(u.role, 'territory') ? '' : ' hidden') + '><h3>استان‌های منطقهٔ فعالیت</h3>' + regs +
        '<label>شهرها و توضیحات منطقه<textarea name="cities" rows="3" maxlength="400" placeholder="مثلاً: تبریز، مراغه، اهر">' + esc(u.cities || '') + '</textarea></label></section>' : '') +
      (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<button type="submit" class="pn-primary">ذخیره</button></form>';
  }
  function canDelete(u, self) {
    if (self || !can('userDelete')) return false;
    var r = MSRoles.norm(u.role);
    return can('roleAdmin') || (r !== 'manager' && r !== 'ceo');   // hr never removes management or the CEO (the rules say the same)
  }
  // the open tab is a navy pill that slides and stretches to the next tab (the tabs change width at the same pace, so text never jumps)
  var MORPH_MS = 300;
  function tabSnap() {
    var nav = root.querySelector('.pn-tabs'); if (!nav) return null;
    var o = { w: {}, active: '', pill: null };
    Array.prototype.forEach.call(nav.querySelectorAll('.pn-tab'), function (b) {
      var k = b.getAttribute('data-tab'); o.w[k] = b.getBoundingClientRect().width;
      if (b.getAttribute('aria-selected') === 'true') { o.active = k; o.pill = { left: b.offsetLeft, width: b.offsetWidth }; }
    });
    return o;
  }
  function placePill(nav, r) { var i = nav.querySelector('.pn-pill'); i.style.left = r.left + 'px'; i.style.width = r.width + 'px'; }
  function morphTabs(prev) {
    var nav = root.querySelector('.pn-tabs'); if (!nav) return;
    var tabs = Array.prototype.slice.call(nav.querySelectorAll('.pn-tab')), act = nav.querySelector('.pn-tab[aria-selected=true]');
    var pill = document.createElement('i'); pill.className = 'pn-pill'; pill.setAttribute('aria-hidden', 'true'); nav.insertBefore(pill, nav.firstChild);
    if (!act) { pill.hidden = true; return; }
    var to = { left: act.offsetLeft, width: act.offsetWidth }, calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prev || !prev.pill || prev.active === act.getAttribute('data-tab') || calm) { placePill(nav, to); return; }
    var ease = 'cubic-bezier(.4,0,.2,1)', now = {};
    tabs.forEach(function (b) { now[b.getAttribute('data-tab')] = b.getBoundingClientRect().width; });
    placePill(nav, prev.pill);
    tabs.forEach(function (b) { var k = b.getAttribute('data-tab'); if (prev.w[k] != null) { b.style.flex = '0 0 auto'; b.style.width = prev.w[k] + 'px'; } });
    void nav.offsetWidth;
    pill.style.transition = 'left ' + MORPH_MS + 'ms ' + ease + ', width ' + MORPH_MS + 'ms ' + ease;
    tabs.forEach(function (b) { var k = b.getAttribute('data-tab'); if (prev.w[k] != null) { b.style.transition = 'width ' + MORPH_MS + 'ms ' + ease; b.style.width = now[k] + 'px'; } });
    placePill(nav, to);
    setTimeout(function () { tabs.forEach(function (b) { b.style.flex = ''; b.style.width = ''; b.style.transition = ''; }); pill.style.transition = 'none'; placePill(nav, { left: act.offsetLeft, width: act.offsetWidth }); }, MORPH_MS + 40);
  }
  window.addEventListener('resize', function () {
    var nav = root.querySelector('.pn-tabs'), act = nav && nav.querySelector('.pn-tab[aria-selected=true]'), pill = nav && nav.querySelector('.pn-pill');
    if (act && pill) { pill.style.transition = 'none'; placePill(nav, { left: act.offsetLeft, width: act.offsetWidth }); }
  });
  var hashDone = false;
  function lastEmail() { try { return localStorage.getItem('ms-last-email') || ''; } catch (e) { return ''; } }
  function render() {
    if (!hashDone && S.user && S.profile) { hashDone = true; var hk = HASH_TAB[(location.hash || '').slice(1)]; if (hk) { S.tab = hk; S.launcher = false; } }   // a link to a section opens that section
    var prev = tabSnap();
    root.innerHTML = view();
    morphTabs(prev);
    var lf0 = !S.user && document.getElementById('loginForm');
    if (lf0 && S.pwTmp && lf0.elements.password) lf0.elements.password.value = S.pwTmp;   // a busy or error redraw keeps what was typed
    var h = document.querySelector('.pn-head'); if (h) h.classList.toggle('anon', !S.user && !S.loading); paintMap();
  }

  // ----- actions
  document.addEventListener('click', function (e) {
    var eye = e.target.closest('[data-eye]');
    if (eye) { var pi = eye.parentNode.querySelector('input'); var show = pi.type === 'password'; pi.type = show ? 'text' : 'password'; eye.classList.toggle('on', show); eye.setAttribute('aria-label', show ? 'پنهان‌کردن رمز' : 'نمایش رمز'); return; }
    if (e.target.closest('[data-out]')) { auth.signOut(); return; }
    if (e.target.closest('[data-forgot]') || e.target.closest('[data-forgot-me]')) {
      var me = !!e.target.closest('[data-forgot-me]'), lf = document.getElementById('loginForm');
      var addr = me && S.user ? S.user.email : (lf ? lf.elements.email.value.trim() : '');
      S.error = ''; S.pwMsg = ''; S.pwErr = '';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) { S.error = 'ابتدا ایمیل ورودتان را در کادر ایمیل بنویسید.'; render(); return; }
      auth.sendPasswordResetEmail(addr).then(function () { S.pwMsg = 'اگر این ایمیل در سامانه ثبت باشد، پیوند تغییر رمز برایش فرستاده شد. پوشهٔ اسپم را هم ببینید. اگر ایمیل ورود شما صندوق واقعی ندارد، از مدیر بخواهید رمز را عوض کند.'; },
        function (err) { if (/user-not-found/.test((err && err.code) || '')) S.pwMsg = 'اگر این ایمیل در سامانه ثبت باشد، پیوند تغییر رمز برایش فرستاده شد. پوشهٔ اسپم را هم ببینید. اگر ایمیل ورود شما صندوق واقعی ندارد، از مدیر بخواهید رمز را عوض کند.'; else S.pwErr = S.error = errText(err); }).then(function () { render(); });
      return;
    }
    var bp = e.target.closest('[data-bank-pick]'); if (bp) { pickBank(bp.getAttribute('data-bank-pick')); return; }
    if (e.target.closest('[data-rv-approve]')) { reviewDoc('approved'); return; }
    if (e.target.closest('[data-rv-refuse]')) { var rb = dlg.querySelector('#rvBox'); if (rb) { rb.hidden = !rb.hidden; var rr = dlg.querySelector('#rvReason'); if (rr && !rb.hidden) rr.focus(); } return; }
    if (e.target.closest('[data-rv-send]')) {
      var why = (dlg.querySelector('#rvReason') || {}).value || '';
      why = why.trim();
      if (why.length < 10) { rvFail('دلیل رد را دست‌کم در یک جملهٔ روشن بنویسید.'); return; }
      reviewDoc('refusal', why); return;
    }
    if (e.target.closest('[data-dc-accept]')) { decideRefusal(true, ((dlg.querySelector('#dcNote') || {}).value || '').trim()); return; }
    if (e.target.closest('[data-dc-keep]')) { decideRefusal(false, ((dlg.querySelector('#dcNote') || {}).value || '').trim()); return; }
    var iv = e.target.closest('[data-inv-view]');
    if (iv) { invDetail(iv.getAttribute('data-inv-view')); return; }
    var ifl = e.target.closest('[data-inv-f]');
    if (ifl) { S.invF = ifl.getAttribute('data-inv-f'); render(); return; }
    var tb = e.target.closest('[data-tab]');
    if (e.target.closest('[data-launch]')) { S.launcher = true; S.msg = ''; S.error = ''; render(); window.scrollTo(0, 0); return; }
    if (tb) { S.tab = tb.getAttribute('data-tab'); S.launcher = false; S.msg = ''; S.error = ''; render(); if (NARROW.matches) window.scrollTo(0, 0); return; }
    var cy = e.target.closest('[data-comm-year]');
    if (cy) { S.comm.year = cy.getAttribute('data-comm-year'); S.comm.doc = null; S.comm.results = []; S.comm.mdoc = null; S.comm.mres = []; S.comm.msg = ''; S.comm.error = ''; render(); loadComm(); return; }
    if (e.target.closest('[data-tk-new]')) { S.tk.error = ''; dlg.innerHTML = tkNewForm(); dlg.showModal(); return; }
    var to = e.target.closest('[data-tk-open]');
    if (to) { openThread(to.getAttribute('data-tk-open')); return; }
    var ts = e.target.closest('[data-tk-status]');
    if (ts) {
      var tid = ts.getAttribute('data-id'), st = ts.getAttribute('data-tk-status');
      tkTouch(tid, { status: st }).then(function () { dlg.close(); S.tk.open = null; loadTickets(); }, function (err) { S.tk.error = errText(err); dlg.innerHTML = tkThread(tid); });
      return;
    }
    var ddb = e.target.closest('[data-dd-btn]');
    if (ddb) {
      var lst = ddb.parentNode.querySelector('.pn-dd-list'), openNow = lst.hidden;
      Array.prototype.forEach.call(document.querySelectorAll('.pn-dd-list'), function (l) { l.hidden = true; });
      Array.prototype.forEach.call(document.querySelectorAll('[data-dd-btn]'), function (b) { b.setAttribute('aria-expanded', 'false'); });
      lst.hidden = !openNow; ddb.setAttribute('aria-expanded', String(openNow));
      return;
    }
    var ddv = e.target.closest('[data-dd-v]');
    if (ddv) {
      var box = ddv.closest('.pn-dd'), hid = box.querySelector('input[type=hidden]');
      hid.value = ddv.getAttribute('data-dd-v');
      box.querySelector('[data-dd-btn] span').textContent = ddv.textContent;
      Array.prototype.forEach.call(box.querySelectorAll('[data-dd-v]'), function (o) { o.setAttribute('aria-selected', String(o === ddv)); });
      box.querySelector('.pn-dd-list').hidden = true; box.querySelector('[data-dd-btn]').setAttribute('aria-expanded', 'false');
      hid.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (!e.target.closest('.pn-dd')) Array.prototype.forEach.call(document.querySelectorAll('.pn-dd-list'), function (l) { l.hidden = true; });
    var pf = e.target.closest('[data-pref]');
    if (pf) { savePrefs(pf.getAttribute('data-pref')); return; }
    if (e.target.closest('[data-allow-notify]')) { if (window.MSNotify) window.MSNotify.askPermission().then(function () { render(); }); return; }
    if (e.target.closest('[data-onb-later]')) { S.onb.hide = true; render(); return; }
    if (e.target.closest('[data-photo-pick]')) { var fi = document.getElementById('photoFile'); if (fi) fi.click(); return; }
    var pc2 = e.target.closest('[data-color]');
    if (pc2) { saveLook({ color: pc2.getAttribute('data-color') }); return; }
    if (e.target.closest('[data-photo-del]')) { saveLook({ photo: '' }); return; }
    var dl = e.target.closest('[data-del]');
    if (dl) {
      if (dl.getAttribute('data-armed') !== '1') {
        dl.setAttribute('data-armed', '1'); dl.setAttribute('title', 'برای حذف قطعی دوباره بزنید');
        var nt = dlg.querySelector('#delNote');
        if (nt) { nt.hidden = false; nt.textContent = 'برای حذف قطعی دوباره آیکن را بزنید. پیش‌فاکتورهای او می‌ماند و یک درخواست خودکار برای حذف حساب ورود به مدیریت می‌رسد.'; }
        return;
      }
      var did = dl.getAttribute('data-del');
      dl.disabled = true;
      var gone = S.team.filter(function (x) { return x.id === did; })[0] || { id: did };
      db.collection('users').doc(did).delete().then(function () {
        return createTicket({ title: 'حذف حساب ورود: ' + (gone.name || did), toRole: 'manager', kind: 'account-removal',
          text: 'کاربر «' + (gone.name || '—') + '» (' + MSRoles.label(gone.role) + ') از پنل حذف شد.\nایمیل: ' + (gone.email || 'ثبت نشده') + '\nشناسه: ' + did + '\nلطفاً حساب ورود را از Firebase ← Authentication ← Users حذف کنید و سپس این درخواست را ببندید.' });
      }).then(function () { dlg.close(); S.msg = 'کاربر حذف شد و درخواست حذف حساب ورود برای مدیریت ثبت شد.'; load(); }, function (err) { S.error = errText(err); dlg.innerHTML = editForm(S.team.filter(function (x) { return x.id === did; })[0] || { id: did }); });
      return;
    }
    var pc = e.target.closest('[data-pub-close]');
    if (pc) { db.collection('public_requests').doc(pc.getAttribute('data-pub-close')).update({ status: 'closed' }).then(loadPublic, function (err) { S.pub.error = errText(err); render(); }); return; }
    var cm = e.target.closest('[data-comm-month]');
    if (cm) { S.comm.month = cm.getAttribute('data-comm-month'); S.comm.mdoc = null; S.comm.msg = ''; S.comm.error = ''; render(); loadComm(); return; }
    var ca = e.target.closest('[data-comm-act]');
    if (ca) { commAct(ca.getAttribute('data-comm-act')); return; }
    var je = e.target.closest('[data-jd-edit]');
    if (je) { jdOpen(je.getAttribute('data-jd-edit')); return; }
    var ed = e.target.closest('[data-edit]');
    if (ed) {
      var u = S.team.filter(function (x) { return x.id === ed.getAttribute('data-edit'); })[0];
      if (u) {
        S.error = ''; dlg.innerHTML = editForm(u); dlg.showModal();
        var nf = dlg.querySelector('input[name=nationalId]'), bf = dlg.querySelector('input[name=birthday]');
        var unlock = function () { nf.disabled = false; if (bf) bf.disabled = false; };
        if (nf) db.collection('personal').doc(u.id).get().then(function (s) {
          nf.value = s.exists ? faDigitsStr(String(s.data().nationalId || '')) : '';
          if (bf) bf.value = s.exists ? faDigitsStr(String(s.data().birthday || '')) : '';
          nidHint(nf); unlock();
        }, unlock);
      }
      return;
    }
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
  document.addEventListener('input', function (e) {
    var ta = e.target;
    if (ta && ta.tagName === 'TEXTAREA' && ta.form && ta.form.id === 'tkReplyForm') {
      ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
      syncSend();
      if (ta.value.trim()) signalTyping(ta.form.getAttribute('data-id'));
    }
    if (ta && ta.tagName === 'INPUT' && ta.name === 'phone') { var cp = cleanPhone(ta.value); if (cp !== ta.value) ta.value = cp; }
    if (ta && ta.tagName === 'INPUT' && ta.name === 'nationalId') nidInput(ta);
    if (ta && ta.hasAttribute && ta.hasAttribute('data-inv-q')) { S.invQ = ta.value; var il = document.getElementById('invList'); if (il) il.innerHTML = invListHtml(); }
  });
  document.addEventListener('keydown', function (e) {
    var ta = e.target;
    if (ta && ta.tagName === 'TEXTAREA' && ta.form && ta.form.id === 'tkReplyForm' && e.key === 'Enter' && !e.shiftKey && !(window.matchMedia && window.matchMedia('(pointer:coarse)').matches)) {
      e.preventDefault(); if (ta.value.trim() || S.tk.pending.length) ta.form.requestSubmit();
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'photoFile' && e.target.files && e.target.files[0]) {
      var file = e.target.files[0]; e.target.value = '';
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { S.look.msg = 'فقط عکس JPG، PNG یا WebP پذیرفته می‌شود.'; render(); return; }
      if (file.size > 1024 * 1024) { S.look.msg = 'عکس بزرگ‌تر از ۱ مگابایت است.'; render(); return; }
      photoFrom(file).then(function (dataUrl) { return saveLook({ photo: dataUrl }); }, function (er) { S.look.msg = er && er.message === 'small' ? 'عکس خیلی کوچک است؛ دست‌کم ۱۲۸ پیکسل لازم است.' : 'عکس خوانده نشد.'; render(); });
      return;
    }
    var t = e.target;
    if (!t || t.name !== 'role' || !t.form || t.form.id !== 'editForm') return;
    Array.prototype.forEach.call(t.form.querySelectorAll('[data-field]'), function (el) {
      el.hidden = !MSRoles.hasField(t.value, el.getAttribute('data-field'));
    });
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, v = function (n) { return f.elements[n].value.trim(); };
    if (f.id === 'jdForm') { jdSave(f); return; }
    S.error = ''; S.msg = '';
    if (f.id === 'onbForm') {
      var bd = latinDigits(f.elements.birthday.value).trim().replace(/[-.]/g, '/');
      if (bd && !/^1[34]\d\d\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(bd)) { S.onb.err = 'تاریخ تولد را مثل ۱۳۷۵/۰۳/۱۲ بنویس (یا خالی بگذار).'; render(); return; }
      var gv = f.elements.gender.value || 'na', ad = f.elements.address.value.trim();
      S.onb.err = ''; S.onb.busy = true; render();
      db.collection('users').doc(S.user.uid).update({ birthday: bd, gender: gv, address: ad, onboarded: true }).then(function () {
        S.profile.birthday = bd; S.profile.gender = gv; S.profile.address = ad; S.profile.onboarded = true; S.msg = 'ذخیره شد؛ ممنون که خودت را معرفی کردی.';
      }, function (err) { S.onb.err = errText(err); }).then(function () { S.onb.busy = false; render(); });
      return;
    }
    if (f.id === 'pwForm') {
      var cur = f.elements.cur.value, nw = f.elements.nw.value, rp = f.elements.rp.value;
      S.pwMsg = ''; S.pwErr = '';
      if (nw.length < 8) S.pwErr = 'رمز جدید دست‌کم ۸ نویسه باشد.';
      else if (nw !== rp) S.pwErr = 'رمز جدید و تکرارش یکی نیست.';
      else if (nw === cur) S.pwErr = 'رمز جدید باید با رمز فعلی فرق کند.';
      if (S.pwErr) { render(); return; }
      S.pwBusy = true; render();
      var cred = firebase.auth.EmailAuthProvider.credential(S.user.email, cur);
      S.user.reauthenticateWithCredential(cred).then(function () { return S.user.updatePassword(nw); }).then(function () { S.pwMsg = 'رمز عبور تغییر کرد. دفعهٔ بعد با رمز تازه وارد شوید.'; },
        function (err) { S.pwErr = /wrong-password|invalid-credential/.test((err && err.code) || '') ? 'رمز فعلی درست نیست.' : errText(err); }).then(function () { S.pwBusy = false; render(); });
      return;
    }
    if (f.id === 'loginForm') {
      S.pwMsg = '';
      S.email = v('email'); S.pwTmp = f.elements.password.value; S.remember = !!(f.elements.remember && f.elements.remember.checked);
      S.busy = true; render();
      S.enroll = false;
      auth.signInWithEmailAndPassword(v('email'), S.pwTmp, f.elements.code ? v('code') : undefined, S.remember).then(function () { S.needCode = false; S.pwTmp = ''; try { localStorage.setItem('ms-last-email', S.email); } catch (x) { /* ignore */ } }, function (err) {
        var c = (err && err.code) || '';
        if (c === 'auth/code-required') { S.needCode = true; S.error = ''; } else if (c === 'auth/enroll-2fa') { S.enroll = true; S.error = ''; } else S.error = errText(err);
        S.busy = false; S.loading = false; render();
      });
    } else if (f.id === 'meForm') {
      var em = v('contactEmail').toLowerCase();
      if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { S.error = 'نشانی ایمیل درست نیست.'; render(); return; }
      S.busy = true; render();
      db.collection('users').doc(S.user.uid).update({ contactEmail: em }).then(function () {
        S.profile.contactEmail = em; S.msg = 'ذخیره شد.';
      }, function (err) { S.error = errText(err); }).then(function () { S.busy = false; render(); });
    } else if (f.id === 'tkNewForm') {
      var val = f.elements.to ? f.elements.to.value : 'role:sales_manager';
      var o = { title: v('title'), text: f.elements.text.value.trim() };
      if (val.indexOf('uid:') === 0) {
        var tu = S.team.filter(function (x) { return x.id === val.slice(4); })[0] || {};
        o.toUid = val.slice(4); o.toRole = MSRoles.norm(tu.role); o.toName = tu.name || '';
      } else { o.toRole = val.slice(5); }
      if (!o.title || !o.text) return;
      createTicket(o).then(function () { dlg.close(); loadTickets(); }, function (err) { S.tk.error = errText(err); dlg.innerHTML = tkNewForm(); });
    } else if (f.id === 'tkReplyForm') {
      var rid = f.getAttribute('data-id'), txt = f.elements.text.value.trim(), ed = S.tk.edit;
      if (ed) {
        var edMsg = S.tk.msgs.filter(function (x) { return x.id === ed.id; })[0] || {};
        if (!txt && !(edMsg.files && edMsg.files.length)) return;
        var eref = db.collection('tickets').doc(rid), lastM = S.tk.msgs[S.tk.msgs.length - 1], nowE = Date.now();
        eref.collection('messages').doc(ed.id).update({ text: txt, editedAt: nowE }).then(function () {
          if (lastM && lastM.id === ed.id) return eref.update({ updatedAt: nowE, lastText: txt.slice(0, 140), lastBy: S.user.uid, lastByName: myName() });
        }).then(function () {
          edMsg.text = txt; edMsg.editedAt = nowE; lastSig = ''; paintFeed(false);
          S.tk.edit = null; f.elements.text.value = ''; f.elements.text.style.height = ''; paintBars(); loadTickets();
        }, function (err) { S.tk.error = errText(err); var er = document.getElementById('tkErr'); if (er) { er.hidden = false; er.textContent = S.tk.error; } });
        return;
      }
      if (!txt && !S.tk.pending.length) return;
      sendMessage(f, rid, txt);
    } else if (f.id === 'addForm') {
      db.collection('users').doc(v('uid')).set({ name: v('name'), email: v('email'), role: 'visitor', active: true, regions: [], cities: '' }).then(function () { load(); }, function (err) { S.error = errText(err); render(); });
    } else if (f.id === 'editForm') {
      var id = f.getAttribute('data-id'), self = id === S.user.uid;
      var data = {};   // only the fields this role is allowed to change, so the rules see no foreign key
      if (can('people')) { data.name = v('name'); data.phone = cleanPhone(v('phone')); if (!self) data.active = f.elements.active.checked; }
      var known = S.team.filter(function (x) { return x.id === id; })[0] || {};
      var roleNow = known.role, picked = f.elements.role ? { value: f.elements.role.value } : null;
      if (can('roleAdmin') && !self && picked) { roleNow = picked.value; data.role = roleNow; }
      if (can('roleAdmin')) data.code = MSRoles.hasField(roleNow, 'code') ? v('code').toUpperCase() : '';
      if (data.code) {
        var dup = S.team.filter(function (x) { return x.id !== id && String(x.code || '').toUpperCase() === data.code; })[0];
        if (dup) { formErr(f, 'این کد برای «' + (dup.name || 'کاربر دیگر') + '» ثبت شده است؛ کد هر نفر باید یکتا باشد.'); return; }
      }
      if (can('territory')) {
        if (MSRoles.hasField(roleNow, 'territory')) {
          data.cities = v('cities');
          data.regions = Array.prototype.map.call(f.querySelectorAll('input[name=reg]:checked'), function (c) { return c.value; });
          data.commissionRegions = regionsOf(data.regions);   // the regions whose commission result this person may read
        } else {          // a role without a territory carries none
          data.cities = ''; data.regions = []; data.commissionRegions = [];
        }
      }
      var nidIn = f.elements.nationalId, nid = '', bdIn = f.elements.birthday, bd = '';
      var lat = function (s) { return String(s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); };
      if (nidIn && !nidIn.disabled) {
        nid = lat(nidIn.value).replace(/\D/g, '');
        bd = bdIn ? lat(bdIn.value).replace(/[^\d]/g, '') : '';
        var bad = '';
        if (nid && !validNid(nid)) bad = 'کد ملی معتبر نیست؛ ارقام را دوباره بررسی کنید.';
        else if (bd && !(/^\d{8}$/.test(bd) && +bd.slice(0, 4) >= 1250 && +bd.slice(0, 4) <= 1420 && +bd.slice(4, 6) >= 1 && +bd.slice(4, 6) <= 12 && +bd.slice(6) >= 1 && +bd.slice(6) <= 31)) bad = 'تاریخ تولد معتبر نیست؛ از تقویم انتخاب کنید.';
        if (bad) { formErr(f, bad); return; }
        formErr(f, '');
        if (bd) bd = bd.slice(0, 4) + '/' + bd.slice(4, 6) + '/' + bd.slice(6);
      }
      db.collection('users').doc(id).set(data, { merge: true }).then(function () {
        return (nidIn && !nidIn.disabled && can('people')) ? db.collection('personal').doc(id).set({ nationalId: nid, birthday: bd, updatedAt: Date.now() }) : null;
      }).then(function () { dlg.close(); load(); }, function (err) { formErr(f, errText(err)); });
    }
  });
  render();
})();

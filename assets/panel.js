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
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال به سرویس برقرار نشد (اینترنت یا VPN). اطلاعات ذخیره‌شدهٔ این دستگاه نمایش داده می‌شود.';
    if (/permission-denied/.test(c)) return 'اجازهٔ انجام این کار را ندارید.';
    if (/too-many-requests/.test(c)) return 'تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید.';
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
    }).then(function () { S.loading = false; render(); loadComm(); loadTickets(); loadPublic(); if (window.MSNotify) window.MSNotify.refresh(true); });
  }
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.docs = []; S.team = []; S.msg = ''; S.busy = false;
    if (!u) { try { localStorage.removeItem('ms-role'); } catch (x) { /* ignore */ } if (window.MSGate) window.MSGate.apply(); S.loading = false; render(); return; }
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
  function tkWaiting() {
    var mine = ['uid:' + S.user.uid, 'role:' + myRole()];   // general management reads everything but is only asked about its own
    return S.tk.list.filter(function (x) {
      return x.status === 'open' && x.lastBy !== S.user.uid && (x.audience || []).some(function (a) { return mine.indexOf(a) >= 0; });
    }).length;
  }
  function tkWhen(ms) { try { return new Intl.DateTimeFormat('fa-IR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; } }
  // ----- the conversation list and the messenger window
  function hue(s) { var h = 0; s = String(s || ''); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function avatar(name, px) {
    var ch = String(name || '').trim().charAt(0) || '؟';
    return '<span class="pn-av" style="--h:' + hue(name) + ';--px:' + (px || 40) + 'px" aria-hidden="true">' + esc(ch) + '</span>';
  }
  function tkTime(ms) { try { return new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; } }
  function tkDay(ms) { try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; } }
  function otherParty(x) { return x.fromUid === S.user.uid ? (x.toName || MSRoles.label(x.toRole)) : (x.fromName || '—'); }
  var CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  var SEND_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 3 10.500l7 3 3 7z"/><path d="m10 13.500 11-10.500"/></svg>';
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

  function ticketsView() {
    var T = S.tk, wait = tkWaiting();
    var rows = T.list.map(function (x) {
      var other = otherParty(x), mineLast = x.lastBy === S.user.uid, waiting = !mineLast && x.status === 'open';
      return '<li><button type="button" class="pn-chat' + (x.status === 'closed' ? ' off' : '') + (waiting ? ' wait' : '') + '" data-tk-open="' + esc(x.id) + '">' +
        avatar(other, 46) +
        '<span class="pn-chat-main"><span class="pn-chat-top"><b>' + esc(x.title) + '</b><time>' + esc(tkTime(x.updatedAt)) + '</time></span>' +
        '<span class="pn-chat-sub">' + esc(other) + (x.kind === 'account-removal' ? ' · خودکار' : '') + (x.status === 'closed' ? ' · بسته' : '') + '</span>' +
        '<span class="pn-chat-last">' + (mineLast ? '<i class="pn-you">شما:</i> ' : '') + esc(x.lastText || '') + '</span></span>' +
        (waiting ? '<i class="pn-unread" aria-label="منتظر پاسخ شما"></i>' : '') + '</button></li>';
    }).join('');
    return '<section class="pn-card pn-tickets" id="tickets"><div class="pn-tk-head"><h2>گفت‌وگوها' + (wait ? ' <span class="pn-badge" aria-label="منتظر پاسخ شما">' + faInt.format(wait) + '</span>' : '') + '</h2>' +
      '<button type="button" class="pn-secondary" data-tk-new>گفت‌وگوی تازه</button></div>' +
      (T.error ? '<p class="pn-err" role="alert">' + esc(T.error) + '</p>' : '') +
      (rows ? '<ul class="pn-chats">' + rows + '</ul>' : '<p class="pn-note">' + (T.loading ? 'در حال بارگذاری…' : 'گفت‌وگویی نیست. برای پیام به فروش، مالی، مدیریت یا هر واحد دیگر «گفت‌وگوی تازه» را بزنید.') + '</p>') + '</section>';
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
      out += '<li class="pn-row ' + (mine ? 'mine' : 'other') + (joinPrev ? '' : ' first') + (joinNext ? '' : ' last') + '">' +
        (mine ? '' : '<span class="pn-row-av">' + (joinNext ? '' : avatar(m.name, 34)) + '</span>') +
        '<div class="pn-bubble">' + (!mine && !joinPrev ? '<b class="pn-from">' + esc(m.name || '—') + '</b>' : '') +
        '<p>' + esc(m.text) + '</p><time>' + esc(tkTime(m.at)) + '</time></div></li>';
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
      avatar(other, 44) + '<div class="pn-chat-who"><b id="dlgName">' + esc(x.title) + '</b><span>' + esc(x.fromName || '—') + ' ← ' + esc(x.toName || MSRoles.label(x.toRole)) + (x.kind === 'account-removal' ? ' · خودکار' : '') + '</span></div>' + toggle + '</div>' +
      '<ul class="pn-feed" id="tkFeed">' + feedHtml() + '</ul>' +
      (S.tk.error ? '<p class="pn-err" role="alert">' + esc(S.tk.error) + '</p>' : '') +
      (open ? '<form id="tkReplyForm" class="pn-composer" data-id="' + esc(x.id) + '"><textarea name="text" rows="1" maxlength="2000" placeholder="پیام…" aria-label="پیام" required></textarea>' +
        '<button type="submit" class="pn-send" aria-label="ارسال">' + SEND_SVG + '</button></form>'
        : '<div class="pn-closed"><span>این گفت‌وگو بسته است.</span><button type="button" class="pn-secondary" data-tk-status="open" data-id="' + esc(x.id) + '">بازکردن دوباره</button></div>');
  }
  var unsubFeed = null;
  function stopFeed() { if (unsubFeed) { try { unsubFeed(); } catch (e) { /* ignore */ } unsubFeed = null; } }
  function paintFeed(first) {
    var feed = document.getElementById('tkFeed');
    if (!feed) return;
    var near = first || feed.scrollHeight - feed.scrollTop - feed.clientHeight < 90;
    var last = S.tk.msgs[S.tk.msgs.length - 1];
    feed.innerHTML = feedHtml();
    if (near || (last && last.uid === S.user.uid)) feed.scrollTop = feed.scrollHeight;
  }
  function openThread(id) {
    stopFeed();
    S.tk.open = id; S.tk.msgs = []; S.tk.error = '';
    dlg.className = 'pn-dialog pn-chatdlg';
    dlg.innerHTML = tkThread(id);
    if (!dlg.open) dlg.showModal();
    var first = true;
    // live: a reply from the other side appears without a refresh
    unsubFeed = db.collection('tickets').doc(id).collection('messages').orderBy('at').onSnapshot(function (qs) {
      S.tk.msgs = []; qs.forEach(function (s) { S.tk.msgs.push(s.data()); });
      paintFeed(first); first = false;
    }, function (e) { S.tk.error = errText(e); dlg.innerHTML = tkThread(id); });
  }
  dlg.addEventListener('close', function () { stopFeed(); S.tk.open = null; dlg.className = 'pn-dialog'; });
  function tkTouch(id, extra) {
    var now = Date.now(), data = { updatedAt: now };
    Object.keys(extra).forEach(function (k) { data[k] = extra[k]; });
    return db.collection('tickets').doc(id).update(data);
  }

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

  function view() {
    if (S.loading) return '<p class="pn-note">در حال بارگذاری…</p>';
    if (!S.user) {
      return '<form class="pn-card pn-login" id="loginForm"><span class="pn-login-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.500"/><path d="M5 20c0-3.900 3.100-7 7-7s7 3.100 7 7"/></svg></span>' +
        '<h2>ورود به حساب</h2><p class="pn-note">با ایمیل و رمزی که مدیر برای شما ساخته وارد شوید.</p>' +
        '<label>ایمیل<input type="email" name="email" dir="ltr" autocomplete="username" required></label>' +
        '<label>رمز عبور<input type="password" name="password" dir="ltr" autocomplete="current-password" required></label>' +
        (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
        '<button type="submit" class="pn-primary"' + (S.busy ? ' disabled' : '') + '>ورود</button></form>';
    }
    if (!S.profile || !active()) {
      return '<div class="pn-card"><h2>حساب فعال نیست</h2><p class="pn-note">' +
        (S.profile ? 'این حساب توسط مدیر غیرفعال شده است.' : 'حساب شما هنوز توسط مدیر فعال نشده است. این شناسه را به مدیر بدهید:') + '</p>' +
        '<p class="pn-uid" dir="ltr">' + esc(S.user.uid) + '</p>' + (S.error ? '<p class="pn-err">' + esc(S.error) + '</p>' : '') +
        '<button type="button" class="pn-secondary" data-out>خروج</button></div>';
    }
    var p = S.profile, mine = S.docs.filter(function (d) { return d.ownerUid === S.user.uid; });
    var out = '';
    out += '<section class="pn-card pn-hero"><div class="pn-avatar" aria-hidden="true">' + esc((p.name || S.user.email || '؟').trim().charAt(0)) + '</div>' +
      '<div><h2>' + esc(p.name || S.user.email) + '</h2><p class="pn-note" dir="ltr">' + esc(S.user.email) + '</p>' +
      '<span class="pn-role">' + esc(MSRoles.label(p.role)) + '</span>' + (p.code ? ' <span class="pn-chip" dir="ltr">' + esc(p.code) + '</span>' : '') + '</div>' +
      '<button type="button" class="pn-secondary" data-out>خروج</button></section>';
    out += '<section class="pn-card"><h2>اطلاعات من</h2><form id="meForm">' +
      '<label>نام و نام خانوادگی (روی پیش‌فاکتور چاپ می‌شود)<input type="text" name="name" value="' + esc(p.name || '') + '" maxlength="60" required></label>' +
      '<label>تلفن تماس<input type="tel" name="phone" dir="ltr" value="' + esc(p.phone || '') + '" maxlength="30" inputmode="tel"></label>' +
      (S.msg ? '<p class="pn-ok" role="status">' + esc(S.msg) + '</p>' : '') + (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<button type="submit" class="pn-primary"' + (S.busy ? ' disabled' : '') + '>ذخیرهٔ اطلاعات</button>' +
      '<p class="pn-note">نقش، کد و منطقهٔ فعالیت را مدیر تعیین می‌کند.</p></form></section>';
    if (MSRoles.hasField(p.role, 'territory')) out += '<section class="pn-card"><h2>منطقهٔ فعالیت و فروش من</h2>' + chips(p) + areaView(p) + '</section>';
    if (MSRoles.hasField(p.role, 'proformas')) out += '<section class="pn-card"><h2>پیش‌فاکتورهای من</h2><div class="pn-stats"><div><span>تعداد کل</span><b>' + faInt.format(mine.length) + '</b></div>' +
      '<div><span>مجموع این ماه (شمسی)</span><b>' + monthTotals(mine) + '</b></div></div>' +
      (mine.length ? '<ul class="pn-list">' + mine.slice(0, 6).map(function (d) {
        return '<li><div><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(d.customer || 'بدون نام مشتری') + '</span></div><div><span>' + esc(faDate(d.createdAt)) + '</span><b>' + money(M.totals(d).total, d.unit) + '</b></div></li>';
      }).join('') + '</ul>' : '<p class="pn-note">هنوز پیش‌فاکتوری صادر نکرده‌اید.</p>') +
      '<a class="pn-link" href="./product-catalog.html">رفتن به کاتالوگ و ساخت پیش‌فاکتور</a></section>';
    out += notifyView();
    out += publicView();
    out += ticketsView();
    out += commissionView();
    if (can('team')) out += teamView();
    return out;
  }
  function teamView() {
    var byOwner = {};
    S.docs.forEach(function (d) { (byOwner[d.ownerUid] = byOwner[d.ownerUid] || []).push(d); });
    var rows = S.team.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'fa'); }).map(function (u) {
      var docs = byOwner[u.id] || [];
      return '<li class="pn-user' + (u.active === false ? ' off' : '') + '"><div><b>' + esc(u.name || '—') + '</b>' +
        '<span class="pn-role">' + esc(MSRoles.label(u.role)) + '</span>' + (u.active === false ? ' <span class="pn-chip off">غیرفعال</span>' : '') +
        (MSRoles.hasField(u.role, 'proformas') ? '<p class="pn-note">' + faInt.format(docs.length) + ' پیش‌فاکتور · این ماه: ' + monthTotals(docs) + '</p>' : '') +
        (can('people') && u.email ? '<p class="pn-note" dir="ltr">' + esc(u.email) + '</p>' : '') +
        (MSRoles.hasField(u.role, 'territory') ? '<div class="pn-chips">' + (u.regions || []).map(function (r) { return '<span class="pn-chip">' + esc(r) + '</span>'; }).join('') + '</div>' +
          (u.cities ? '<p class="pn-note">' + esc(u.cities) + '</p>' : '') : '') + '</div>' +
        '<button type="button" class="pn-secondary" data-edit="' + esc(u.id) + '">ویرایش</button></li>';
    }).join('');
    return '<section class="pn-card"><h2>تیم</h2><ul class="pn-users">' + rows + '</ul>' +
      (can('roleAdmin') ? '<form id="addForm" class="pn-add"><h3>افزودن کاربر</h3>' +
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
      '<form id="editForm" class="pn-edit" data-id="' + esc(u.id) + '">' +
      '<label>نام و نام خانوادگی<input type="text" name="name" value="' + esc(u.name || '') + '" maxlength="60" required' + (can('people') ? '' : ' disabled') + '></label>' +
      '<label>تلفن<input type="tel" name="phone" dir="ltr" value="' + esc(u.phone || '') + '" maxlength="30"' + (can('people') ? '' : ' disabled') + '></label>' +
      (can('roleAdmin') && !self ? dropdown('role', 'نقش', [{ label: '', options: MSRoles.ORDER.map(function (r) { return { v: r, t: MSRoles.label(r) }; }) }], MSRoles.norm(u.role))
        : '<p class="pn-note">نقش: ' + esc(MSRoles.label(u.role)) + (can('roleAdmin') ? '' : ' (تغییر نقش فقط با مدیرعامل یا تکنولوژی سازمانی است)') + '</p>') +
      // fields that belong to one kind of role only; the block follows the chosen role
      (can('roleAdmin') ? '<div data-field="code"' + (MSRoles.hasField(u.role, 'code') ? '' : ' hidden') + '><label>کد برای شمارهٔ سند (حروف و عدد لاتین)<input type="text" name="code" dir="ltr" value="' + esc(u.code || '') + '" maxlength="6" pattern="[A-Za-z0-9]*"></label></div>' : '') +
      (can('people') ? '<label class="pn-check"><input type="checkbox" name="active"' + (u.active === false ? '' : ' checked') + (self ? ' disabled' : '') + '><span>حساب فعال است</span></label>' : '') +
      (can('territory') ? '<div data-field="territory"' + (MSRoles.hasField(u.role, 'territory') ? '' : ' hidden') + '><h3>استان‌های منطقهٔ فعالیت</h3>' + regs +
      '<label>شهرها و توضیحات منطقه<textarea name="cities" rows="3" maxlength="400" placeholder="مثلاً: تبریز، مراغه، اهر">' + esc(u.cities || '') + '</textarea></label></div>' : '') +
      (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<button type="submit" class="pn-primary">ذخیره</button></form>';
  }
  function canDelete(u, self) {
    if (self || !can('userDelete')) return false;
    var r = MSRoles.norm(u.role);
    return can('roleAdmin') || (r !== 'manager' && r !== 'ceo');   // hr never removes management or the CEO (the rules say the same)
  }
  function render() { root.innerHTML = view(); var h = document.querySelector('.pn-head'); if (h) h.classList.toggle('anon', !S.user && !S.loading); paintMap(); }

  // ----- actions
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-out]')) { auth.signOut(); return; }
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
    var ed = e.target.closest('[data-edit]');
    if (ed) {
      var u = S.team.filter(function (x) { return x.id === ed.getAttribute('data-edit'); })[0];
      if (u) { S.error = ''; dlg.innerHTML = editForm(u); dlg.showModal(); }
      return;
    }
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
  document.addEventListener('input', function (e) {
    var ta = e.target;
    if (ta && ta.tagName === 'TEXTAREA' && ta.form && ta.form.id === 'tkReplyForm') { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; }
  });
  document.addEventListener('keydown', function (e) {
    var ta = e.target;
    if (ta && ta.tagName === 'TEXTAREA' && ta.form && ta.form.id === 'tkReplyForm' && e.key === 'Enter' && !e.shiftKey && !(window.matchMedia && window.matchMedia('(pointer:coarse)').matches)) {
      e.preventDefault(); if (ta.value.trim()) ta.form.requestSubmit();
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.name !== 'role' || !t.form || t.form.id !== 'editForm') return;
    Array.prototype.forEach.call(t.form.querySelectorAll('[data-field]'), function (el) {
      el.hidden = !MSRoles.hasField(t.value, el.getAttribute('data-field'));
    });
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, v = function (n) { return f.elements[n].value.trim(); };
    S.error = ''; S.msg = '';
    if (f.id === 'loginForm') {
      S.busy = true; render();
      auth.signInWithEmailAndPassword(v('email'), f.elements.password.value).then(null, function (err) { S.error = errText(err); S.busy = false; S.loading = false; render(); });
    } else if (f.id === 'meForm') {
      S.busy = true; render();
      db.collection('users').doc(S.user.uid).update({ name: v('name'), phone: v('phone') }).then(function () {
        S.profile.name = v('name'); S.profile.phone = v('phone'); S.msg = 'ذخیره شد. از این پس نام شما روی پیش‌فاکتورهای جدید همین است.';
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
      var rid = f.getAttribute('data-id'), txt = f.elements.text.value.trim();
      if (!txt) return;
      var rref = db.collection('tickets').doc(rid), nb = db.batch(), now2 = Date.now();
      nb.set(rref.collection('messages').doc(), { uid: S.user.uid, name: myName(), role: myRole(), text: txt, at: now2 });
      nb.update(rref, { updatedAt: now2, lastText: txt.slice(0, 140), lastBy: S.user.uid, lastByName: myName() });
      nb.commit().then(function () { f.elements.text.value = ''; f.elements.text.style.height = ''; loadTickets(); }, function (err) { S.tk.error = errText(err); dlg.innerHTML = tkThread(rid); });
    } else if (f.id === 'addForm') {
      db.collection('users').doc(v('uid')).set({ name: v('name'), email: v('email'), role: 'visitor', active: true, regions: [], cities: '' }).then(function () { load(); }, function (err) { S.error = errText(err); render(); });
    } else if (f.id === 'editForm') {
      var id = f.getAttribute('data-id'), self = id === S.user.uid;
      var data = {};   // only the fields this role is allowed to change, so the rules see no foreign key
      if (can('people')) { data.name = v('name'); data.phone = v('phone'); if (!self) data.active = f.elements.active.checked; }
      var known = S.team.filter(function (x) { return x.id === id; })[0] || {};
      var roleNow = known.role, picked = f.elements.role ? { value: f.elements.role.value } : null;
      if (can('roleAdmin') && !self && picked) { roleNow = picked.value; data.role = roleNow; }
      if (can('roleAdmin')) data.code = MSRoles.hasField(roleNow, 'code') ? v('code').toUpperCase() : '';
      if (can('territory')) {
        if (MSRoles.hasField(roleNow, 'territory')) {
          data.cities = v('cities');
          data.regions = Array.prototype.map.call(f.querySelectorAll('input[name=reg]:checked'), function (c) { return c.value; });
          data.commissionRegions = regionsOf(data.regions);   // the regions whose commission result this person may read
        } else {          // a role without a territory carries none
          data.cities = ''; data.regions = []; data.commissionRegions = [];
        }
      }
      db.collection('users').doc(id).set(data, { merge: true }).then(function () { dlg.close(); load(); }, function (err) { S.error = errText(err); dlg.innerHTML = editForm(Object.assign({ id: id }, S.team.filter(function (x) { return x.id === id; })[0] || {}, data)); });
    }
  });
  render();
})();

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

  // ----- data
  function load() {
    S.loading = true; S.error = ''; render();
    var uid = S.user.uid;
    var timeout = new Promise(function (_, rej) { setTimeout(function () { rej({ code: 'timeout' }); }, 15000); });
    Promise.race([db.collection('users').doc(uid).get(), timeout]).then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      try { localStorage.setItem('ms-role', active() ? (S.profile.role || '') : ''); } catch (x) { /* ignore */ }
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
    }).then(function () { S.loading = false; render(); loadComm(); });
  }
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.docs = []; S.team = []; S.msg = ''; S.busy = false;
    if (!u) { try { localStorage.removeItem('ms-role'); } catch (x) { /* ignore */ } S.loading = false; render(); return; }
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
  S.comm = { year: '', month: '', doc: null, results: [], mdoc: null, mres: [], loading: false, busy: false, msg: '', error: '' };
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
        db.collection('commission_months').doc(y + '_' + mm).get().then(function (s) { S.comm.mdoc = s.exists ? s.data() : null; })
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
    p.then(null, function (e) { S.comm.error = errText(e); }).then(function () { S.comm.loading = false; render(); });
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
    return '<section class="pn-card pn-comm"><h2>پورسانت مناطق</h2>' + commYearChips() +
      '<p class="pn-note"><span class="pn-chip">' + esc(COMM_LABEL[status] || COMM_LABEL.none) + '</span> مبنا: درآمد سالانهٔ هر منطقه؛ نرخ بین ' + faPct.format(RATE_MIN) + ' تا ' + faPct.format(RATE_MAX) + ' درصد.</p>' +
      '<div class="pn-scroll"><table class="pn-table"><thead><tr><th>منطقه</th><th>درآمد (میلیارد تومان)</th><th>نرخ ٪</th><th>پورسانت (میلیارد تومان)</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><td>جمع</td><td>' + faOne.format(totInc) + '</td><td>—</td><td>' + faTwo.format(tot) + '</td></tr></tfoot></table></div>' +
      (C.msg ? '<p class="pn-ok" role="status">' + esc(C.msg) + '</p>' : '') + (C.error ? '<p class="pn-err" role="alert">' + esc(C.error) + '</p>' : '') +
      (acts ? '<div class="pn-actions">' + acts + '</div>' : '') +
      '<p class="pn-note">فقط مالی نرخ را وارد می‌کند، مدیر فروش بررسی و مدیرعامل تأیید می‌کند. کارشناس فروش فقط نتیجهٔ منطقهٔ خودش را می‌بیند.</p></section>';
  }
  function monthChips() {
    return '<div class="pn-chips pn-months" role="group" aria-label="ماه">' + MONTHS.map(function (n, i) {
      return '<button type="button" class="pn-year" data-comm-month="' + pad2(i + 1) + '" aria-pressed="' + (pad2(i + 1) === S.comm.month) + '">' + esc(n) + '</button>';
    }).join('') + '</div>';
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

  function view() {
    if (S.loading) return '<p class="pn-note">در حال بارگذاری…</p>';
    if (!S.user) {
      return '<form class="pn-card pn-login" id="loginForm"><h2>ورود به پنل کاربری</h2>' +
        '<label>ایمیل<input type="email" name="email" dir="ltr" autocomplete="username" required></label>' +
        '<label>رمز عبور<input type="password" name="password" dir="ltr" autocomplete="current-password" required></label>' +
        (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
        '<button type="submit" class="pn-primary"' + (S.busy ? ' disabled' : '') + '>ورود</button>' +
        '<p class="pn-note">حساب‌ها فقط توسط مدیر ساخته می‌شود.</p></form>';
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
    out += '<section class="pn-card"><h2>پیش‌فاکتورهای من</h2><div class="pn-stats"><div><span>تعداد کل</span><b>' + faInt.format(mine.length) + '</b></div>' +
      '<div><span>مجموع این ماه (شمسی)</span><b>' + monthTotals(mine) + '</b></div></div>' +
      (mine.length ? '<ul class="pn-list">' + mine.slice(0, 6).map(function (d) {
        return '<li><div><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(d.customer || 'بدون نام مشتری') + '</span></div><div><span>' + esc(faDate(d.createdAt)) + '</span><b>' + money(M.totals(d).total, d.unit) + '</b></div></li>';
      }).join('') + '</ul>' : '<p class="pn-note">هنوز پیش‌فاکتوری صادر نکرده‌اید.</p>') +
      '<a class="pn-link" href="./product-catalog.html">رفتن به کاتالوگ و ساخت پیش‌فاکتور</a></section>';
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
        '<p class="pn-note">' + faInt.format(docs.length) + ' پیش‌فاکتور · این ماه: ' + monthTotals(docs) + '</p>' +
        (MSRoles.hasField(u.role, 'territory') ? '<div class="pn-chips">' + (u.regions || []).map(function (r) { return '<span class="pn-chip">' + esc(r) + '</span>'; }).join('') + '</div>' +
          (u.cities ? '<p class="pn-note">' + esc(u.cities) + '</p>' : '') : '') + '</div>' +
        '<button type="button" class="pn-secondary" data-edit="' + esc(u.id) + '">ویرایش</button></li>';
    }).join('');
    return '<section class="pn-card"><h2>تیم</h2><ul class="pn-users">' + rows + '</ul>' +
      (can('roleAdmin') ? '<form id="addForm" class="pn-add"><h3>افزودن کاربر</h3>' +
        '<p class="pn-note">ابتدا در Firebase ← Authentication ← Users کاربر را بسازید و «User UID» را اینجا بچسبانید. نقش اولیه کارشناس فروش است؛ پس از افزودن از «ویرایش» تغییر دهید.</p>' +
        '<label>User UID<input type="text" name="uid" dir="ltr" required pattern="[A-Za-z0-9]{10,}" title="فقط حروف و عدد"></label>' +
        '<label>نام و نام خانوادگی<input type="text" name="name" required maxlength="60"></label>' +
        '<button type="submit" class="pn-primary">افزودن</button></form>' : '') + '</section>';
  }
  function editForm(u) {
    var self = u.id === S.user.uid;
    var regs = Object.keys(REGIONS).map(function (g) {
      return '<fieldset><legend>' + esc(g) + '</legend>' + REGIONS[g].map(function (p) {
        return '<label class="pn-check"><input type="checkbox" name="reg" value="' + esc(p) + '"' + ((u.regions || []).indexOf(p) >= 0 ? ' checked' : '') + '><span>' + esc(p) + '</span></label>';
      }).join('') + '</fieldset>';
    }).join('');
    return '<div class="pn-bar"><h2 id="dlgName">ویرایش ' + esc(u.name || 'کاربر') + '</h2><button type="button" class="pn-x" data-close aria-label="بستن">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>' +
      '<form id="editForm" class="pn-edit" data-id="' + esc(u.id) + '">' +
      '<label>نام و نام خانوادگی<input type="text" name="name" value="' + esc(u.name || '') + '" maxlength="60" required' + (can('people') ? '' : ' disabled') + '></label>' +
      '<label>تلفن<input type="tel" name="phone" dir="ltr" value="' + esc(u.phone || '') + '" maxlength="30"' + (can('people') ? '' : ' disabled') + '></label>' +
      (can('roleAdmin') ? '<fieldset class="pn-seg"><legend>نقش</legend>' + MSRoles.ORDER.map(function (r) {
        return '<label><input type="radio" name="role" value="' + r + '"' + (MSRoles.norm(u.role) === r ? ' checked' : '') + (self ? ' disabled' : '') + '><span>' + esc(MSRoles.label(r)) + '</span></label>';
      }).join('') + '</fieldset>' : '<p class="pn-note">نقش: ' + esc(MSRoles.label(u.role)) + ' (تغییر نقش فقط با مدیرعامل یا مدیریت عمومی است)</p>') +
      // fields that belong to one kind of role only; the block follows the chosen role
      (can('roleAdmin') ? '<div data-field="code"' + (MSRoles.hasField(u.role, 'code') ? '' : ' hidden') + '><label>کد برای شمارهٔ سند (حروف و عدد لاتین)<input type="text" name="code" dir="ltr" value="' + esc(u.code || '') + '" maxlength="6" pattern="[A-Za-z0-9]*"></label></div>' : '') +
      (can('people') ? '<label class="pn-check"><input type="checkbox" name="active"' + (u.active === false ? '' : ' checked') + (self ? ' disabled' : '') + '><span>حساب فعال است</span></label>' : '') +
      (can('territory') ? '<div data-field="territory"' + (MSRoles.hasField(u.role, 'territory') ? '' : ' hidden') + '><h3>استان‌های منطقهٔ فعالیت</h3>' + regs +
      '<label>شهرها و توضیحات منطقه<textarea name="cities" rows="3" maxlength="400" placeholder="مثلاً: تبریز، مراغه، اهر">' + esc(u.cities || '') + '</textarea></label></div>' : '') +
      (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<button type="submit" class="pn-primary">ذخیره</button>' +
      (canDelete(u, self) ? '<div class="pn-danger-zone"><p class="pn-note">حذف، دسترسی این حساب را می‌بندد. پیش‌فاکتورهای صادرشدهٔ او می‌ماند. حساب ورود را هم از Firebase ← Authentication حذف کنید.</p>' +
        '<button type="button" class="pn-danger" data-del="' + esc(u.id) + '">حذف کاربر</button></div>' : '') + '</form>';
  }
  function canDelete(u, self) {
    if (self || !can('userDelete')) return false;
    var r = MSRoles.norm(u.role);
    return can('roleAdmin') || (r !== 'manager' && r !== 'ceo');   // hr never removes management or the CEO (the rules say the same)
  }
  function render() { root.innerHTML = view(); paintMap(); }

  // ----- actions
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-out]')) { auth.signOut(); return; }
    var cy = e.target.closest('[data-comm-year]');
    if (cy) { S.comm.year = cy.getAttribute('data-comm-year'); S.comm.doc = null; S.comm.results = []; S.comm.mdoc = null; S.comm.mres = []; S.comm.msg = ''; S.comm.error = ''; render(); loadComm(); return; }
    var dl = e.target.closest('[data-del]');
    if (dl) {
      if (dl.getAttribute('data-armed') !== '1') { dl.setAttribute('data-armed', '1'); dl.textContent = 'برای حذف قطعی دوباره بزنید'; return; }
      var did = dl.getAttribute('data-del');
      dl.disabled = true;
      db.collection('users').doc(did).delete().then(function () { dlg.close(); S.msg = 'کاربر حذف شد.'; load(); }, function (err) { S.error = errText(err); dlg.innerHTML = editForm(S.team.filter(function (x) { return x.id === did; })[0] || { id: did }); });
      return;
    }
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
    } else if (f.id === 'addForm') {
      db.collection('users').doc(v('uid')).set({ name: v('name'), role: 'visitor', active: true, regions: [], cities: '' }).then(function () { load(); }, function (err) { S.error = errText(err); render(); });
    } else if (f.id === 'editForm') {
      var id = f.getAttribute('data-id'), self = id === S.user.uid;
      var data = {};   // only the fields this role is allowed to change, so the rules see no foreign key
      if (can('people')) { data.name = v('name'); data.phone = v('phone'); if (!self) data.active = f.elements.active.checked; }
      var known = S.team.filter(function (x) { return x.id === id; })[0] || {};
      var roleNow = known.role, picked = f.querySelector('input[name=role]:checked');
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

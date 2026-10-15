// Customer database: one record per customer (the accounting code is the id), a page for each customer, and an import that
// reads the accounting "فروش" reports. Visitors only ever receive their own customers (the rules enforce it, not this file).
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('cu');
  if (!root) return;
  if (!cfg || !window.firebase) { root.innerHTML = '<p class="cu-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var faInt = new Intl.NumberFormat('fa-IR'), faPct = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });
  var W = window.MaxSilverWorkbook;

  var S = { user: null, profile: null, loading: true, error: '', msg: '', list: [], groups: {}, years: [], latest: 0,
    q: '', fGroup: '', fStatus: 'all', sort: 'latest', shown: 60, invoices: null, users: null, busy: false, imp: null, impOpen: false, owner: null };

  // ---------- text helpers
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function latinDigits(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); }
  function faDigits(s) { return String(s == null ? '' : s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); }
  function fixLetters(s) { return String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ۀ/g, 'ه').replace(/[‌‏‎]/g, ' ').replace(/[ـ]/g, '').replace(/[\s ]+/g, ' ').trim(); }
  function norm(s) { return latinDigits(fixLetters(s)).toLowerCase(); }
  function amount(n) { return faInt.format(Math.round(n || 0)); }
  function compact(n) {
    n = Math.round(n || 0);
    if (n >= 1e12) return faInt.format(Math.round(n / 1e11) / 10) + ' هزار میلیارد';
    if (n >= 1e9) return faInt.format(Math.round(n / 1e8) / 10) + ' میلیارد';
    if (n >= 1e6) return faInt.format(Math.round(n / 1e5) / 10) + ' میلیون';
    return faInt.format(n);
  }
  function gkey(name) { var h = 5381, s = norm(name); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'g' + (h >>> 0).toString(36); }
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ انجام این کار را ندارید (یا قوانین پایگاه داده هنوز منتشر نشده است).';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  var can = function (area) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, area)); };
  var myName = function () { return (S.profile && S.profile.name) || (S.user && S.user.email) || ''; };

  // ---------- city / province from the title (the accounting titles carry the city in brackets)
  var CITY_PROVINCE = {
    'تهران': 'تهران', 'اسلامشهر': 'تهران', 'ورامین': 'تهران', 'پاکدشت': 'تهران', 'شهریار': 'تهران', 'کرج': 'البرز', 'قم': 'قم',
    'مشهد': 'خراسان رضوی', 'نیشابور': 'خراسان رضوی', 'سبزوار': 'خراسان رضوی', 'بجنورد': 'خراسان شمالی', 'بیرجند': 'خراسان جنوبی',
    'اصفهان': 'اصفهان', 'کاشان': 'اصفهان', 'نجف آباد': 'اصفهان', 'شهرکرد': 'چهارمحال و بختیاری', 'یاسوج': 'کهگیلویه و بویراحمد',
    'اهواز': 'خوزستان', 'دزفول': 'خوزستان', 'آبادان': 'خوزستان', 'ماهشهر': 'خوزستان', 'بهبهان': 'خوزستان', 'خرمشهر': 'خوزستان',
    'بندر عباس': 'هرمزگان', 'بندرعباس': 'هرمزگان', 'کیش': 'هرمزگان', 'شیراز': 'فارس', 'کازرون': 'فارس', 'جهرم': 'فارس', 'لار': 'فارس', 'مرودشت': 'فارس',
    'یزد': 'یزد', 'کرمان': 'کرمان', 'رفسنجان': 'کرمان', 'زاهدان': 'سیستان و بلوچستان', 'چابهار': 'سیستان و بلوچستان',
    'تبریز': 'آذربایجان شرقی', 'ارومیه': 'آذربایجان غربی', 'اردبیل': 'اردبیل', 'زنجان': 'زنجان', 'قزوین': 'قزوین', 'همدان': 'همدان', 'ملایر': 'همدان', 'نهاوند': 'همدان',
    'کرمانشاه': 'کرمانشاه', 'سنندج': 'کردستان', 'ایلام': 'ایلام', 'خرم آباد': 'لرستان', 'بروجرد': 'لرستان', 'اراک': 'مرکزی', 'ساوه': 'مرکزی',
    'رشت': 'گیلان', 'آمل': 'مازندران', 'ساری': 'مازندران', 'بابل': 'مازندران', 'قائم شهر': 'مازندران', 'گرگان': 'گلستان', 'سمنان': 'سمنان', 'دامغان': 'سمنان',
    'بوشهر': 'بوشهر', 'گناوه': 'بوشهر'
  };
  function provinceOf(city) {
    if (!city) return '';
    if (CITY_PROVINCE[city]) return CITY_PROVINCE[city];
    if (W && W.regionByProvince && W.regionByProvince[city]) return city;
    return '';
  }
  function regionOf(prov) { return prov && W && W.regionByProvince ? (W.regionByProvince[prov] || '') : ''; }
  function isCity(t) { return !!(CITY_PROVINCE[t] || (W && W.regionByProvince && W.regionByProvince[t])); }
  // "پرویزی (کازرون)" -> { name: 'پرویزی', city: 'کازرون' };  "(تهران)'مهرداد" is a known malformed form
  function parseTitle(raw) {
    var s = fixLetters(raw), city = '';
    var lead = /^\(\s*([^)]+?)\s*\)\s*['’`]?\s*(.+)$/.exec(s);
    if (lead && isCity(lead[1])) { city = lead[1]; s = lead[2]; }
    if (!city) {
      var re = /\(\s*([^()]+?)\s*\)/g, m;
      while ((m = re.exec(s))) { if (isCity(m[1])) { city = m[1]; s = (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)); break; } }
    }
    s = s.replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').trim();
    if (!city) {
      var words = s.split(' ');
      if (words.length > 1 && isCity(words[words.length - 1])) city = words[words.length - 1];
    }
    return { name: s || fixLetters(raw), city: city };
  }

  // ---------- derived values
  function statusOf(c, latest) {
    var y = c.sales || {}, prev = latest - 1, keys = Object.keys(y).map(Number).filter(function (k) { return y[k] > 0; });
    if (!keys.length) return 'idle';
    var has = function (k) { return (y[k] || 0) > 0; };
    if (has(latest)) return keys.every(function (k) { return k === latest; }) ? 'new' : 'active';
    if (has(prev)) return 'atrisk';
    return 'lost';
  }
  var STATUS = { active: 'فعال', 'new': 'جدید', atrisk: 'در معرض ریزش', lost: 'غیرفعال', idle: 'بدون فروش' };
  function enrich() {
    var yrs = {};
    S.list.forEach(function (c) { Object.keys(c.sales || {}).forEach(function (k) { yrs[k] = 1; }); });
    S.years = Object.keys(yrs).map(Number).sort();
    S.latest = S.years.length ? S.years[S.years.length - 1] : 0;
    var tot = {};
    S.list.forEach(function (c) {
      c._key = norm([c.name, c.code, c.city, c.group].join(' '));
      c._nameKey = norm(c.name);
      c._status = statusOf(c, S.latest);
      c._latest = (c.sales || {})[S.latest] || 0;
      c._prev = (c.sales || {})[S.latest - 1] || 0;
      c._total = Object.keys(c.sales || {}).reduce(function (a, k) { return a + (c.sales[k] || 0); }, 0);
      Object.keys(c.sales || {}).forEach(function (k) { tot[k] = (tot[k] || 0) + (c.sales[k] || 0); });
    });
    S.yearTotals = tot;
    // rank inside each year
    S.rank = {};
    S.years.forEach(function (y) {
      var arr = S.list.filter(function (c) { return (c.sales || {})[y] > 0; }).sort(function (a, b) { return b.sales[y] - a.sales[y]; });
      arr.forEach(function (c, i) { (S.rank[c.code] = S.rank[c.code] || {})[y] = { n: i + 1, of: arr.length }; });
    });
  }

  // ---------- data
  function load() {
    S.loading = true; S.error = ''; render();
    db.collection('users').doc(S.user.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false) return null;
      var col = db.collection('customers');
      var q = can('customerAll') ? col : col.where('ownerUid', '==', S.user.uid);
      var jobs = [q.get()];
      if (can('customerAll')) jobs.push(db.collection('customer_groups').get());
      return Promise.all(jobs).then(function (res) {
        S.list = []; res[0].forEach(function (s) { var d = s.data(); d.code = d.code || s.id; S.list.push(d); });
        S.groups = {}; if (res[1]) res[1].forEach(function (s) { S.groups[s.id] = s.data(); });
        enrich();
      });
    }).then(null, function (e) { S.error = errText(e); }).then(function () { S.loading = false; render(); if (S.profile && S.user) loadInvoices().then(render); });
  }
  function loadInvoices() {
    if (S.invoices) return Promise.resolve();
    var col = db.collection('invoices'), q = can('invoices') ? col : col.where('ownerUid', '==', S.user.uid);
    return q.get().then(function (qs) { S.invoices = []; qs.forEach(function (s) { S.invoices.push(s.data()); }); }, function () { S.invoices = []; });
  }
  function invoicesOf(c) {
    return (S.invoices || []).filter(function (d) {
      var n = norm(d.customer || '');
      return d.customerCode === c.code || (n && (n === c._nameKey || (c._nameKey.length >= 5 && (n.indexOf(c._nameKey) >= 0 || c._nameKey.indexOf(n) >= 0 && n.length >= 5))));
    }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  }
  function itemsOf(invs) {
    var by = {};
    invs.forEach(function (d) {
      (d.lines || []).forEach(function (l) {
        var k = l.id || l.name, o = by[k] = by[k] || { name: l.name, code: l.code, qty: 0, sum: 0, unit: d.unit, last: 0 };
        o.qty += l.qty || 0; o.sum += (l.qty || 0) * (l.price || 0); o.last = Math.max(o.last, d.createdAt || 0);
      });
    });
    return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.sum - a.sum; });
  }

  // ---------- list
  function filtered() {
    var q = norm(S.q);
    var list = S.list.filter(function (c) {
      if (S.fStatus !== 'all' && c._status !== S.fStatus) return false;
      if (S.fGroup === '__none') { if (c.group) return false; } else if (S.fGroup && c.group !== S.fGroup) return false;
      return !q || c._key.indexOf(q) >= 0;
    });
    list.sort(function (a, b) {
      if (S.sort === 'name') return String(a.name).localeCompare(String(b.name), 'fa');
      if (S.sort === 'total') return b._total - a._total;
      return b._latest - a._latest || b._total - a._total;
    });
    return list;
  }
  function bars(c, h) {
    var max = Math.max.apply(null, S.years.map(function (y) { return (c.sales || {})[y] || 0; }).concat([1]));
    return '<span class="cu-spark" aria-hidden="true">' + S.years.map(function (y) {
      return '<i style="height:' + Math.max(2, Math.round(((c.sales || {})[y] || 0) / max * (h || 26))) + 'px"></i>';
    }).join('') + '</span>';
  }
  function card(c) {
    var chg = c._prev > 0 ? (c._latest - c._prev) / c._prev * 100 : null;
    return '<li><a class="cu-card" href="#/c/' + encodeURIComponent(c.code) + '">' +
      '<div class="cu-card-top"><b>' + esc(c.name) + '</b><span class="cu-chip st-' + c._status + '">' + STATUS[c._status] + '</span></div>' +
      '<div class="cu-card-meta"><span dir="ltr">' + esc(c.code) + '</span>' + (c.city ? '<span>' + esc(c.city) + '</span>' : '') + (c.group ? '<span>' + esc(c.group) + '</span>' : '') + '</div>' +
      '<div class="cu-card-sales">' + bars(c) + '<span><small>فروش ' + faDigits(S.latest) + '</small><b>' + compact(c._latest) + '</b></span>' +
      (chg === null ? '' : '<em class="' + (chg >= 0 ? 'up' : 'down') + '">' + (chg >= 0 ? '▲' : '▼') + ' ' + faPct.format(Math.abs(chg)) + '٪</em>') + '</div></a></li>';
  }
  function listHtml() {
    var list = filtered(), part = list.slice(0, S.shown);
    return (part.length ? part.map(card).join('') : '<li class="cu-note">مشتری مطابق این فیلتر پیدا نشد.</li>') +
      (list.length > part.length ? '<li class="cu-more"><button type="button" class="cu-btn" data-more>نمایش بیشتر (' + faInt.format(list.length - part.length) + ')</button></li>' : '');
  }
  function paintList() {
    var el = document.getElementById('cuList'), cnt = document.getElementById('cuCount');
    if (el) el.innerHTML = listHtml();
    if (cnt) cnt.textContent = faInt.format(filtered().length) + ' مشتری';
  }
  function groupNames() {
    var by = {};
    S.list.forEach(function (c) { var g = c.group || ''; by[g] = (by[g] || 0) + 1; });
    return by;
  }
  function listView() {
    var act = S.list.filter(function (c) { return c._status === 'active' || c._status === 'new'; });
    var gn = groupNames(), names = Object.keys(gn).filter(Boolean).sort(function (a, b) { return gn[b] - gn[a]; });
    var statuses = ['all', 'active', 'new', 'atrisk', 'lost', 'idle'];
    var cnt = function (s) { return s === 'all' ? S.list.length : S.list.filter(function (c) { return c._status === s; }).length; };
    var kpi = '<div class="cu-kpis">' +
      '<div><span>مشتری فعال ' + faDigits(S.latest || '') + '</span><b>' + faInt.format(act.length) + '</b></div>' +
      '<div><span>فروش ' + faDigits(S.latest || '') + '</span><b>' + compact((S.yearTotals || {})[S.latest] || 0) + '</b></div>' +
      '<div><span>مشتری جدید</span><b>' + faInt.format(cnt('new')) + '</b></div>' +
      '<div><span>در معرض ریزش</span><b>' + faInt.format(cnt('atrisk')) + '</b></div></div>';
    var statusChips = statuses.map(function (s) {
      return '<button type="button" class="cu-fchip" data-status="' + s + '" aria-pressed="' + (S.fStatus === s) + '">' + (s === 'all' ? 'همه' : STATUS[s]) + ' <b>' + faInt.format(cnt(s)) + '</b></button>';
    }).join('');
    var groupChips = '<button type="button" class="cu-fchip" data-group="" aria-pressed="' + (S.fGroup === '') + '">همهٔ گروه‌ها</button>' + names.map(function (g) {
      return '<button type="button" class="cu-fchip" data-group="' + esc(g) + '" aria-pressed="' + (S.fGroup === g) + '">' + esc(g) + ' <b>' + faInt.format(gn[g]) + '</b></button>';
    }).join('') + (gn[''] ? '<button type="button" class="cu-fchip" data-group="__none" aria-pressed="' + (S.fGroup === '__none') + '">بدون گروه <b>' + faInt.format(gn['']) + '</b></button>' : '');
    var sorts = [['latest', 'فروش سال جاری'], ['total', 'مجموع فروش'], ['name', 'نام']].map(function (s) {
      return '<button type="button" class="cu-fchip sm" data-sort="' + s[0] + '" aria-pressed="' + (S.sort === s[0]) + '">' + s[1] + '</button>';
    }).join('');
    return head('مشتریان') + kpi +
      '<section class="cu-card-box">' +
      '<label class="cu-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<input type="search" id="cuQ" placeholder="جست‌وجو: نام، کد، شهر یا گروه" value="' + esc(S.q) + '" autocomplete="off"></label>' +
      '<div class="cu-fchips" role="group" aria-label="وضعیت">' + statusChips + '</div>' +
      (S.groupFilterVisible !== false && names.length ? '<div class="cu-fchips scroll" role="group" aria-label="گروه">' + groupChips + '</div>' : '') +
      '<div class="cu-sortrow"><span id="cuCount">' + faInt.format(filtered().length) + ' مشتری</span><span class="cu-sorts">' + sorts + '</span></div>' +
      '<ul class="cu-list" id="cuList">' + listHtml() + '</ul></section>' +
      (can('customerAssign') ? groupsView() : '') +
      (can('customerImport') ? importView() : '');
  }
  function head(title, back) {
    return '<header class="cu-head"><div>' + (back ? '<a class="cu-back" href="#/" aria-label="بازگشت به فهرست">‹ مشتریان</a>' : '') + '<h1>' + esc(title) + '</h1>' +
      (back ? '' : '<p>پایگاه مشتریان؛ هر مشتری صفحهٔ خودش را دارد.' + (can('customerAll') ? '' : ' فقط مشتریان خودتان نمایش داده می‌شود.') + '</p>') + '</div>' +
      (back ? '' : '<a class="cu-btn ghost" href="./sales-analysis.html" data-manager-only="analysis">تحلیل مجموعهٔ فروش</a>') + '</header>';
  }

  // ---------- groups and owners
  function groupsView() {
    var gn = groupNames(), names = Object.keys(gn).filter(Boolean).sort(function (a, b) { return gn[b] - gn[a]; });
    if (!names.length) return '';
    return '<section class="cu-card-box" id="groups"><h2>گروه‌ها و مسئول</h2><p class="cu-note">هر گروه یک همکار یا شخص مسئول دارد. با تعیین مسئول، همهٔ مشتریان آن گروه برای او در «مشتریان» دیده می‌شود و همکاران دیگر آن‌ها را نمی‌بینند.</p>' +
      '<ul class="cu-glist">' + names.map(function (g) {
        var sum = S.list.filter(function (c) { return c.group === g; }).reduce(function (a, c) { return a + c._latest; }, 0);
        var info = S.groups[gkey(g)] || {};
        return '<li><div><b>' + esc(g) + '</b><span>' + faInt.format(gn[g]) + ' مشتری · فروش ' + faDigits(S.latest) + ': ' + compact(sum) + '</span></div>' +
          '<div class="cu-owner">' + (info.ownerName ? '<span class="cu-chip ok">' + esc(info.ownerName) + '</span>' : '<span class="cu-chip">مسئول تعیین نشده</span>') +
          '<button type="button" class="cu-btn small" data-owner-group="' + esc(g) + '">تعیین مسئول</button></div></li>';
      }).join('') + '</ul></section>';
  }
  function loadUsers() {
    if (S.users) return Promise.resolve();
    return db.collection('users').get().then(function (qs) {
      S.users = [];
      qs.forEach(function (s) { var d = s.data(); if (d.active !== false) S.users.push({ id: s.id, name: d.name || d.email || s.id, role: d.role }); });
      S.users.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'fa'); });
    }, function () { S.users = []; });
  }
  var dlg = document.createElement('dialog');
  dlg.className = 'cu-dialog';
  document.body.appendChild(dlg);
  function ownerDialog(target) {
    S.owner = target;
    loadUsers().then(function () {
      dlg.innerHTML = '<div class="cu-dbar"><h2>مسئول «' + esc(target.label) + '»</h2><button type="button" class="cu-x" data-close aria-label="بستن">✕</button></div>' +
        '<p class="cu-note">' + (target.group ? 'همهٔ مشتریان این گروه به این نفر داده می‌شود.' : 'این مشتری به این نفر داده می‌شود و با تغییر مسئول گروه عوض نمی‌شود.') + '</p>' +
        '<ul class="cu-ulist">' + S.users.map(function (u) {
          return '<li><button type="button" data-pick-owner="' + esc(u.id) + '"><b>' + esc(u.name) + '</b><span>' + esc(window.MSRoles ? window.MSRoles.label(u.role) : u.role) + '</span></button></li>';
        }).join('') + '<li><button type="button" data-pick-owner="" class="clear"><b>بدون مسئول</b><span>برداشتن مسئول</span></button></li></ul><p class="cu-err" id="cuDErr" hidden></p>';
      if (!dlg.open) dlg.showModal();
    });
  }
  function assignOwner(uid) {
    var t = S.owner, u = S.users.filter(function (x) { return x.id === uid; })[0], b = db.batch(), now = Date.now();
    var ownerName = u ? u.name : '';
    if (t.group) {
      b.set(db.collection('customer_groups').doc(gkey(t.group)), { name: t.group, ownerUid: uid, ownerName: ownerName, updatedAt: now }, { merge: true });
      S.list.forEach(function (c) { if (c.group === t.group && !c.ownerLocked) b.update(db.collection('customers').doc(c.code), { ownerUid: uid, ownerName: ownerName, updatedAt: now }); });
    } else {
      b.update(db.collection('customers').doc(t.code), { ownerUid: uid, ownerName: ownerName, ownerLocked: !!uid, updatedAt: now });
    }
    return b.commit().then(function () {
      S.list.forEach(function (c) {
        if ((t.group && c.group === t.group && !c.ownerLocked) || (!t.group && c.code === t.code)) { c.ownerUid = uid; c.ownerName = ownerName; if (!t.group) c.ownerLocked = !!uid; }
      });
      if (t.group) S.groups[gkey(t.group)] = Object.assign({}, S.groups[gkey(t.group)], { name: t.group, ownerUid: uid, ownerName: ownerName });
      dlg.close(); render();
    }, function (e) { var el = dlg.querySelector('#cuDErr'); if (el) { el.textContent = errText(e); el.hidden = false; } });
  }

  // ---------- one customer
  function yearBars(c) {
    var max = Math.max.apply(null, S.years.map(function (y) { return (c.sales || {})[y] || 0; }).concat([1]));
    return '<div class="cu-years">' + S.years.map(function (y, i) {
      var v = (c.sales || {})[y] || 0, pv = i ? (c.sales || {})[S.years[i - 1]] || 0 : 0;
      var chg = i && pv > 0 ? (v - pv) / pv * 100 : null, r = (S.rank[c.code] || {})[y], tot = (S.yearTotals || {})[y] || 0;
      return '<div class="cu-year"><div class="cu-bar"><i style="height:' + Math.max(3, Math.round(v / max * 100)) + '%"></i></div>' +
        '<b>' + compact(v) + '</b><span>' + faDigits(y) + (y === S.latest ? ' (تا امروز)' : '') + '</span>' +
        (chg === null ? '' : '<em class="' + (chg >= 0 ? 'up' : 'down') + '">' + (chg >= 0 ? '▲' : '▼') + ' ' + faPct.format(Math.abs(chg)) + '٪</em>') +
        (v > 0 && tot ? '<small>سهم ' + faInt.format(Math.round(v / tot * 1000) / 10) + '٪' + (r ? ' · رتبهٔ ' + faInt.format(r.n) + ' از ' + faInt.format(r.of) : '') + '</small>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function detailView(code) {
    var c = S.list.filter(function (x) { return x.code === code; })[0];
    if (!c) return head('مشتری پیدا نشد', true) + '<p class="cu-note">این مشتری وجود ندارد یا برای شما قابل مشاهده نیست.</p>';
    var prov = c.province || provinceOf(c.city), reg = c.region || regionOf(prov);
    var invs = invoicesOf(c), items = itemsOf(invs);
    var fact = function (l, v) { return '<div class="cu-fact"><dt>' + l + '</dt><dd>' + (v ? esc(v) : '<i>ثبت نشده</i>') + '</dd></div>'; };
    var edit = can('customerEdit') || (S.user && c.ownerUid === S.user.uid);
    return head(c.name, true) +
      '<section class="cu-card-box cu-top"><div class="cu-top-row"><span class="cu-chip st-' + c._status + '">' + STATUS[c._status] + '</span><span class="cu-chip" dir="ltr">' + esc(c.code) + '</span>' +
      (c.ownerName ? '<span class="cu-chip ok">مسئول: ' + esc(c.ownerName) + '</span>' : '') + '</div>' +
      '<dl class="cu-facts">' + fact('گروه (همکار مسئول)', c.group) + fact('شهر', c.city) + fact('استان', prov) + fact('منطقه فروش', reg) +
      fact('آخرین سال خرید', (function () { var ys = S.years.filter(function (y) { return (c.sales || {})[y] > 0; }); return ys.length ? faDigits(ys[ys.length - 1]) : ''; })()) +
      fact('مجموع فروش ثبت‌شده', c._total ? amount(c._total) : '') + '</dl>' +
      (can('customerAssign') ? '<button type="button" class="cu-btn small" data-owner-customer="' + esc(c.code) + '">تغییر مسئول این مشتری</button>' : '') + '</section>' +
      '<section class="cu-card-box"><h2>خرید در سال‌ها</h2>' + yearBars(c) +
      '<p class="cu-note">مبلغ‌ها همان عددهای گزارش حسابداری هستند؛ واحد پول در گزارش مشخص نشده است. سال ' + faDigits(S.latest) + ' هنوز تمام نشده است.</p></section>' +
      '<section class="cu-card-box"><h2>اطلاعات تماس</h2><form id="cuForm" data-code="' + esc(c.code) + '"><div class="cu-grid">' +
      '<label>تلفن<input type="tel" name="phone" dir="ltr" inputmode="numeric" maxlength="15" value="' + esc(faDigits(c.phone || '')) + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label>شخص تماس<input type="text" name="contact" maxlength="80" value="' + esc(c.contact || '') + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label class="full">نشانی<input type="text" name="address" maxlength="300" value="' + esc(c.address || '') + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label class="full">یادداشت<textarea name="notes" rows="3" maxlength="800"' + (edit ? '' : ' disabled') + '>' + esc(c.notes || '') + '</textarea></label></div>' +
      (S.msg ? '<p class="cu-ok" role="status">' + esc(S.msg) + '</p>' : '') + (S.error ? '<p class="cu-err" role="alert">' + esc(S.error) + '</p>' : '') +
      (edit ? '<button type="submit" class="cu-btn primary">ذخیرهٔ اطلاعات</button>' : '') + '</form></section>' +
      '<section class="cu-card-box"><h2>پیش‌فاکتورهای ثبت‌شده در برنامه</h2>' +
      (S.invoices === null ? '<p class="cu-note">در حال بارگذاری…</p>' : invs.length ? '<ul class="cu-inv">' + invs.slice(0, 30).map(function (d) {
        var tot = 0; (d.lines || []).forEach(function (l) { tot += (l.qty || 0) * (l.price || 0); });
        var net = tot - (d.discMode === 'pct' ? tot * Math.min(d.discount || 0, 100) / 100 : Math.min(d.discount || 0, tot));
        return '<li><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(faDigits(d.date || '')) + ' · ' + esc(d.ownerName || d.issuer || '') + '</span><em>' + amount(net * (1 + (d.tax || 0) / 100)) + ' ' + esc(d.unit || '') + '</em></li>';
      }).join('') + '</ul>' : '<p class="cu-note">هنوز پیش‌فاکتوری برای این مشتری در برنامه ثبت نشده است.</p>') + '</section>' +
      '<section class="cu-card-box"><h2>کالاهای خریداری‌شده</h2>' +
      (items.length ? '<div class="cu-tablewrap"><table class="cu-tbl"><thead><tr><th>کالا</th><th>تعداد</th><th>مبلغ</th></tr></thead><tbody>' + items.slice(0, 40).map(function (it) {
        return '<tr><td>' + esc(it.name || '') + (it.code ? '<small dir="ltr">' + esc(it.code) + '</small>' : '') + '</td><td>' + faInt.format(it.qty) + '</td><td>' + amount(it.sum) + ' ' + esc(it.unit || '') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="cu-note">این فهرست فقط از پیش‌فاکتورهای ثبت‌شده در این برنامه ساخته می‌شود.</p>'
        : '<p class="cu-note">گزارش‌های حسابداری فعلی فقط جمع فروش هر مشتری را دارند و کالاهای هر مشتری در آن‌ها نیست. با ثبت پیش‌فاکتور در برنامه، کالاهای این مشتری اینجا دیده می‌شود؛ برای داشتن سابقهٔ قبل از آن، باید گزارش «فروش به تفکیک مشتری و کالا» از نرم‌افزار حسابداری گرفته شود.</p>') + '</section>';
  }

  // ---------- import of the accounting reports
  function importView() {
    var im = S.imp, body = '';
    if (!S.impOpen) return '<section class="cu-card-box"><h2>ورود اطلاعات از گزارش حسابداری</h2><p class="cu-note">گزارش‌های «فروش ۱۴۰۳ / ۱۴۰۴ / ۱۴۰۵» را وارد کنید تا مشتریان ساخته یا به‌روز شوند. فایل‌ها فقط در مرورگر شما خوانده می‌شوند.</p><button type="button" class="cu-btn" data-imp-open>شروع ورود اطلاعات</button></section>';
    body += '<label class="cu-file"><input type="file" id="cuFiles" accept=".xls,.xlsx" multiple><span>انتخاب فایل‌های فروش مشتریان (نام فایل باید سال داشته باشد)</span></label>';
    if (S.busy && !im) body += '<p class="cu-note">در حال خواندن…</p>';
    if (im && im.error) body += '<p class="cu-err">' + esc(im.error) + '</p>';
    if (im && im.rows) {
      body += '<div class="cu-kpis"><div><span>مشتری در فایل‌ها</span><b>' + faInt.format(im.rows.length) + '</b></div><div><span>جدید</span><b>' + faInt.format(im.fresh) + '</b></div>' +
        '<div><span>موجود (به‌روزرسانی)</span><b>' + faInt.format(im.rows.length - im.fresh) + '</b></div><div><span>بدون گروه</span><b>' + faInt.format(im.blank) + '</b></div></div>' +
        '<ul class="cu-imp">' + im.files.map(function (f) { return '<li><b>' + esc(f.name) + '</b><span>سال ' + faDigits(f.year) + ' · ' + faInt.format(f.rows) + ' ردیف · ردیف جمع حذف شد: ' + faInt.format(f.skipped) + '</span></li>'; }).join('') + '</ul>' +
        (im.renamed.length ? '<p class="cu-note">نام این کدها در سال‌ها متفاوت است؛ نام سال جدیدتر نگه داشته می‌شود: ' + esc(im.renamed.slice(0, 6).join('، ')) + '</p>' : '') +
        '<button type="button" class="cu-btn primary" data-imp-save' + (S.busy ? ' disabled' : '') + '>ذخیره در پایگاه مشتریان</button>';
    }
    if (im && im.done) body += '<p class="cu-ok" role="status">' + esc(im.done) + '</p>';
    return '<section class="cu-card-box" id="import"><h2>ورود اطلاعات از گزارش حسابداری</h2>' + body + '</section>';
  }
  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = './assets/vendor/xlsx.full.min.js';
      s.onload = function () { resolve(window.XLSX); }; s.onerror = function () { reject(new Error('کتابخانهٔ خواندن Excel بارگذاری نشد.')); };
      document.head.appendChild(s);
    });
  }
  function readFiles(files) {
    S.busy = true; S.imp = null; render();
    return ensureXlsx().then(function (XLSX) {
      return Promise.all(Array.prototype.map.call(files, function (f) {
        return W.parseFile(f, XLSX).then(function (p) { return { f: f, p: p }; });
      }));
    }).then(function (res) {
      var by = {}, info = [], names = {}, renamed = {};
      res.forEach(function (r) {
        if (r.p.kind !== 'customers') throw new Error(r.f.name + ': این فایل گزارش فروش مشتریان نیست.');
        var yr = r.p.records[0] && r.p.records[0].year;
        info.push({ name: r.f.name, year: yr, rows: r.p.records.length, skipped: r.p.skippedNoCode });
        r.p.records.forEach(function (rec) {
          var code = String(rec.customerCode).trim(), o = by[code] = by[code] || { code: code, sales: {}, _y: 0 };
          o.sales[rec.year] = Math.round(rec.amount || 0);
          var nm = fixLetters(rec.customerName);
          if (names[code] && names[code] !== nm && rec.year >= (o._y || 0)) renamed[code] = nm;
          if (rec.year >= (o._y || 0)) { o._y = rec.year; o._name = nm; if (rec.customerGroup) o._group = fixLetters(rec.customerGroup); }
          names[code] = nm;
          if (!o._group && rec.customerGroup) o._group = fixLetters(rec.customerGroup);
        });
      });
      var have = {}; S.list.forEach(function (c) { have[c.code] = 1; });
      var rows = Object.keys(by).map(function (k) {
        var o = by[k], t = parseTitle(o._name || ''), prov = provinceOf(t.city);
        return { code: k, name: t.name, city: t.city, province: prov, region: regionOf(prov), group: o._group || '', sales: o.sales };
      });
      S.imp = { rows: rows, files: info, fresh: rows.filter(function (r) { return !have[r.code]; }).length, blank: rows.filter(function (r) { return !r.group; }).length,
        renamed: Object.keys(renamed).map(function (k) { return k + ': ' + renamed[k]; }) };
    }).then(null, function (e) { S.imp = { error: e && e.message || 'خواندن فایل انجام نشد.' }; })
      .then(function () { S.busy = false; render(); });
  }
  function saveImport() {
    var im = S.imp; if (!im || !im.rows || S.busy) return;
    S.busy = true; render();
    var now = Date.now(), groupOwner = {};
    Object.keys(S.groups).forEach(function (k) { if (S.groups[k].ownerUid) groupOwner[S.groups[k].name] = S.groups[k]; });
    var ops = [];
    im.rows.forEach(function (r) {
      var doc = { code: r.code, name: r.name, city: r.city, province: r.province, region: r.region, group: r.group, sales: r.sales, importedAt: now, updatedAt: now };
      var go = groupOwner[r.group];
      if (go) { doc.ownerUid = go.ownerUid; doc.ownerName = go.ownerName; }
      ops.push([db.collection('customers').doc(r.code), doc]);
    });
    var groups = {}; im.rows.forEach(function (r) { if (r.group) groups[r.group] = 1; });
    Object.keys(groups).forEach(function (g) { ops.push([db.collection('customer_groups').doc(gkey(g)), { name: g, updatedAt: now }]); });
    var chunks = [], i;
    for (i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
    chunks.reduce(function (p, ch) {
      return p.then(function () { var b = db.batch(); ch.forEach(function (o) { b.set(o[0], o[1], { merge: true }); }); return b.commit(); });
    }, Promise.resolve()).then(function () {
      S.imp = { done: faInt.format(im.rows.length) + ' مشتری ذخیره شد.' };
      S.busy = false; S.list = []; load();
    }, function (e) { S.imp = { error: errText(e) }; S.busy = false; render(); });
  }

  // ---------- render and events
  function route() { var m = /^#\/c\/(.+)$/.exec(location.hash || ''); return m ? decodeURIComponent(m[1]) : ''; }
  function view() {
    if (S.loading) return '<p class="cu-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="cu-note">برای دیدن مشتریان ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="cu-note">حساب شما هنوز فعال نشده است.</p>';
    if (S.error) return '<p class="cu-err" role="alert">' + esc(S.error) + '</p>';
    var code = route();
    return code ? detailView(code) : listView();
  }
  function render() {
    var active = document.activeElement, keep = active && active.id === 'cuQ' ? active.selectionStart : null;
    root.innerHTML = view();
    if (window.MSGate) window.MSGate.apply();
    if (keep !== null) { var q = document.getElementById('cuQ'); if (q) { q.focus(); try { q.setSelectionRange(keep, keep); } catch (e) { /* ignore */ } } }
  }
  window.addEventListener('hashchange', function () {
    S.msg = ''; S.error = ''; render(); window.scrollTo(0, 0);
    if (route() && S.user) loadInvoices().then(render);
  });
  document.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-status]'))) { S.fStatus = t.getAttribute('data-status'); S.shown = 60; render(); return; }
    if ((t = e.target.closest('[data-group]'))) { S.fGroup = t.getAttribute('data-group'); S.shown = 60; render(); return; }
    if ((t = e.target.closest('[data-sort]'))) { S.sort = t.getAttribute('data-sort'); render(); return; }
    if (e.target.closest('[data-more]')) { S.shown += 60; paintList(); return; }
    if ((t = e.target.closest('[data-owner-group]'))) { var g = t.getAttribute('data-owner-group'); ownerDialog({ group: g, label: g }); return; }
    if ((t = e.target.closest('[data-owner-customer]'))) { var cc = S.list.filter(function (x) { return x.code === t.getAttribute('data-owner-customer'); })[0]; if (cc) ownerDialog({ code: cc.code, label: cc.name }); return; }
    if ((t = e.target.closest('[data-pick-owner]'))) { assignOwner(t.getAttribute('data-pick-owner')); return; }
    if (e.target.closest('[data-imp-open]')) { S.impOpen = true; render(); return; }
    if (e.target.closest('[data-imp-save]')) { saveImport(); return; }
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'cuQ') { S.q = e.target.value; S.shown = 60; paintList(); }
    if (e.target.name === 'phone' && e.target.form && e.target.form.id === 'cuForm') {
      var d = latinDigits(e.target.value).replace(/\D/g, '').slice(0, 15), shown = faDigits(d);
      if (e.target.value !== shown) e.target.value = shown;
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'cuFiles' && e.target.files && e.target.files.length) readFiles(e.target.files);
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id !== 'cuForm') return;
    e.preventDefault();
    var f = e.target, code = f.getAttribute('data-code'), now = Date.now();
    var upd = { phone: latinDigits(f.elements.phone.value).replace(/\D/g, ''), contact: f.elements.contact.value.trim(), address: f.elements.address.value.trim(), notes: f.elements.notes.value.trim(), updatedAt: now };
    S.msg = ''; S.error = '';
    db.collection('customers').doc(code).update(upd).then(function () {
      var c = S.list.filter(function (x) { return x.code === code; })[0]; if (c) Object.assign(c, upd);
      S.msg = 'ذخیره شد.';
    }, function (err) { S.error = errText(err); }).then(render);
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.list = []; S.invoices = null;
    if (!u) { S.loading = false; render(); return; }
    load();
  });
  render();
})();

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
    if (/network|unavailable|deadline/.test(c)) return 'اتصال برقرار نشد. اینترنت یا VPN را بررسی کنید.';
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

  var isManager = function () { return !!(S.profile && S.profile.role === 'manager' && S.profile.active !== false); };
  var active = function () { return !!(S.profile && S.profile.active !== false); };

  // ----- data
  function load() {
    S.loading = true; S.error = ''; render();
    var uid = S.user.uid;
    db.collection('users').doc(uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      try { localStorage.setItem('ms-role', active() ? (S.profile.role || '') : ''); } catch (x) { /* ignore */ }
      if (!active()) return null;
      var q = isManager() ? db.collection('invoices') : db.collection('invoices').where('ownerUid', '==', uid);
      return Promise.all([q.get(), isManager() ? db.collection('users').get() : null]).then(function (res) {
        S.docs = [];
        res[0].forEach(function (s) { S.docs.push(s.data()); });
        S.docs.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        S.team = [];
        if (res[1]) res[1].forEach(function (s) { var d = s.data(); d.id = s.id; S.team.push(d); });
      });
    }).then(null, function (e) { S.error = errText(e); }).then(function () { S.loading = false; render(); });
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
  function money(n, u) { return faInt.format(Math.round(n)) + ' ' + (u || 'تومان'); }
  function monthTotals(docs) {
    var now = monthKey(Date.now()), by = {};
    docs.forEach(function (d) { if (monthKey(d.createdAt || 0) === now) by[d.unit || 'تومان'] = (by[d.unit || 'تومان'] || 0) + M.totals(d).total; });
    var keys = Object.keys(by);
    return keys.length ? keys.map(function (u) { return money(by[u], u); }).join(' + ') : '—';
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
      '<span class="pn-role">' + (isManager() ? 'مدیر' : 'ویزیتور') + '</span>' + (p.code ? ' <span class="pn-chip" dir="ltr">' + esc(p.code) + '</span>' : '') + '</div>' +
      '<button type="button" class="pn-secondary" data-out>خروج</button></section>';
    out += '<section class="pn-card"><h2>اطلاعات من</h2><form id="meForm">' +
      '<label>نام و نام خانوادگی (روی پیش‌فاکتور چاپ می‌شود)<input type="text" name="name" value="' + esc(p.name || '') + '" maxlength="60" required></label>' +
      '<label>تلفن تماس<input type="tel" name="phone" dir="ltr" value="' + esc(p.phone || '') + '" maxlength="30" inputmode="tel"></label>' +
      (S.msg ? '<p class="pn-ok" role="status">' + esc(S.msg) + '</p>' : '') + (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<button type="submit" class="pn-primary"' + (S.busy ? ' disabled' : '') + '>ذخیرهٔ اطلاعات</button>' +
      '<p class="pn-note">نقش، کد و منطقهٔ فعالیت را مدیر تعیین می‌کند.</p></form></section>';
    out += '<section class="pn-card"><h2>منطقهٔ فعالیت من</h2>' + chips(p) + '</section>';
    out += '<section class="pn-card"><h2>پیش‌فاکتورهای من</h2><div class="pn-stats"><div><span>تعداد کل</span><b>' + faInt.format(mine.length) + '</b></div>' +
      '<div><span>مجموع این ماه (شمسی)</span><b>' + monthTotals(mine) + '</b></div></div>' +
      (mine.length ? '<ul class="pn-list">' + mine.slice(0, 6).map(function (d) {
        return '<li><div><b dir="ltr">' + esc(d.docNo) + '</b><span>' + esc(d.customer || 'بدون نام مشتری') + '</span></div><div><span>' + esc(faDate(d.createdAt)) + '</span><b>' + money(M.totals(d).total, d.unit) + '</b></div></li>';
      }).join('') + '</ul>' : '<p class="pn-note">هنوز پیش‌فاکتوری صادر نکرده‌اید.</p>') +
      '<a class="pn-link" href="./product-catalog.html">رفتن به کاتالوگ و ساخت پیش‌فاکتور</a></section>';
    if (isManager()) out += teamView();
    return out;
  }
  function teamView() {
    var byOwner = {};
    S.docs.forEach(function (d) { (byOwner[d.ownerUid] = byOwner[d.ownerUid] || []).push(d); });
    var rows = S.team.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'fa'); }).map(function (u) {
      var docs = byOwner[u.id] || [];
      return '<li class="pn-user' + (u.active === false ? ' off' : '') + '"><div><b>' + esc(u.name || '—') + '</b>' +
        '<span class="pn-role">' + (u.role === 'manager' ? 'مدیر' : 'ویزیتور') + '</span>' + (u.active === false ? ' <span class="pn-chip off">غیرفعال</span>' : '') +
        '<p class="pn-note">' + faInt.format(docs.length) + ' پیش‌فاکتور · این ماه: ' + monthTotals(docs) + '</p>' +
        '<div class="pn-chips">' + (u.regions || []).map(function (r) { return '<span class="pn-chip">' + esc(r) + '</span>'; }).join('') + '</div>' +
        (u.cities ? '<p class="pn-note">' + esc(u.cities) + '</p>' : '') + '</div>' +
        '<button type="button" class="pn-secondary" data-edit="' + esc(u.id) + '">ویرایش</button></li>';
    }).join('');
    return '<section class="pn-card"><h2>تیم فروش</h2><ul class="pn-users">' + rows + '</ul>' +
      '<form id="addForm" class="pn-add"><h3>افزودن ویزیتور</h3>' +
      '<p class="pn-note">ابتدا در Firebase ← Authentication ← Users کاربر را بسازید و «User UID» را اینجا بچسبانید.</p>' +
      '<label>User UID<input type="text" name="uid" dir="ltr" required pattern="[A-Za-z0-9]{10,}" title="فقط حروف و عدد"></label>' +
      '<label>نام و نام خانوادگی<input type="text" name="name" required maxlength="60"></label>' +
      '<button type="submit" class="pn-primary">افزودن</button></form></section>';
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
      '<label>نام و نام خانوادگی<input type="text" name="name" value="' + esc(u.name || '') + '" maxlength="60" required></label>' +
      '<label>تلفن<input type="tel" name="phone" dir="ltr" value="' + esc(u.phone || '') + '" maxlength="30"></label>' +
      '<fieldset class="pn-seg"><legend>نقش</legend>' +
        '<label><input type="radio" name="role" value="visitor"' + (u.role !== 'manager' ? ' checked' : '') + (self ? ' disabled' : '') + '><span>ویزیتور</span></label>' +
        '<label><input type="radio" name="role" value="manager"' + (u.role === 'manager' ? ' checked' : '') + (self ? ' disabled' : '') + '><span>مدیر</span></label></fieldset>' +
      '<label>کد برای شمارهٔ سند (حروف و عدد لاتین)<input type="text" name="code" dir="ltr" value="' + esc(u.code || '') + '" maxlength="6" pattern="[A-Za-z0-9]*"></label>' +
      '<label class="pn-check"><input type="checkbox" name="active"' + (u.active === false ? '' : ' checked') + (self ? ' disabled' : '') + '><span>حساب فعال است</span></label>' +
      '<h3>استان‌های منطقهٔ فعالیت</h3>' + regs +
      '<label>شهرها و توضیحات منطقه<textarea name="cities" rows="3" maxlength="400" placeholder="مثلاً: تبریز، مراغه، اهر">' + esc(u.cities || '') + '</textarea></label>' +
      (S.error ? '<p class="pn-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<button type="submit" class="pn-primary">ذخیره</button></form>';
  }
  function render() { root.innerHTML = view(); }

  // ----- actions
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-out]')) { auth.signOut(); return; }
    var ed = e.target.closest('[data-edit]');
    if (ed) {
      var u = S.team.filter(function (x) { return x.id === ed.getAttribute('data-edit'); })[0];
      if (u) { S.error = ''; dlg.innerHTML = editForm(u); dlg.showModal(); }
      return;
    }
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
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
      var data = {
        name: v('name'), phone: v('phone'), code: v('code').toUpperCase(), cities: v('cities'),
        regions: Array.prototype.map.call(f.querySelectorAll('input[name=reg]:checked'), function (c) { return c.value; })
      };
      if (!self) { data.role = f.querySelector('input[name=role]:checked').value; data.active = f.elements.active.checked; }
      db.collection('users').doc(id).set(data, { merge: true }).then(function () { dlg.close(); load(); }, function (err) { S.error = errText(err); dlg.innerHTML = editForm(Object.assign({ id: id }, data)); });
    }
  });
  render();
})();

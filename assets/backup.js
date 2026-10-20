// backup.html: management downloads a copy of the database as one JSON file. It reads with the signed-in person's own permissions, so
// nothing is read that this person could not already see, and nothing is written. A collection that is refused is listed as refused.
// The file holds confidential business data (customers, requests, prices, bank accounts): it must be kept somewhere safe.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('bk');
  if (!root) return;
  if (!cfg || !window.firebase) { root.innerHTML = '<p class="bk-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  // [collection, label, has a history inside each document]
  var LIST = [
    ['users', 'کاربران و نقش‌ها'], ['customers', 'مشتریان'], ['customer_groups', 'گروه‌های مشتری'], ['requests', 'درخواست‌های خرید', 'log'], ['fulfilment', 'آماده‌سازی انبار و تولید'],
    ['invoices', 'پیش‌فاکتورها'], ['invoice_archive', 'بایگانی پیش‌فاکتورها'], ['proforma_numbers', 'شمارهٔ پیش‌فاکتورها'], ['bank_accounts', 'حساب‌های بانکی'],
    ['inventory', 'موجودی انبار'], ['inventory_claims', 'رزرو موجودی'], ['list_prices', 'قیمت‌ها'], ['public_requests', 'درخواست‌های عمومی'],
    ['tickets', 'گفت‌وگوها', 'messages'], ['job_descriptions', 'شرح وظایف'], ['job_description_log', 'تاریخچهٔ شرح وظایف'],
    ['commission_rates', 'نرخ کمیسیون'], ['commission_results', 'نتیجهٔ کمیسیون'], ['commission_months', 'ماه‌های کمیسیون'], ['commission_month_results', 'نتیجهٔ ماهانهٔ کمیسیون'],
    ['intel', 'تحلیل رقبا و نقشهٔ راه'], ['settings', 'مسئولان قیمت و درصد قیمت اعتباری (چکی)'], ['item_status', 'کدهای کنار گذاشته‌شده'], ['public_config', 'تنظیمات عمومی'], ['request_counters', 'شمارنده‌های روزانهٔ درخواست']
  ];
  var KEY = 'ms-last-backup';
  var S = { user: null, profile: null, loading: true, running: false, state: {}, history: false, done: '' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fa = function (n) { return String(n).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  var can = function (a) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, a)); };
  function last() { try { return Number(localStorage.getItem(KEY)) || 0; } catch (e) { return 0; } }
  function ago(ms) {
    if (!ms) return 'هنوز نسخه‌ای از این دستگاه گرفته نشده است.';
    var d = Math.floor((Date.now() - ms) / 86400000);
    var dt = new Date(ms), E = window.MSEvents, when = E && E.toJ ? (function () { var j = E.toJ(dt); return fa(j.jy + '/' + (j.jm < 10 ? '0' : '') + j.jm + '/' + (j.jd < 10 ? '0' : '') + j.jd); })() : dt.toLocaleDateString();
    return 'آخرین نسخه از این دستگاه: ' + when + (d >= 1 ? ' (' + fa(d) + ' روز پیش)' : ' (امروز)') + '.';
  }
  // Firestore values that JSON cannot hold: timestamps become ISO text, references become their path
  function plain(v) {
    if (v == null || typeof v !== 'object') return v;
    if (typeof v.toDate === 'function') { try { return { __ts: v.toDate().toISOString() }; } catch (e) { return null; } }
    if (v.path && v.firestore) return { __ref: v.path };
    if (Array.isArray(v)) return v.map(plain);
    var o = {}; Object.keys(v).forEach(function (k) { o[k] = plain(v[k]); }); return o;
  }
  function view() {
    if (S.loading) return '<p class="bk-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="bk-note">برای دیدن این بخش ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!can('backup')) return '<p class="bk-note">این بخش فقط برای مدیریت است.</p>';
    var rows = LIST.map(function (c) {
      var st = S.state[c[0]] || {}, mark = st.s === 'ok' ? '<b class="ok">' + fa(st.n) + ' سند</b>' : st.s === 'err' ? '<b class="er">' + esc(st.m) + '</b>' : st.s === 'run' ? '<b class="run">در حال خواندن…</b>' : '<b class="wait">در انتظار</b>';
      return '<li class="' + (st.s || '') + '"><span>' + esc(c[1]) + '<small dir="ltr">' + c[0] + '</small></span>' + mark + '</li>';
    }).join('');
    var d = S.done ? '<p class="bk-ok" role="status">' + esc(S.done) + '</p>' : '';
    return '<h1>نسخهٔ پشتیبان</h1><p class="bk-lead">همهٔ داده‌های برنامه را در یک فایل JSON روی همین دستگاه ذخیره می‌کند. فقط خواندن است و چیزی تغییر نمی‌کند.</p>' +
      '<div class="bk-box"><p class="bk-last">' + esc(ago(last())) + '</p>' +
      '<label class="bk-opt"><input type="checkbox" id="bkHist"' + (S.history ? ' checked' : '') + (S.running ? ' disabled' : '') + '> شامل تاریخچهٔ درخواست‌ها و پیام‌های گفت‌وگو <small>(خواندن بیشتر؛ سقف روزانهٔ پلن رایگان ۵۰ هزار خواندن است)</small></label>' +
      '<button type="button" class="bk-go" id="bkGo"' + (S.running ? ' disabled' : '') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>' + (S.running ? 'در حال تهیه…' : 'تهیه و دریافت نسخهٔ پشتیبان') + '</button>' + d + '</div>' +
      '<ul class="bk-list">' + rows + '</ul>' +
      '<p class="bk-warn">فایل شامل اطلاعات محرمانه (مشتریان، قیمت‌ها، حساب‌های بانکی) است. آن را جایی امن نگه دارید و در پوشهٔ عمومی یا پیام‌رسان نگذارید. هر هفته یک بار کافی است.</p>';
  }
  function render() { root.innerHTML = view(); }
  function readOne(c, withHist) {
    S.state[c[0]] = { s: 'run' }; render();
    return db.collection(c[0]).get().then(function (snap) {
      var docs = {}, subs = [];
      snap.forEach(function (d) { docs[d.id] = plain(d.data()); if (withHist && c[2]) subs.push(d); });
      var chain = Promise.resolve();
      subs.forEach(function (d) {
        chain = chain.then(function () {
          return d.ref.collection(c[2]).get().then(function (sub) { var arr = []; sub.forEach(function (x) { arr.push(Object.assign({ _id: x.id }, plain(x.data()))); }); if (arr.length) docs[d.id]['_' + c[2]] = arr; }, function () { /* a refused history is skipped */ });
        });
      });
      return chain.then(function () { S.state[c[0]] = { s: 'ok', n: Object.keys(docs).length }; render(); return docs; });
    }, function (e) {
      var code = (e && e.code) || '';
      S.state[c[0]] = { s: 'err', m: /permission/.test(code) ? 'اجازهٔ خواندن ندارید' : /unavail|network/.test(code) ? 'اتصال برقرار نیست' : 'خوانده نشد' }; render();
      return null;
    });
  }
  function download(obj) {
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    var a = document.createElement('a'), n = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; };
    a.href = URL.createObjectURL(blob); a.download = 'maxsilver-backup-' + n.getFullYear() + p(n.getMonth() + 1) + p(n.getDate()) + '-' + p(n.getHours()) + p(n.getMinutes()) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function run() {
    if (S.running) return;
    S.running = true; S.done = ''; S.state = {}; render();
    var out = { app: 'Max Silver', made: new Date().toISOString(), by: S.user.uid, history: S.history, collections: {} }, chain = Promise.resolve();
    LIST.forEach(function (c) { chain = chain.then(function () { return readOne(c, S.history).then(function (docs) { if (docs) out.collections[c[0]] = docs; }); }); });
    chain.then(function () {
      var ok = Object.keys(out.collections).length, bad = LIST.length - ok;
      if (ok) { download(out); try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* ignore */ } }
      S.done = ok ? 'فایل ساخته شد و دریافت می‌شود: ' + fa(ok) + ' مجموعه' + (bad ? ' (' + fa(bad) + ' مجموعه خوانده نشد، در فهرست دیده می‌شود)' : '') + '.' : 'هیچ مجموعه‌ای خوانده نشد.';
      S.running = false; render();
    });
  }
  root.addEventListener('change', function (e) { if (e.target.id === 'bkHist') S.history = e.target.checked; });
  root.addEventListener('click', function (e) { if (e.target.closest('#bkGo')) run(); });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null;
    if (!u) { S.loading = false; render(); return; }
    db.collection('users').doc(u.uid).get().then(function (snap) { S.profile = snap.exists ? snap.data() : null; S.loading = false; render(); }, function () { S.loading = false; render(); });
  });
  render();
})();

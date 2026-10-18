// Bank accounts for pre-invoices (حساب‌های بانکی). Only the account manager adds, edits and removes them; finance (and management) see
// them and pick the one a pre-invoice shows. The account may belong to a brand, to the company, or to a supplier (sometimes the customer
// is told to pay a supplier, not the company). Firestore: bank_accounts/<auto id>.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('bk');
  if (!root) return;
  if (!cfg || !window.firebase) { root.innerHTML = '<p class="bk-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var BR = { 'max-silver': 'مکث‌سیلور', wintora: 'وینتورا', 'torbo-max': 'توربومکس' };
  var KIND = { brand: 'برند', company: 'شرکت', supplier: 'تأمین‌کننده' };
  var S = { user: null, profile: null, loading: true, list: [], form: null, error: '', msg: '', busy: false, kind: 'all' };
  var unsub = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var latin = function (s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); };
  var faD = function (s) { return String(s == null ? '' : s).replace(/[0-9]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  var digits = function (s) { return latin(s).replace(/\D/g, ''); };
  var can = function (a) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, a)); };
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ این کار را ندارید (فقط اکانت منیجر حساب را اضافه یا ویرایش می‌کند، یا قوانین پایگاه داده هنوز منتشر نشده است).';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  // IBAN check (ISO 7064 mod 97) for an Iranian Sheba: IR + 24 digits
  function validSheba(s) {
    s = latin(s).replace(/\s+/g, '').toUpperCase();
    if (!/^IR\d{24}$/.test(s)) return false;
    var r = s.slice(4) + '1827' + s.slice(2, 4), rem = 0, i;
    for (i = 0; i < r.length; i++) rem = (rem * 10 + Number(r.charAt(i))) % 97;
    return rem === 1;
  }
  function validCard(s) {
    var d = digits(s); if (!/^\d{16}$/.test(d)) return false;
    var sum = 0, i, n; for (i = 0; i < 16; i++) { n = Number(d.charAt(i)); if (i % 2 === 0) { n *= 2; if (n > 9) n -= 9; } sum += n; }
    return sum % 10 === 0;
  }
  var fmtCard = function (s) { var d = digits(s); return d ? faD(d.replace(/(\d{4})(?=\d)/g, '$1 ')) : ''; };
  function blank() { return { id: '', mode: 'account', kind: 'brand', brand: 'max-silver', label: '', holder: '', bank: '', account: '', sheba: '', card: '', payee: '', note: '', active: true }; }
  var group = function (a) { return a.kind === 'brand' ? (BR[a.brand] || 'برند') : KIND[a.kind] || ''; };
  function cardHtml(a) {
    var f = function (k, v, ltr) { return v ? '<div><dt>' + k + '</dt><dd' + (ltr ? ' dir="ltr"' : '') + '>' + esc(v) + '</dd></div>' : ''; };
    return '<article class="bk-card' + (a.active === false ? ' off' : '') + '"><div class="bk-top"><h3>' + esc(a.label) + '</h3><span class="bk-k ' + esc(a.kind) + '">' + esc(group(a)) + '</span></div><dl>' +
      f('صاحب حساب', a.holder) + f('بانک', a.bank) + f('شمارهٔ حساب', faD(a.account), true) + f('شبا', a.sheba, true) + f('شمارهٔ کارت', fmtCard(a.card), true) + f('در وجه (چک)', a.payee) + f('توضیح', a.note) + '</dl>' +
      (a.active === false ? '<p class="bk-off">غیرفعال</p>' : '') +
      (can('bankEdit') ? '<div class="bk-acts"><button type="button" class="bk-btn alt" data-edit="' + esc(a.id) + '">ویرایش</button><button type="button" class="bk-btn alt" data-toggle="' + esc(a.id) + '">' + (a.active === false ? 'فعال کردن' : 'غیرفعال کردن') + '</button><button type="button" class="bk-btn danger" data-del="' + esc(a.id) + '">حذف</button></div>' : '') + '</article>';
  }
  function formHtml() {
    var f = S.form; if (!f) return '';
    var inp = function (k, label, o) { o = o || {}; return '<label class="' + (o.wide ? 'wide' : '') + '">' + label + '<input type="text" data-k="' + k + '" value="' + esc(f[k]) + '"' + (o.ltr ? ' dir="ltr"' : '') + (o.num ? ' inputmode="numeric"' : '') + ' maxlength="' + (o.max || 80) + '" autocomplete="off"></label>'; };
    return '<section class="bk-form"><h2>' + (f.id ? (f.mode === 'card' ? 'ویرایش کارت' : 'ویرایش حساب') : f.mode === 'card' ? 'افزودن کارت' : 'افزودن حساب') + '</h2>' + (S.error ? '<p class="bk-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<div class="bk-seg" role="radiogroup" aria-label="صاحب حساب">' + Object.keys(KIND).map(function (k) { return '<button type="button" role="radio" data-kind="' + k + '" aria-checked="' + (f.kind === k) + '">' + KIND[k] + '</button>'; }).join('') + '</div>' +
      (f.kind === 'brand' ? '<div class="bk-seg" role="radiogroup" aria-label="برند">' + Object.keys(BR).map(function (k) { return '<button type="button" role="radio" data-brand="' + k + '" aria-checked="' + (f.brand === k) + '">' + BR[k] + '</button>'; }).join('') + '</div>' : '') +
      (f.mode === 'card'
        ? '<div class="bk-grid">' + inp('card', 'شمارهٔ کارت (۱۶ رقم)', { ltr: true, num: true, max: 19, wide: true }) + inp('holder', 'نام صاحب کارت') + inp('bank', 'نام بانک') + inp('label', 'عنوان (اختیاری؛ برای انتخاب)', { wide: true }) + inp('note', 'توضیح (اختیاری)', { wide: true, max: 200 }) + '</div>'
        : '<div class="bk-grid">' + inp('label', 'عنوان حساب (برای انتخاب)', { wide: true }) + inp('holder', 'نام صاحب حساب') + inp('bank', 'نام بانک') + inp('account', 'شمارهٔ حساب', { ltr: true, num: true, max: 30 }) +
          inp('sheba', 'شمارهٔ شبا (IR…)', { ltr: true, max: 30 }) + inp('card', 'شمارهٔ کارت (اختیاری)', { ltr: true, num: true, max: 19 }) + inp('payee', 'در وجه (برای چک)') + inp('note', 'توضیح (اختیاری)', { wide: true, max: 200 }) + '</div>') +
      '<div class="bk-acts"><button type="button" class="bk-btn" data-save' + (S.busy ? ' disabled' : '') + '>ذخیره</button><button type="button" class="bk-btn alt" data-cancel>انصراف</button></div></section>';
  }
  function view() {
    if (S.loading) return (window.MSSkel ? window.MSSkel() : '<p class="bk-note">در حال بارگذاری…</p>');
    if (!S.user) return '<p class="bk-note">ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="bk-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('bankAccounts')) return '<p class="bk-note">این بخش برای اکانت منیجر، مالی و مدیریت است.</p>';
    var kinds = ['all', 'brand', 'company', 'supplier'], list = S.list.filter(function (a) { return S.kind === 'all' || a.kind === S.kind; });
    return '<h1>حساب‌های بانکی</h1><p class="bk-lead">حساب‌هایی که روی پیش‌فاکتور مشتری نوشته می‌شود تا بداند به چه کسی واریز کند یا چک بنویسد. حساب می‌تواند مال یک برند، خود شرکت یا یک تأمین‌کننده باشد. فقط اکانت منیجر حساب را اضافه یا ویرایش می‌کند؛ مالی از میان آن‌ها برای هر پیش‌فاکتور یکی را انتخاب می‌کند.</p>' +
      (S.msg ? '<p class="bk-ok" role="status">' + esc(S.msg) + '</p>' : '') + (S.form ? '' : (S.error ? '<p class="bk-err" role="alert">' + esc(S.error) + '</p>' : '')) +
      (can('bankEdit') && !S.form ? '<div class="bk-acts"><button type="button" class="bk-btn" data-new="account">افزودن حساب</button><button type="button" class="bk-btn alt" data-new="card">افزودن کارت</button></div>' : '') + formHtml() +
      '<div class="bk-chips" role="group" aria-label="صاحب حساب">' + kinds.map(function (k) { return '<button type="button" class="bk-chip" data-flt="' + k + '" aria-pressed="' + (S.kind === k) + '">' + (k === 'all' ? 'همه' : KIND[k]) + '</button>'; }).join('') + '</div>' +
      '<div class="bk-grid2">' + list.map(cardHtml).join('') + '</div>' + (list.length ? '' : '<p class="bk-note">هنوز حسابی ثبت نشده است.</p>') +
      '<p class="bk-note">انتخاب حساب روی هر پیش‌فاکتور مشتری در مرحلهٔ ساخت پیش‌فاکتور (گام بعدی جریان سفارش) اضافه می‌شود.</p>';
  }
  function render() {
    var a = document.activeElement, keep = a && a.hasAttribute && a.hasAttribute('data-k') ? { k: a.getAttribute('data-k'), at: a.selectionStart } : null;
    var M = window.MSMorph, prev = M ? M.snapAll(root, '.bk-seg,.bk-chips', 'button', '[aria-checked=true],[aria-pressed=true]') : null;
    root.innerHTML = view();
    if (M) M.playAll(root, '.bk-seg,.bk-chips', 'button', '[aria-checked=true],[aria-pressed=true]', prev, { cls: 'chip' });
    if (window.MSGate) window.MSGate.apply();
    if (keep) { var el = root.querySelector('[data-k="' + keep.k + '"]'); if (el) { el.focus(); try { el.setSelectionRange(keep.at, keep.at); } catch (e) { /* ignore */ } } }
  }
  function save() {
    var f = S.form, e = '';
    f.label = f.label.trim(); f.holder = f.holder.trim(); f.bank = f.bank.trim(); f.payee = f.payee.trim(); f.note = f.note.trim();
    f.account = digits(f.account); f.card = digits(f.card); f.sheba = latin(f.sheba).replace(/\s+/g, '').toUpperCase();
    if (f.mode === 'card') {
      if (!f.card) e = 'شمارهٔ کارت را بنویسید.';
      else if (!validCard(f.card)) e = 'شمارهٔ کارت درست نیست (۱۶ رقم).';
      else if (f.holder.length < 3) e = 'نام صاحب کارت را بنویسید.';
      if (!e && f.label.length < 2) f.label = ('کارت ' + (f.bank ? f.bank + ' ' : '') + f.card.slice(-4)).slice(0, 80);
      if (!e) { f.account = ''; f.sheba = ''; }
    }
    else if (f.label.length < 2) e = 'عنوان حساب را بنویسید.';
    else if (f.holder.length < 3) e = 'نام صاحب حساب را بنویسید.';
    else if (!f.account && !f.sheba && !f.card) e = 'دست‌کم شمارهٔ حساب، شبا یا کارت را بنویسید.';
    else if (f.sheba && !validSheba(f.sheba)) e = 'شمارهٔ شبا درست نیست (IR و ۲۴ رقم).';
    else if (f.card && !validCard(f.card)) e = 'شمارهٔ کارت درست نیست (۱۶ رقم).';
    if (e) { S.error = e; render(); return; }
    var doc = { kind: f.kind, brand: f.kind === 'brand' ? f.brand : '', label: f.label.slice(0, 80), holder: f.holder.slice(0, 80), bank: f.bank.slice(0, 60), account: f.account.slice(0, 30), sheba: f.sheba.slice(0, 30), card: f.card.slice(0, 19), payee: f.payee.slice(0, 80), note: f.note.slice(0, 200), active: f.active !== false, updatedAt: Date.now(), updatedBy: S.user.uid };
    S.busy = true; S.error = '';
    var ref = f.id ? db.collection('bank_accounts').doc(f.id) : db.collection('bank_accounts').doc();
    ref.set(doc).then(function () { S.form = null; S.msg = 'ذخیره شد.'; }, function (er) { S.error = errText(er); }).then(function () { S.busy = false; render(); });
  }
  root.addEventListener('click', function (e) {
    var t;
    var nw = e.target.closest('[data-new]'); if (nw) { S.form = blank(); S.form.mode = nw.getAttribute('data-new') === 'card' ? 'card' : 'account'; S.error = ''; S.msg = ''; render(); return; }
    if ((t = e.target.closest('[data-edit]'))) { var a = S.list.filter(function (x) { return x.id === t.getAttribute('data-edit'); })[0]; if (a) { S.form = Object.assign(blank(), a); S.form.mode = !a.account && !a.sheba && a.card ? 'card' : 'account'; S.error = ''; S.msg = ''; render(); } return; }
    if (e.target.closest('[data-cancel]')) { S.form = null; S.error = ''; render(); return; }
    if (e.target.closest('[data-save]')) { save(); return; }
    if ((t = e.target.closest('[data-kind]'))) { S.form.kind = t.getAttribute('data-kind'); render(); return; }
    if ((t = e.target.closest('[data-brand]'))) { S.form.brand = t.getAttribute('data-brand'); render(); return; }
    if ((t = e.target.closest('[data-flt]'))) { S.kind = t.getAttribute('data-flt'); render(); return; }
    if ((t = e.target.closest('[data-toggle]'))) { var b = S.list.filter(function (x) { return x.id === t.getAttribute('data-toggle'); })[0]; if (b) db.collection('bank_accounts').doc(b.id).update({ active: b.active === false, updatedAt: Date.now(), updatedBy: S.user.uid }).then(null, function (er) { S.error = errText(er); render(); }); return; }
    if ((t = e.target.closest('[data-del]'))) { if (window.confirm('این حساب حذف شود؟')) db.collection('bank_accounts').doc(t.getAttribute('data-del')).delete().then(function () { S.msg = 'حذف شد.'; render(); }, function (er) { S.error = errText(er); render(); }); }
  });
  root.addEventListener('input', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (k && S.form) S.form[k] = e.target.value; });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.list = [];
    if (unsub) { unsub(); unsub = null; }
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('bankAccounts')) { S.loading = false; render(); return; }
      unsub = db.collection('bank_accounts').onSnapshot(function (qs) {
        var l = []; qs.forEach(function (s) { var d = s.data(); d.id = s.id; l.push(d); });
        l.sort(function (a, b) { return (a.kind || '').localeCompare(b.kind || '') || String(a.label).localeCompare(String(b.label), 'fa'); });
        S.list = l; S.loading = false; render();
      }, function (er) { S.loading = false; S.error = errText(er); render(); });
    }).then(null, function (er) { S.loading = false; S.error = errText(er); render(); });
  });
  render();
})();

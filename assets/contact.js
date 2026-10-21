// "تماس با ما": a message from someone without an account to one of three contact points.
// It writes one document to public_requests (create-only for everyone; only the addressee role can read it).
(function () {
  'use strict';
  var root = document.getElementById('contact');
  if (!root) return;
  var cfg = window.MS_FIREBASE;
  var TO = [
    { v: 'sales', t: 'فروش و توسعه بازار', d: 'قیمت، کاتالوگ و سفارش' },
    { v: 'service', t: 'خدمات پس از فروش', d: 'نصب، گارانتی و تعمیر' },
    { v: 'management', t: 'مدیریت', d: 'پیشنهاد، شکایت و همکاری' }
  ];
  var state = { to: 'sales', open: false, busy: false, done: false, error: '' };
  var db = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.500"/></svg>';

  function cur() { return TO.filter(function (x) { return x.v === state.to; })[0]; }
  function view() {
    if (state.done) {
      return '<div class="ct-done"><span class="ct-done-ico">' + CHECK + '</span><h2>پیام شما ثبت شد</h2><p>همکاران ما در اولین فرصت با شما تماس می‌گیرند.</p>' +
        '<button type="button" class="ct-again" data-again>پیام تازه</button></div>';
    }
    var list = TO.map(function (x) {
      return '<li role="option" tabindex="-1" aria-selected="' + (x.v === state.to) + '" data-to="' + x.v + '"><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></li>';
    }).join('');
    return '<form id="ctForm" novalidate>' +
      '<div class="ct-field"><span class="ct-label" id="ctToLabel">به</span>' +
        '<div class="ct-dd">' +
          '<button type="button" class="ct-dd-btn" id="ctDd" aria-haspopup="listbox" aria-expanded="' + state.open + '" aria-labelledby="ctToLabel ctDd"><span>' + esc(cur().t) + '</span>' + CHEV + '</button>' +
          '<ul class="ct-dd-list" role="listbox" aria-labelledby="ctToLabel"' + (state.open ? '' : ' hidden') + '>' + list + '</ul>' +
        '</div></div>' +
      '<label class="ct-field"><span class="ct-label">نام</span><input type="text" name="name" maxlength="60" autocomplete="name" required></label>' +
      '<label class="ct-field"><span class="ct-label">تلفن یا ایمیل برای پاسخ</span><input type="text" name="contact" dir="ltr" maxlength="80" autocomplete="tel" required></label>' +
      '<label class="ct-field"><span class="ct-label">پیام</span><textarea name="text" rows="5" maxlength="1000" required></textarea></label>' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="ct-hp">' +
      (state.error ? '<p class="ct-err" role="alert">' + esc(state.error) + '</p>' : '') +
      '<button type="submit" class="ct-send"' + (state.busy ? ' disabled' : '') + '>' + (state.busy ? '<span class="ct-spin" aria-hidden="true"></span>در حال ارسال…' : 'ارسال پیام') + '</button></form>';
  }
  function render(keep) {
    var vals = {};
    if (keep) { var f = document.getElementById('ctForm'); if (f) ['name', 'contact', 'text'].forEach(function (n) { vals[n] = f.elements[n].value; }); }
    root.innerHTML = view();
    var f2 = document.getElementById('ctForm');
    if (f2) Object.keys(vals).forEach(function (n) { f2.elements[n].value = vals[n]; });
  }

  root.addEventListener('click', function (e) {
    var dd = e.target.closest('#ctDd');
    if (dd) { state.open = !state.open; render(true); return; }
    var li = e.target.closest('[data-to]');
    if (li) { state.to = li.getAttribute('data-to'); state.open = false; render(true); var b = document.getElementById('ctDd'); if (b) b.focus(); return; }
    if (e.target.closest('[data-again]')) { state.done = false; render(false); }
  });
  document.addEventListener('click', function (e) { if (state.open && !e.target.closest('.ct-dd')) { state.open = false; render(true); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) { state.open = false; render(true); } });

  root.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.elements.website.value || state.busy) return;
    var name = f.elements.name.value.trim(), contact = f.elements.contact.value.trim(), text = f.elements.text.value.trim();
    // a phone number is digits only, no country code; an e-mail address is kept as written
    if (contact.indexOf('@') < 0) {
      contact = contact.replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }).replace(/\D/g, '');
      if (contact.indexOf('0098') === 0) contact = contact.slice(4); else if (contact.indexOf('98') === 0 && contact.length >= 12) contact = contact.slice(2);
      if (contact.length === 10 && contact.charAt(0) !== '0') contact = '0' + contact;
      if (!/^0\d{10}$/.test(contact)) { state.error = 'شمارهٔ تلفن باید ۱۱ رقم، فقط عدد و بدون کد کشور باشد (یا یک ایمیل بنویسید).'; render(true); return; }
    }
    if (!name || contact.length < 3 || !text) { state.error = 'نام، راه تماس و پیام را کامل کنید.'; render(true); return; }
    if (window.MSApi && window.MSApi.enabled()) {
      state.error = ''; state.busy = true; render(true);
      window.MSApi.sendMessage({ name: name, contact: contact, to: state.to, text: text }).then(function () { state.busy = false; state.done = true; render(false); },
        function (err) { state.busy = false; state.error = err.status === 429 ? 'تعداد ارسال‌ها از حد مجاز گذشته است؛ کمی بعد دوباره امتحان کنید.' : err.status === 0 ? 'اتصال برقرار نشد؛ دوباره امتحان کنید.' : 'ارسال انجام نشد؛ اطلاعات را بررسی کنید.'; render(true); });
      return;
    }
    if (!window.firebase || !cfg) { state.error = 'سرویس در دسترس نیست. صفحه را دوباره باز کنید.'; render(true); return; }
    state.error = ''; state.busy = true; render(true);
    try {
      if (!db) { if (!firebase.apps.length) firebase.initializeApp(cfg); db = firebase.firestore(); }
    } catch (x) { state.busy = false; state.error = 'اتصال برقرار نشد.'; render(true); return; }
    db.collection('public_requests').add({ name: name, contact: contact, to: state.to, text: text, status: 'open', createdAt: Date.now() }).then(function () {
      state.busy = false; state.done = true; render(false);
    }, function (err) {
      state.busy = false;
      state.error = /network|unavailable|deadline|timeout/.test((err && err.code) || '') ? 'اتصال به اینترنت برقرار نشد؛ دوباره امتحان کنید.' : 'ارسال انجام نشد؛ کمی بعد دوباره امتحان کنید.';
      render(true);
    });
  });
  render(false);
})();

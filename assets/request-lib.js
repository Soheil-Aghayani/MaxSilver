// Purchase requests from people who have no account (Chef Market request sheet). Shared by planner.js (the public side)
// and crm.js (sales). A request is one document, requests/<code>, created by an anonymous Firebase sign-in that lasts only
// for the send; the person can never read it back. Sales roles read and work on it (firestore.rules).
(function () {
  'use strict';
  var STATUS = { new: 'جدید', contacted: 'تماس گرفته شد', quoted: 'پیش‌فاکتور فرستاده شد', won: 'خرید انجام شد', lost: 'منصرف شد' };
  var ROUTE = { call: 'نیاز به تماس', warehouse: 'ارسال به انبار', production: 'ارسال به تولید' };
  var NEXT_LOG = { call: 'تماس', note: 'یادداشت', status: 'تغییر وضعیت', route: 'تصمیم ارسال', assign: 'ارجاع' };

  function latin(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); }
  function digits(s) { return latin(s).replace(/\D/g, ''); }
  function phone(s) { var d = digits(s); if (/^0098/.test(d)) d = d.slice(4); else if (/^98/.test(d) && d.length === 12) d = d.slice(2); if (d.length === 10 && d.charAt(0) === '9') d = '0' + d; return d; }
  function validPhone(s) { return /^09\d{9}$/.test(phone(s)); }
  function validNid(s) {
    s = digits(s);
    if (!/^\d{10}$/.test(s) || /^(\d)\1{9}$/.test(s)) return false;
    var sum = 0, i;
    for (i = 0; i < 9; i++) sum += Number(s.charAt(i)) * (10 - i);
    var r = sum % 11, c = Number(s.charAt(9));
    return r < 2 ? c === r : c === 11 - r;
  }
  function validZip(s) { return /^\d{10}$/.test(digits(s)); }
  function text(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }

  // CM-yymmdd-XXXX (Jalali date, four letters or digits without look-alikes)
  function newCode() {
    var j = window.MSEvents ? window.MSEvents.toJ(new Date()) : { jy: 1405, jm: 1, jd: 1 }, p = function (n) { return (n < 10 ? '0' : '') + n; };
    var abc = '23456789ABCDEFGHJKMNPQRSTUVWXYZ', s = '', buf = new Uint32Array(4), i;
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(buf); else for (i = 0; i < 4; i++) buf[i] = Math.floor(Math.random() * 4294967296);
    for (i = 0; i < 4; i++) s += abc.charAt(buf[i] % abc.length);
    return 'CM-' + p(j.jy % 100) + p(j.jm) + p(j.jd) + '-' + s;
  }

  // checks every field the same way the rules do; returns { ok, errors: { field: message }, data }
  function check(f) {
    var e = {}, c = { name: text(f.name, 80), phone: phone(f.phone), nid: digits(f.nid), address: text(f.address, 300), city: text(f.city, 40), zip: digits(f.zip) };
    if (c.name.length < 3) e.name = 'نام و نام خانوادگی را کامل بنویسید.';
    if (!validPhone(c.phone)) e.phone = 'شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.';
    if (!validNid(c.nid)) e.nid = 'کد ملی ۱۰ رقمی و درست وارد کنید.';
    if (c.address.length < 5) e.address = 'نشانی را بنویسید.';
    if (c.city.length < 2) e.city = 'شهر را بنویسید.';
    if (!validZip(c.zip)) e.zip = 'کد پستی ۱۰ رقمی است.';
    var r = { self: !!f.self };
    if (!r.self) {
      r.name = text(f.rName, 80); r.nid = digits(f.rNid); r.phone = phone(f.rPhone);
      if (r.name.length < 3) e.rName = 'نام گیرنده را کامل بنویسید.';
      if (!validNid(r.nid)) e.rNid = 'کد ملی گیرنده درست نیست.';
      if (!validPhone(r.phone)) e.rPhone = 'موبایل گیرنده درست نیست.';
    }
    return { ok: !Object.keys(e).length, errors: e, customer: c, receiver: r, note: text(f.note, 500) };
  }

  function errText(e) {
    var c = e && e.code || '';
    if (/operation-not-allowed|admin-restricted/.test(c)) return 'ثبت درخواست هنوز فعال نشده است. لطفاً با فروش تماس بگیرید.';
    if (/network|unavailable|timeout/.test(c)) return 'اتصال برقرار نشد. اینترنت (یا VPN) را بررسی و دوباره تلاش کنید.';
    if (/permission-denied/.test(c)) return 'درخواست پذیرفته نشد؛ اطلاعات را بررسی و دوباره تلاش کنید.';
    return 'ثبت درخواست انجام نشد (' + (c || (e && e.message) || 'خطای نامشخص') + ').';
  }

  // sign in anonymously only for the send, write the document, sign out again so no other page takes the visitor for a user
  function submit(payload, tries) {
    var fb = window.firebase, cfg = window.MS_FIREBASE;
    if (!fb || !cfg) return Promise.reject({ code: 'unavailable' });
    var app = fb.apps.length ? fb.app() : fb.initializeApp(cfg), auth = fb.auth(app), db = fb.firestore(app);
    var had = auth.currentUser;
    if (had && !had.isAnonymous) return Promise.reject({ code: 'staff-session' });
    var go = had ? Promise.resolve() : auth.signInAnonymously();
    return go.then(function () {
      var code = newCode(), doc = Object.assign({ code: code, createdAt: Date.now(), status: 'new', route: 'call' }, payload);
      return db.collection('requests').doc(code).set(doc).then(function () { return code; }, function (e) {
        if ((tries || 0) < 2 && /permission-denied/.test(e && e.code || '')) return submit(payload, (tries || 0) + 1);   // the code was taken: draw another
        throw e;
      });
    }).then(function (code) { return auth.signOut().then(function () { return code; }, function () { return code; }); },
      function (e) { return auth.signOut().then(function () { throw e; }, function () { throw e; }); });
  }

  window.MSRequests = { STATUS: STATUS, ROUTE: ROUTE, LOGKIND: NEXT_LOG, latin: latin, digits: digits, phone: phone, validPhone: validPhone, validNid: validNid, validZip: validZip, text: text, newCode: newCode, check: check, errText: errText, submit: submit };
})();

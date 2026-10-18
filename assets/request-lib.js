// Purchase requests from people who have no account (Chef Market request sheet). Shared by planner.js (the public side)
// and crm.js (sales). A request is one document, requests/<code>, created by an anonymous Firebase sign-in that lasts only
// for the send; the person can never read it back. Sales roles read and work on it (firestore.rules).
(function () {
  'use strict';
  // the version of the legal texts (assets/legal.js) the visitor accepted; stored with every request
  var TERMS = '1405-07-25';
  var STATUS = { new: 'جدید', contacted: 'تماس گرفته شد', quoted: 'پیش‌فاکتور فرستاده شد', won: 'خرید انجام شد', lost: 'منصرف شد' };
  var ROUTE = { call: 'نیاز به تماس', warehouse: 'ارسال به انبار', production: 'ارسال به تولید' };
  var NEXT_LOG = { call: 'تماس', note: 'یادداشت', status: 'تغییر وضعیت', route: 'تصمیم ارسال', assign: 'ارجاع' };

  function latin(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); }
  function fa(s) { return String(s == null ? '' : s).replace(/[0-9]/g, function (c) { return String.fromCharCode(1776 + Number(c)); }); }
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

  // Request code: CON-<first three letters of the delivery city>-<Jalali yymmdd>-<four random digits>, e.g. CON-TEH-051025-4827. The prefix CON = consumer (CUS customer, BB company, BG government are planned).
  // CON = consumer. The number is the day's counter (request_counters/<yymmdd>), taken in the same transaction that writes the request.
  var CITIES = {
    'تهران': 'TEH', 'مشهد': 'MAS', 'اصفهان': 'ISF', 'کرج': 'KAR', 'شیراز': 'SHI', 'تبریز': 'TAB', 'قم': 'QOM', 'اهواز': 'AHV', 'کرمانشاه': 'KER', 'ارومیه': 'URM',
    'رشت': 'RAS', 'زاهدان': 'ZAH', 'کرمان': 'KER', 'همدان': 'HAM', 'یزد': 'YAZ', 'اردبیل': 'ARD', 'بندرعباس': 'BAN', 'اراک': 'ARA', 'زنجان': 'ZAN', 'سنندج': 'SAN',
    'قزوین': 'QAZ', 'گرگان': 'GOR', 'ساری': 'SAR', 'خرم‌آباد': 'KHO', 'خرم آباد': 'KHO', 'بجنورد': 'BOJ', 'بیرجند': 'BIR', 'بوشهر': 'BUS', 'ایلام': 'ILA', 'شهرکرد': 'SHA',
    'یاسوج': 'YAS', 'سمنان': 'SEM', 'اسلامشهر': 'ESL', 'قدس': 'QOD', 'ورامین': 'VAR', 'دزفول': 'DEZ', 'آبادان': 'ABA', 'خرمشهر': 'KHO', 'ایرانشهر': 'IRA', 'نیشابور': 'NEY',
    'سبزوار': 'SAB', 'کاشان': 'KAS', 'قائمشهر': 'QAE', 'بابل': 'BAB', 'آمل': 'AMO', 'سیرجان': 'SIR', 'بروجرد': 'BOR', 'ساوه': 'SAV', 'مرودشت': 'MAR', 'کیش': 'KIS',
    'قشم': 'QES', 'گنبد': 'GON', 'گنبدکاووس': 'GON', 'مهاباد': 'MAH', 'خوی': 'KHO', 'ملایر': 'MAL', 'شاهرود': 'SHA', 'رفسنجان': 'RAF', 'ماهشهر': 'MAH', 'بوکان': 'BUK',
    'نجف‌آباد': 'NAJ', 'نجف آباد': 'NAJ', 'شهریار': 'SHA', 'پردیس': 'PAR', 'پاکدشت': 'PAK', 'رباط‌کریم': 'RAB', 'ملارد': 'MAL', 'فردیس': 'FAR', 'لاهیجان': 'LAH', 'انزلی': 'ANZ',
    'بندرانزلی': 'ANZ', 'چابهار': 'CHA', 'اسفراین': 'ESF', 'دماوند': 'DAM', 'نوشهر': 'NOS', 'چالوس': 'CHA', 'مراغه': 'MAR', 'میانه': 'MIA', 'سقز': 'SAG', 'بانه': 'BAN'
  };
  var LETTER = { 'ا': 'A', 'آ': 'A', 'ب': 'B', 'پ': 'P', 'ت': 'T', 'ث': 'S', 'ج': 'J', 'چ': 'C', 'ح': 'H', 'خ': 'K', 'د': 'D', 'ذ': 'Z', 'ر': 'R', 'ز': 'Z', 'ژ': 'J', 'س': 'S', 'ش': 'S', 'ص': 'S', 'ض': 'Z', 'ط': 'T', 'ظ': 'Z', 'ع': 'A', 'غ': 'G', 'ف': 'F', 'ق': 'Q', 'ک': 'K', 'گ': 'G', 'ل': 'L', 'م': 'M', 'ن': 'N', 'و': 'V', 'ه': 'H', 'ی': 'Y', 'ئ': 'Y', 'ء': 'A', 'ة': 'H', 'ؤ': 'V', 'أ': 'A', 'إ': 'A' };
  function cityKey(s) { return String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, '').replace(/\s+/g, '').replace(/[^\u0600-\u06FFA-Za-z]/g, ''); }
  var CITY_MAP = {}; Object.keys(CITIES).forEach(function (k) { CITY_MAP[cityKey(k)] = CITIES[k]; });
  // three Latin letters for a city name typed in Persian (a known city, or the first three letters transliterated), XXX when there is nothing to use
  function cityCode(city) {
    var k = cityKey(city); if (!k) return 'XXX';
    if (/^[A-Za-z]+$/.test(k)) return (k + 'XXX').slice(0, 3).toUpperCase();
    if (CITY_MAP[k]) return CITY_MAP[k];
    var best = ''; Object.keys(CITY_MAP).forEach(function (c) { if (k.indexOf(c) === 0 && c.length > best.length) best = c; });   // «تهران پارس» -> تهران
    if (best) return CITY_MAP[best];
    var s = ''; for (var i = 0; i < k.length && s.length < 3; i++) s += LETTER[k.charAt(i)] || '';
    return (s + 'XXX').slice(0, 3);
  }
  function dayStamp() {
    var j = window.MSEvents ? window.MSEvents.toJ(new Date()) : { jy: 1405, jm: 1, jd: 1 }, p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(j.jy % 100) + p(j.jm) + p(j.jd);
  }
  function rand4() { var a = new Uint32Array(1); (window.crypto || window.msCrypto).getRandomValues(a); return ('000' + (a[0] % 10000)).slice(-4); }
  function buildCode(city, day, n4) { return 'CON-' + cityCode(city) + '-' + day + '-' + n4; }
  // checks every field the same way the rules do; returns { ok, errors: { field: message }, data }
  function check(f) {
    var e = {}, c = { name: text(f.name, 80), phone: phone(f.phone), nid: digits(f.nid), address: text(f.address, 300), city: text(f.city, 40), zip: digits(f.zip) };
    if (!c.zip || /^1+$/.test(c.zip)) c.zip = '1111111111';   // no postal code (or only ones): stored as ten ones so the rules still pass; sales sees it as «ندارد»
    if (c.name.length < 3) e.name = 'نام و نام خانوادگی را کامل بنویسید.';
    if (!validPhone(c.phone)) e.phone = 'شمارهٔ موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.';
    if (!validNid(c.nid)) e.nid = 'کد ملی ۱۰ رقمی و درست وارد کنید.';
    c.address = c.address.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
    if (c.address.length < 5) e.address = 'نشانی را بنویسید.';
    else if (/[A-Za-z]/.test(c.address) || !/[؀-ۿ]/.test(c.address)) e.address = 'نشانی را به فارسی بنویسید.';
    c.address = fa(c.address);
    var province = text(f.province, 40);
    if (!province) e.province = 'استان را انتخاب کنید.';
    if (c.city.length < 2) e.city = province ? 'شهر را انتخاب کنید.' : 'ابتدا استان را انتخاب کنید.';
    if (!validZip(c.zip)) e.zip = 'کد پستی ۱۰ رقمی است.';
    if (!f.agree) e.agree = 'برای ارسال، باید شرایط و ضوابط و سیاست حریم خصوصی را بپذیرید.';
    var r = { self: !!f.self };
    if (!r.self) {
      r.name = text(f.rName, 80); r.nid = digits(f.rNid); r.phone = phone(f.rPhone);
      if (r.name.length < 3) e.rName = 'نام گیرنده را کامل بنویسید.';
      if (!validNid(r.nid)) e.rNid = 'کد ملی گیرنده درست نیست.';
      if (!validPhone(r.phone)) e.rPhone = 'موبایل گیرنده درست نیست.';
    }
    return { ok: !Object.keys(e).length, errors: e, customer: c, province: province, receiver: r, note: text(f.note, 500), terms: TERMS };
  }

  function errText(e) {
    var c = e && e.code || '';
    if (/operation-not-allowed|admin-restricted/.test(c)) return 'ثبت درخواست هنوز فعال نشده است. لطفاً با فروش تماس بگیرید. (' + c + ')';
    if (/network|unavailable|timeout/.test(c)) return 'اتصال برقرار نشد. اینترنت (یا VPN) را بررسی و دوباره تلاش کنید.';
    if (/permission-denied/.test(c)) return 'درخواست پذیرفته نشد؛ اطلاعات را بررسی و دوباره تلاش کنید.';
    return 'ثبت درخواست انجام نشد (' + (c || (e && e.message) || 'خطای نامشخص') + ').';
  }

  // sign in anonymously only for the send, take the day's next number and write the request in one transaction,
  // then sign out again so no other page takes the visitor for a user
  function submit(payload) {
    var fb = window.firebase, cfg = window.MS_FIREBASE;
    if (!fb || !cfg) return Promise.reject({ code: 'unavailable' });
    var app = fb.apps.length ? fb.app() : fb.initializeApp(cfg), auth = fb.auth(app), db = fb.firestore(app);
    var had = auth.currentUser;
    if (had && !had.isAnonymous) return Promise.reject({ code: 'staff-session' });
    var go = had ? Promise.resolve() : auth.signInAnonymously();
    var day = dayStamp();
    // the four digits are random (they say nothing about how many requests there were that day). A code that already exists makes the
    // write an update, which the rules refuse for an anonymous visitor (permission-denied); then a new number is tried.
    function attempt(k) {
      var code = buildCode(payload.customer.city, day, rand4());
      return db.collection('requests').doc(code).set(Object.assign({ code: code, createdAt: Date.now(), status: 'new', route: 'call' }, payload)).then(function () { return code; },
        function (e) { if (k < 8 && /permission-denied/.test(e && e.code || '')) return attempt(k + 1); throw e; });
    }
    return go.then(function () { return attempt(0); }).then(function (code) { return auth.signOut().then(function () { return code; }, function () { return code; }); },
      function (e) { return auth.signOut().then(function () { throw e; }, function () { throw e; }); });
  }
  window.MSRequests = { TERMS: TERMS, STATUS: STATUS, ROUTE: ROUTE, LOGKIND: NEXT_LOG, latin: latin, fa: fa, digits: digits, phone: phone, validPhone: validPhone, validNid: validNid, validZip: validZip, text: text, cityCode: cityCode, buildCode: buildCode, check: check, errText: errText, submit: submit };
})();

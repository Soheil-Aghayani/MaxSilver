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
    q: '', fGroup: '', fStatus: 'all', fPay: '', sort: 'latest', shown: 60, invoices: null, users: null, busy: false, imp: null, impOpen: false, owner: null };

  (function () { var k = window.MSKeep ? window.MSKeep.get('customers') : {}; if (k.fStatus) S.fStatus = k.fStatus; if (k.fGroup != null) S.fGroup = k.fGroup; if (k.fPay != null) S.fPay = k.fPay; if (k.sort) S.sort = k.sort; })();
  function keepFilters() { if (window.MSKeep) window.MSKeep.set('customers', { fStatus: S.fStatus, fGroup: S.fGroup, fPay: S.fPay, sort: S.sort }); }

  // ---------- text helpers
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function latinDigits(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); }
  function faDigits(s) { return String(s == null ? '' : s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); }
  function fixLetters(s) { return String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/ۀ/g, 'ه').replace(/[‌‏‎]/g, ' ').replace(/[ـ]/g, '').replace(/[\s ]+/g, ' ').trim(); }
  function norm(s) { return latinDigits(fixLetters(s)).toLowerCase(); }
  // the Iranian national code has a check digit; a birthday is a Jalali date written yyyy/mm/dd
  function nidOk(v) {
    v = latinDigits(v); if (!/^\d{10}$/.test(v) || /^(\d)\1{9}$/.test(v)) return false;
    var sum = 0, i; for (i = 0; i < 9; i++) sum += Number(v.charAt(i)) * (10 - i);
    var r = sum % 11, c = Number(v.charAt(9)); return r < 2 ? c === r : c === 11 - r;
  }
  function bdayFix(v) { v = latinDigits(v).replace(/[\-.\s]+/g, '/').replace(/^\/|\/$/g, ''); var m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(v); return m ? m[1] + '/' + ('0' + m[2]).slice(-2) + '/' + ('0' + m[3]).slice(-2) : ''; }
  function bdayOk(v) { v = bdayFix(v); if (!v) return false; var p = v.split('/').map(Number); return p[0] >= 1250 && p[0] <= 1420 && p[1] >= 1 && p[1] <= 12 && p[2] >= 1 && p[2] <= (p[1] <= 6 ? 31 : 30); }
  function postalOk(v) { return /^\d{10}$/.test(latinDigits(v)); }
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
  var can = function (area) { if (!(S.profile && S.profile.active !== false && window.MSRoles)) return false; return window.MSPerm ? window.MSPerm.can(S.profile.role, S.user && S.user.uid, area) : window.MSRoles.can(S.profile.role, area); };
  var myName = function () { return (S.profile && S.profile.name) || (S.user && S.user.email) || ''; };


  // ---------- look: every customer gets a colour (from the owner group, else the name) and a letter; icons are the app's stroke family
  var PAL = ['#3858e9', '#7f54b3', '#0891b2', '#e39c27', '#ce1f39', '#0d9488', '#ff6a00', '#65a30d', '#be185d', '#4338ca', '#0369a1', '#a16207'];
  function hue(c) { var s = norm(c.group || c.name || ''), h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PAL[h % PAL.length]; }
  function inkOn(col) { var r = parseInt(col.substr(1, 2), 16), g = parseInt(col.substr(3, 2), 16), b = parseInt(col.substr(5, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#071b36' : '#ffffff'; }
  function letter(c) { var n = String(c.name || '').replace(/\[.*?\]/g, '').trim(); return esc(n.charAt(0) || '؟'); }
  // «win» at the end of an accounting title marks a Wintora customer: the card shows a Wintora badge instead of the word in the name
  function isWin(c) { return /(^|[^a-z])win\s*$/i.test(String(c.name || '').replace(/\[.*?\]/g, '').trim()); }
  function shownName(c) { return String(c._title || c.name || '').replace(/\s*\[.*?\]\s*$/, '').replace(/\s*win\s*$/i, '').trim(); }
  // a small face drawn from the customer's code and name (the idea of «Boring Avatars», MIT licence; drawn here, nothing is loaded from the internet)
  var AVC = ['#ffcc2a', '#071b36', '#3858e9', '#ce1f39', '#0d9488', '#7f54b3', '#ff6a00', '#0891b2'], AVMEMO = {};
  function avHash(str) { var h = 0; for (var i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h = h & h; } return Math.abs(h); }
  function avUnit(n, range, idx) { var v = n % range; return idx && (Math.floor(n / Math.pow(10, idx)) % 10) % 2 === 0 ? -v : v; }
  function avInk(col) { var r = parseInt(col.substr(1, 2), 16), g = parseInt(col.substr(3, 2), 16), b = parseInt(col.substr(5, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) >= 128 ? '#071b36' : '#ffffff'; }
  function face(c) {
    var key = String(c.code || '') + '|' + String(c.name || ''); if (AVMEMO[key]) return AVMEMO[key];
    var n = avHash(key), L = AVC.length, SZ = 36;
    var wrap = AVC[n % L], bg = AVC[(n + 13) % L]; if (bg === wrap) bg = AVC[(n + 14) % L];
    var tx = avUnit(n, 10, 1), ty = avUnit(n, 10, 2); tx = tx < 5 ? tx + SZ / 9 : tx; ty = ty < 5 ? ty + SZ / 9 : ty;
    var rot = avUnit(n, 360), sc = 1 + avUnit(n, SZ / 12) / 10, open = n % 2 === 0, round = (Math.floor(n / 10) % 2) === 0;
    var eye = avUnit(n, 5), mouth = avUnit(n, 3), frot = avUnit(n, 10, 3), ink = avInk(wrap);
    var ftx = tx > SZ / 6 ? tx / 2 : avUnit(n, 8, 1), fty = ty > SZ / 6 ? ty / 2 : avUnit(n, 7, 2);
    var svg = '<svg viewBox="0 0 36 36" fill="none" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" fill="' + bg + '"/>' +
      '<rect x="0" y="0" width="36" height="36" transform="translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') rotate(' + rot + ' 18 18) scale(' + sc.toFixed(2) + ')" fill="' + wrap + '" rx="' + (round ? 36 : 6) + '"/>' +
      '<g transform="translate(' + ftx.toFixed(2) + ' ' + fty.toFixed(2) + ') rotate(' + frot + ' 18 18)">' +
      (open ? '<path d="M15 ' + (19 + mouth) + 'c2 1 4 1 6 0" stroke="' + ink + '" fill="none" stroke-linecap="round"/>' : '<path d="M13 ' + (21 + mouth) + 'a1 0.75 0 0 0 10 0Z" fill="' + ink + '"/>') +
      '<rect x="' + (14 - eye) + '" y="14" width="1.5" height="2" rx="1" stroke="none" fill="' + ink + '"/><rect x="' + (20 + eye) + '" y="14" width="1.5" height="2" rx="1" stroke="none" fill="' + ink + '"/></g></svg>';
    return (AVMEMO[key] = svg);
  }
  var IC = {
    pin: '<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c0-3.8 3.4-6.5 7.5-6.5s7.5 2.7 7.5 6.5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6M17 5a3.5 3.5 0 0 1 0 7M21.5 20c0-2.6-1.7-4.7-4.2-5.6"/>',
    coins: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
    spark: '<path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/>',
    alert: '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17h.01"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    medal: '<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5 7 21l5-3 5 3-1.5-7.5"/>', phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>'
  };
  function ic(k, cls) { return '<svg class="' + (cls || 'cu-i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>'; }
  function chg(v) { return '<em class="' + (v >= 0 ? 'up' : 'down') + '">' + ic(v >= 0 ? 'up' : 'down', 'cu-ar') + faPct.format(Math.abs(v)) + '٪</em>'; }
  var STC = { active: '#14804a', 'new': '#1746b5', atrisk: '#e08a00', lost: '#8795aa', idle: '#c3cad6' };

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
  (function () {
    var more = {
      'تهران ': ['بنی هاشم', 'بازار تهران', 'ناصر خسرو'],
      'تهران': ['شهر ری', 'دماوند', 'پردیس', 'بومهن', 'رباط کریم', 'ملارد', 'نسیم شهر', 'بهارستان', 'فشم', 'پیشوا', 'قرچک', 'چهاردانگه'],
      'البرز': ['کرج', 'فردیس', 'نظرآباد', 'ماهدشت', 'محمدشهر', 'هشتگرد', 'اشتهارد', 'طالقان'],
      'اصفهان': ['خمینی شهر', 'شاهین شهر', 'فولادشهر', 'زرین شهر', 'گلپایگان', 'خوانسار', 'میمه', 'فلاورجان', 'مبارکه', 'نایین', 'اردستان', 'سمیرم'],
      'خراسان رضوی': ['تربت حیدریه', 'قوچان', 'گناباد', 'کاشمر', 'تایباد', 'تربت جام', 'چناران', 'درگز', 'فریمان'],
      'خوزستان': ['ایذه', 'اندیمشک', 'شوشتر', 'شوش', 'مسجد سلیمان', 'رامهرمز', 'سوسنگرد', 'هندیجان', 'بندر ماهشهر', 'امیدیه', 'باغملک'],
      'فارس': ['فسا', 'داراب', 'آباده', 'نی ریز', 'اقلید', 'فیروزآباد', 'استهبان', 'سپیدان', 'ممسنی', 'زرقان', 'سروستان'],
      'کرمان': ['سیرجان', 'جیرفت', 'بم', 'زرند', 'کهنوج', 'بردسیر', 'شهربابک', 'راور'],
      'آذربایجان شرقی': ['مراغه', 'مرند', 'میانه', 'اهر', 'سراب', 'بناب', 'شبستر', 'ملکان', 'آذرشهر', 'اسکو', 'هشترود'],
      'آذربایجان غربی': ['خوی', 'مهاباد', 'میاندوآب', 'سلماس', 'بوکان', 'پیرانشهر', 'نقده', 'سردشت', 'تکاب', 'اشنویه'],
      'اردبیل': ['پارس آباد', 'مشگین شهر', 'خلخال', 'گرمی', 'بیله سوار'],
      'گیلان': ['لاهیجان', 'لنگرود', 'رودسر', 'انزلی', 'بندر انزلی', 'آستارا', 'تالش', 'فومن', 'صومعه سرا', 'رودبار', 'ماسال', 'سیاهکل', 'آستانه اشرفیه'],
      'مازندران': ['تنکابن', 'چالوس', 'نوشهر', 'بابلسر', 'محمودآباد', 'نکا', 'بهشهر', 'جویبار', 'قائمشهر', 'رامسر', 'فریدونکنار', 'کلاردشت'],
      'گلستان': ['گنبد', 'گنبد کاووس', 'علی آباد', 'علی آباد کتول', 'آق قلا', 'بندر ترکمن', 'کردکوی', 'آزادشهر', 'مینودشت', 'گمیشان', 'رامیان'],
      'سمنان': ['شاهرود', 'گرمسار', 'مهدی شهر', 'ایوانکی'],
      'قزوین': ['البرز قزوین', 'تاکستان', 'بوئین زهرا', 'آبیک'],
      'مرکزی': ['خمین', 'محلات', 'شازند', 'دلیجان', 'آشتیان'],
      'همدان': ['اسدآباد', 'تویسرکان', 'کبودرآهنگ', 'رزن'],
      'کرمانشاه': ['اسلام آباد غرب', 'سرپل ذهاب', 'کنگاور', 'سنقر', 'هرسین', 'صحنه', 'پاوه', 'جوانرود', 'قصر شیرین'],
      'کردستان': ['سقز', 'بانه', 'مریوان', 'قروه', 'بیجار', 'کامیاران'],
      'لرستان': ['دورود', 'الیگودرز', 'ازنا', 'کوهدشت', 'نورآباد', 'پلدختر'],
      'ایلام': ['دهلران', 'ایوان', 'آبدانان', 'مهران'],
      'هرمزگان': ['میناب', 'بندر لنگه', 'قشم', 'بندر خمیر', 'حاجی آباد', 'جاسک', 'پارسیان'],
      'بوشهر': ['برازجان', 'دشتستان', 'کنگان', 'عسلویه', 'خارک'],
      'سیستان و بلوچستان': ['ایرانشهر', 'زابل', 'خاش', 'سراوان', 'نیک شهر', 'کنارک'],
      'یزد': ['میبد', 'اردکان', 'ابرکوه', 'بافق', 'تفت', 'مهریز', 'اشکذر'],
      'قم': [],
      'خراسان جنوبی': ['قائن', 'فردوس', 'طبس', 'نهبندان'],
      'خراسان شمالی': ['شیروان', 'اسفراین', 'آشخانه'],
      'چهارمحال و بختیاری': ['بروجن', 'فارسان', 'لردگان', 'سامان', 'فرخ شهر'],
      'کهگیلویه و بویراحمد': ['دهدشت', 'گچساران', 'دوگنبدان'],
      'زنجان': ['ابهر', 'خرمدره', 'خدابنده'],
      'قزوین ': []
    };
    Object.keys(more).forEach(function (prov) { more[prov].forEach(function (c) { if (!CITY_PROVINCE[c]) CITY_PROVINCE[c] = prov.trim(); }); });
  })();
  function provinceOf(city) {
    if (!city) return '';
    if (CITY_PROVINCE[city]) return CITY_PROVINCE[city];
    if (W && W.regionByProvince && W.regionByProvince[city]) return city;
    return '';
  }
  function regionOf(prov) { return prov && W && W.regionByProvince ? (W.regionByProvince[prov] || '') : ''; }
  function isCity(t) { return !!(CITY_PROVINCE[t] || (W && W.regionByProvince && W.regionByProvince[t])); }
  // "پرویزی (کازرون)" -> { name: 'پرویزی', city: 'کازرون' };  "(تهران)'مهرداد" is a known malformed form
  // «گازسو» and similar: companies the owner knows by name, when the title carries no city
  var KNOWN_PROVINCE = { 'گازسو': 'البرز' };
  // a market district written like a city is the city it belongs to
  var PAREN_PLACE = { 'جمهوری': 'تهران', 'خیابان جمهوری': 'تهران', 'ناصرخسرو': 'تهران' };   // «(جمهوری)» is the street, i.e. Tehran
  var CITY_ALIAS = { 'بنی هاشم': 'تهران', 'بازار تهران': 'تهران', 'ناصر خسرو': 'تهران' };
  // the first known city written in an address, e.g. «کرج، شاهین ویلا…»; looks only at the first words
  function cityIn(text) {
    var t = ' ' + fixLetters(text).slice(0, 70).replace(/[،,:؛\-_/\\.]/g, ' ') + ' ', best = '', at = 1e9;
    Object.keys(CITY_PROVINCE).forEach(function (k) {
      var key = k.trim(); if (key.length < 3) return;
      var i = t.indexOf(' ' + key + ' '); if (i >= 0 && (i < at || (i === at && key.length > best.length))) { best = key; at = i; }
    });
    return CITY_ALIAS[best] || best;
  }
  // payment behaviour (set by the sales leads): how a customer usually pays; a cheque customer may also pay part in cash
  var PAY = {
    cash: { i: 'cash-payment', t: 'نقدی، پیش از ارسال', s: 'نقدی', d: 'مشتری فقط اول نقدی واریز می‌کند.' },
    days: { i: 'days-reminder', t: 'واریز ۱۰ تا ۲۰ روز بعد', s: '۱۰–۲۰ روزه', d: 'مشتری بعد از ۱۰ تا ۲۰ روز واریز می‌کند.' },
    chequeBefore: { i: 'cheque-payment', t: 'چک پیش از ارسال بار', s: 'چک اول', d: 'مشتری اول چک می‌دهد (پیش از ارسال بار).' },
    chequeAfter: { i: 'after-delivery-payment', t: 'چک پس از ارسال بار', s: 'چک بعد از بار', d: 'مشتری بعد از ارسال بار چک می‌دهد.' }
  };
  var PAY_ORDER = ['cash', 'days', 'chequeBefore', 'chequeAfter'];
  function payOf(c) { return c.payMode && PAY[c.payMode] ? c.payMode : ''; }
  function isCheque(m) { return m === 'chequeBefore' || m === 'chequeAfter'; }
  function payShort(c) {
    var m = payOf(c); if (!m) return c._pay || '';
    var t = PAY[m].s, pct = Number(c.payChequePct);
    if (isCheque(m) && c.payMixed) t += ' + نقدی' + (pct > 0 && pct < 100 ? ' (چک ' + faInt.format(pct) + '٪)' : '');
    return t;
  }
  function payChip(c, lg) {
    var t = payShort(c); if (!t) return '';
    var m = payOf(c);
    return ' <span class="cu-pay' + (lg ? ' lg' : '') + (m ? ' pm-' + m : '') + '" title="' + esc(m ? PAY[m].d : 'رفتار خرید، از عنوان حسابداری') + '">' + esc(t) + '</span>';
  }
  function payFromText(t) {
    t = fixLetters(String(t || '')).replace(/\s+/g, ' ');
    if (!t) return '';
    if (/چک/.test(t)) return /(پس|بعد)/.test(t) ? 'chequeAfter' : /(پیش|اول|قبل)/.test(t) ? 'chequeBefore' : '';
    if (/روز/.test(t)) return 'days';
    if (/نقد/.test(t)) return 'cash';
    return '';
  }
  var PAYWORDS = { 'نقدی': 'نقدی', 'نقد': 'نقدی', 'چکی': 'چکی', 'چک': 'چکی', 'اعتباری': 'اعتباری', 'مدت دار': 'مدت‌دار', 'مدتدار': 'مدت‌دار' };
  // "پرویزی (کازرون)" -> { name: 'پرویزی', city: 'کازرون' };  "(تهران)'مهرداد" is a known malformed form;
  // «(نقدی)» or «(چکی)» in a title says how the customer pays: it is returned as pay and taken out of the name;
  // a dash or underscore before the city («احمد-تهران», «محمدپرست _زاهدان») is a separator, not part of the name
  function parseTitle(raw) {
    var s = fixLetters(raw), city = '', win = false, pay = '';
    s = s.replace(/\s*win\s*$/i, function () { win = true; return ''; });   // «win» at the end marks a Wintora customer; it is kept at the end of the name
    s = s.replace(/\(\s*([^()]*?)\s*\)/g, function (all, inner) {
      var k = fixLetters(inner); if (PAYWORDS[k]) { pay = PAYWORDS[k]; return ' '; } return all;
    });
    var lead = /^\(\s*([^)]+?)\s*\)\s*['’`]?\s*(.+)$/.exec(s);
    if (lead && isCity(lead[1].trim())) { city = lead[1].trim(); s = lead[2]; }
    if (!city) {
      var re = /\(\s*([^()]+?)\s*\)/g, m;
      while ((m = re.exec(s))) { var inner = m[1].trim(); if (isCity(inner) || PAREN_PLACE[inner]) { city = isCity(inner) ? inner : PAREN_PLACE[inner]; s = (s.slice(0, m.index) + ' ' + s.slice(m.index + m[0].length)); break; } }
    }
    s = s.replace(/\s+/g, ' ').replace(/\(\s*\)/g, '').trim();
    // a separator at the end or in front of a trailing city
    s = s.replace(/\s*[-_–—]+\s*$/, '').trim();
    if (!city) {
      var sep = /^(.*?)\s*[-_–—]+\s*([^\s\-_–—][^\-_–—]*)$/.exec(s);
      if (sep && isCity(sep[2].trim())) { city = sep[2].trim(); s = sep[1].trim(); }
    }
    if (!city) {
      // «(یوسفی)گرگان»: a city written right after a closing bracket; also two-word cities («قائم شهر») at the end
      var spaced = s.replace(/\)(?=[^\s)])/g, ') ').replace(/(\S)\(/g, '$1 (');
      var words = spaced.split(' ');
      if (words.length > 2 && isCity(words[words.length - 2] + ' ' + words[words.length - 1])) { city = words[words.length - 2] + ' ' + words[words.length - 1]; s = words.slice(0, -2).join(' '); }
      else if (words.length > 1 && isCity(words[words.length - 1])) { city = words[words.length - 1]; s = words.slice(0, -1).join(' '); }
    }
    // tidy: no space inside brackets, one space before «(» and after «)»; a dash left at the end goes
    s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/(\S)\(/g, '$1 (').replace(/\)(?=[^\s)])/g, ') ').replace(/\s*[-_–—]+\s*$/, '').replace(/\s+/g, ' ').trim();
    return { name: ((s || fixLetters(raw)).trim() + (win ? ' win' : '')).trim(), city: (CITY_ALIAS[city.trim()] || city.trim()), pay: pay };
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
      c._key = norm([c.name, c.code, c.city, c.group, isWin(c) ? 'وینتورا wintora' : ''].join(' '));
      // a saved customer without a city: read it from the title («صنایع امین (یوسفی)گرگان»), as the import does
      var tp = parseTitle(c.name || ''); c._title = tp.name; c._pay = tp.pay;
      if (!c.city && tp.city) c.city = tp.city;
      if (!c.city && c.address) { var ac = cityIn(c.address); if (ac) c.city = ac; }
      if (c.city && !c.province) c.province = provinceOf(c.city.trim());
      if (!c.province) { var kn = Object.keys(KNOWN_PROVINCE).filter(function (k) { return String(c.name || '').indexOf(k) >= 0; })[0]; if (kn) c.province = KNOWN_PROVINCE[kn]; }
      c._nameKey = norm(c.name);
      c._status = statusOf(c, S.latest);
      // the accounting reports are in rial; every figure shown here is in toman
      c._latest = ((c.sales || {})[S.latest] || 0) / 10;
      c._prev = ((c.sales || {})[S.latest - 1] || 0) / 10;
      c._total = Object.keys(c.sales || {}).reduce(function (a, k) { return a + (c.sales[k] || 0); }, 0) / 10;
      Object.keys(c.sales || {}).forEach(function (k) { tot[k] = (tot[k] || 0) + (c.sales[k] || 0); });
    });
    S.yearTotals = tot;
    // one company can have several accounts in the accounting program (for example a separate «win» account for Wintora): they are shown together
    var byBase = {};
    S.list.forEach(function (c) {
      var b = norm(parseTitle(c.name || '').name).replace(/\(.*?\)/g, ' ').replace(/\bwin\b/g, ' ').replace(/\s+/g, ' ').trim();
      c._base = b.split(' ').length >= 2 && b.length >= 8 ? b : '';
      if (c._base) (byBase[c._base] = byBase[c._base] || []).push(c);
    });
    S.list.forEach(function (c) { c._sibs = c._base ? byBase[c._base].filter(function (x) { return x !== c; }) : []; });
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
        // accounts joined to another one («mergedInto») are shown inside it: their sales and balances are added to the main account
        S.byCode = {}; S.list.forEach(function (d) { S.byCode[d.code] = d; });
        var into = function (d) { var t = d.mergedInto && d.mergedInto !== d.code && S.byCode[d.mergedInto]; return t && !t.mergedInto ? t : null; };
        S.list.forEach(function (d) { var t = into(d); if (t) (t._merged = t._merged || []).push(d); });
        S.list = S.list.filter(function (d) { return !into(d); });
        // colleagues who also have an accounting account are kept out of the customer list (marked by management with the button in «کارکنان در فهرست مشتریان»)
        S.staffCust = S.list.filter(function (d) { return d.isStaff === true; });
        S.list = S.list.filter(function (d) { return d.isStaff !== true; });
        S.list.forEach(function (t) {
          if (!t._merged) return;
          var sl = Object.assign({}, t.sales || {}), bl = Object.assign({}, t.balances || {});
          t._ownSales = t.sales || {}; t._ownBal = t.balances || {};
          t._merged.forEach(function (d) {
            Object.keys(d.sales || {}).forEach(function (y) { sl[y] = (sl[y] || 0) + d.sales[y]; });
            Object.keys(d.balances || {}).forEach(function (y) { bl[y] = (bl[y] || 0) + d.balances[y]; });
          });
          t.sales = sl; t.balances = bl;
        });
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
      if (S.fPay && (S.fPay === '__none' ? payOf(c) : payOf(c) !== S.fPay)) return false;
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
    var d = (c._latest && c._prev > 0) || c._prev > 0 ? (c._latest - c._prev) / c._prev * 100 : null, col = hue(c), rk = (S.rank[c.code] || {})[S.latest];
    return '<li data-code="' + esc(c.code) + '"><a class="cu-card" href="#/c/' + encodeURIComponent(c.code) + '" style="--c:' + col + ';--ink:' + inkOn(col) + '">' +
      '<div class="cu-card-top"><span class="cu-av face">' + face(c) + '</span><div class="cu-nm"><b>' + esc(shownName(c)) + (isWin(c) ? ' <span class="cu-win">وینتورا</span>' : '') + payChip(c) + (c._merged && c._merged.length ? ' <span class="cu-sib on" title="حساب‌های ترکیب‌شده">' + faInt.format(c._merged.length + 1) + ' حساب</span>' : '') + (c._sibs && c._sibs.length ? ' <span class="cu-sib" title="حساب‌های هم‌نام در حسابداری؛ در پروفایل می‌توانید ترکیب کنید">هم‌نام ' + faInt.format(c._sibs.length) + '</span>' : '') + '</b>' +
      '<div class="cu-card-meta"><span dir="ltr">' + ic('tag') + esc(c.code) + '</span>' + (c.city ? '<span>' + ic('pin') + esc(c.city) + '</span>' : '') + (c.group ? '<span>' + ic('user') + esc(c.group) + '</span>' : '') + '</div></div>' +
      '<span class="cu-chip st-' + c._status + '"><i style="background:' + STC[c._status] + '"></i>' + STATUS[c._status] + '</span></div>' +
      '<div class="cu-card-sales">' + bars(c) + '<span class="cu-amt"><small>فروش ' + faDigits(S.latest) + ' · تومان</small><b>' + compact(c._latest) + '</b></span>' +
      (rk && rk.n <= 5 ? '<span class="cu-rk" title="رتبهٔ ' + faInt.format(rk.n) + ' در فروش ' + faDigits(S.latest) + '">' + ic('medal') + faInt.format(rk.n) + '</span>' : '') +
      (d === null ? '' : chg(d)) + '</div></a></li>';
  }
  function listHtml() {
    var list = filtered(), part = list.slice(0, S.shown);
    return (part.length ? part.map(card).join('') : '<li class="cu-note ms-empty"><img class="ms-empty-img" src="./assets/art/tiles/no-results.webp" alt="" width="96" height="96" decoding="async"><span>مشتری مطابق این فیلتر پیدا نشد.</span></li>') +
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
  // the three filters (search, group, status) all shape every number: status counts and the tiles use search + group; group counts use search + status
  function scopes() {
    var q = norm(S.q), mq = function (c) { return !q || c._key.indexOf(q) >= 0; };
    var gOk = function (c) { return S.fGroup === '' || (S.fGroup === '__none' ? !c.group : c.group === S.fGroup); };
    var sOk = function (c) { return S.fStatus === 'all' || c._status === S.fStatus; };
    var pOk = function (c) { return !S.fPay || (S.fPay === '__none' ? !payOf(c) : payOf(c) === S.fPay); };
    var inGroup = S.list.filter(function (c) { return mq(c) && gOk(c) && pOk(c); }), inStatus = S.list.filter(function (c) { return mq(c) && sOk(c) && pOk(c); });
    var gcount = {}; inStatus.forEach(function (c) { var g = c.group || ''; gcount[g] = (gcount[g] || 0) + 1; });
    var pcount = { '': 0, __none: 0 }; PAY_ORDER.forEach(function (k) { pcount[k] = 0; });
    S.list.forEach(function (c) { if (mq(c) && gOk(c) && sOk(c)) { var m = payOf(c); pcount[m || '__none']++; pcount['']++; } });
    return { inGroup: inGroup, inStatus: inStatus, gcount: gcount, pcount: pcount, cnt: function (st) { return st === 'all' ? inGroup.length : inGroup.filter(function (c) { return c._status === st; }).length; } };
  }
  function kpiHtml(sc) {
    var inGroup = sc.inGroup, cnt = sc.cnt, act = inGroup.filter(function (c) { return c._status === 'active' || c._status === 'new'; });
    var revenue = inGroup.reduce(function (a, c) { return a + c._latest; }, 0);
    var KART = { users: 'active-customers', coins: 'sales-revenue', spark: 'new-customer', alert: 'at-risk-customers' };
    var tile = function (k, color, label, val) { return '<div style="--c:' + color + '"><img class="cu-kimg" src="./assets/art/tiles/' + KART[k] + '.webp" alt="" width="96" height="96" decoding="async" onerror="this.remove()"><div><span>' + label + '</span><b>' + val + '</b></div></div>'; };
    var tot = inGroup.length || 1, order = ['active', 'new', 'atrisk', 'lost', 'idle'];
    var kpi = '<div class="cu-kpis">' +
      tile('users', '#14804a', 'مشتری فعال ' + faDigits(S.latest || ''), faInt.format(act.length)) +
      tile('coins', '#1746b5', 'فروش ' + faDigits(S.latest || '') + ' (تومان)', compact(revenue)) +
      tile('spark', '#7f54b3', 'مشتری جدید', faInt.format(cnt('new'))) +
      tile('alert', '#e08a00', 'در معرض ریزش', faInt.format(cnt('atrisk'))) + '</div>' +
      '<div class="cu-dist" role="img" aria-label="پراکندگی وضعیت مشتریان"><div class="cu-dist-bar">' + order.map(function (s) { var n = cnt(s); return n ? '<i style="flex:' + n + ';background:' + STC[s] + '" title="' + STATUS[s] + ': ' + faInt.format(n) + '"></i>' : ''; }).join('') + '</div>' +
      '<div class="cu-dist-lg">' + order.map(function (s) { var n = cnt(s); return n ? '<span><i style="background:' + STC[s] + '"></i>' + STATUS[s] + ' ' + faInt.format(n) + '</span>' : ''; }).join('') + '</div></div>';
    return kpi;
  }
  var REDUCE = false; try { REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  function snapCards() { var m = {}; [].forEach.call(document.querySelectorAll('#cuList li[data-code]'), function (li) { m[li.getAttribute('data-code')] = li.getBoundingClientRect(); }); return m; }
  // cards that stay glide to their new place; new ones rise in (FLIP)
  function flipCards(before) {
    if (REDUCE || !Element.prototype.animate) return;
    [].forEach.call(document.querySelectorAll('#cuList li[data-code]'), function (li, i) {
      var r = li.getBoundingClientRect(), b = before[li.getAttribute('data-code')];
      if (b) { var dx = b.left - r.left, dy = b.top - r.top; if (dx || dy) li.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,.9,.3,1)' }); }
      else li.animate([{ opacity: 0, transform: 'translateY(12px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: Math.min(i, 8) * 28, easing: 'ease-out', fill: 'backwards' });
    });
  }
  // the dark «selected» pill glides from one chip to the next
  function movePills(animate) {
    [].forEach.call(root.querySelectorAll('.cu-fchips[data-pill]'), function (box) {
      var on = box.querySelector('.cu-fchip[aria-pressed="true"]'), pill = box.querySelector('.cu-pill');
      if (!on) { if (pill) pill.style.opacity = '0'; return; }
      if (!pill) { pill = document.createElement('i'); pill.className = 'cu-pill'; box.insertBefore(pill, box.firstChild); animate = false; }
      box.classList.add('has-pill');
      pill.style.transition = animate && !REDUCE ? '' : 'none';
      pill.style.width = on.offsetWidth + 'px'; pill.style.height = on.offsetHeight + 'px';
      pill.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)'; pill.style.opacity = '1';
    });
  }
  function updateChips(sc) {
    [].forEach.call(root.querySelectorAll('[data-status]'), function (b) { var v = b.getAttribute('data-status'); b.setAttribute('aria-pressed', S.fStatus === v); var n = b.querySelector('b'); if (n) n.textContent = faInt.format(sc.cnt(v)); });
    [].forEach.call(root.querySelectorAll('[data-group]'), function (b) {
      var v = b.getAttribute('data-group'), n = b.querySelector('b'); b.setAttribute('aria-pressed', S.fGroup === v);
      if (n) { var k = v === '__none' ? '' : v; n.textContent = faInt.format(sc.gcount[k] || 0); }
    });
    [].forEach.call(root.querySelectorAll('[data-pay]'), function (b) {
      var v = b.getAttribute('data-pay'), n = b.querySelector('b'); b.setAttribute('aria-pressed', S.fPay === v);
      if (n) n.textContent = faInt.format(sc.pcount[v] || 0);
    });
    [].forEach.call(root.querySelectorAll('[data-sort]'), function (b) { b.setAttribute('aria-pressed', S.sort === b.getAttribute('data-sort')); });
  }
  // a filter was changed: numbers, tiles, chips and the list change in place, with motion
  function refreshAll(animate) {
    var kp = document.getElementById('cuKpi'); if (!kp) { render(); return; }
    keepFilters();
    var before = animate ? snapCards() : null, sc = scopes();
    kp.innerHTML = kpiHtml(sc); updateChips(sc); paintList();
    if (before) flipCards(before);
    movePills(animate);
  }
  function listView() {
    keepFilters();
    var gn = groupNames(); if (S.fGroup && S.fGroup !== '__none' && !gn[S.fGroup]) S.fGroup = '';
    var names = Object.keys(gn).filter(Boolean).sort(function (a, b) { return gn[b] - gn[a]; });
    var statuses = ['all', 'active', 'new', 'atrisk', 'lost', 'idle'];
    var sc = scopes(), cnt = sc.cnt, gcount = sc.gcount;
    var kpi = '<div id="cuKpi">' + kpiHtml(sc) + '</div>';
    var statusChips = statuses.map(function (s) {
      return '<button type="button" class="cu-fchip" data-status="' + s + '" aria-pressed="' + (S.fStatus === s) + '">' + (s === 'all' ? 'همه' : STATUS[s]) + ' <b>' + faInt.format(cnt(s)) + '</b></button>';
    }).join('');
    var groupChips = '<button type="button" class="cu-fchip" data-group="" aria-pressed="' + (S.fGroup === '') + '">همهٔ گروه‌ها</button>' + names.map(function (g) {
      return '<button type="button" class="cu-fchip" data-group="' + esc(g) + '" aria-pressed="' + (S.fGroup === g) + '">' + esc(g) + ' <b>' + faInt.format(gcount[g] || 0) + '</b></button>';
    }).join('') + (gn[''] ? '<button type="button" class="cu-fchip" data-group="__none" aria-pressed="' + (S.fGroup === '__none') + '">بدون گروه <b>' + faInt.format(gcount[''] || 0) + '</b></button>' : '');
    var payChips = [['', 'همه']].concat(PAY_ORDER.map(function (k) { return [k, PAY[k].s]; }), [['__none', 'ثبت نشده']]).map(function (x) {
      return '<button type="button" class="cu-fchip' + (x[0] && x[0] !== '__none' ? ' pm-' + x[0] : '') + '" data-pay="' + x[0] + '" aria-pressed="' + (S.fPay === x[0]) + '">' + x[1] + ' <b>' + faInt.format(sc.pcount[x[0]] || 0) + '</b></button>';
    }).join('');
    var sorts = [['latest', 'فروش سال جاری'], ['total', 'مجموع فروش'], ['name', 'نام']].map(function (s) {
      return '<button type="button" class="cu-fchip sm" data-sort="' + s[0] + '" aria-pressed="' + (S.sort === s[0]) + '">' + s[1] + '</button>';
    }).join('');
    return head('مشتریان') + kpi +
      '<section class="cu-card-box">' +
      '<label class="cu-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<input type="search" id="cuQ" placeholder="جست‌وجو: نام، کد، شهر یا گروه" value="' + esc(S.q) + '" autocomplete="off"></label>' +
      '<div class="cu-fchips" data-pill role="group" aria-label="وضعیت">' + statusChips + '</div>' +
      (S.groupFilterVisible !== false && names.length ? '<div class="cu-fchips scroll" data-pill role="group" aria-label="گروه">' + groupChips + '</div>' : '') +
      '<div class="cu-fchips scroll" data-pill role="group" aria-label="رفتار پرداخت"><span class="cu-fl">رفتار پرداخت</span>' + payChips + '</div>' +
      '<div class="cu-sortrow"><span id="cuCount">' + faInt.format(filtered().length) + ' مشتری</span><span class="cu-sorts">' + sorts + '</span></div>' +
      '<ul class="cu-list" id="cuList">' + listHtml() + '</ul></section>' +
      (can('customerAssign') ? reviewView() + groupsView() + staffSplitView() : '') +
      (can('customerImport') ? importView() : '');
  }
  function head(title, back) {
    return '<header class="cu-head"><div>' + (back ? '<a class="cu-back" href="#/" aria-label="بازگشت به فهرست">‹ مشتریان</a>' : '') + '<h1>' + esc(title) + '</h1>' +
      (back ? '' : '<p>پایگاه مشتریان؛ هر مشتری صفحهٔ خودش را دارد.' + (can('customerAll') ? '' : ' فقط مشتریان خودتان نمایش داده می‌شود.') + '</p>') + '</div>' +
      (back ? '' : '<div class="cu-hacts"><button type="button" class="cu-ico ghost" data-ex-open title="خروجی فهرست مشتریان (PDF یا Excel)" aria-label="خروجی فهرست مشتریان"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg></button><a class="cu-ico ghost" href="./sales-analysis.html" data-manager-only="analysis" title="تحلیل مجموعهٔ فروش" aria-label="تحلیل مجموعهٔ فروش"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M3 3v18h18M7 14l4-4 4 3 6-7\"/></svg></a></div>') + '</header>';
  }

  // ---------- groups and owners
  function groupsView() {
    var gn = groupNames(), names = Object.keys(gn).filter(Boolean).sort(function (a, b) { return gn[b] - gn[a]; });
    if (!names.length) return '';
    return '<section class="cu-card-box" id="groups"><h2>گروه‌ها و مسئول</h2><p class="cu-note">هر گروه یک همکار یا شخص مسئول دارد. با تعیین مسئول، همهٔ مشتریان آن گروه برای او در «مشتریان» دیده می‌شود و همکاران دیگر آن‌ها را نمی‌بینند.</p>' +
      '<ul class="cu-glist">' + names.map(function (g) {
        var sum = S.list.filter(function (c) { return c.group === g; }).reduce(function (a, c) { return a + c._latest; }, 0);
        var info = S.groups[gkey(g)] || {};
        return '<li><div><b>' + esc(g) + '</b><span>' + faInt.format(gn[g]) + ' مشتری · فروش ' + faDigits(S.latest) + ': ' + compact(sum) + ' تومان</span></div>' +
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
  function chg_(v) { return chg(v); }
  function yearBars(c) {
    var max = Math.max.apply(null, S.years.map(function (y) { return (c.sales || {})[y] || 0; }).concat([1]));
    return '<div class="cu-years" style="--c:' + hue(c) + '">' + S.years.map(function (y, i) {
      var v = (c.sales || {})[y] || 0, pv = i ? (c.sales || {})[S.years[i - 1]] || 0 : 0;
      var chg = i && pv > 0 ? (v - pv) / pv * 100 : null, r = (S.rank[c.code] || {})[y], tot = (S.yearTotals || {})[y] || 0;
      return '<div class="cu-year"><div class="cu-bar"><i style="height:' + Math.max(3, Math.round(v / max * 100)) + '%"></i></div>' +
        '<b>' + compact(v / 10) + '</b><span>' + faDigits(y) + (y === S.latest ? ' (تا امروز)' : '') + '</span>' +
        (chg === null ? '' : chg_(chg)) +
        (v > 0 && tot ? '<small>سهم ' + faInt.format(Math.round(v / tot * 1000) / 10) + '٪' + (r ? ' · رتبهٔ ' + faInt.format(r.n) + ' از ' + faInt.format(r.of) : '') + '</small>' : '') + '</div>';
    }).join('') + '</div>';
  }
  // account and payments: the balance at the end of each year comes from the accounting program; what the customer paid in a year is
  // worked out as  previous balance + sales of the year - balance at the end of the year  (it includes returns and discounts, so it is approximate)
  function cashHtml(c) {
    var b = c.balances || {}, ys = Object.keys(b).map(Number).sort(); if (!ys.length) return '';
    var rows = ys.map(function (y) {
      var bal = b[y] / 10, prev = b[y - 1], sale = (c.sales || {})[y], pay = (prev != null && sale != null) ? (prev + sale - b[y]) / 10 : null;
      return '<tr><th>' + faDigits(y) + '</th><td>' + (sale != null ? compact(sale / 10) : '—') + '</td><td class="' + (bal > 0 ? 'owe' : bal < 0 ? 'cred' : '') + '">' + (bal === 0 ? '۰' : compact(Math.abs(bal)) + ' ' + (bal > 0 ? 'بدهکار' : 'بستانکار')) + '</td><td>' + (pay == null ? '—' : compact(Math.max(pay, 0)) ) + '</td></tr>';
    }).join('');
    return '<section class="cu-card-box"><h2>حساب و پرداخت</h2><div class="cu-cash"><table><thead><tr><th>سال</th><th>فروش</th><th>مانده پایان سال</th><th>دریافت‌شده (تقریبی)</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="cu-note">تومان. «بدهکار» یعنی مشتری به ما بدهکار است و «بستانکار» یعنی از ما طلب دارد (پیش‌پرداخت یا برگشتی). «دریافت‌شده» را از «مانده سال قبل + فروش − مانده این سال» حساب می‌کنیم؛ برگشتی و تخفیف را هم شامل می‌شود و فقط تقریبی است.</p></section>';
  }
  // ---------- tidy addresses and find look-alike accounts
  // only safe clean-ups: separators, spaces, «خ» -> «خیابان», «وحد» -> «واحد», digits stuck to letters, Persian digits. Spelling is never guessed.
  function tidyAddress(a) {
    var t = fixLetters(String(a || '')).replace(/[\u200c\u200f\u00a0]/g, function (m) { return m === '\u200c' ? '\u200c' : ' '; });
    t = t.replace(/\s+/g, ' ').trim();
    t = t.replace(/\s*[-–—_ـ]+\s*/g, function (m, off, str) {
      var pr = str.charAt(off - 1), nx = str.charAt(off + m.length);
      return /\d/.test(pr) && /\d/.test(nx) ? '-' : '، ';
    });
    t = t.replace(/\s*[,،]+\s*/g, '، ');
    t = t.replace(/([\u0600-\u06FF])(\d)/g, '$1 $2').replace(/(\d)([\u0600-\u06FF])/g, '$1 $2');
    t = t.replace(/(^|[\s،])خ\.?(?=\s)/g, '$1خیابان').replace(/(^|[\s،])وحد(?=[\s\d]|$)/g, '$1واحد');
    t = t.replace(/(،\s*){2,}/g, '، ').replace(/^[،\s]+|[،\s]+$/g, '').replace(/\s+/g, ' ');
    return faDigits(t);
  }
  var SIM_STOP = { 'شرکت': 1, 'فروشگاه': 1, 'تجهیزات': 1, 'آشپزخانه': 1, 'صنعتی': 1, 'استیل': 1, 'گروه': 1, 'تولیدی': 1, 'بازرگانی': 1, 'صنایع': 1, 'تولید': 1, 'پخش': 1, 'سازان': 1, 'ماشین': 1, 'ماشین‌سازی': 1, 'و': 1, 'آقای': 1, 'خانم': 1, 'اقای': 1, 'مهندس': 1, 'دکتر': 1, 'رستوران': 1, 'کافه': 1, 'هتل': 1, 'نان': 1 };
  function simTokens(c) {
    var n = norm(parseTitle(c.name || '').name).replace(/\(.*?\)/g, ' ').replace(/\bwin\b/g, ' ').replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ');
    var seen = {}, out = [];
    n.split(/\s+/).forEach(function (w) { if (w.length > 1 && !SIM_STOP[w] && !seen[w]) { seen[w] = 1; out.push(w); } });
    return out;
  }
  function totalOf(c) { return Object.keys(c.sales || {}).reduce(function (a, y) { return a + (c.sales[y] || 0); }, 0); }
  function simDismissed() { try { return JSON.parse(localStorage.getItem('ms-cu-sim-no') || '[]'); } catch (e) { return []; } }
  function simDismiss(key) { try { var l = simDismissed(); if (l.indexOf(key) < 0) l.push(key); localStorage.setItem('ms-cu-sim-no', JSON.stringify(l)); } catch (e) { /* ignore */ } }
  function simGroups() {
    var L = S.list, n = L.length, par = [], why = {}, i, j;
    for (i = 0; i < n; i++) par[i] = i;
    var find = function (x) { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
    var join = function (a, b, r) { var ra = find(a), rb = find(b); if (ra !== rb) par[ra] = rb; (why[find(a)] = why[find(a)] || {})[r] = 1; if (ra !== rb) { Object.keys(why[ra] || {}).forEach(function (k) { why[rb] = why[rb] || {}; why[rb][k] = 1; }); } };
    var toks = L.map(simTokens), by = {};
    var idx = function (map, key, i2, r) { if (!key) return; (map[key] = map[key] || []).push(i2); };
    var phones = {}, nids = {}, tk = {};
    L.forEach(function (c, k) {
      var ph = latinDigits(c.phone || '').replace(/\D/g, ''); if (ph.length >= 10) idx(phones, ph.slice(-10), k);
      var ni = latinDigits(c.nationalId || '').replace(/\D/g, ''); if (ni.length === 10) idx(nids, ni, k);
      toks[k].forEach(function (w) { idx(tk, w, k); });
    });
    Object.keys(phones).forEach(function (k) { var a = phones[k]; for (i = 1; i < a.length; i++) join(a[0], a[i], 'تلفن یکسان'); });
    Object.keys(nids).forEach(function (k) { var a = nids[k]; for (i = 1; i < a.length; i++) join(a[0], a[i], 'کد ملی یکسان'); });
    var done = {};
    Object.keys(tk).forEach(function (w) {
      var a = tk[w]; if (a.length < 2 || a.length > 40) return;
      for (i = 0; i < a.length; i++) for (j = i + 1; j < a.length; j++) {
        var x = a[i], y = a[j], key = x + ',' + y; if (done[key]) continue; done[key] = 1;
        var tx = toks[x], ty = toks[y], sh = tx.filter(function (t) { return ty.indexOf(t) >= 0; }).length, mn = Math.min(tx.length, ty.length);
        if ((mn >= 2 && sh >= 2 && sh / mn >= 0.75) || (mn === 1 && tx.length === ty.length && sh === 1 && w.length >= 5)) join(x, y, 'نام مشابه');
      }
    });
    var cl = {};
    for (i = 0; i < n; i++) { var r = find(i); (cl[r] = cl[r] || []).push(L[i]); }
    var no = simDismissed(), out = [];
    Object.keys(cl).forEach(function (r) {
      var m = cl[r]; if (m.length < 2) return;
      m.sort(function (a, b) { return totalOf(b) - totalOf(a); });
      var key = m.map(function (c) { return c.code; }).sort().join(','); if (no.indexOf(key) >= 0) return;
      out.push({ key: key, members: m, why: Object.keys(why[find(L.indexOf(m[0]))] || why[r] || { 'نام مشابه': 1 }) });
    });
    out.sort(function (a, b) { return b.members.length - a.members.length || totalOf(b.members[0]) - totalOf(a.members[0]); });
    return out;
  }
  // ---------- colleagues among the customers: matched with the staff list (phone, or the same full name), then marked isStaff so they leave the customer list
  var SPI = { user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>', scan: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4-4M9 11l1.5 1.5L13.5 9"/>', undo: '<path d="M9 14 4 9l5-5M4 9h9a7 7 0 0 1 0 14h-3"/>', ok: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>' };
  var spi = function (k) { return '<svg class="cu-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SPI[k] + '</svg>'; };
  function tail10(v) { var d = latinDigits(String(v == null ? '' : v)).replace(/\D/g, ''); return d.length >= 10 ? d.slice(-10) : ''; }
  function staffSplitView() {
    if (!can('staff')) return '';
    var sp = S.sp, own = S.staffCust || [];
    var head = '<div class="cu-boxhead"><h2>کارکنان در فهرست مشتریان</h2><button type="button" class="cu-ico" data-sp-scan title="تشخیص با لیست پرسنلی" aria-label="تشخیص با لیست پرسنلی"' + (S.busy ? ' disabled' : '') + '>' + spi('scan') + '</button></div>';
    var body = '';
    if (sp) {
      body = sp.hits.length ? '<p class="cu-note">' + faInt.format(sp.hits.length) + ' مورد از ' + faInt.format(sp.n) + ' نفر پرسنل در مشتریان پیدا شد. تیک را بردارید برای کسی که واقعاً مشتری است.</p><ul class="cu-splist">' +
        sp.hits.map(function (h, i) { return '<li><label><input type="checkbox" data-sp-i="' + i + '"' + (h.on ? ' checked' : '') + '><span><b>' + esc(shownName(h.c)) + '</b><small>' + esc(h.why) + ' · ' + esc(h.p.name) + '</small></span></label></li>'; }).join('') + '</ul>' +
        '<div class="cu-acts"><button type="button" class="cu-ico" data-sp-apply title="از مشتریان جدا کن" aria-label="از مشتریان جدا کن">' + spi('ok') + '</button><button type="button" class="cu-ico ghost" data-sp-cancel title="انصراف" aria-label="انصراف">' + spi('x') + '</button></div>'
        : '<p class="cu-note">کسی از لیست پرسنلی در مشتریان پیدا نشد.</p>';
    } else if (own.length) {
      body = '<p class="cu-note">این حساب‌ها مشتری حساب نمی‌شوند و در آمار نیستند:</p><ul class="cu-splist">' + own.map(function (c) { return '<li><span><b>' + esc(shownName(c)) + '</b><small dir="ltr">' + esc(c.code) + '</small></span><button type="button" class="cu-ico ghost" data-sp-undo="' + esc(c.code) + '" title="برگرداندن به مشتریان" aria-label="برگرداندن به مشتریان">' + spi('undo') + '</button></li>'; }).join('') + '</ul>';
    } else body = '<p class="cu-note">هنوز کسی جدا نشده است. دکمهٔ بالا لیست پرسنلی را با مشتریان مقایسه می‌کند.</p>';
    return '<section class="cu-card-box">' + head + body + '</section>';
  }
  function scanStaff() {
    S.busy = true; S.error = ''; render();
    db.collection('staff').get().then(function (qs) {
      var people = []; qs.forEach(function (d) { var v = d.data(); if (v && v.status !== 'applicant') people.push(v); });
      var byPhone = {}, byName = {};
      people.forEach(function (p) { var t = tail10(p.phone); if (t) byPhone[t] = p; var n = norm(p.name).replace(/\s+/g, ' ').trim(); if (n.split(' ').length >= 2) byName[n] = p; });
      var hits = [];
      S.list.forEach(function (c) {
        var found = null, why = '';
        [c.phone, c.contact].forEach(function (f) { String(f || '').split(/[\s,،;/]+/).forEach(function (x) { var t = tail10(x); if (t && byPhone[t] && !found) { found = byPhone[t]; why = 'همان شمارهٔ تماس'; } }); });
        if (!found) { var nn = norm(shownName(c)).replace(/\s+/g, ' ').trim(); if (byName[nn]) { found = byName[nn]; why = 'همان نام کامل'; } }
        if (found) hits.push({ c: c, p: found, why: why, on: true });
      });
      S.sp = { hits: hits, n: people.length };
    }, function (e) { S.error = errText(e); }).then(function () { S.busy = false; render(); });
  }
  function applySplit() {
    var on = S.sp.hits.filter(function (h) { return h.on; }); if (!on.length) { S.sp = null; render(); return; }
    S.busy = true; render();
    var chunks = [], i; for (i = 0; i < on.length; i += 400) chunks.push(on.slice(i, i + 400));
    chunks.reduce(function (pr, ch) { return pr.then(function () { var b = db.batch(); ch.forEach(function (h) { b.update(db.collection('customers').doc(h.c.code), { isStaff: true, updatedAt: Date.now() }); }); return b.commit(); }); }, Promise.resolve())
      .then(function () { S.msg = faInt.format(on.length) + ' حساب از مشتریان جدا شد.'; S.sp = null; S.busy = false; S.list = []; load(); }, function (e) { S.error = errText(e); S.busy = false; render(); });
  }
  function undoSplit(code) {
    db.collection('customers').doc(code).update({ isStaff: false, updatedAt: Date.now() }).then(function () { S.msg = 'به مشتریان برگشت.'; S.list = []; load(); }, function (e) { S.error = errText(e); render(); });
  }

  // ---------- export: the customer list as PDF (printed page with the Estedad font) or Excel; choose the groups, the columns and what to leave out
  var EX_COLS = [['name', 'نام مشتری', 30], ['phone', 'شماره تلفن', 16], ['address', 'نشانی', 44], ['pay', 'رفتار پرداخت', 18], ['group', 'گروه مشتری', 18],
    ['code', 'کد حسابداری', 12], ['city', 'شهر', 14], ['province', 'استان', 14], ['status', 'وضعیت', 14], ['latest', 'فروش سال جاری (تومان)', 20], ['total', 'جمع فروش (تومان)', 20]];
  var EX_DEFAULT = { name: 1, phone: 1, address: 1, pay: 1, group: 1 };
  function exState() { return S.ex || (S.ex = { mode: 'only', groups: {}, cols: Object.assign({}, EX_DEFAULT), skipEmpty: false, useFilters: false }); }
  function exVal(c, k) {
    switch (k) {
      case 'name': return shownName(c);
      case 'phone': return String(c.phone || '').trim();
      case 'address': return String(c.address || '').trim();
      case 'pay': return payShort(c);
      case 'group': return c.group || '';
      case 'code': return String(c.code || '');
      case 'city': return c.city || '';
      case 'province': return c.province || '';
      case 'status': return STATUS[c._status] || '';
      case 'latest': return c._latest ? Math.round(c._latest) : '';
      case 'total': return c._total ? Math.round(c._total) : '';
    }
    return '';
  }
  function exRows() {
    var x = exState(), base = x.useFilters ? filtered() : S.list.slice(), keys = EX_COLS.filter(function (d) { return x.cols[d[0]]; }).map(function (d) { return d[0]; });
    var picked = Object.keys(x.groups).filter(function (g) { return x.groups[g]; });
    var list = base.filter(function (c) {
      var g = c.group || '__none', hit = picked.indexOf(g) >= 0;
      if (!picked.length) return true;
      return x.mode === 'only' ? hit : !hit;
    });
    if (x.skipEmpty) list = list.filter(function (c) { return keys.every(function (k) { return k === 'latest' || k === 'total' || exVal(c, k) !== ''; }); });
    list.sort(function (a, b) { return String(shownName(a)).localeCompare(String(shownName(b)), 'fa', { numeric: true }); });
    return { list: list, keys: keys, picked: picked };
  }
  function exDialog() {
    var x = exState(), r = exRows(), gn = groupNames(), names = Object.keys(gn).sort(function (a, b) { return gn[b] - gn[a]; });
    var chip = function (attr, label, on, n) { return '<button type="button" class="cu-fchip" ' + attr + ' aria-pressed="' + (!!on) + '">' + esc(label) + (n != null ? ' <b>' + faInt.format(n) + '</b>' : '') + '</button>'; };
    var groups = names.length ? names.map(function (g) { var k = g || '__none'; return chip('data-ex-g="' + esc(k) + '"', g || 'بدون گروه', x.groups[k], gn[g]); }).join('') : '<span class="cu-note">گروهی ثبت نشده است.</span>';
    var cols = EX_COLS.map(function (d) { return chip('data-ex-c="' + d[0] + '"', d[1], x.cols[d[0]]); }).join('');
    var none = !r.keys.length || !r.list.length;
    dlg.innerHTML = '<div class="cu-dbar"><h2>خروجی فهرست مشتریان</h2><button type="button" class="cu-x" data-close aria-label="بستن">✕</button></div>' +
      '<div class="cu-ex"><section><h3>گروه مشتری</h3><div class="cu-seg" role="group" aria-label="روش انتخاب گروه">' + chip('data-ex-mode="only"', 'فقط گروه‌های انتخاب‌شده', x.mode === 'only') + chip('data-ex-mode="except"', 'همه به‌جز گروه‌های انتخاب‌شده', x.mode === 'except') + '</div>' +
      '<div class="cu-fchips wrap" role="group" aria-label="گروه‌ها">' + groups + '</div><p class="cu-note">' + (r.picked.length ? '' : 'هیچ گروهی انتخاب نشده؛ همهٔ مشتریان در خروجی می‌آیند.') + '</p></section>' +
      '<section><h3>ستون‌ها</h3><div class="cu-fchips wrap" role="group" aria-label="ستون‌ها">' + cols + '</div></section>' +
      '<section class="cu-exopt"><label><input type="checkbox" data-ex-opt="skipEmpty"' + (x.skipEmpty ? ' checked' : '') + '><span>مشتریانی که یکی از ستون‌های انتخابی‌شان خالی است نیایند</span></label>' +
      '<label><input type="checkbox" data-ex-opt="useFilters"' + (x.useFilters ? ' checked' : '') + '><span>فقط مشتریان فهرست فعلی صفحه (جست‌وجو و فیلترهای بالا)</span></label></section>' +
      '<p class="cu-excount">' + faInt.format(r.list.length) + ' مشتری · ' + faInt.format(r.keys.length) + ' ستون</p>' +
      '<div class="cu-exacts"><button type="button" class="cu-btn primary" data-ex-pdf' + (none ? ' disabled' : '') + '>PDF</button><button type="button" class="cu-btn" data-ex-xlsx' + (none ? ' disabled' : '') + '>Excel</button></div></div>';
    if (!dlg.open) dlg.showModal();
  }
  function exTitleLines(r) {
    var x = exState(), t = [];
    if (r.picked.length) t.push((x.mode === 'only' ? 'گروه‌ها: ' : 'همه به‌جز گروه‌های: ') + r.picked.map(function (g) { return g === '__none' ? 'بدون گروه' : g; }).join('، '));
    return t.join(' · ');
  }
  function exXlsx() {
    var r = exRows(), cols = EX_COLS.filter(function (d) { return r.keys.indexOf(d[0]) >= 0; });
    var rows = [['ردیف'].concat(cols.map(function (d) { return d[1]; }))];
    r.list.forEach(function (c, i) { rows.push([i + 1].concat(cols.map(function (d) { return exVal(c, d[0]); }))); });
    window.MSXlsx.save(window.MSXlsx.blob([{ name: 'مشتریان', rows: rows, widths: [7].concat(cols.map(function (d) { return d[2]; })), freeze: true, filter: true }]), 'Max_Silver_Customers.xlsx');
  }
  // the PDF is a clean printable page in a new tab (Estedad font, header on every page, rows never split); «Save as PDF» in the print window gives the file
  function exPdf() {
    var r = exRows(), cols = EX_COLS.filter(function (d) { return r.keys.indexOf(d[0]) >= 0; }), total = cols.reduce(function (a, d) { return a + d[2]; }, 0) + 5;
    var font = new URL('./assets/fonts/Estedad-VF.woff2', location.href).href;
    var cell = function (c, k) {
      var v = exVal(c, k); if (v === '' || v == null) return '<span class="e">—</span>';
      if (k === 'phone') return '<bdi dir="ltr">' + esc(faDigits(v)) + '</bdi>';
      if (k === 'code') return '<bdi dir="ltr">' + esc(faDigits(v)) + '</bdi>';
      if (k === 'latest' || k === 'total') return esc(faInt.format(v));
      return esc(k === 'address' ? faDigits(v) : v);
    };
    var head = '<th style="width:' + (5 * 100 / total).toFixed(2) + '%">ردیف</th>' + cols.map(function (d) { return '<th style="width:' + (d[2] * 100 / total).toFixed(2) + '%">' + esc(d[1]) + '</th>'; }).join('');
    var body = r.list.map(function (c, i) { return '<tr><td class="n">' + faInt.format(i + 1) + '</td>' + cols.map(function (d) { return '<td' + (d[0] === 'latest' || d[0] === 'total' ? ' class="n"' : '') + '>' + cell(c, d[0]) + '</td>'; }).join('') + '</tr>'; }).join('');
    var date = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date());
    var html = '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>فهرست مشتریان مکث‌سیلور</title><style>' +
      '@font-face{font-family:Estedad;src:url(' + font + ') format("woff2");font-weight:100 900}' +
      '@page{size:A4 ' + (cols.length > 5 ? 'landscape' : 'portrait') + ';margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Estedad,Tahoma,sans-serif;color:#051934;font-size:11px;line-height:1.8}' +
      'h1{margin:0 0 2px;font-size:20px}.m{color:#5b6677;font-size:11px;margin:0 0 10px}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}' +
      'th{background:#ffcc2a;color:#051934;font-weight:800;text-align:right;padding:6px 8px;border:1px solid #e0b300}td{padding:5px 8px;border:1px solid #dfe5ee;vertical-align:top;overflow-wrap:anywhere;word-break:break-word}' +
      'tr{break-inside:avoid;page-break-inside:avoid}tbody tr:nth-child(even) td{background:#f6f8fb}.n{text-align:center}.e{color:#a3acb9}' +
      '.bar{position:sticky;top:0;display:flex;gap:8px;justify-content:flex-start;padding:8px 0}.bar button{font:700 13px Estedad,Tahoma,sans-serif;padding:8px 16px;border:1px solid #051934;border-radius:10px;background:#051934;color:#fff;cursor:pointer}@media print{.bar{display:none}}</style></head><body>' +
      '<div class="bar"><button onclick="window.print()">چاپ / ذخیره PDF</button></div>' +
      '<h1>فهرست مشتریان مکث‌سیلور</h1><p class="m">' + esc(date) + ' · ' + faInt.format(r.list.length) + ' مشتری' + (exTitleLines(r) ? ' · ' + esc(exTitleLines(r)) : '') + '</p>' +
      '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
      '<script>document.fonts.ready.then(function(){setTimeout(function(){window.print();},400);});<\/script></body></html>';
    var url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    var w = window.open(url, '_blank');
    if (!w) { S.error = 'مرورگر باز شدن صفحه را بست؛ اجازهٔ بازشدن پنجره را بدهید و دوباره بزنید.'; dlg.close(); render(); }
  }

  function reviewView() {
    var fixN = 0; S.list.forEach(function (c) { if (c.address && tidyAddress(c.address) !== c.address) fixN++; });
    var sims = S.simOpen ? simGroups() : null;
    var h = '<section class="cu-card-box" id="cuReview"><h2>مرتب‌سازی و بررسی</h2>' +
      '<div class="cu-rv"><div><b>نشانی‌ها</b><p class="cu-note">جداکننده‌ها، فاصله‌ها، «خ» ← «خیابان»، «وحد» ← «واحد» و رقم‌های چسبیده به حرف مرتب می‌شود؛ املا دست نمی‌خورد.</p></div>' +
      '<button type="button" class="cu-btn small" data-tidy-addr' + (fixN && !S.busy ? '' : ' disabled') + '>' + (fixN ? 'مرتب کردن ' + faInt.format(fixN) + ' نشانی' : 'همهٔ نشانی‌ها مرتب است') + '</button></div>' +
      '<div class="cu-rv"><div><b>حساب‌های مشابه</b><p class="cu-note">نام نزدیک، تلفن یا کد ملی یکسان. خودتان بررسی کنید و اگر یکی هستند ترکیب کنید.</p></div>' +
      '<button type="button" class="cu-btn small ghost" data-sim-toggle>' + (S.simOpen ? 'بستن' : 'نشان بده') + '</button></div>';
    if (sims) {
      h += sims.length ? '<ul class="cu-simlist">' + sims.slice(0, 40).map(function (g) {
        var m = g.members;
        return '<li><div class="cu-simwhy">' + g.why.map(esc).join(' · ') + '</div><ul>' + m.map(function (c) {
          return '<li><a href="#/c/' + encodeURIComponent(c.code) + '"><b>' + esc(shownName(c)) + '</b><span dir="ltr">' + esc(c.code) + '</span><span>' + esc(c.city || '') + ' ' + esc(c.group || '') + '</span><em>' + compact(totalOf(c) / 10) + '</em></a></li>';
        }).join('') + '</ul>' + (can('customerAssign') ? '<div class="cu-simact"><button type="button" class="cu-btn small" data-merge-all="' + esc(m[0].code + '|' + m.slice(1).map(function (c) { return c.code; }).join(',')) + '">ترکیب همه در «' + esc(shownName(m[0])) + '»</button><button type="button" class="cu-btn small ghost" data-sim-no="' + esc(g.key) + '">مشابه نیست</button></div>' : '') + '</li>';
      }).join('') + '</ul>' + (sims.length > 40 ? '<p class="cu-note">۴۰ مورد اول نشان داده شد؛ بعد از بررسی بقیه می‌آیند.</p>' : '') : '<p class="cu-note">مورد مشابهی پیدا نشد.</p>';
    }
    return h + '</section>';
  }
  function tidyAll() {
    var ops = []; S.list.concat(Object.keys(S.byCode || {}).map(function (k) { return S.byCode[k]; }).filter(function (d) { return d.mergedInto; })).forEach(function (c) {
      var t = c.address ? tidyAddress(c.address) : ''; if (t && t !== c.address) ops.push([c, t]);
    });
    if (!ops.length) return;
    S.busy = true; render();
    var chunks = [], i; for (i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
    chunks.reduce(function (pr, ch) {
      return pr.then(function () { var b = db.batch(); ch.forEach(function (o) { b.update(db.collection('customers').doc(o[0].code), { address: o[1].slice(0, 300), updatedAt: Date.now() }); }); return b.commit(); });
    }, Promise.resolve()).then(function () { S.msg = faInt.format(ops.length) + ' نشانی مرتب شد.'; S.busy = false; S.list = []; load(); }, function (e) { S.error = errText(e); S.busy = false; render(); });
  }
  function mergeMany(primary, codes) {
    var b = db.batch(); codes.forEach(function (c) { b.update(db.collection('customers').doc(c), { mergedInto: primary, updatedAt: Date.now() }); });
    b.commit().then(function () { S.msg = faInt.format(codes.length) + ' حساب با ' + faDigits(primary) + ' ترکیب شد.'; S.list = []; load(); }, function (e) { S.error = errText(e); render(); });
  }

  function payBox(c) {
    var lead = can('customerAssign'), m = payOf(c), pct = Number(c.payChequePct) || '';
    var opts = PAY_ORDER.map(function (k) {
      return '<label class="cu-payopt pm-' + k + (m === k ? ' on' : '') + '"><input type="radio" name="payMode" value="' + k + '"' + (m === k ? ' checked' : '') + (lead ? '' : ' disabled') + '><img class="cu-payimg" src="./assets/art/tiles/' + PAY[k].i + '.webp" alt="" width="44" height="40" loading="lazy" decoding="async" onerror="this.remove()"><b>' + esc(PAY[k].t) + '</b><span>' + esc(PAY[k].d) + '</span></label>';
    }).join('');
    return '<section class="cu-card-box"><div class="cu-boxhead"><h2>رفتار پرداخت</h2>' + (lead ? '<button type="submit" form="cuPay" class="cu-ico" title="ذخیره" aria-label="ذخیرهٔ رفتار پرداخت"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 3v5h7V3M8 21v-7h8v7"/></svg></button>' : '') + '</div>' +
      '<form id="cuPay" data-code="' + esc(c.code) + '"><div class="cu-payopts">' + opts + '</div>' +
      '<div class="cu-paymix"' + (isCheque(m) ? '' : ' hidden') + '><label class="cu-chk"><input type="checkbox" name="payMixed"' + (c.payMixed ? ' checked' : '') + (lead ? '' : ' disabled') + '> بخشی را نقدی می‌دهد</label>' +
      '<label class="cu-pct">سهم چک (٪)<input type="text" name="payChequePct" inputmode="numeric" maxlength="2" placeholder="مثلاً ۷۰" value="' + esc(pct ? faDigits(pct) : '') + '"' + (lead ? '' : ' disabled') + '></label></div>' +
      '<label class="full cu-paynote">توضیح<input type="text" name="payNote" maxlength="200" placeholder="مثلاً چک ۳۰ روزه، یا ۵۰٪ نقدی هنگام سفارش" value="' + esc(c.payNote || '') + '"' + (lead ? '' : ' disabled') + '></label>' +
      (lead ? '' : '<p class="cu-note">رفتار پرداخت را مدیر یا مدیر فروش ثبت می‌کند.</p>') +
      (S.payMsg === c.code ? '<p class="cu-ok" role="status">ذخیره شد.</p>' : '') + (S.payErr ? '<p class="cu-err" role="alert">' + esc(S.payErr) + '</p>' : '') + '</form></section>';
  }
  function sibsHtml(c) {
    var l = c._sibs || [], mg = c._merged || [], lead = can('customerAssign'); if (!l.length && !mg.length && !lead) return '';
    var own = function (x) { return x === c ? ((c._ownSales || c.sales || {})[S.latest] || 0) / 10 : ((x.sales || {})[S.latest] || 0) / 10; };
    var all = [c].concat(mg), sum = all.reduce(function (a, x) { return a + own(x); }, 0);
    var li = function (x, merged, sug) {
      return '<li' + (x === c ? ' class="me"' : '') + '><a href="#/c/' + encodeURIComponent(x.code) + '"><b>' + esc(shownName(x)) + '</b><span dir="ltr">' + esc(x.code) + '</span><span>' + esc(x.group || 'بدون گروه') + '</span><em>' + compact(own(x)) + ' <small>تومان · ' + faDigits(S.latest) + '</small></em></a>' +
        (lead && merged ? '<button type="button" class="cu-btn small ghost" data-unmerge="' + esc(x.code) + '">جدا کردن</button>' : '') +
        (lead && sug ? '<button type="button" class="cu-btn small" data-merge="' + esc(c.code + '|' + x.code) + '">ترکیب با این مشتری</button>' : '') + '</li>';
    };
    return '<section class="cu-card-box"><h2>حساب‌های این مشتری</h2>' +
      '<p class="cu-note">گاهی یک شرکت در حسابداری چند حساب دارد (مثلاً یک حساب جدا برای وینتورا با «win»). حساب‌های ترکیب‌شده در یک مشتری دیده می‌شوند و فروش و مانده‌شان با هم جمع می‌شود.</p>' +
      '<ul class="cu-sibs">' + all.map(function (x) { return li(x, x !== c, false); }).join('') + '</ul>' +
      (l.length ? '<h3 class="cu-sub">هم‌نام (هنوز ترکیب نشده)</h3><ul class="cu-sibs">' + l.map(function (x) { return li(x, false, true); }).join('') + '</ul>' : '') +
      (lead ? '<div class="cu-mergebox"><input type="text" id="cuMergeCode" inputmode="numeric" dir="ltr" placeholder="کد حساب دیگر"><button type="button" class="cu-btn small" data-merge-code="' + esc(c.code) + '">ترکیب با کد</button></div>' : '') +
      '<p class="cu-note">جمع فروش ' + faDigits(S.latest) + ' همهٔ حساب‌ها: <b>' + compact(sum) + ' تومان</b></p></section>';
  }
  function mergeAccounts(primary, secondary) {
    if (!primary || !secondary || primary === secondary) return;
    db.collection('customers').doc(secondary).update({ mergedInto: primary, updatedAt: Date.now() }).then(function () {
      S.msg = 'حساب ' + faDigits(secondary) + ' با ' + faDigits(primary) + ' ترکیب شد.'; S.list = []; load();
    }, function (err) { S.error = errText(err); render(); });
  }
  function unmergeAccount(code) {
    db.collection('customers').doc(code).update({ mergedInto: '', updatedAt: Date.now() }).then(function () {
      S.msg = 'حساب ' + faDigits(code) + ' جدا شد.'; S.list = []; load();
    }, function (err) { S.error = errText(err); render(); });
  }
  function detailView(code) {
    var c = S.list.filter(function (x) { return x.code === code; })[0];
    if (!c && S.byCode && S.byCode[code] && S.byCode[code].mergedInto && S.byCode[S.byCode[code].mergedInto]) { setTimeout(function () { location.replace('#/c/' + encodeURIComponent(S.byCode[code].mergedInto)); }, 0); return head('این حساب جزو حساب دیگری است…', true); }
    if (!c) return head('مشتری پیدا نشد', true) + '<p class="cu-note">این مشتری وجود ندارد یا برای شما قابل مشاهده نیست.</p>';
    var prov = c.province || provinceOf(c.city), reg = c.region || regionOf(prov);
    var invs = invoicesOf(c), items = itemsOf(invs);
    var fact = function (l, v, k) { return '<div class="cu-fact">' + (k ? '<span class="cu-fi">' + ic(k) + '</span>' : '') + '<div><dt>' + l + '</dt><dd>' + (v ? esc(v) : '<i>ثبت نشده</i>') + '</dd></div></div>'; };
    var edit = can('customerEdit') || (S.user && c.ownerUid === S.user.uid);
    return head(shownName(c), true) +
      '<section class="cu-card-box cu-top" style="--c:' + hue(c) + ';--ink:' + inkOn(hue(c)) + '"><div class="cu-hero"><span class="cu-av big face">' + face(c) + '</span><div><span class="cu-hero-m">' + (c.city ? ic('pin') + esc(c.city) : '') + (c.group ? ic('user') + esc(c.group) : '') + (payShort(c) ? '<span class="cu-pay lg' + (payOf(c) ? ' pm-' + payOf(c) : '') + '">رفتار پرداخت: ' + esc(payShort(c)) + '</span>' : '') + '</span></div></div><div class="cu-top-row"><span class="cu-chip st-' + c._status + '">' + STATUS[c._status] + '</span><span class="cu-chip" dir="ltr">' + esc(c.code) + '</span>' +
      (c.ownerName ? '<span class="cu-chip ok">مسئول: ' + esc(c.ownerName) + '</span>' : '') + '</div>' +
      '<dl class="cu-facts">' + fact('گروه (همکار مسئول)', c.group, 'user') + fact('شهر', c.city, 'pin') + fact('استان', prov, 'map') + fact('منطقه فروش', reg, 'map') +
      fact('آخرین سال خرید', (function () { var ys = S.years.filter(function (y) { return (c.sales || {})[y] > 0; }); return ys.length ? faDigits(ys[ys.length - 1]) : ''; })(), 'clock') +
      fact('مجموع فروش ثبت‌شده', c._total ? amount(c._total) + ' تومان' : '', 'coins') + '</dl>' +
      (can('customerAssign') ? '<button type="button" class="cu-btn small" data-owner-customer="' + esc(c.code) + '">تغییر مسئول این مشتری</button>' : '') + '</section>' +
      cashHtml(c) +
      payBox(c) +
      sibsHtml(c) +
      '<section class="cu-card-box"><h2>خرید در سال‌ها</h2>' + yearBars(c) +
      '<p class="cu-note">مبلغ‌ها به تومان است (گزارش حسابداری به ریال است و اینجا تبدیل شده). سال ' + faDigits(S.latest) + ' هنوز تمام نشده است.</p></section>' +
      '<section class="cu-card-box"><div class="cu-boxhead"><h2>اطلاعات تماس</h2>' + (edit ? '<button type="submit" form="cuForm" class="cu-ico" title="ذخیره" aria-label="ذخیرهٔ اطلاعات تماس"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM8 3v5h7V3M8 21v-7h8v7"/></svg></button>' : '') + '</div><form id="cuForm" data-code="' + esc(c.code) + '"><div class="cu-grid">' +
      '<label>تلفن<input type="tel" name="phone" dir="ltr" inputmode="numeric" maxlength="15" value="' + esc(faDigits(c.phone || '')) + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label>شخص تماس<input type="text" name="contact" maxlength="80" value="' + esc(c.contact || '') + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label class="full">نشانی<input type="text" name="address" maxlength="300" value="' + esc(c.address || '') + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label>کد پستی<input type="text" name="postal" dir="ltr" inputmode="numeric" maxlength="10" value="' + esc(faDigits(c.postal || '')) + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label>کد ملی<input type="text" name="nationalId" dir="ltr" inputmode="numeric" maxlength="10" value="' + esc(faDigits(c.nationalId || '')) + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label>تاریخ تولد (شمسی، ۱۳۷۰/۰۱/۱۵)<input type="text" name="birthday" dir="ltr" inputmode="numeric" maxlength="10" placeholder="۱۳۷۰/۰۱/۱۵" value="' + esc(faDigits(c.birthday || '')) + '"' + (edit ? '' : ' disabled') + '></label>' +
      '<label class="full">یادداشت<textarea name="notes" rows="3" maxlength="800"' + (edit ? '' : ' disabled') + '>' + esc(c.notes || '') + '</textarea></label></div>' +
      (S.msg ? '<p class="cu-ok" role="status">' + esc(S.msg) + '</p>' : '') + (S.error ? '<p class="cu-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '</form></section>' +
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
    var tools = '<div class="cu-tools"><button type="button" class="cu-ico ghost" data-tpl-sample title="دریافت فایل نمونه (Excel)" aria-label="دریافت فایل نمونه (Excel)"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6\"/></svg></button>' +
      '<button type="button" class="cu-ico ghost" data-tpl-export' + (S.list.length ? '' : ' disabled') + ' title="خروجی مشتریان فعلی (Excel)" aria-label="خروجی مشتریان فعلی (Excel)"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 4v11m0 0-4-4m4 4 4-4M5 20h14\"/></svg></button><span class="cu-tools-t">نمونه و خروجی Excel</span></div>';
    if (!S.impOpen) return '<section class="cu-card-box" id="import"><h2>ورود اطلاعات</h2>' +
      '<p class="cu-note">دو راه دارد: گزارش‌های «فروش ۱۴۰۳ / ۱۴۰۴ / ۱۴۰۵» حسابداری، یا فایل Excel نمونهٔ خود برنامه که تلفن، نشانی، شخص تماس و گروه را هم دارد. «فایل نمونه» را بگیرید، پر کنید و همین‌جا بارگذاری کنید. فایل‌ها فقط در مرورگر شما خوانده می‌شوند.</p>' +
      tools + '<button type="button" class="cu-btn primary" data-imp-open>شروع ورود اطلاعات</button></section>';
    body += tools + '<label class="cu-file"><input type="file" id="cuFiles" accept=".xls,.xlsx" multiple><span>انتخاب فایل‌ها: گزارش‌های فروش حسابداری (سال در نام فایل) یا فایل نمونهٔ برنامه</span></label>';
    if (S.busy && !im) body += '<p class="cu-note">در حال خواندن…</p>';
    if (im && im.error) body += '<p class="cu-err">' + esc(im.error) + '</p>';
    if (im && im.rows) {
      body += '<div class="cu-kpis"><div><span>مشتری در فایل‌ها</span><b>' + faInt.format(im.rows.length) + '</b></div><div><span>جدید</span><b>' + faInt.format(im.fresh) + '</b></div>' +
        '<div><span>موجود (به‌روزرسانی)</span><b>' + faInt.format(im.rows.length - im.fresh) + '</b></div><div><span>بدون گروه</span><b>' + faInt.format(im.blank) + '</b></div></div>' +
        (im.withPhone ? '<p class="cu-note">دارای تلفن: ' + faInt.format(im.withPhone) + ' · دارای نشانی: ' + faInt.format(im.withAddress) + '</p>' : '') +
        (im.bad ? '<p class="cu-err">' + faInt.format(im.bad) + ' کد ملی، کد پستی یا تاریخ تولد درست نبود و ذخیره نمی‌شود.</p>' : '') +
        '<ul class="cu-imp">' + im.files.map(function (f) { return '<li><b>' + esc(f.name) + '</b><span>' + esc(f.label) + '</span></li>'; }).join('') + '</ul>' +
        (im.skipped ? '<p class="cu-note">ردیف‌های نمونه یا بدون کد نادیده گرفته شد: ' + faInt.format(im.skipped) + '</p>' : '') +
        (im.renamed.length ? '<p class="cu-note">نام این کدها در سال‌ها متفاوت است؛ نام جدیدتر نگه داشته می‌شود: ' + esc(im.renamed.slice(0, 6).join('، ')) + '</p>' : '') +
        '<button type="button" class="cu-btn primary" data-imp-save' + (S.busy ? ' disabled' : '') + '>ذخیره در پایگاه مشتریان</button>';
    }
    if (im && im.done) body += '<p class="cu-ok" role="status">' + esc(im.done) + '</p>';
    return '<section class="cu-card-box" id="import"><h2>ورود اطلاعات</h2>' + body + '</section>';
  }
  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = './assets/vendor/xlsx.full.min.js';
      s.onload = function () { resolve(window.XLSX); }; s.onerror = function () { reject(new Error('کتابخانهٔ خواندن Excel بارگذاری نشد.')); };
      document.head.appendChild(s);
    });
  }
  // The program's own Excel template: one row per customer, optional sales columns named «فروش 1403».
  var TPL_ALIASES = {
    code: ['کد مشتری'], name: ['نام مشتری', 'نام', 'عنوان'], group: ['گروه (همکار مسئول)', 'گروه', 'گروه مشتری', 'همکار مسئول'], city: ['شهر'], province: ['استان'],
    phone: ['تلفن', 'موبایل', 'شماره تماس'], contact: ['شخص تماس', 'نام تماس'], address: ['نشانی', 'آدرس'], postal: ['کد پستی'], nationalId: ['کد ملی', 'شماره ملی'], birthday: ['تاریخ تولد', 'تولد'], notes: ['یادداشت', 'توضیحات'], payMode: ['رفتار پرداخت'], payChequePct: ['سهم چک (٪)', 'سهم چک']
  };
  var TPL_HEAD = [['code', 'کد مشتری'], ['name', 'نام مشتری'], ['group', 'گروه (همکار مسئول)'], ['city', 'شهر'], ['province', 'استان'], ['phone', 'تلفن'], ['contact', 'شخص تماس'], ['address', 'نشانی'], ['postal', 'کد پستی'], ['nationalId', 'کد ملی'], ['birthday', 'تاریخ تولد'], ['notes', 'یادداشت'], ['payMode', 'رفتار پرداخت'], ['payChequePct', 'سهم چک (٪)']];
  function parseTemplate(matrix) {
    for (var r = 0; r < Math.min(matrix.length, 10); r++) {
      var row = matrix[r] || [], cols = {}, sales = {}, bals = {}, found = false, altCode;
      row.forEach(function (h, i) {
        var k = norm(h); if (!k) return;
        if (k === norm('کد مشتری')) { cols.code = i; found = true; return; }
        if (k === norm('کد')) { altCode = i; return; }
        var m = /^فروش\s*(\d{4})\s*(?:\(.*\))?$/.exec(k);
        if (m) { sales[m[1]] = i; return; }
        var mb = /^مانده\s*(\d{4})\s*(?:\(.*\))?$/.exec(k);
        if (mb) { bals[mb[1]] = i; return; }
        Object.keys(TPL_ALIASES).forEach(function (f) { if (f !== 'code' && cols[f] === undefined && TPL_ALIASES[f].map(norm).indexOf(k) >= 0) cols[f] = i; });
      });
      // a plain «کد» column counts only together with a phone or address column: that is the accounting program's customer list, not a sales report
      if (!found && altCode !== undefined && (cols.phone !== undefined || cols.address !== undefined)) { cols.code = altCode; found = true; }
      if (!found || cols.name === undefined) continue;
      var out = [], skipped = 0, val = function (rw, i) { var v = rw[i]; return v == null ? '' : String(v).trim(); };
      for (var i = r + 1; i < matrix.length; i++) {
        var rw = matrix[i] || [], code = latinDigits(val(rw, cols.code)).replace(/\.0+$/, '');
        if (!code || /^نمونه/.test(code)) { if (rw.some(function (x) { return x != null && String(x).trim(); })) skipped++; continue; }
        var rec = { code: code, sales: {}, bal: {} };
        Object.keys(cols).forEach(function (f) { if (f !== 'code') rec[f] = (f === 'phone' || f === 'postal' || f === 'nationalId') ? latinDigits(val(rw, cols[f])).replace(/\D/g, '') : fixLetters(val(rw, cols[f])); });
        Object.keys(sales).forEach(function (y) { var n = Number(latinDigits(val(rw, sales[y])).replace(/[٬,\s]/g, '')); if (isFinite(n) && val(rw, sales[y]) !== '') rec.sales[y] = Math.round(n * 10); });
        // the balance at the end of a year (toman in the file, rial stored): positive = the customer owes us, negative = the customer is in credit
        Object.keys(bals).forEach(function (y) { var n = Number(latinDigits(val(rw, bals[y])).replace(/[٬,\s]/g, '')); if (isFinite(n) && val(rw, bals[y]) !== '') rec.bal[y] = Math.round(n * 10); });
        out.push(rec);
      }
      return { rows: out, skipped: skipped };
    }
    return null;
  }
  function readOne(f, XLSX) {
    return f.arrayBuffer().then(function (buf) {
      var wb = XLSX.read(buf, { type: 'array', cellDates: true, codepage: 65001 });
      var sheet = wb.SheetNames.indexOf('مشتریان') >= 0 ? 'مشتریان' : wb.SheetNames[0];
      var matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: true, defval: null, blankrows: false });
      var tpl = parseTemplate(matrix);
      if (tpl) return { f: f, tpl: tpl };
      var p = W.parseMatrix(matrix, f.name);
      return { f: f, p: p };
    });
  }
  function sheetRows(list) {
    var years = S.years.length ? S.years : [1403, 1404, 1405];
    var byears = {}; list.forEach(function (c) { Object.keys(c.balances || {}).forEach(function (y) { byears[y] = 1; }); }); byears = Object.keys(byears).sort();
    var head = TPL_HEAD.map(function (h) { return h[1]; }).concat(years.map(function (y) { return 'فروش ' + y + ' (تومان)'; }), byears.map(function (y) { return 'مانده ' + y + ' (تومان)'; }));
    var rows = [head];
    list.forEach(function (c) {
      rows.push([c.code, c.name || '', c.group || '', c.city || '', c.province || provinceOf(c.city), c.phone || '', c.contact || '', c.address || '', c.postal || '', c.nationalId || '', c.birthday || '', c.notes || '', payOf(c) ? PAY[payOf(c)].t : '', c.payMixed && c.payChequePct ? Number(c.payChequePct) : '']
        .concat(years.map(function (y) { var v = (c.sales || {})[y]; return v == null ? '' : Math.round(v / 10); }), byears.map(function (y) { var v = (c.balances || {})[y]; return v == null ? '' : Math.round(v / 10); })));
    });
    return rows;
  }
  // ---- a real .xlsx written here (no library): brand-book styling, Estedad font, right-to-left, frozen header, filter
  var crcTable = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, cdSize = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      cdSize += 46 + name.length; offset += 30 + name.length + data.length;
    });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function xml(s) { return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  // style ids: 1 header, 2 body, 3 body zebra, 4 example, 5 number, 6 number zebra, 7 guide title, 8 guide text
  function sheetXml(rows, widths, opt) {
    opt = opt || {};
    var out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"' + (opt.first ? ' tabSelected="1"' : '') + '>' +
      (opt.freeze ? '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>' : '') + '</sheetView></sheetViews><sheetFormatPr defaultRowHeight="24"/><cols>' +
      widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols><sheetData>';
    rows.forEach(function (row, r) {
      out += '<row r="' + (r + 1) + '"' + (r === 0 && opt.freeze ? ' ht="30" customHeight="1"' : '') + '>';
      row.forEach(function (v, c) {
        var ref = colName(c) + (r + 1), st;
        if (opt.guide) st = r === 0 ? 7 : 8;
        else if (r === 0) st = 1;
        else if (opt.exampleFrom !== undefined && r >= opt.exampleFrom) st = 4;
        else st = typeof v === 'number' ? (r % 2 ? 5 : 6) : (r % 2 ? 2 : 3);
        if (typeof v === 'number') out += '<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>';
        else out += '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + xml(v) + '</t></is></c>';
      });
      out += '</row>';
    });
    out += '</sheetData>' + (opt.filter && rows.length > 1 ? '<autoFilter ref="A1:' + colName(rows[0].length - 1) + rows.length + '"/>' : '') +
      '<pageSetup orientation="landscape" fitToWidth="1"/></worksheet>';
    return out;
  }
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="0"/><fonts count="5">' +
    '<font><sz val="11"/><color rgb="FF051934"/><name val="Estedad"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FF051934"/><name val="Estedad"/></font>' +
    '<font><b/><sz val="14"/><color rgb="FFFFCC2A"/><name val="Estedad"/></font>' +
    '<font><i/><sz val="11"/><color rgb="FF4C5158"/><name val="Estedad"/></font>' +
    '<font><sz val="11"/><color rgb="FF051934"/><name val="Estedad"/></font></fonts>' +
    '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFCC2A"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F5F7"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF051934"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
    '<border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf>' +
    '<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
    '<xf numFmtId="3" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="2" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>' +
    '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  function buildXlsx(rows, opt) {
    var widths = [13, 34, 26, 14, 18, 16, 20, 40, 13, 13, 13, 30].concat(rows[0].slice(12).map(function () { return 18; }));
    var guide = [['راهنمای پر کردن'],
      ['۱. هر مشتری یک ردیف است. «کد مشتری» همان کد نرم‌افزار حسابداری است و باید یکتا باشد.'],
      ['۲. «نام مشتری» و «کد مشتری» اجباری‌اند؛ بقیهٔ ستون‌ها اختیاری هستند.'],
      ['۳. «گروه (همکار مسئول)» همان گروه مشتری در حسابداری است؛ مسئول هر گروه بعداً در برنامه تعیین می‌شود.'],
      ['۴. تلفن را فقط عدد بنویسید (مثلاً 09121234567).'],
      ['۵. ستون‌های «فروش 1403 (تومان)» و مانند آن اختیاری‌اند؛ سال را در عنوان ستون بنویسید و مبلغ را به تومان وارد کنید.'],
      ['۶. خانهٔ خالی، مقدار فعلی را پاک نمی‌کند؛ فقط خانه‌های پر شده جایگزین می‌شوند.'],
      ['۷. ردیف‌هایی که کدشان با «نمونه» شروع شود نادیده گرفته می‌شوند.'],
      ['۸. «کد ملی» ده رقم، «کد پستی» ده رقم و «تاریخ تولد» شمسی به شکل 1370/01/15 است؛ مقدار نادرست ذخیره نمی‌شود.'],
      ['۹. فایل را در برنامه از «مشتریان ← ورود اطلاعات» بارگذاری کنید و پیش از ذخیره، پیش‌نمایش را ببینید.']];
    var NS = 'http://schemas.openxmlformats.org/';
    return zipStore([
      { name: '[Content_Types].xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
      { name: '_rels/.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + NS + 'officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="' + NS + 'officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="مشتریان" sheetId="1" r:id="rId1"/><sheet name="راهنما" sheetId="2" r:id="rId2"/></sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', text: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + NS + 'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="' + NS + 'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="' + NS + 'officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', text: STYLES },
      { name: 'xl/worksheets/sheet1.xml', text: sheetXml(rows, widths, { freeze: true, filter: true, first: true, exampleFrom: opt && opt.exampleFrom }) },
      { name: 'xl/worksheets/sheet2.xml', text: sheetXml(guide, [110], { guide: true }) }
    ]);
  }
  function saveBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }
  function downloadSample() {
    var rows = sheetRows([]), from = rows.length;
    rows.push(['نمونه-۱', 'نمونه: فروشگاه آزمایشی', 'نام همکار مسئول', 'تهران', 'تهران', '09120000000', 'نام شخص تماس', 'نشانی کامل مشتری', '1234567890', '', '1370/01/15', 'هر توضیح لازم']);
    rows.push(['نمونه-۲', 'نمونه: شرکت دوم', 'نام همکار مسئول', 'مشهد', 'خراسان رضوی', '', '', '', '', '', '', '']);
    saveBlob(buildXlsx(rows, { exampleFrom: from }), 'customers-template.xlsx');
  }
  function downloadExport() {
    var list = S.list.slice().sort(function (a, b) { return String(a.code).localeCompare(String(b.code), 'en', { numeric: true }); });
    saveBlob(buildXlsx(sheetRows(list)), 'customers-export.xlsx');
  }
  function readFiles(files) {
    S.busy = true; S.imp = null; render();
    return ensureXlsx().then(function (XLSX) {
      return Promise.all(Array.prototype.map.call(files, function (f) { return readOne(f, XLSX); }));
    }).then(function (res) {
      var by = {}, info = [], names = {}, renamed = {}, skipped = 0;
      var slot = function (code) { return by[code] = by[code] || { code: code, sales: {}, bal: {}, _y: 0, tpl: {} }; };
      res.forEach(function (r) {
        if (r.tpl) {
          skipped += r.tpl.skipped;
          info.push({ name: r.f.name, label: 'فایل نمونهٔ برنامه · ' + faInt.format(r.tpl.rows.length) + ' ردیف' });
          r.tpl.rows.forEach(function (rec) {
            var o = slot(rec.code);
            Object.keys(rec.sales).forEach(function (y) { o.sales[y] = rec.sales[y]; });
            Object.keys(rec.bal || {}).forEach(function (y) { o.bal[y] = rec.bal[y]; });
            ['name', 'group', 'city', 'province', 'phone', 'contact', 'address', 'postal', 'nationalId', 'birthday', 'notes', 'payMode', 'payChequePct'].forEach(function (k) { if (rec[k]) o.tpl[k] = rec[k]; });
          });
          return;
        }
        if (r.p.kind !== 'customers') throw new Error(r.f.name + ': این فایل گزارش فروش مشتریان نیست.');
        skipped += r.p.skippedNoCode;
        var yr = r.p.records[0] && r.p.records[0].year;
        info.push({ name: r.f.name, label: 'گزارش حسابداری · سال ' + faDigits(yr) + ' · ' + faInt.format(r.p.records.length) + ' ردیف · ردیف جمع حذف شد: ' + faInt.format(r.p.skippedNoCode) });
        r.p.records.forEach(function (rec) {
          var code = String(rec.customerCode).trim(), o = slot(code);
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
        var o = by[k], raw = o.tpl.name || o._name || '', t = o.tpl.city ? { name: fixLetters(raw), city: o.tpl.city } : parseTitle(raw), city = t.city || (o.tpl.address ? cityIn(o.tpl.address) : ''), prov = o.tpl.province || provinceOf(city);
        return { code: k, name: t.name, payMode: payFromText(o.tpl.payMode || ''), payChequePct: Number(latinDigits(o.tpl.payChequePct || '').replace(/\D/g, '')) || 0, city: city, province: prov, region: regionOf(prov), group: o.tpl.group || o._group || '', sales: o.sales, bal: o.bal,
          phone: o.tpl.phone || '', contact: o.tpl.contact || '', address: tidyAddress(o.tpl.address || '').slice(0, 300), postal: postalOk(o.tpl.postal || '') ? o.tpl.postal : '', nationalId: nidOk(o.tpl.nationalId || '') ? o.tpl.nationalId : '', birthday: bdayOk(o.tpl.birthday || '') ? bdayFix(o.tpl.birthday) : '', notes: o.tpl.notes || '',
          bad: (o.tpl.postal && !postalOk(o.tpl.postal) ? 1 : 0) + (o.tpl.nationalId && !nidOk(o.tpl.nationalId) ? 1 : 0) + (o.tpl.birthday && !bdayOk(o.tpl.birthday) ? 1 : 0) };
      });
      S.imp = { rows: rows, files: info, skipped: skipped, fresh: rows.filter(function (r) { return !have[r.code]; }).length, blank: rows.filter(function (r) { return !r.group; }).length,
        bad: rows.reduce(function (n, r) { return n + (r.bad || 0); }, 0), withPhone: rows.filter(function (r) { return r.phone; }).length, withAddress: rows.filter(function (r) { return r.address; }).length,
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
      var doc = { code: r.code, name: r.name, city: r.city, province: r.province, region: r.region, group: r.group, importedAt: now, updatedAt: now };
      if (r.sales && Object.keys(r.sales).length) doc.sales = r.sales;
      if (r.bal && Object.keys(r.bal).length) doc.balances = r.bal;
      ['phone', 'contact', 'address', 'postal', 'nationalId', 'birthday', 'notes'].forEach(function (k) { if (r[k]) doc[k] = r[k]; });
      ['name', 'city', 'province', 'region', 'group'].forEach(function (k) { if (!doc[k]) delete doc[k]; });   // an empty cell in the file never erases what is already stored
      if (r.payMode) { doc.payMode = r.payMode; if (isCheque(r.payMode) && r.payChequePct > 0 && r.payChequePct < 100) { doc.payMixed = true; doc.payChequePct = r.payChequePct; } else { doc.payMixed = false; doc.payChequePct = 0; } }
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
    if (S.loading) return (window.MSSkel ? window.MSSkel() : '<p class="cu-note">در حال بارگذاری…</p>');
    if (!S.user) return '<p class="cu-note">برای دیدن مشتریان ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="cu-note">حساب شما هنوز فعال نشده است.</p>';
    if (S.error) return '<p class="cu-err" role="alert">' + esc(S.error) + '</p>';
    var code = route();
    return code ? detailView(code) : listView();
  }
  function render() {
    var active = document.activeElement, keep = active && active.id === 'cuQ' ? active.selectionStart : null;
    root.innerHTML = view();
    if (window.MSPurchases && S.user && S.profile) window.MSPurchases.paint(root, route());   // purchase history under a customer; the sales import under «ورود اطلاعات»
    if (window.MSGate) window.MSGate.apply();
    movePills(false);
    if (keep !== null) { var q = document.getElementById('cuQ'); if (q) { q.focus(); try { q.setSelectionRange(keep, keep); } catch (e) { /* ignore */ } } }
  }
  window.addEventListener('resize', function () { movePills(false); });
  window.addEventListener('hashchange', function () {
    S.msg = ''; S.error = ''; render(); window.scrollTo(0, 0);
    if (route() && S.user) loadInvoices().then(render);
  });
  document.addEventListener('click', function (e) {
    var t;
    if (e.target.closest('[data-ex-open]')) { exDialog(); return; }
    if ((t = e.target.closest('[data-ex-mode]'))) { exState().mode = t.getAttribute('data-ex-mode'); exDialog(); return; }
    if ((t = e.target.closest('[data-ex-g]'))) { var gk = t.getAttribute('data-ex-g'), xs = exState(); xs.groups[gk] = !xs.groups[gk]; exDialog(); return; }
    if ((t = e.target.closest('[data-ex-c]'))) { var ck = t.getAttribute('data-ex-c'), xc = exState(); xc.cols[ck] = !xc.cols[ck]; exDialog(); return; }
    if ((t = e.target.closest('[data-ex-opt]'))) { exState()[t.getAttribute('data-ex-opt')] = t.checked; exDialog(); return; }
    if (e.target.closest('[data-ex-pdf]')) { exPdf(); return; }
    if (e.target.closest('[data-ex-xlsx]')) { exXlsx(); return; }
    if (e.target.closest('[data-sp-scan]')) { scanStaff(); return; }
    if (e.target.closest('[data-sp-cancel]')) { S.sp = null; render(); return; }
    if (e.target.closest('[data-sp-apply]')) { applySplit(); return; }
    if ((t = e.target.closest('[data-sp-undo]'))) { undoSplit(t.getAttribute('data-sp-undo')); return; }
    if ((t = e.target.closest('[data-sp-i]'))) { var h = S.sp && S.sp.hits[Number(t.getAttribute('data-sp-i'))]; if (h) h.on = t.checked; return; }
    if ((t = e.target.closest('[data-status]'))) { S.fStatus = t.getAttribute('data-status'); S.shown = 60; refreshAll(true); return; }
    if ((t = e.target.closest('[data-pay]'))) { S.fPay = t.getAttribute('data-pay'); S.shown = 60; refreshAll(true); return; }
    if ((t = e.target.closest('[data-group]'))) { S.fGroup = t.getAttribute('data-group'); S.shown = 60; refreshAll(true); return; }
    if ((t = e.target.closest('[data-sort]'))) { S.sort = t.getAttribute('data-sort'); refreshAll(true); return; }
    if ((t = e.target.closest('[data-tidy-addr]'))) { tidyAll(); return; }
    if ((t = e.target.closest('[data-sim-toggle]'))) { S.simOpen = !S.simOpen; render(); return; }
    if ((t = e.target.closest('[data-sim-no]'))) { simDismiss(t.getAttribute('data-sim-no')); render(); return; }
    if ((t = e.target.closest('[data-merge-all]'))) { var ma = t.getAttribute('data-merge-all').split('|'); mergeMany(ma[0], ma[1].split(',')); return; }
    if ((t = e.target.closest('[data-merge]'))) { var mp = t.getAttribute('data-merge').split('|'); mergeAccounts(mp[0], mp[1]); return; }
    if ((t = e.target.closest('[data-unmerge]'))) { unmergeAccount(t.getAttribute('data-unmerge')); return; }
    if ((t = e.target.closest('[data-merge-code]'))) {
      var mc = latinDigits((document.getElementById('cuMergeCode') || {}).value || '').replace(/\D/g, '');
      if (!mc || !S.byCode || !S.byCode[mc] || mc === t.getAttribute('data-merge-code')) { S.error = 'حسابی با این کد پیدا نشد.'; render(); return; }
      mergeAccounts(t.getAttribute('data-merge-code'), mc); return;
    }
    if (e.target.closest('[data-more]')) { S.shown += 60; paintList(); return; }
    if ((t = e.target.closest('[data-owner-group]'))) { var g = t.getAttribute('data-owner-group'); ownerDialog({ group: g, label: g }); return; }
    if ((t = e.target.closest('[data-owner-customer]'))) { var cc = S.list.filter(function (x) { return x.code === t.getAttribute('data-owner-customer'); })[0]; if (cc) ownerDialog({ code: cc.code, label: cc.name }); return; }
    if ((t = e.target.closest('[data-pick-owner]'))) { assignOwner(t.getAttribute('data-pick-owner')); return; }
    if (e.target.closest('[data-imp-open]')) { S.impOpen = true; render(); return; }
    if (e.target.closest('[data-tpl-sample]')) { downloadSample(); return; }
    if (e.target.closest('[data-tpl-export]')) { downloadExport(); return; }
    if (e.target.closest('[data-imp-save]')) { saveImport(); return; }
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'cuQ') { S.q = e.target.value; S.shown = 60; refreshAll(false); }
    if ((e.target.name === 'postal' || e.target.name === 'nationalId') && e.target.form && e.target.form.id === 'cuForm') {
      var dd = latinDigits(e.target.value).replace(/\D/g, '').slice(0, 10), shown2 = faDigits(dd); if (e.target.value !== shown2) e.target.value = shown2;
    }
    if (e.target.name === 'phone' && e.target.form && e.target.form.id === 'cuForm') {
      var d = latinDigits(e.target.value).replace(/\D/g, '').slice(0, 15), shown = faDigits(d);
      if (e.target.value !== shown) e.target.value = shown;
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'cuFiles' && e.target.files && e.target.files.length) readFiles(e.target.files);
  });
  document.addEventListener('change', function (e) {
    var f = e.target.form;
    if (e.target.name === 'payMode' && f && f.id === 'cuPay') {
      var mx = f.querySelector('.cu-paymix'); if (mx) mx.hidden = !isCheque(e.target.value);
      [].forEach.call(f.querySelectorAll('.cu-payopt'), function (l) { l.classList.toggle('on', l.contains(e.target)); });
    }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.id === 'cuPay') {
      e.preventDefault();
      var pf = e.target, pcode = pf.getAttribute('data-code'), sel = pf.querySelector('input[name="payMode"]:checked');
      var pct = Number(latinDigits(pf.elements.payChequePct.value).replace(/\D/g, '')) || 0, mode = sel ? sel.value : '';
      S.payErr = ''; S.payMsg = '';
      if (pct && (pct < 1 || pct > 99)) { S.payErr = 'سهم چک باید بین ۱ تا ۹۹ باشد.'; render(); return; }
      var mixed = isCheque(mode) && pf.elements.payMixed.checked;
      var u2 = { payMode: mode, payMixed: !!mixed, payChequePct: mixed && pct ? pct : 0, payNote: pf.elements.payNote.value.trim(), updatedAt: Date.now() };
      db.collection('customers').doc(pcode).update(u2).then(function () {
        var c2 = S.list.filter(function (x) { return x.code === pcode; })[0]; if (c2) Object.assign(c2, u2);
        S.payMsg = pcode;
      }, function (err) { S.payErr = errText(err); }).then(render);
      return;
    }
    if (e.target.id !== 'cuForm') return;
    e.preventDefault();
    var f = e.target, code = f.getAttribute('data-code'), now = Date.now();
    var upd = { phone: latinDigits(f.elements.phone.value).replace(/\D/g, ''), contact: f.elements.contact.value.trim(), address: tidyAddress(f.elements.address.value), postal: latinDigits(f.elements.postal.value).replace(/\D/g, ''), nationalId: latinDigits(f.elements.nationalId.value).replace(/\D/g, ''), birthday: bdayFix(f.elements.birthday.value), notes: f.elements.notes.value.trim(), updatedAt: now };
    S.msg = ''; S.error = '';
    if (upd.postal && !postalOk(upd.postal)) { S.error = 'کد پستی باید ده رقم باشد.'; render(); return; }
    if (upd.nationalId && !nidOk(upd.nationalId)) { S.error = 'کد ملی درست نیست (ده رقم و رقم کنترل).'; render(); return; }
    if (f.elements.birthday.value.trim() && !bdayOk(f.elements.birthday.value)) { S.error = 'تاریخ تولد را شمسی و به شکل ۱۳۷۰/۰۱/۱۵ بنویسید.'; render(); return; }
    db.collection('customers').doc(code).update(upd).then(function () {
      var c = S.list.filter(function (x) { return x.code === code; })[0]; if (c) Object.assign(c, upd);
      S.msg = 'ذخیره شد.';
    }, function (err) { S.error = errText(err); }).then(render);
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.list = []; S.invoices = null;
    if (!u) { S.loading = false; render(); return; }
    if (window.MSPerm) window.MSPerm.load(db).then(function () { render(); });
    load();
  });
  render();
})();

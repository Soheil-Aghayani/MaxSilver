// Staff and applicants (کارکنان و متقاضیان). Only human resources and management (CEO, technology lead) read or change it: salaries and
// personal details are in it. Firestore/server collection: staff/<id>. The Excel template and the import also read the company's own
// «لیست پرسنلی» workbook (three sheets: staff list, start dates, leavers) so nobody has to retype it.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('st');
  if (!root) return;
  if (!cfg || !window.firebase) { root.innerHTML = '<p class="st-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var faInt = new Intl.NumberFormat('fa-IR');
  var STATUS = { active: 'کارمند فعال', applicant: 'متقاضی', left: 'ترک کار' };
  var STAGE = ['جدید', 'در حال بررسی', 'مصاحبه', 'پیشنهاد حقوق', 'پذیرفته', 'رد شده'];
  var S = { user: null, profile: null, loading: true, list: [], q: '', fStatus: 'all', fUnit: '', form: null, imp: null, busy: false, msg: '', error: '', shown: 60 };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var latin = function (s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); };
  var faD = function (s) { return String(s == null ? '' : s).replace(/[0-9]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  var can = function (a) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, a)); };
  function fix(s) { return String(s == null ? '' : s).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏ ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ این کار را ندارید، یا قوانین سرور هنوز برای این بخش به‌روز نشده است.';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  // the same person always gets the same id, so importing the file again updates instead of duplicating
  function idOf(name, phone) {
    var t = fix(name) + '|' + String(phone || '').replace(/\D/g, '').slice(-10), h = 2166136261, i;
    for (i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return 'st_' + h.toString(36);
  }
  function phoneFix(v) { var d = latin(v).replace(/\D/g, ''); if (d.length === 10 && d.charAt(0) === '9') d = '0' + d; return d; }
  function dateFix(v) {
    var t = latin(v).trim().replace(/[.\-]/g, '/'); if (!t) return '';
    var m = /^(\d{2,4})\/(\d{1,2})\/(\d{1,2})$/.exec(t); if (!m) return '';
    var y = m[1].length === 3 ? '1' + m[1] : m[1].length === 2 ? '14' + m[1] : m[1];
    return y + '/' + ('0' + m[2]).slice(-2) + '/' + ('0' + m[3]).slice(-2);
  }
  var money = function (n) { return n ? faInt.format(n) + ' تومان' : '—'; };

  // fields of a person: key, label, kind (text | tel | date | money | status | stage | long | list), width
  var FIELDS = [
    ['name', 'نام و نام خانوادگی (کامل)', 'text', 'wide'], ['unit', 'واحد', 'text'], ['position', 'سمت', 'text'], ['phone', 'شمارهٔ تماس', 'tel'], ['code', 'کد پرسنلی', 'text'],
    ['status', 'وضعیت', 'status'], ['startDate', 'تاریخ شروع (شمسی)', 'date'], ['endDate', 'تاریخ ترک کار', 'date'],
    ['salary', 'حقوق ماهانه (تومان)', 'money'], ['salaryNote', 'توضیح حقوق (مزایا، توافق)', 'text', 'wide'], ['stage', 'مرحلهٔ متقاضی', 'stage'],
    ['nationalId', 'کد ملی', 'text'], ['birthday', 'تاریخ تولد', 'date'], ['education', 'تحصیلات', 'text'], ['email', 'ایمیل', 'text'],
    ['address', 'نشانی', 'text', 'wide'], ['notes', 'یادداشت', 'long', 'wide']
  ];
  var KEYS = FIELDS.map(function (f) { return f[0]; });
  var KEEP = KEYS.concat(['photo']);
  function blank() { var o = { id: '' }; KEYS.forEach(function (k) { o[k] = ''; }); o.status = 'active'; o.salary = 0; return o; }

  // ---------- icons (the page uses pictures instead of words for its buttons)
  var IC = {
    plus: '<path d="M12 5v14M5 12h14"/>', back: '<path d="m9 6 6 6-6 6"/>', ok: '<path d="m5 12 5 5 9-10"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>', down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>', up: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>',
    warn: '<path d="M12 4 3 20h18zM12 10v4M12 17v.5"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', link: '<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>'
  };
  var ic = function (k) { return '<svg class="st-i" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>'; };
  var ibtn = function (attr, k, label, cls) { return '<button type="button" class="st-ico ' + (cls || '') + '" ' + attr + ' title="' + label + '" aria-label="' + label + '">' + ic(k) + '</button>'; };

  function happy(p) { return window.MSAvatar.beam(fix(p.name) + '|' + String(p.phone || '')); }
  function avatar(p, cls) { return '<span class="' + (cls || 'st-av') + '">' + (p.photo ? '<img src="' + esc(p.photo) + '" alt="" decoding="async">' : happy(p)) + '</span>'; }
  // a title without a family name («خانم مروت», «آقای منادی»): shown with a small warning so human resources complete the full name
  function shortName(n) { var t = fix(n).replace(/^(خانم|آقای|دکتر|مهندس|سرکار خانم|جناب آقای)\s+/, ''); return t.split(' ').length < 2; }
  // job sites for the applicants section; the picture of each is assets/jobsites/<id>.webp (a site without a picture is not listed)
  var JOBSITES = [['jobvision', 'جاب‌ویژن', 'https://jobvision.ir/employer'], ['jobinja', 'جابینجا', 'https://jobinja.ir/'], ['irantalent', 'ایران‌تلنت', 'https://www.irantalent.com/en/employer/register'],
    ['iranestekhdam', 'ایران استخدام', 'https://iranestekhdam.ir'], ['karboom', 'کاربوم', 'https://karboom.io/ats/landing/applicant-tracking-system'], ['quera', 'کوئرا', 'https://talent.quera.org/employer/intro'], ['divar', 'دیوار (استخدام)', 'https://divar.ir/s/tehran/jobs']];
  function jobTiles() {
    return '<div class="st-jobs" role="group" aria-label="سایت‌های کاریابی">' + JOBSITES.map(function (j) {
      return '<a class="st-job" href="' + j[2] + '" target="_blank" rel="noopener noreferrer" title="' + esc(j[1]) + '"><img class="st-jlogo" src="./assets/jobsites/' + j[0] + '.webp" alt="" width="72" height="72" loading="lazy" decoding="async"><span>' + esc(j[1]) + '</span></a>';
    }).join('') + '</div>';
  }

  // ---------- list
  function filtered() {
    var q = fix(S.q).toLowerCase();
    return S.list.filter(function (p) {
      if (S.fStatus !== 'all' && p.status !== S.fStatus) return false;
      if (S.fUnit && p.unit !== S.fUnit) return false;
      return !q || [p.name, p.unit, p.position, p.phone, p.code].join(' ').toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return String(a.unit || '').localeCompare(String(b.unit || ''), 'fa') || String(a.name).localeCompare(String(b.name), 'fa'); });
  }
  function card(p) {
    return '<li><button type="button" class="st-card ' + esc(p.status || 'active') + '" data-open="' + esc(p.id) + '">' + avatar(p) + '<span class="st-nm"><b>' + esc(p.name) + (shortName(p.name) ? '<i class="st-warn" title="نام و نام خانوادگی کامل نیست" aria-label="نام کامل نیست">' + ic('warn') + '</i>' : '') + '</b><small>' + esc([p.position, p.unit].filter(Boolean).join(' · ')) + '</small></span>' +
      '<span class="st-st">' + esc(STATUS[p.status] || '') + (p.status === 'applicant' && p.stage ? ' · ' + esc(p.stage) : '') + '</span>' +
      '<span class="st-meta">' + (p.phone ? '<bdi dir="ltr">' + esc(faD(p.phone)) + '</bdi>' : '') + (p.startDate ? '<span>شروع ' + esc(faD(p.startDate)) + '</span>' : '') + (p.salary ? '<span>' + esc(money(p.salary)) + '</span>' : '') + '</span></button></li>';
  }
  function units() { var u = {}; S.list.forEach(function (p) { if (p.unit) u[p.unit] = (u[p.unit] || 0) + 1; }); return u; }
  function listView() {
    var cnt = { all: S.list.length, active: 0, applicant: 0, left: 0 }; S.list.forEach(function (p) { cnt[p.status] = (cnt[p.status] || 0) + 1; });
    var un = units(), unitNames = Object.keys(un).sort(function (a, b) { return un[b] - un[a]; }), list = filtered();
    var chips = [['all', 'همه'], ['active', 'کارمند فعال'], ['applicant', 'متقاضی'], ['left', 'ترک کار']].map(function (x) {
      return '<button type="button" class="st-chip" data-st="' + x[0] + '" aria-pressed="' + (S.fStatus === x[0]) + '">' + x[1] + ' <b>' + faInt.format(cnt[x[0]] || 0) + '</b></button>';
    }).join('');
    var uchips = unitNames.length ? '<div class="st-chips scroll" role="group" aria-label="واحد"><button type="button" class="st-chip" data-unit="" aria-pressed="' + (S.fUnit === '') + '">همهٔ واحدها</button>' + unitNames.map(function (u) {
      return '<button type="button" class="st-chip" data-unit="' + esc(u) + '" aria-pressed="' + (S.fUnit === u) + '">' + esc(u) + ' <b>' + faInt.format(un[u]) + '</b></button>'; }).join('') + '</div>' : '';
    var sal = list.filter(function (p) { return p.status === 'active' && p.salary > 0; }), total = sal.reduce(function (a, p) { return a + p.salary; }, 0);
    return '<header class="st-head"><div><h1>همکاران و متقاضیان</h1><p>فهرست کارکنان، متقاضیان و ترک‌کارها با حقوق و اطلاعات کامل؛ فقط منابع انسانی و مدیریت می‌بینند.</p></div>' +
      ibtn('data-new', 'plus', 'افزودن همکار یا متقاضی') + '</header>' +
      (S.msg ? '<p class="st-ok" role="status">' + esc(S.msg) + '</p>' : '') + (S.error ? '<p class="st-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<div class="st-kpis"><div><span>کارمند فعال</span><b>' + faInt.format(cnt.active || 0) + '</b></div><div><span>متقاضی</span><b>' + faInt.format(cnt.applicant || 0) + '</b></div><div><span>ترک کار</span><b>' + faInt.format(cnt.left || 0) + '</b></div>' +
      '<div><span>جمع حقوق ثبت‌شده (فعال‌ها در فیلتر)</span><b>' + (total ? esc(faInt.format(Math.round(total / 1000000))) + ' میلیون' : '—') + '</b></div></div>' +
      '<section class="st-box"><label class="st-search"><input type="search" id="stQ" placeholder="جست‌وجو: نام، واحد، سمت یا تلفن" value="' + esc(S.q) + '" autocomplete="off"></label>' +
      '<div class="st-chips" role="group" aria-label="وضعیت">' + chips + '</div>' + uchips +
      (S.fStatus === 'applicant' ? jobTiles() : '') + '<p class="st-count">' + faInt.format(list.length) + ' نفر</p><ul class="st-list">' + (list.slice(0, S.shown).map(card).join('') || '<li class="st-note">موردی پیدا نشد.</li>') + '</ul>' +
      (list.length > S.shown ? '<button type="button" class="st-btn alt" data-more>نمایش بیشتر (' + faInt.format(list.length - S.shown) + ')</button>' : '') + '</section>' + importView();
  }

  // ---------- one person
  function formView() {
    var f = S.form;
    var inp = function (d) {
      var k = d[0], kind = d[2], cls = d[3] || '', v = f[k], lab = '<span>' + d[1] + '</span>';
      if (kind === 'status') return '<label class="' + cls + '">' + lab + '<select data-k="' + k + '">' + Object.keys(STATUS).map(function (x) { return '<option value="' + x + '"' + (v === x ? ' selected' : '') + '>' + STATUS[x] + '</option>'; }).join('') + '</select></label>';
      if (kind === 'stage') return f.status === 'applicant' ? '<label class="' + cls + '">' + lab + '<select data-k="' + k + '"><option value="">—</option>' + STAGE.map(function (x) { return '<option' + (v === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' : '';
      if (kind === 'long') return '<label class="' + cls + '">' + lab + '<textarea data-k="' + k + '" rows="3" maxlength="800">' + esc(v) + '</textarea></label>';
      if (kind === 'money') return '<label class="' + cls + '">' + lab + '<input type="text" inputmode="numeric" data-k="' + k + '" value="' + (v ? esc(faInt.format(v)) : '') + '"></label>';
      return '<label class="' + cls + '">' + lab + '<input type="text" data-k="' + k + '" value="' + esc(kind === 'tel' || kind === 'date' ? faD(v) : v) + '"' + (kind === 'tel' ? ' dir="ltr" inputmode="numeric" maxlength="11"' : kind === 'date' ? ' dir="ltr" inputmode="numeric" placeholder="۱۴۰۵/۰۶/۲۹" maxlength="10"' : '') + '></label>';
    };
    return '<header class="st-head"><div><h1>' + (f.id ? esc(f.name || 'ویرایش') : 'افزودن') + '</h1></div>' + ibtn('data-cancel', 'back', 'بازگشت', 'alt') + '</header>' + photoPick(f) +
      (S.error ? '<p class="st-err" role="alert">' + esc(S.error) + '</p>' : '') +
      '<section class="st-box"><div class="st-grid">' + FIELDS.map(inp).join('') + '</div><div class="st-acts">' + ibtn('data-save' + (S.busy ? ' disabled' : ''), 'ok', 'ذخیره') + (f.id ? ibtn('data-del="' + esc(f.id) + '"', 'trash', 'حذف', 'danger') : '') + '</div></section>';
  }
  function photoPick(f) {
    return '<div class="st-photo">' + avatar(f, 'st-av big') + '<label class="st-ico alt" title="عکس پروفایل" aria-label="عکس پروفایل"><input type="file" accept="image/*" id="stPhoto">' + window.MSImg.camera.replace('<svg ', '<svg class="st-i" ') + '</label>' +
      (f.photo ? ibtn('data-rmphoto', 'x', 'برداشتن عکس', 'alt') : '') + '</div>';
  }
  function save() {
    var f = S.form, e = '';
    f.name = fix(f.name);
    if (f.name.length < 2) e = 'نام را بنویسید.';
    f.phone = phoneFix(f.phone); f.startDate = dateFix(f.startDate) || (fix(f.startDate) ? '?' : ''); f.endDate = dateFix(f.endDate) || (fix(f.endDate) ? '?' : ''); f.birthday = dateFix(f.birthday) || (fix(f.birthday) ? '?' : '');
    if (f.startDate === '?' || f.endDate === '?' || f.birthday === '?') e = e || 'تاریخ را شمسی و به شکل ۱۴۰۵/۰۶/۲۹ بنویسید.';
    if (f.phone && !/^0\d{9,10}$/.test(f.phone)) e = e || 'شمارهٔ تماس درست نیست.';
    if (f.nationalId && !/^\d{10}$/.test(latin(f.nationalId))) e = e || 'کد ملی ده رقم است.';
    if (e) { S.error = e; render(); return; }
    var doc = {};
    KEYS.forEach(function (k) { doc[k] = typeof f[k] === 'number' ? f[k] : String(f[k] == null ? '' : f[k]).trim().slice(0, k === 'notes' ? 800 : 300); });
    doc.photo = typeof f.photo === 'string' && f.photo.indexOf('data:image/') === 0 && f.photo.length < 70000 ? f.photo : '';
    doc.salary = Number(f.salary) || 0; doc.nationalId = latin(doc.nationalId); doc.updatedAt = Date.now(); doc.updatedBy = S.user.uid;
    var id = f.id || idOf(f.name, f.phone) + (f.id ? '' : '_' + Date.now().toString(36).slice(-3));
    S.busy = true; S.error = '';
    db.collection('staff').doc(id).set(doc).then(function () {
      doc.id = id; var i = S.list.map(function (x) { return x.id; }).indexOf(id); if (i >= 0) S.list[i] = doc; else S.list.push(doc);
      S.form = null; S.msg = 'ذخیره شد.';
    }, function (er) { S.error = errText(er); }).then(function () { S.busy = false; render(); });
  }

  // ---------- Excel: template, export, import (also the company's own list file)
  var HEAD = ['کد پرسنلی', 'نام و نام خانوادگی', 'واحد', 'سمت', 'شمارهٔ تماس', 'وضعیت', 'تاریخ شروع', 'تاریخ ترک کار', 'حقوق ماهانه (تومان)', 'توضیح حقوق', 'مرحلهٔ متقاضی', 'کد ملی', 'تاریخ تولد', 'تحصیلات', 'ایمیل', 'نشانی', 'یادداشت'];
  var HK = ['code', 'name', 'unit', 'position', 'phone', 'status', 'startDate', 'endDate', 'salary', 'salaryNote', 'stage', 'nationalId', 'birthday', 'education', 'email', 'address', 'notes'];
  var ST_OUT = { active: 'فعال', applicant: 'متقاضی', left: 'ترک کار' };
  function statusIn(v) { v = fix(v); if (/ترک|رفته|left/i.test(v)) return 'left'; if (/متقاضی|applicant/i.test(v)) return 'applicant'; return 'active'; }
  function rowsOf(list) { return [HEAD].concat(list.map(function (p) { return HK.map(function (k) { return k === 'status' ? ST_OUT[p.status] || '' : k === 'salary' ? (p.salary || '') : (p[k] || ''); }); })); }
  var GUIDE = [['راهنمای پر کردن'], ['۱. هر نفر یک ردیف است. فقط «نام و نام خانوادگی» اجباری است.'], ['۲. «وضعیت»: فعال، متقاضی یا ترک کار. اگر خالی باشد «فعال» حساب می‌شود.'], ['۳. تاریخ‌ها شمسی و مثل 1405/06/29؛ تلفن فقط عدد (09121234567).'],
    ['۴. حقوق را به تومان و فقط عدد بنویسید.'], ['۵. خانهٔ خالی، مقدار فعلی را پاک نمی‌کند. ردیف‌هایی که نامشان با «نمونه» شروع شود نادیده گرفته می‌شوند.'],
    ['۶. فایل «لیست پرسنلی» خود شرکت (سه برگه: لیست پرسنل، شروع به کار، ترک کار) را هم می‌توانید مستقیم بارگذاری کنید.']];
  function download(list, name, example) {
    var rows = rowsOf(list), from = rows.length;
    if (example) { rows.push(['نمونه-۱', 'نمونه: نام و نام خانوادگی', 'مالی', 'حسابدار', '09120000000', 'فعال', '1405/06/29', '', 3000000, 'پایه به‌علاوهٔ بن', '', '', '', '', '', '', '']); rows.push(['نمونه-۲', 'نمونه: متقاضی', 'فروش', 'کارشناس فروش', '09350000000', 'متقاضی', '', '', 0, 'توافق: ۳۰ میلیون', 'مصاحبه', '', '', 'کارشناسی', '', '', '']); }
    window.MSXlsx.save(window.MSXlsx.build(rows, [14, 26, 16, 20, 16, 12, 14, 14, 18, 28, 14, 14, 14, 16, 22, 36, 30], GUIDE, { exampleFrom: example ? from : undefined }), name);
  }
  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = './assets/vendor/xlsx.full.min.js'; s.onload = function () { res(window.XLSX); }; s.onerror = function () { rej(new Error('کتابخانهٔ خواندن Excel بارگذاری نشد.')); }; document.head.appendChild(s); });
  }
  function readSheets(wb, X) { var o = {}; wb.SheetNames.forEach(function (n) { o[n] = X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null, blankrows: false }); }); return o; }
  function cell(r, i) { var v = r && r[i]; return v == null ? '' : String(v).trim(); }
  function mergeInto(by, key, patch) { var o = by[key] = by[key] || { name: '' }; Object.keys(patch).forEach(function (k) { if (patch[k] !== '' && patch[k] != null) o[k] = patch[k]; }); return o; }
  // «خانم شهبازی» in the list and «عاطفه شهبازی» in the start-date sheet are the same person: the short one is merged into the full name when the family name is unique
  function mergeShort(by) {
    var keys = Object.keys(by), full = keys.filter(function (k) { return !shortName(by[k].name); });
    keys.forEach(function (k) {
      var r = by[k]; if (!r || !shortName(r.name)) return;
      var fam = fix(r.name).replace(/^(خانم|آقای|دکتر|مهندس|سرکار خانم|جناب آقای)\s+/, '');
      var cand = full.filter(function (f) { var w = fix(by[f].name).split(' '); return by[f] && w[w.length - 1] === fam; });
      if (cand.length !== 1) return;
      var t = by[cand[0]]; Object.keys(r).forEach(function (x) { if (x !== 'name' && r[x] !== '' && r[x] != null && (t[x] === undefined || t[x] === '')) t[x] = r[x]; });
      delete by[k];
    });
  }
  // returns { records, kind }
  function parseWorkbook(sheets) {
    var names = Object.keys(sheets), by = {}, kind = '';
    // 1) the program's own template: a header row with «نام و نام خانوادگی» and «وضعیت»/«واحد»
    names.forEach(function (n) {
      var m = sheets[n];
      for (var r = 0; r < Math.min(m.length, 6); r++) {
        var hdr = (m[r] || []).map(function (c) { return fix(c); });
        if (hdr.indexOf('نام و نام خانوادگی') >= 0 && hdr.indexOf('کد پرسنلی') >= 0 && hdr.indexOf('وضعیت') >= 0) {
          kind = 'template';
          var col = {}; HK.forEach(function (k, i) { var at = hdr.indexOf(fix(HEAD[i])); if (at >= 0) col[k] = at; });
          for (var i = r + 1; i < m.length; i++) {
            var row = m[i], nm = fix(cell(row, col.name)); if (!nm || /^نمونه/.test(nm) || /^نمونه/.test(cell(row, col.code))) continue;
            var rec = { name: nm };
            HK.forEach(function (k) { if (k === 'name' || col[k] === undefined) return; var v = cell(row, col[k]); rec[k] = k === 'status' ? (v ? statusIn(v) : '') : k === 'phone' ? phoneFix(v) : /Date|birthday/.test(k) ? dateFix(v) : k === 'salary' ? (Number(latin(v).replace(/[^\d]/g, '')) || 0) : k === 'nationalId' ? latin(v).replace(/\D/g, '') : fix(v); });
            mergeInto(by, idOf(nm, rec.phone), rec);
          }
          return;
        }
      }
    });
    if (kind === 'template') return { records: Object.keys(by).map(function (k) { return by[k]; }), kind: 'قالب برنامه' };
    // 2) the company list: staff (two tables side by side), start dates, leavers
    names.forEach(function (n) {
      var m = sheets[n], nn = fix(n);
      if (/لیست/.test(nn)) {
        kind = 'لیست پرسنلی شرکت';
        [[0, 1, 2, 3, 4], [5, 6, 7, 8, 9]].forEach(function (c) {
          var unit = '';
          for (var i = 2; i < m.length; i++) {
            var row = m[i], nm = fix(cell(row, c[2])); if (!nm || !/\D/.test(cell(row, c[0])) && false) continue;
            if (!nm) continue;
            if (cell(row, c[1])) unit = fix(cell(row, c[1]));
            var ph = phoneFix(cell(row, c[4]));
            mergeInto(by, 'n:' + nm, { name: nm, unit: unit, position: fix(cell(row, c[3])), phone: ph, status: 'active' });
          }
        });
      }
    });
    names.forEach(function (n) {
      var m = sheets[n], nn = fix(n);
      if (/شروع/.test(nn)) { for (var i = 2; i < m.length; i++) { var row = m[i], nm = fix(cell(row, 1)); if (!nm) continue; mergeInto(by, 'n:' + nm, { name: nm, position: fix(cell(row, 2)), code: fix(cell(row, 3)), startDate: dateFix(cell(row, 4)), status: by['n:' + nm] ? by['n:' + nm].status : 'active' }); } }
    });
    names.forEach(function (n) {
      var m = sheets[n], nn = fix(n);
      if (/ترک/.test(nn)) { for (var i = 2; i < m.length; i++) { var row = m[i], nm = fix(cell(row, 1)); if (!nm) continue; var had = by['n:' + nm]; mergeInto(by, 'n:' + nm, { name: nm, position: fix(cell(row, 2)), startDate: dateFix(cell(row, 3)), endDate: dateFix(cell(row, 4)), status: 'left' }); void had; } }
    });
    mergeShort(by);
    return { records: Object.keys(by).map(function (k) { return by[k]; }), kind: kind || '' };
  }
  function importView() {
    var im = S.imp;
    var tools = '<div class="st-acts">' + ibtn('data-tpl', 'sheet', 'قالب Excel (خالی)', 'alt') + ibtn('data-export' + (S.list.length ? '' : ' disabled'), 'down', 'خروجی Excel', 'alt') + '<label class="st-ico alt" title="بارگذاری فایل Excel: قالب برنامه یا «لیست پرسنلی» شرکت" aria-label="بارگذاری فایل Excel"><input type="file" id="stFile" accept=".xlsx,.xls">' + ic('up') + '</label></div>';
    if (!can('staffEdit')) return '';
    var body = tools + '<p class="st-note">قالب خالی را پر کنید یا فایل «لیست پرسنلی» شرکت را مستقیم بارگذاری کنید.</p>';
    if (S.busy && !im) body += '<p class="st-note">در حال خواندن…</p>';
    if (im && im.error) body += '<p class="st-err">' + esc(im.error) + '</p>';
    if (im && im.records) {
      var have = {}; S.list.forEach(function (p) { have[idOf(p.name, p.phone)] = 1; });
      body += '<p class="st-note">' + esc(im.kind || 'فایل') + ': ' + faInt.format(im.records.length) + ' نفر خوانده شد (' + faInt.format(im.records.filter(function (r) { return r.status === 'left'; }).length) + ' ترک کار). ' + faInt.format(im.records.filter(function (r) { return have[idOf(r.name, r.phone)]; }).length) + ' نفر از قبل در برنامه هست و به‌روز می‌شود.</p>' +
        '<ul class="st-imp">' + im.records.slice(0, 8).map(function (r) { return '<li><b>' + esc(r.name) + '</b><span>' + esc([r.position, r.unit, STATUS[r.status || 'active']].filter(Boolean).join(' · ')) + '</span></li>'; }).join('') + '</ul>' +
        ibtn('data-imp-save' + (S.busy ? ' disabled' : ''), 'ok', 'ذخیره در پایگاه');
    }
    if (im && im.done) body += '<p class="st-ok" role="status">' + esc(im.done) + '</p>';
    return '<section class="st-box"><h2>ورود و خروج دسته‌جمعی (Excel)</h2>' + body + '</section>';
  }
  function readFile(f) {
    S.busy = true; S.imp = null; render();
    ensureXlsx().then(function (X) { return f.arrayBuffer().then(function (b) { return X.read(b, { type: 'array', codepage: 65001 }); }).then(function (wb) { return parseWorkbook(readSheets(wb, X)); }); })
      .then(function (r) { S.imp = r.records.length ? r : { error: 'ردیفی با قالب شناخته‌شده پیدا نشد. «قالب Excel» را بگیرید یا فایل لیست پرسنلی را بدهید.' }; }, function (e) { S.imp = { error: e && e.message || 'خواندن فایل انجام نشد.' }; })
      .then(function () { S.busy = false; render(); });
  }
  function saveImport() {
    var im = S.imp; if (!im || !im.records || S.busy) return;
    S.busy = true; render();
    var now = Date.now(), ops = im.records.map(function (r) {
      var id = idOf(r.name, r.phone), d = { updatedAt: now, updatedBy: S.user.uid, importedAt: now };
      KEYS.forEach(function (k) { if (r[k] !== undefined && r[k] !== '' && r[k] !== 0) d[k] = r[k]; });
      d.name = r.name; if (!d.status) d.status = 'active';
      return [db.collection('staff').doc(id), d];
    });
    var chunks = [], i; for (i = 0; i < ops.length; i += 400) chunks.push(ops.slice(i, i + 400));
    chunks.reduce(function (p, ch) { return p.then(function () { var b = db.batch(); ch.forEach(function (o) { b.set(o[0], o[1], { merge: true }); }); return b.commit(); }); }, Promise.resolve())
      .then(function () { S.imp = { done: 'ذخیره شد: ' + faInt.format(ops.length) + ' نفر.' }; return load(); }, function (er) { S.imp = { error: errText(er) }; })
      .then(function () { S.busy = false; render(); });
  }

  // ---------- page
  function view() {
    if (S.loading) return window.MSSkel ? window.MSSkel() : '<p class="st-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="st-note">ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="st-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('staff')) return '<p class="st-note">این بخش فقط برای منابع انسانی و مدیریت است.</p>';
    return S.form ? formView() : listView();
  }
  function render() {
    var a = document.activeElement, keep = a && a.id === 'stQ' ? a.selectionStart : null, kk = a && a.getAttribute && a.getAttribute('data-k') ? { k: a.getAttribute('data-k'), at: a.selectionStart } : null;
    root.innerHTML = view();
    if (window.MSGate) window.MSGate.apply();
    if (keep !== null) { var q = document.getElementById('stQ'); if (q) { q.focus(); try { q.setSelectionRange(keep, keep); } catch (e) { /* ignore */ } } }
    if (kk) { var el = root.querySelector('[data-k="' + kk.k + '"]'); if (el && el.tagName !== 'SELECT') { el.focus(); try { el.setSelectionRange(kk.at, kk.at); } catch (e) { /* ignore */ } } }
  }
  function load() {
    return db.collection('staff').get().then(function (qs) {
      S.list = []; qs.forEach(function (s) { var d = s.data(); d.id = s.id; if (typeof d.salary !== 'number') d.salary = Number(d.salary) || 0; S.list.push(d); });
    }, function (er) { S.error = errText(er); });
  }
  root.addEventListener('click', function (e) {
    var t;
    if ((t = e.target.closest('[data-open]'))) { var p = S.list.filter(function (x) { return x.id === t.getAttribute('data-open'); })[0]; if (p) { S.form = Object.assign(blank(), p); S.error = ''; S.msg = ''; render(); window.scrollTo(0, 0); } return; }
    if (e.target.closest('[data-new]')) { S.form = blank(); S.error = ''; S.msg = ''; render(); window.scrollTo(0, 0); return; }
    if (e.target.closest('[data-cancel]')) { S.form = null; S.error = ''; render(); return; }
    if (e.target.closest('[data-rmphoto]')) { if (S.form) { S.form.photo = ''; render(); } return; }
    if (e.target.closest('[data-save]')) { save(); return; }
    if ((t = e.target.closest('[data-del]'))) {
      if (!window.confirm('این نفر برای همیشه از پایگاه حذف شود؟')) return;
      db.collection('staff').doc(t.getAttribute('data-del')).delete().then(function () { S.list = S.list.filter(function (x) { return x.id !== t.getAttribute('data-del'); }); S.form = null; S.msg = 'حذف شد.'; render(); }, function (er) { S.error = errText(er); render(); });
      return;
    }
    if ((t = e.target.closest('[data-st]'))) { S.fStatus = t.getAttribute('data-st'); S.shown = 60; render(); return; }
    if ((t = e.target.closest('[data-unit]'))) { S.fUnit = t.getAttribute('data-unit'); S.shown = 60; render(); return; }
    if (e.target.closest('[data-more]')) { S.shown += 60; render(); return; }
    if (e.target.closest('[data-tpl]')) { download([], 'staff-template.xlsx', true); return; }
    if (e.target.closest('[data-export]')) { download(S.list.slice().sort(function (a, b) { return String(a.unit || '').localeCompare(String(b.unit || ''), 'fa'); }), 'staff-export.xlsx', false); return; }
    if (e.target.closest('[data-imp-save]')) { saveImport(); return; }
  });
  root.addEventListener('input', function (e) {
    if (e.target.id === 'stQ') { S.q = e.target.value; S.shown = 60; render(); return; }
    var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (!k || !S.form) return;
    if (e.target.tagName === 'SELECT') return;
    if (k === 'salary') { S.form.salary = Number(latin(e.target.value).replace(/\D/g, '')) || 0; var v = S.form.salary ? faInt.format(S.form.salary) : ''; if (e.target.value !== v) e.target.value = v; return; }
    S.form[k] = e.target.value;
  });
  root.addEventListener('change', function (e) {
    if (e.target.id === 'stFile' && e.target.files && e.target.files[0]) { readFile(e.target.files[0]); return; }
    if (e.target.id === 'stPhoto' && e.target.files && e.target.files[0] && S.form) {
      window.MSImg.fromFile(e.target.files[0], 256).then(function (u) { S.form.photo = u; S.error = ''; }, function (er) { S.error = er.message || 'عکس خوانده نشد.'; }).then(render);
      return;
    }
    var k = e.target.getAttribute && e.target.getAttribute('data-k');
    if (k && S.form && e.target.tagName === 'SELECT') { S.form[k] = e.target.value; if (k === 'status') render(); }
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.list = [];
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('staff')) { S.loading = false; render(); return null; }
      return load();
    }).then(function () { S.loading = false; render(); }, function (er) { S.loading = false; S.error = errText(er); render(); });
  });
  render();
})();

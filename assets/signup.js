// signup.html: asking for an account, one small step at a time.
// Every field is checked while the person types (on the page first, then by the server for what only it can know:
// a national code or number already used, a password that is too common). «Next» opens only when the step is fully correct.
// After sending, the page keeps a status screen (waiting / accepted / refused) and can connect Bale so the answer arrives there too.
(function () {
  'use strict';
  var root = document.getElementById('su'), api = window.MSApi;
  if (!root) return;
  var TOKEN_KEY = 'ms-signup-token', DRAFT_KEY = 'ms-signup-draft';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fa = function (s) { return String(s).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  var en = function (s) { return String(s || '').replace(/[۰-۹]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); }).replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }); };
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var jyear = 1405;
  try { var py = parseInt(en(new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric' }).format(new Date())), 10); if (py > 1380 && py < 1600) jyear = py; } catch (e) { /* default */ }

  var STEPS = [
    { id: 'name', title: 'نام شما', lead: 'همان‌طور که در کارت ملی نوشته شده است.', fields: ['name'] },
    { id: 'identity', title: 'کد ملی و تاریخ تولد', lead: 'برای شناسایی شما. این اطلاعات فقط پیش مدیر می‌ماند.', fields: ['national_id', 'birth'] },
    { id: 'phone', title: 'شمارهٔ موبایل', lead: 'نتیجهٔ درخواست و خبرها با همین شماره (و بله) به شما می‌رسد.', fields: ['phone'] },
    { id: 'account', title: 'ایمیل و رمز', lead: 'برای ورود به حساب. رمز را جایی نمی‌فرستیم مگر به سرور مکث‌سیلور.', fields: ['email', 'password', 'password2'] },
    { id: 'card', title: 'عکس کارت ملی', lead: 'یک عکس واضح از روی کارت ملی.', fields: ['card'] },
    { id: 'review', title: 'مرور و ارسال', lead: 'همه‌چیز درست است؟', fields: [] }
  ];
  var S = { step: 0, dir: 1, v: {}, st: {}, card: null, cardUrl: '', busy: false, error: '', seq: {}, timers: {}, done: null };

  // ---------------------------------------------------------------- the checks
  function nameLocal(v) {
    v = v.replace(/\s+/g, ' ').trim();
    if (v.length < 5 || v.indexOf(' ') < 0) return { ok: false, m: 'نام و نام خانوادگی را کامل بنویسید.' };
    if (/[0-9<>@]/.test(v) || v.length > 120) return { ok: false, m: 'در نام فقط حروف بنویسید.' };
    return { ok: true, m: '' };
  }
  function nidLocal(v) {
    v = en(v).replace(/\D/g, '');
    if (v.length < 10) return { ok: false, m: v.length ? 'کد ملی ۱۰ رقم است (' + fa(v.length) + ' رقم نوشته‌اید).' : '', quiet: v.length === 0 };
    if (/^(\d)\1{9}$/.test(v)) return { ok: false, m: 'این کد ملی درست نیست.' };
    var s = 0, i; for (i = 0; i < 9; i++) s += +v.charAt(i) * (10 - i);
    var r = s % 11, c = +v.charAt(9);
    if (!(r < 2 ? c === r : c === 11 - r)) return { ok: false, m: 'این کد ملی درست نیست؛ یک بار دیگر بررسی کنید.' };
    return { ok: true, m: '', remote: true };
  }
  function birthLocal() {
    var y = +en(S.v.by), m = +en(S.v.bm), d = +en(S.v.bd);
    if (!S.v.by && !S.v.bm && !S.v.bd) return { ok: false, m: '', quiet: true };
    if (!S.v.by || String(en(S.v.by)).length < 4 || !S.v.bm || !S.v.bd) return { ok: false, m: '', quiet: true };
    if (y < jyear - 100 || y > jyear - 12) return { ok: false, m: 'سال تولد درست نیست.' };
    if (m < 1 || m > 12) return { ok: false, m: 'ماه باید بین ۱ و ۱۲ باشد.' };
    if (d < 1 || d > (m <= 6 ? 31 : 30)) return { ok: false, m: m <= 6 ? 'روز باید بین ۱ و ۳۱ باشد.' : 'روز باید بین ۱ و ۳۰ باشد.' };
    return { ok: true, m: MONTHS[m - 1] + ' ' + fa(y) };
  }
  function phoneLocal(v) {
    v = en(v).replace(/\D/g, '');
    if (v.indexOf('0098') === 0) v = v.slice(4); else if (v.indexOf('98') === 0 && v.length === 12) v = v.slice(2);
    if (v.length && v.charAt(0) !== '0') v = '0' + v;
    if (v.length < 11) return { ok: false, m: v.length ? 'شمارهٔ موبایل ۱۱ رقم است و با ۰۹ شروع می‌شود.' : '', quiet: v.length === 0 };
    if (!/^09\d{9}$/.test(v)) return { ok: false, m: 'شمارهٔ موبایل را به صورت ۰۹۱۲۳۴۵۶۷۸۹ بنویسید.' };
    return { ok: true, m: '', remote: true };
  }
  function emailLocal(v) {
    v = v.trim();
    if (!v) return { ok: false, m: '', quiet: true };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return { ok: false, m: 'نشانی ایمیل درست نیست.' };
    return { ok: true, m: '', remote: true };
  }
  function pwLocal(v) {
    if (!v) return { ok: false, m: '', quiet: true };
    if (v.length < 8) return { ok: false, m: 'حداقل ۸ نویسه.' };
    if (!/[a-z]/.test(v) || !/[A-Z]/.test(v)) return { ok: false, m: 'یک حرف بزرگ و یک حرف کوچک انگلیسی هم لازم است.' };
    return { ok: true, m: '', remote: true };
  }
  function pw2Local(v) {
    if (!v) return { ok: false, m: '', quiet: true };
    return v === S.v.password ? { ok: true, m: 'یکی است' } : { ok: false, m: 'با رمز بالا یکی نیست.' };
  }
  var LOCAL = { name: nameLocal, national_id: nidLocal, birth: birthLocal, phone: phoneLocal, email: emailLocal, password: pwLocal, password2: pw2Local };
  var REMOTE = { national_id: 'national_id', phone: 'phone', email: 'email', password: 'password' };

  function setState(f, s, m) {
    S.st[f] = { s: s, m: m || '' };
    var el = root.querySelector('[data-field="' + f + '"]');
    if (el) {
      el.setAttribute('data-s', s);
      var msg = el.querySelector('.su-msg'); if (msg) { msg.textContent = m || ''; msg.className = 'su-msg' + (m ? ' on' : ''); }
    }
    syncNext();
  }
  function validate(f, instant) {
    clearTimeout(S.timers[f]);
    var val = f === 'birth' ? null : (S.v[f] || '');
    var r = LOCAL[f](val);
    if (!r.ok) { setState(f, r.quiet ? 'idle' : 'bad', r.m); if (!r.quiet && instant) shake(f); return; }
    if (!r.remote) { setState(f, 'ok', r.m); return; }
    setState(f, 'checking', 'در حال بررسی…');
    var id = (S.seq[f] = (S.seq[f] || 0) + 1);
    S.timers[f] = setTimeout(function () {
      var body = { field: REMOTE[f], value: f === 'password' ? S.v.password : S.v[f] };
      if (f === 'password') body.email = S.v.email || '';
      api.raw('POST', 'public/signup/check', body, true).then(function (j) {
        if (id !== S.seq[f]) return;
        if (j.ok) setState(f, 'ok', ''); else { setState(f, 'bad', j.message); shake(f); }
        if (f === 'password' && S.v.password2) validate('password2');
      }, function (e) {
        if (id !== S.seq[f]) return;
        // the server cannot be asked right now: the page-side rules passed, the final send checks again
        setState(f, 'ok', e && e.status === 429 ? '' : '');
      });
    }, instant ? 0 : 450);
  }
  function shake(f) {
    var el = root.querySelector('[data-field="' + f + '"]'); if (!el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  }
  function stepOk(i) {
    var fs = STEPS[i].fields;
    if (STEPS[i].id === 'card') return !!S.card;
    for (var k = 0; k < fs.length; k++) if (!S.st[fs[k]] || S.st[fs[k]].s !== 'ok') return false;
    return true;
  }
  function syncNext() {
    var b = root.querySelector('[data-next]'); if (!b) return;
    var ok = stepOk(S.step);
    b.disabled = !ok; b.classList.toggle('ready', ok);
  }

  // ---------------------------------------------------------------- draft (never the password nor the picture)
  function saveDraft() { try { var d = {}; ['name', 'national_id', 'by', 'bm', 'bd', 'phone', 'email'].forEach(function (k) { d[k] = S.v[k] || ''; }); sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* ignore */ } }
  function loadDraft() { try { var d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); Object.keys(d).forEach(function (k) { S.v[k] = d[k]; }); } catch (e) { /* ignore */ } }

  // ---------------------------------------------------------------- views
  var CHECK = '<svg class="su-ico ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" class="ring"/><path d="m7.5 12.5 3 3 6-7" class="tick"/></svg>';
  var CROSS = '<svg class="su-ico bad" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8.5 8.5 7 7m0-7-7 7"/></svg>';
  var SPIN = '<span class="su-spin" aria-hidden="true"></span>';
  function field(f, label, input, hint) {
    var st = S.st[f] || { s: 'idle', m: '' };
    return '<div class="su-field" data-field="' + f + '" data-s="' + st.s + '"><label class="su-label" for="in-' + f + '">' + label + '</label><div class="su-wrap">' + input +
      '<span class="su-state">' + SPIN + CHECK + CROSS + '</span></div>' + (hint ? '<p class="su-hint">' + hint + '</p>' : '') + '<p class="su-msg' + (st.m ? ' on' : '') + '" role="status" aria-live="polite">' + esc(st.m) + '</p></div>';
  }
  function inp(f, extra) { return '<input id="in-' + f + '" name="' + f + '" value="' + esc(S.v[f] || '') + '" autocomplete="off" ' + (extra || '') + '>'; }
  function strength(p) {
    var s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.min(4, Math.max(p ? 1 : 0, s - (p.length < 8 ? 1 : 0)));
  }
  function body(id) {
    if (id === 'name') return field('name', 'نام و نام خانوادگی', inp('name', 'autocomplete="name" autofocus enterkeyhint="next"'), 'مثال: علی رضایی');
    if (id === 'identity') return field('national_id', 'کد ملی', inp('national_id', 'dir="ltr" inputmode="numeric" maxlength="14" autofocus enterkeyhint="next"'), 'کد ۱۰ رقمی روی کارت ملی') +
      field('birth', 'تاریخ تولد (شمسی)', '<div class="su-date" dir="ltr"><input id="in-by" name="by" placeholder="سال" inputmode="numeric" maxlength="4" value="' + esc(S.v.by || '') + '" aria-label="سال"><input name="bm" placeholder="ماه" inputmode="numeric" maxlength="2" value="' + esc(S.v.bm || '') + '" aria-label="ماه"><input name="bd" placeholder="روز" inputmode="numeric" maxlength="2" value="' + esc(S.v.bd || '') + '" aria-label="روز"></div>', 'مثال: ۱۳۷۰ / ۵ / ۱۲');
    if (id === 'phone') return field('phone', 'موبایل', inp('phone', 'dir="ltr" inputmode="tel" maxlength="14" autocomplete="tel" autofocus enterkeyhint="next"'), 'مثال: ۰۹۱۲۳۴۵۶۷۸۹');
    if (id === 'account') return field('email', 'ایمیل', inp('email', 'dir="ltr" type="email" inputmode="email" autocomplete="email" autofocus enterkeyhint="next"'), 'با همین ایمیل وارد می‌شوید') +
      field('password', 'رمز', '<input id="in-password" name="password" type="password" dir="ltr" autocomplete="new-password" value="' + esc(S.v.password || '') + '"><button type="button" class="su-eye" data-eye aria-label="نمایش رمز">👁</button>', 'حداقل ۸ نویسه، با حرف بزرگ و کوچک انگلیسی') +
      '<div class="su-meter" data-meter="' + strength(S.v.password || '') + '" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      field('password2', 'تکرار رمز', '<input id="in-password2" name="password2" type="password" dir="ltr" autocomplete="new-password" value="' + esc(S.v.password2 || '') + '">', '');
    if (id === 'card') return '<div class="su-photo" data-has="' + (S.card ? 1 : 0) + '">' +
      (S.cardUrl ? '<img src="' + esc(S.cardUrl) + '" alt="پیش‌نمایش کارت ملی">' : '<div class="su-ph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h5M14 13h4"/></svg></div>') +
      '</div><div class="su-row"><label class="su-btn alt"><input type="file" accept="image/*" capture="environment" data-card hidden>گرفتن عکس</label><label class="su-btn alt"><input type="file" accept="image/*" data-card hidden>انتخاب از گالری</label></div>' +
      '<ul class="su-tips"><li>کارت روی سطح صاف و روشن باشد.</li><li>هر چهار گوشه و شمارهٔ ملی خوانا باشد.</li><li>فقط مدیر مکث‌سیلور عکس را می‌بیند؛ اگر درخواست رد شود پاک می‌شود.</li></ul>' + (S.error && S.step === 4 ? '<p class="su-msg on">' + esc(S.error) + '</p>' : '');
    if (id === 'review') {
      var row = function (k, v, step) { return '<div class="su-rev"><span>' + k + '</span><b dir="auto">' + v + '</b><button type="button" class="su-link" data-goto="' + step + '">ویرایش</button></div>'; };
      return '<div class="su-review">' + row('نام', esc(S.v.name), 0) + row('کد ملی', '<bdi dir="ltr">' + esc(fa(en(S.v.national_id))) + '</bdi>', 1) + row('تولد', esc(fa(en(S.v.by)) + '/' + fa(en(S.v.bm)) + '/' + fa(en(S.v.bd))), 1) +
        row('موبایل', '<bdi dir="ltr">' + esc(fa(S.v.phone)) + '</bdi>', 2) + row('ایمیل', '<bdi dir="ltr">' + esc(S.v.email) + '</bdi>', 3) + row('رمز', '••••••••', 3) + row('کارت ملی', S.cardUrl ? '<img class="su-thumb" src="' + esc(S.cardUrl) + '" alt="">' : '', 4) + '</div>' +
        '<p class="su-hint">با ارسال، درخواست شما برای مدیر می‌رود. پس از تأیید، با ایمیل و رمز بالا وارد می‌شوید.</p>' + (S.error ? '<p class="su-msg on bad">' + esc(S.error) + '</p>' : '');
    }
    return '';
  }
  function dots() {
    return '<ol class="su-dots" aria-label="مرحله‌ها">' + STEPS.map(function (s, i) { return '<li class="' + (i < S.step ? 'done' : i === S.step ? 'now' : '') + '"><span>' + (i < S.step ? '✓' : fa(i + 1)) + '</span></li>'; }).join('') + '</ol>' +
      '<div class="su-bar" aria-hidden="true"><i style="width:' + Math.round((S.step / (STEPS.length - 1)) * 100) + '%"></i></div>';
  }
  function renderWizard(animate) {
    var st = STEPS[S.step], last = S.step === STEPS.length - 1;
    root.innerHTML = '<section class="su-card">' + dots() +
      '<div class="su-step ' + (animate ? (S.dir > 0 ? 'in-next' : 'in-prev') : '') + '"><h1>' + esc(st.title) + '</h1><p class="su-lead">' + esc(st.lead) + '</p><form id="suForm" novalidate>' + body(st.id) +
      '<div class="su-nav">' + (S.step > 0 ? '<button type="button" class="su-btn ghost" data-back>قبلی</button>' : '<a class="su-btn ghost" href="./backend.html">قبلاً حساب دارم</a>') +
      '<button type="submit" class="su-btn primary" data-next ' + (stepOk(S.step) || last ? '' : 'disabled') + '>' + (last ? (S.busy ? 'در حال ارسال…' : 'ارسال درخواست') : 'ادامه') + '</button></div></form>' +
      (S.step === 0 ? '<p class="su-lost">قبلاً درخواست داده‌اید و صفحه‌اش را ندارید؟ <button type="button" class="su-link" data-lost>پیگیری با موبایل و کد ملی</button></p>' : '') + '</div></section>';
    // fields already filled (back / draft): check them again so the step opens correct
    st.fields.forEach(function (f) { if (S.v[f] || (f === 'birth' && (S.v.by || S.v.bm || S.v.bd))) validate(f, true); });
    var first = root.querySelector('input[autofocus]'); if (first && window.innerWidth > 700) first.focus();
    syncNext();
  }
  // someone who sent a request and lost the page: the mobile number and the national id bring the answer back
  function showLost(msg) {
    root.innerHTML = '<section class="su-card"><div class="su-step in-next"><h1>پیگیری درخواست</h1><p class="su-lead">شمارهٔ موبایل و کد ملی را همان‌طور که ثبت کرده‌اید وارد کنید تا وضعیت درخواستتان را ببینید.</p>' +
      '<form id="suLost" novalidate><div class="su-field" data-s="idle"><label class="su-label" for="lost-phone">موبایل</label><div class="su-wrap"><input id="lost-phone" data-l="phone" dir="ltr" inputmode="tel" maxlength="14" autocomplete="tel" autofocus></div></div>' +
      '<div class="su-field" data-s="idle"><label class="su-label" for="lost-nid">کد ملی</label><div class="su-wrap"><input id="lost-nid" data-l="nid" dir="ltr" inputmode="numeric" maxlength="14" autocomplete="off"></div></div>' +
      (msg ? '<p class="su-msg on" role="alert">' + esc(msg) + '</p>' : '') +
      '<div class="su-nav"><button type="button" class="su-btn ghost" data-lost-back>بازگشت</button><button type="submit" class="su-btn primary">نمایش وضعیت</button></div></form></div></section>';
    var f = root.querySelector('#suLost');
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var ph = en(f.querySelector('[data-l="phone"]').value).replace(/[^\d+]/g, ''), nid = en(f.querySelector('[data-l="nid"]').value).replace(/\D/g, '');
      if (ph.length < 10 || nid.length !== 10) { showLost('موبایل و کد ۱۰ رقمی ملی را کامل وارد کنید.'); return; }
      var b = f.querySelector('.primary'); b.disabled = true; b.textContent = 'در حال جست‌وجو…';
      api.raw('POST', 'public/signup/lookup', { phone: ph, national_id: nid }, true).then(function (j) {
        try { localStorage.setItem(TOKEN_KEY, j.token); } catch (e) { /* ignore */ }
        showStatus(j.token);
      }, function (e) { showLost(e && e.status === 429 ? 'تلاش‌ها زیاد بود؛ یک ساعت دیگر دوباره امتحان کنید.' : 'درخواستی با این موبایل و کد ملی پیدا نشد.'); });
    });
  }
  function go(n, dir) { S.dir = dir || (n > S.step ? 1 : -1); S.step = n; S.error = ''; renderWizard(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  // ---------------------------------------------------------------- the picture: shrunk on the phone before sending
  function shrink(file, done) {
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var max = 1600, k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      if (c.toBlob) c.toBlob(function (b) { done(b || file); }, 'image/jpeg', 0.86); else done(file);
    };
    img.onerror = function () { URL.revokeObjectURL(url); done(null); };
    img.src = url;
  }

  // ---------------------------------------------------------------- sending
  function send() {
    if (S.busy) return;
    S.busy = true; S.error = ''; renderWizard(false);
    var fd = new FormData();
    fd.append('name', S.v.name.trim()); fd.append('national_id', en(S.v.national_id)); fd.append('by', en(S.v.by)); fd.append('bm', en(S.v.bm)); fd.append('bd', en(S.v.bd));
    fd.append('phone', en(S.v.phone)); fd.append('email', S.v.email.trim()); fd.append('password', S.v.password); fd.append('card', S.card, 'card.jpg');
    api.raw('POST', 'public/signup', fd, true).then(function (j) {
      S.busy = false;
      try { localStorage.setItem(TOKEN_KEY, j.token); sessionStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
      S.v.password = ''; S.v.password2 = '';
      showStatus(j.token);
    }, function (e) {
      S.busy = false;
      var errs = (e && e.data && e.data.errors) || null, map = { name: 0, national_id: 1, birth: 1, phone: 2, email: 3, password: 3, card: 4 };
      if (errs) { var k = Object.keys(errs)[0]; S.error = errs[k][0]; go(map[k] != null ? map[k] : 5, -1); return; }
      S.error = (e && e.message) || 'ارسال انجام نشد. دوباره امتحان کنید.'; renderWizard(false);
    });
  }

  // ---------------------------------------------------------------- the answer
  var poll = 0;
  function showStatus(token) {
    clearInterval(poll);
    var cur = null, baleMsg = '';
    function draw() {
      if (!cur) { root.innerHTML = '<section class="su-card"><div class="su-wait"><span class="su-spin big"></span><p>در حال دریافت وضعیت…</p></div></section>'; return; }
      var s = cur.status, h = '<section class="su-card su-final ' + s + '">';
      if (s === 'pending') {
        h += '<div class="su-hero pend"><span class="su-pulse"></span></div><h1>درخواست شما ارسال شد</h1><p class="su-lead">' + esc(cur.name) + ' عزیز، مدیر مکث‌سیلور درخواست را بررسی می‌کند. این صفحه را باز نگه دارید یا بعداً دوباره بیایید؛ نتیجه همین‌جا نشان داده می‌شود.</p>';
        if (cur.baleEnabled) h += cur.bale ? '<p class="su-note ok">✓ بله متصل است؛ نتیجه را آن‌جا هم برایتان می‌فرستیم.</p>' : '<div class="su-bale"><p>می‌خواهید نتیجه در «بله» هم به شما برسد؟</p><button type="button" class="su-btn alt" data-bale>اتصال به بله</button>' + (baleMsg ? '<p class="su-hint">' + esc(baleMsg) + '</p>' : '') + '</div>';
      } else if (s === 'approved') {
        h += '<div class="su-hero okk">' + CHECK + '</div><h1>حساب شما تأیید شد</h1><p class="su-lead">با ایمیل و رمزی که ثبت کردید وارد شوید.</p><div class="su-nav"><a class="su-btn primary" href="./backend.html">ورود به حساب</a></div>';
      } else {
        h += '<div class="su-hero nok">' + CROSS + '</div><h1>درخواست تأیید نشد</h1><p class="su-lead">' + (cur.reason ? 'دلیل: ' + esc(cur.reason) : 'برای اطلاعات بیشتر با ما تماس بگیرید.') + '</p><div class="su-nav"><button type="button" class="su-btn primary" data-again>اصلاح و ارسال دوباره</button></div>';
      }
      root.innerHTML = h + '</section>';
    }
    function load() {
      api.raw('GET', 'public/signup/' + token, undefined, true).then(function (j) {
        var changed = !cur || cur.status !== j.status || cur.bale !== j.bale;
        cur = j; if (changed) draw();
        if (j.status !== 'pending') clearInterval(poll);
      }, function (e) { if (e && e.status === 404) { try { localStorage.removeItem(TOKEN_KEY); } catch (x) { /* ignore */ } clearInterval(poll); start(); } });
    }
    draw(); load(); poll = setInterval(load, 8000);
    root.onclick = function (ev) {
      if (ev.target.closest('[data-again]')) { try { localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } clearInterval(poll); root.onclick = null; S.step = 0; S.st = {}; start(true); return; }
      if (ev.target.closest('[data-bale]')) {
        baleMsg = 'در حال ساخت پیوند…'; draw();
        api.raw('POST', 'public/signup/' + token + '/bale', {}, true).then(function (j) { baleMsg = 'در بله «Start» را بزنید و شمارهٔ خود را با دکمهٔ «اشتراک شمارهٔ من» بفرستید.'; draw(); window.open(j.url, '_blank', 'noopener'); }, function (e) { baleMsg = (e && e.message) || 'پیوند ساخته نشد.'; draw(); });
      }
    };
  }

  // ---------------------------------------------------------------- events
  root.addEventListener('input', function (e) {
    var t = e.target, n = t.name; if (!n || t.type === 'file') return;
    if (n === 'by' || n === 'bm' || n === 'bd') {
      t.value = en(t.value).replace(/\D/g, ''); S.v[n] = t.value; saveDraft();
      if (n === 'by' && t.value.length === 4) { var nx = root.querySelector('[name="bm"]'); if (nx) nx.focus(); }
      else if (n === 'bm' && (t.value.length === 2 || +t.value > 1)) { var nd = root.querySelector('[name="bd"]'); if (nd) nd.focus(); }
      validate('birth'); return;
    }
    if (n === 'national_id' || n === 'phone') t.value = en(t.value).replace(/[^\d+]/g, '');
    S.v[n] = t.value; if (n !== 'password' && n !== 'password2') saveDraft();
    if (n === 'password') { var m = root.querySelector('[data-meter]'); if (m) m.setAttribute('data-meter', strength(t.value)); }
    validate(n);
  });
  root.addEventListener('change', function (e) {
    var t = e.target; if (!t.hasAttribute || !t.hasAttribute('data-card')) return;
    var f = t.files && t.files[0]; if (!f) return;
    if (!/^image\//.test(f.type)) { S.error = 'فقط عکس انتخاب کنید.'; renderWizard(false); return; }
    shrink(f, function (b) {
      if (!b) { S.error = 'این عکس باز نشد؛ عکس دیگری امتحان کنید.'; renderWizard(false); return; }
      if (b.size > 5.5 * 1048576) { S.error = 'حجم عکس زیاد است.'; renderWizard(false); return; }
      if (S.cardUrl) URL.revokeObjectURL(S.cardUrl);
      S.card = b; S.cardUrl = URL.createObjectURL(b); S.error = ''; renderWizard(false);
    });
  });
  root.addEventListener('click', function (e) {
    if (e.target.closest('[data-lost]')) { showLost(''); return; }
    if (e.target.closest('[data-lost-back]')) { renderWizard(false); return; }
    if (e.target.closest('[data-back]')) { go(S.step - 1, -1); return; }
    var g = e.target.closest('[data-goto]'); if (g) { go(+g.getAttribute('data-goto'), -1); return; }
    var eye = e.target.closest('[data-eye]');
    if (eye) { var p = root.querySelector('#in-password'); if (p) { p.type = p.type === 'password' ? 'text' : 'password'; var p2 = root.querySelector('#in-password2'); if (p2) p2.type = p.type; } }
  });
  root.addEventListener('submit', function (e) {
    e.preventDefault();
    if (S.step === STEPS.length - 1) { send(); return; }
    if (!stepOk(S.step)) {
      // show what is missing on this step
      STEPS[S.step].fields.forEach(function (f) { if (!S.st[f] || S.st[f].s !== 'ok') { var r = LOCAL[f](f === 'birth' ? null : (S.v[f] || '')); setState(f, 'bad', r.m || 'این بخش را کامل کنید.'); shake(f); } });
      if (STEPS[S.step].id === 'card') { S.error = 'عکس کارت ملی را اضافه کنید.'; renderWizard(false); }
      return;
    }
    go(S.step + 1, 1);
  });

  function start(fresh) {
    if (!api || !api.enabled || !api.enabled()) { root.innerHTML = '<section class="su-card"><h1>ثبت‌نام</h1><p class="su-lead">اتصال به سرور مکث‌سیلور در این نشانی فعال نیست. سایت را از portal.agseyl.ir باز کنید.</p></section>'; return; }
    var token = ''; try { token = fresh ? '' : (localStorage.getItem(TOKEN_KEY) || ''); } catch (e) { /* ignore */ }
    if (token) { showStatus(token); return; }
    if (!fresh) loadDraft();
    renderWizard(false);
  }
  start();
})();

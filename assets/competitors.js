// competitors.html: the competitor analysis as an app page. The content is sensitive, so it is NOT in this public repository: it lives in
// Firestore (intel/competitors) and only management, the CEO and the sales manager can read it (firestore.rules). The owner/IT role loads
// it once from the JSON file prepared from the analysis PDF (01_Source_Data/Competitor_Analysis/competitors.json) with the button below.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('cm');
  if (!root) return;
  if (!cfg || !window.firebase) { root.innerHTML = '<p class="cm-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore(), DOC = db.collection('intel').doc('competitors');
  var S = { user: null, profile: null, loading: true, data: null, error: '', msg: '', q: '', threat: 'all', busy: false };
  var esc = function (s) { return String(s == null ? '' : s).replace(/\s*\u2014\s*/g, '، ').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').toLowerCase(); };
  var can = function (a) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, a)); };
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ دیدن یا نوشتن ندارید (یا قوانین پایگاه داده هنوز منتشر نشده است).';
    if (/invalid-argument|invalid data/.test(c + ' ' + (e && e.message || ''))) return 'ساختار فایل برای پایگاه داده مناسب نیست.';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  function unwrap(x) { if (x && typeof x.payload === 'string') { try { return JSON.parse(x.payload); } catch (e) { return null; } } return x; }
  var THREATS = [['all', 'همه'], ['بالا', 'تهدید بالا'], ['متوسط-بالا', 'متوسط-بالا'], ['متوسط', 'متوسط']];
  function tone(t) { return /بالا/.test(t) && !/متوسط/.test(t) ? 'high' : /متوسط-بالا/.test(t) ? 'mid-high' : /متوسط/.test(t) ? 'mid' : /پایین/.test(t) ? 'low' : 'direct'; }

  // ---- cards: a short card for every competitor; "اطلاعات بیشتر" opens a popup with the contacts, the facts, the second look at the site and the AI summary
  var MARK = { ok: ['✓', 'یکی است'], diff: ['≠', 'فرق دارد'], none: ['؟', 'پیدا نشد'] };
  var MSVG = { ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', diff: '<path d="M12 7.5v6M12 17h.01"/>', none: '<path d="M9.5 9.2a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.4 1-1.4 2M12 17h.01"/>' };
  var SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  var ITEMS = {}, dlg = null, aiTimer = 0;
  var faN = function (s) { return window.MSEvents_fa(String(s)); };
  function indexItems(d) {
    ITEMS = {};
    ((d.strategic && d.strategic.items) || []).forEach(function (x, i) { ITEMS['s' + i] = x; });
    ((d.market && d.market.items) || []).forEach(function (x, i) { ITEMS['m' + i] = x; });
    ((d.supplementary && d.supplementary.items) || []).forEach(function (x, i) { ITEMS['u' + i] = x; });
  }
  function lead(x) { return x.facts && x.facts[0] ? x.facts[0][1] : (x.finding || x.text || ''); }
  function siteLink(u) { return u ? '<a href="https://' + esc(u) + '" target="_blank" rel="noopener" dir="ltr">' + esc(u) + '</a>' : ''; }
  function telLink(n) { var s = String(n).replace(/[^\d+]/g, ''); return '<a href="tel:' + esc(s) + '" dir="ltr">' + esc(faN(s.replace(/^(0\d{2})(\d{8})$/, '$1-$2'))) + '</a>'; }
  function waLink(n) { var s = String(n).replace(/[^\d]/g, '').replace(/^0/, '98'); return '<a href="https://wa.me/' + esc(s) + '" target="_blank" rel="noopener" dir="ltr">' + esc(faN(n)) + '</a>'; }
  function teaser(key, x, num) {
    var th = x.threat ? '<span class="cm-th ' + tone(x.threat) + '">تهدید ' + esc(x.threat) + '</span>' : '';
    var links = [x.site ? '<a class="cm-q" href="https://' + esc(x.site) + '" target="_blank" rel="noopener" dir="ltr">' + esc(x.site) + '</a>' : '', x.phones && x.phones[0] ? '<a class="cm-q" href="tel:' + esc(x.phones[0]) + '" dir="ltr">' + esc(faN(x.phones[0])) + '</a>' : ''].filter(Boolean).join('');
    return '<article class="cm-card cm-tz" data-key="' + key + '"><div class="cm-top"><h3>' + (num ? '<span class="cm-n">' + faN(num) + '</span>' : '') + esc(x.name) + '</h3>' + th + '</div>' +
      '<p class="cm-lead2">' + esc(lead(x)) + '</p>' + (links ? '<div class="cm-ql">' + links + '</div>' : '') +
      '<button type="button" class="cm-more-btn" data-open="' + key + '">اطلاعات بیشتر</button></article>';
  }
  function ver(x) {
    if (!x.check || !x.check.length) return '';
    var list = '<ul class="cm-chk">' + x.check.map(function (c) {
      var k = MSVG[c[1]] ? c[1] : 'none';
      return '<li class="' + k + '"><b title="' + MARK[k][1] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MSVG[k] + '</svg></b><span><em>' + esc(c[0]) + ':</em> ' + esc(c[2]) + ' <i>(' + MARK[k][1] + ')</i></span></li>';
    }).join('') + '</ul>';
    return '<h4 class="cm-h4">بررسی دوباره از سایت</h4>' + list;
  }
  function crow(k, v) { return v ? '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; }
  function popup(key) {
    var x = ITEMS[key]; if (!x) return;
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'cm-dialog';
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg || e.target.closest('[data-cm-close]')) { dlg.close(); return; }
        var b = e.target.closest('[data-ai]'); if (b) ai(b);
      });
      dlg.addEventListener('close', function () { clearInterval(aiTimer); });
      document.body.appendChild(dlg);
    }
    var ig = x.instagram ? '<a href="https://instagram.com/' + esc(x.instagram) + '" target="_blank" rel="noopener" dir="ltr">@' + esc(x.instagram) + '</a>' : '';
    var tg = x.telegram ? '<a href="https://t.me/' + esc(x.telegram) + '" target="_blank" rel="noopener" dir="ltr">@' + esc(x.telegram) + '</a>' : '';
    var facts = x.facts ? x.facts : [x.focus ? ['تمرکز', x.focus] : null, x.finding ? ['یافته', x.finding] : null, x.text ? ['توضیح', x.text] : null].filter(Boolean);
    var rasmio = '<a href="https://rasmio.com/search/companies/" target="_blank" rel="noopener" dir="ltr">rasmio.com</a> (نام را آنجا جست‌وجو کنید: <b>' + esc(x.name.replace(/\s*\(.*$/, '')) + '</b>)';
    dlg.setAttribute('aria-label', x.name);
    dlg.innerHTML = '<div class="cm-dbar"><h2>' + esc(x.name) + '</h2><button type="button" class="cm-x" data-cm-close aria-label="بستن">' + CLOSE + '</button></div>' +
      '<div class="cm-dbody">' + (x.threat ? '<p><span class="cm-th ' + tone(x.threat) + '">تهدید ' + esc(x.threat) + '</span></p>' : '') +
      (x.sum ? '<div class="cm-aibox"><button type="button" class="cm-ai" data-ai="' + key + '" aria-expanded="false">' + SPARK + '<span>خلاصهٔ هوش مصنوعی</span></button><div class="cm-aiout" hidden></div></div>' : '') +
      '<h4 class="cm-h4">راه‌های ارتباط</h4><dl class="cm-ct">' + crow('وب‌سایت', siteLink(x.site)) + crow('اینستاگرام', ig) + crow('تلگرام', tg) +
      crow('تلفن', (x.phones || []).map(telLink).join(' ، ')) + crow('واتس‌اپ', (x.wa || []).map(waLink).join(' ، ')) + crow('ایمیل', (x.emails || []).map(function (m) { return '<a href="mailto:' + esc(m) + '" dir="ltr">' + esc(m) + '</a>'; }).join(' ، ')) +
      crow('نشانی', esc(x.address || '')) + crow('نام ثبتی', esc(x.legal || '')) + crow('ثبت شرکت', rasmio) + '</dl>' +
      (!x.site && !(x.phones && x.phones.length) && !x.instagram && !(x.emails && x.emails.length) ? '<p class="cm-nosite">برای این مورد ارتباطی پیدا نشد.</p>' : '') +
      '<h4 class="cm-h4">یافته‌های تحلیل</h4><dl class="cm-ct">' + facts.map(function (f) { return crow(esc(f[0]), esc(f[1])); }).join('') + '</dl>' +
      (x.registry ? '<h4 class="cm-h4">ثبت رسمی شرکت</h4><dl class="cm-ct">' + x.registry.rows.map(function (f) { return crow(esc(f[0]), esc(f[1])); }).join('') + '</dl><p class="cm-src2">منبع: <a href="' + esc(x.registry.url) + '" target="_blank" rel="noopener" dir="ltr">' + esc(x.registry.source) + '</a>، ' + esc(x.registry.date) + '</p>' : '') +
      ver(x) + (x.more && x.more.length ? '<h4 class="cm-h4">اطلاعات بیشتر از سایت</h4><dl class="cm-ct">' + x.more.map(function (f) { return crow(esc(f[0]), esc(f[1])); }).join('') + '</dl>' : '') + '</div>';
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }
  // The summary was written in advance by an AI (Claude) from the facts in this file; the button shows it word by word.
  // It says so under the text, because it is not produced live.
  function ai(btn) {
    var out = btn.parentNode.querySelector('.cm-aiout'), x = ITEMS[btn.getAttribute('data-ai')];
    if (!out || !x) return;
    clearInterval(aiTimer);
    if (!out.hidden) { out.hidden = true; btn.setAttribute('aria-expanded', 'false'); return; }
    var note = (S.data && S.data.verification && S.data.verification.ai) || 'نوشته‌شده با هوش مصنوعی';
    out.hidden = false; btn.setAttribute('aria-expanded', 'true');
    var words = String(x.sum).split(' '), i = 0, calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function paint() { out.innerHTML = '<p>' + esc(words.slice(0, i).join(' ')) + (i < words.length ? '<span class="cm-caret"></span>' : '') + '</p>' + (i >= words.length ? '<small>' + esc(note) + '. این متن از قبل نوشته شده و در لحظه تولید نمی‌شود.</small>' : ''); }
    if (calm) { i = words.length; paint(); return; }
    paint();
    aiTimer = setInterval(function () { i += 2; if (i >= words.length) { i = words.length; clearInterval(aiTimer); } paint(); }, 55);
  }
  function strategic(d) {
    var q = norm(S.q), list = [];
    (d.strategic.items || []).forEach(function (x, i) {
      if (S.threat !== 'all' && x.threat !== S.threat) return;
      if (q && norm(x.name + ' ' + x.facts.map(function (f) { return f[0] + ' ' + f[1]; }).join(' ') + ' ' + (x.sum || '')).indexOf(q) < 0) return;
      list.push([i, x]);
    });
    return '<section class="cm-sec"><h2>' + esc(d.strategic.heading) + '</h2><p class="cm-sub">' + esc(d.strategic.sub) + '</p>' +
      '<div class="cm-bar"><input id="cmQ" type="search" placeholder="جست‌وجوی نام یا ویژگی…" value="' + esc(S.q) + '" autocomplete="off"><div class="cm-chips" role="group" aria-label="سطح تهدید" data-morph="threat">' +
      THREATS.map(function (t) { return '<button type="button" class="cm-chip" data-th="' + esc(t[0]) + '" aria-pressed="' + (S.threat === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="cm-grid">' + list.map(function (p) { return teaser('s' + p[0], p[1], p[1].n); }).join('') + '</div>' + (list.length ? '' : '<p class="cm-note">موردی پیدا نشد.</p>') + '</section>';
  }
  function market(d) {
    var m = d.market; if (!m) return '';
    return '<section class="cm-sec"><h2>' + esc(m.heading) + '</h2><p class="cm-sub">' + esc(m.sub) + '</p><div class="cm-grid">' + m.items.map(function (x, i) { return teaser('m' + i, x); }).join('') + '</div></section>';
  }
  function plain(sec, pre) {
    if (!sec) return '';
    return '<section class="cm-sec"><h2>' + esc(sec.heading) + '</h2><p class="cm-sub">' + esc(sec.sub || '') + '</p><div class="cm-grid two">' +
      sec.items.map(function (x, i) { return pre ? teaser(pre + i, x) : '<article class="cm-card soft"><h3>' + esc(x.name) + '</h3><p>' + esc(x.text) + '</p></article>'; }).join('') + '</div></section>';
  }
  function view() {
    if (S.loading) return '<p class="cm-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="cm-note">برای دیدن این بخش ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="cm-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('competitors')) return '<p class="cm-note">این بخش فقط برای مدیریت و مدیر فروش است.</p>';
    var d = S.data, out = '<h1>تحلیل رقبا</h1>';
    if (S.error) out += '<p class="cm-err" role="alert">' + esc(S.error) + '</p>';
    if (S.msg) out += '<p class="cm-ok" role="status">' + esc(S.msg) + '</p>';
    if (!d) {
      out += '<p class="cm-lead">هنوز دادهٔ این بخش بارگذاری نشده است. این اطلاعات محرمانه است و در مخزن عمومی نیست؛ از فایل «competitors.json» (پوشهٔ 01_Source_Data/Competitor_Analysis) بارگذاری می‌شود.</p>';
      out += can('roleAdmin') ? '<label class="cm-btn">بارگذاری فایل داده<input id="cmFile" type="file" accept="application/json,.json" hidden></label>' : '<p class="cm-note">بارگذاری با تکنولوژی ارتباطات سازمانی یا مدیریت است.</p>';
      return out;
    }
    out += '<p class="cm-lead">' + esc(d.subtitle) + '</p><p class="cm-src">منبع: ' + esc(d.source) + '</p>';
    if (d.verification) out += '<p class="cm-ok2"><b>' + esc(d.verification.title) + ' (' + esc(d.verification.date) + ').</b> ' + esc(d.verification.text) + '</p>';
    if (d.transcription) out += '<p class="cm-warn">' + esc(d.transcription) + '</p>';
    if (d.method) out += '<section class="cm-box"><h2>' + esc(d.method.heading) + '</h2><h3>' + esc(d.method.sub) + '</h3><p>' + esc(d.method.text) + '</p><div class="cm-fix"><b>' + esc(d.method.fixTitle) + '</b><p>' + esc(d.method.fix) + '</p></div></section>';
    indexItems(d);
    out += strategic(d) + market(d) + plain(d.supplementary, 'u') + plain(d.frameworks);
    if (d.conclusion) out += '<section class="cm-sec cm-concl"><h2>' + esc(d.conclusion.heading) + '</h2><p class="cm-sub">' + esc(d.conclusion.sub) + '</p>' + d.conclusion.paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '<blockquote>' + esc(d.conclusion.quote) + '</blockquote></section>';
    if (can('roleAdmin')) out += '<label class="cm-btn alt">جایگزینی با فایل تازه<input id="cmFile" type="file" accept="application/json,.json" hidden></label>';
    return out;
  }
  window.MSEvents_fa = function (n) { return String(n).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  function render() {
    var a = document.activeElement, keep = a && a.id === 'cmQ' ? a.selectionStart : null;
    var M = window.MSMorph, prev = M ? M.snapAll(root, '.cm-chips', '.cm-chip', '[aria-pressed=true]') : null;
    root.innerHTML = view();
    if (M) M.playAll(root, '.cm-chips', '.cm-chip', '[aria-pressed=true]', prev, { cls: 'chip' });
    if (window.MSGate) window.MSGate.apply();
    if (keep !== null) { var q = document.getElementById('cmQ'); if (q) { q.focus(); try { q.setSelectionRange(keep, keep); } catch (e) { /* ignore */ } } }
  }
  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-th]'); if (t) { S.threat = t.getAttribute('data-th'); render(); return; }
    var o = e.target.closest('[data-open]'); if (o) { popup(o.getAttribute('data-open')); return; }
    var c = e.target.closest('.cm-tz'); if (c && !e.target.closest('a')) popup(c.getAttribute('data-key'));
  });
  root.addEventListener('input', function (e) { if (e.target.id === 'cmQ') { S.q = e.target.value; render(); } });
  root.addEventListener('change', function (e) {
    if (e.target.id !== 'cmFile') return;
    var f = e.target.files && e.target.files[0];
    e.target.value = '';                                  // so the same file can be chosen again after a failure
    if (!f || S.busy) return;
    S.msg = 'فایل خوانده می‌شود…'; S.error = ''; render();
    var rd = new FileReader();
    rd.onerror = function () { S.msg = ''; S.error = 'فایل خوانده نشد.'; render(); };
    rd.onload = function () {
      var d; try { d = JSON.parse(String(rd.result).replace(/^\uFEFF/, '')); } catch (x) { S.msg = ''; S.error = 'فایل JSON درست نیست.'; render(); return; }
      if (!d || !d.strategic || !d.strategic.items || !d.title) { S.msg = ''; S.error = 'ساختار فایل با تحلیل رقبا نمی‌خواند.'; render(); return; }
      d.updatedAt = Date.now(); d.updatedBy = S.user.uid;
      S.busy = true; var secs = 0; S.msg = 'در حال ارسال به پایگاه داده… ۰ ثانیه (منتظر بمانید؛ تا ۲۰ ثانیه طول می‌کشد)';
      render();
      // a write made while the connection is down waits for ever without an error, so after 20 seconds the person is told, with a check of the server
      var done = false, tick = setInterval(function () { if (done) return; secs++; S.msg = 'در حال ارسال به پایگاه داده… ' + window.MSEvents_fa(secs) + ' ثانیه (منتظر بمانید؛ تا ۲۰ ثانیه طول می‌کشد)'; render(); }, 1000);
      var timer = setTimeout(function () {
        if (done) return; done = true; clearInterval(tick);
        S.msg = 'ارسال جواب نداد؛ اتصال به سرور بررسی می‌شود…'; render();
        var probe = new Promise(function (ok) { var to = setTimeout(function () { ok('نشد'); }, 8000); DOC.get({ source: 'server' }).then(function () { clearTimeout(to); ok('شد'); }, function (er) { clearTimeout(to); ok('نشد (' + ((er && er.code) || 'خطا') + ')'); }); });
        probe.then(function (r) {
          S.busy = false; S.msg = '';
          S.error = 'پایگاه داده جواب نداد. خواندن از سرور: ' + r + '. ' + (r === 'شد' ? 'خواندن کار می‌کند ولی نوشتن به سرور نمی‌رسد؛ احتمالاً مسیر نوشتن در اینترنت یا VPN شما بسته است.' : 'اتصال به سرور برقرار نیست؛ VPN یا اینترنت را بررسی کنید.') + ' دوباره فایل را انتخاب کنید.';
          render();
        });
      }, 20000);
      // Firestore refuses arrays inside arrays (the file has pairs like [name, value]), so the whole analysis is stored as one text field
      var stored = { title: String(d.title), updatedAt: d.updatedAt, updatedBy: d.updatedBy, payload: JSON.stringify(d) }, wr;
      try { wr = DOC.set(stored); } catch (ex) { wr = Promise.reject(ex); }
      wr.then(function () { if (done) return; done = true; clearTimeout(timer); clearInterval(tick); S.data = d; S.error = ''; S.msg = 'تحلیل رقبا بارگذاری شد.'; }, function (er) { if (done) return; done = true; clearTimeout(timer); clearInterval(tick); S.msg = ''; S.error = errText(er); })
        .then(function () { if (!done || S.msg === 'ارسال جواب نداد؛ اتصال به سرور بررسی می‌شود…') return; S.busy = false; render(); });
    };
    rd.readAsText(f, 'utf-8');
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.data = null;
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('competitors')) { S.loading = false; render(); return; }
      return DOC.get().then(function (s) { S.data = s.exists ? unwrap(s.data()) : null; S.loading = false; render(); });
    }).then(null, function (e) { S.loading = false; S.error = errText(e); render(); });
  });
  render();
})();

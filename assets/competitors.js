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
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').toLowerCase(); };
  var can = function (a) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, a)); };
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ دیدن یا نوشتن ندارید (یا قوانین پایگاه داده هنوز منتشر نشده است).';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  var THREATS = [['all', 'همه'], ['بالا', 'تهدید بالا'], ['متوسط-بالا', 'متوسط-بالا'], ['متوسط', 'متوسط']];
  function tone(t) { return /بالا/.test(t) && !/متوسط/.test(t) ? 'high' : /متوسط-بالا/.test(t) ? 'mid-high' : /متوسط/.test(t) ? 'mid' : /پایین/.test(t) ? 'low' : 'direct'; }

  function strategic(d) {
    var q = norm(S.q), list = (d.strategic.items || []).filter(function (x) {
      if (S.threat !== 'all' && x.threat !== S.threat) return false;
      return !q || norm(x.name + ' ' + x.facts.map(function (f) { return f[0] + ' ' + f[1]; }).join(' ')).indexOf(q) >= 0;
    });
    return '<section class="cm-sec"><h2>' + esc(d.strategic.heading) + '</h2><p class="cm-sub">' + esc(d.strategic.sub) + '</p>' +
      '<div class="cm-bar"><input id="cmQ" type="search" placeholder="جست‌وجوی نام یا ویژگی…" value="' + esc(S.q) + '" autocomplete="off"><div class="cm-chips" role="group" aria-label="سطح تهدید" data-morph="threat">' +
      THREATS.map(function (t) { return '<button type="button" class="cm-chip" data-th="' + esc(t[0]) + '" aria-pressed="' + (S.threat === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="cm-grid">' + list.map(function (x) {
        return '<article class="cm-card"><div class="cm-top"><h3><span class="cm-n">' + window.MSEvents_fa(x.n) + '</span>' + esc(x.name) + '</h3><span class="cm-th ' + tone(x.threat) + '">تهدید ' + esc(x.threat) + '</span></div><dl>' +
          x.facts.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') + '</dl><p class="cm-ver">' + esc(x.verified || '') + '</p></article>';
      }).join('') + '</div>' + (list.length ? '' : '<p class="cm-note">موردی پیدا نشد.</p>') + '</section>';
  }
  function market(d) {
    var m = d.market; if (!m) return '';
    return '<section class="cm-sec"><h2>' + esc(m.heading) + '</h2><p class="cm-sub">' + esc(m.sub) + '</p><div class="cm-tw"><table class="cm-table"><thead><tr><th>رقیب</th><th>تمرکز</th><th>یافتهٔ تأییدشده</th><th>تهدید</th></tr></thead><tbody>' +
      m.items.map(function (x) { return '<tr><td data-l="رقیب"><b>' + esc(x.name) + '</b></td><td data-l="تمرکز">' + esc(x.focus) + '</td><td data-l="یافته">' + esc(x.finding) + '</td><td data-l="تهدید"><span class="cm-th ' + tone(x.threat) + '">' + esc(x.threat) + '</span></td></tr>'; }).join('') +
      '</tbody></table></div></section>';
  }
  function plain(sec) {
    if (!sec) return '';
    return '<section class="cm-sec"><h2>' + esc(sec.heading) + '</h2><p class="cm-sub">' + esc(sec.sub || '') + '</p><div class="cm-grid two">' +
      sec.items.map(function (x) { return '<article class="cm-card soft"><h3>' + esc(x.name) + '</h3><p>' + esc(x.text) + '</p></article>'; }).join('') + '</div></section>';
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
    if (d.transcription) out += '<p class="cm-warn">' + esc(d.transcription) + '</p>';
    if (d.method) out += '<section class="cm-box"><h2>' + esc(d.method.heading) + '</h2><h3>' + esc(d.method.sub) + '</h3><p>' + esc(d.method.text) + '</p><div class="cm-fix"><b>' + esc(d.method.fixTitle) + '</b><p>' + esc(d.method.fix) + '</p></div></section>';
    out += strategic(d) + market(d) + plain(d.supplementary) + plain(d.frameworks);
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
  root.addEventListener('click', function (e) { var t = e.target.closest('[data-th]'); if (t) { S.threat = t.getAttribute('data-th'); render(); } });
  root.addEventListener('input', function (e) { if (e.target.id === 'cmQ') { S.q = e.target.value; render(); } });
  root.addEventListener('change', function (e) {
    if (e.target.id !== 'cmFile' || !e.target.files[0] || S.busy) return;
    var f = e.target.files[0], rd = new FileReader();
    rd.onload = function () {
      var d; try { d = JSON.parse(String(rd.result)); } catch (x) { S.error = 'فایل JSON درست نیست.'; render(); return; }
      if (!d || !d.strategic || !d.strategic.items || !d.title) { S.error = 'ساختار فایل با تحلیل رقبا نمی‌خواند.'; render(); return; }
      d.updatedAt = Date.now(); d.updatedBy = S.user.uid;
      S.busy = true; S.error = '';
      DOC.set(d).then(function () { S.data = d; S.msg = 'تحلیل رقبا بارگذاری شد.'; }, function (er) { S.error = errText(er); }).then(function () { S.busy = false; render(); });
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
      return DOC.get().then(function (s) { S.data = s.exists ? s.data() : null; S.loading = false; render(); });
    }).then(null, function (e) { S.loading = false; S.error = errText(e); render(); });
  });
  render();
})();

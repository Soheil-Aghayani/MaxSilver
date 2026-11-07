// voip.html: the internal phone extensions (VoIP) of the company. Every signed-in colleague reads the list; management (manager, CEO)
// edits it. Data: phone_directory/<id> {exts:["210"], label, person, order, updatedAt, updatedBy}. The list lives on the Max Silver server
// behind the rules, not in this static file: the site is public, the extensions are not.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('vp');
  if (!root) return;
  if (!cfg || !window.firebase) { root.innerHTML = '<p class="vp-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var S = { user: null, profile: null, loading: true, list: [], q: '', edit: false, form: null, busy: false, msg: '', error: '', cti: null, sheet: '', callMsg: '' };
  // the office phone connection (tap to call, incoming calls) exists only on the Max Silver server, not on the GitHub copy
  var onServer = function () { return !!(window.MSApi && window.MSApi.signedIn && window.MSApi.signedIn()); };
  var ctiOn = function () { return !!(S.cti && S.cti.enabled); };
  function loadCti() {
    if (!onServer()) return Promise.resolve();
    return window.MSApi.raw('GET', 'cti').then(function (r) { S.cti = r; }, function () { S.cti = null; });
  }
  function when(sec) { try { return new Intl.DateTimeFormat('fa-IR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(sec * 1000)); } catch (e) { return ''; } }
  function ctiBar() {
    if (!ctiOn()) return '';
    var c = S.cti;
    return '<section class="vp-cti" id="vpCti"><div class="vp-cti-row"><span class="vp-dot ' + (c.online ? 'on' : 'off') + '" aria-hidden="true"></span><span>' + (c.online ? 'اتصال به سانترال دفتر برقرار است' : 'سانترال دفتر در دسترس نیست؛ تماس از اینجا فعلاً ممکن نیست') + '</span></div>' +
      '<form class="vp-extform" id="vpExt"><label>داخلی من<input name="ext" dir="ltr" inputmode="numeric" maxlength="5" placeholder="مثلاً ۵۰۲" value="' + esc(c.ext ? fa(c.ext) : '') + '"></label><button type="submit" class="vp-mini">ذخیره</button></form>' +
      '<p class="vp-hint">با زدن روی یک شماره، اول گوشی «داخلی من» زنگ می‌خورد و بعد از برداشتن، آن شماره گرفته می‌شود.</p><div id="vpCtiRecent">' + recentHtml() + '</div></section>';
  }
  function recentHtml() {
    var r = (S.cti && S.cti.recent) || [];
    if (!r.length) return '';
    return '<h3 class="vp-sub">تماس‌های ورودی اخیر روی داخلی من</h3><ul class="vp-calls">' + r.map(function (x) {
      return '<li><span class="vp-when">' + esc(when(x.at)) + '</span><bdi dir="ltr">' + esc(fa(x.number)) + '</bdi>' + (x.name ? '<b>' + esc(x.name) + '</b>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function sheetHtml() {
    if (!S.sheet) return '';
    var can = ctiOn() && S.cti.ext && S.cti.online;
    return '<div class="vp-sheet" role="dialog" aria-label="تماس"><p>داخلی <b>' + esc(fa(S.sheet)) + '</b></p>' +
      (can ? '<button type="button" class="vp-primary" data-dial="' + esc(S.sheet) + '">تماس (اول داخلی ' + esc(fa(S.cti.ext)) + ' زنگ می‌خورد)</button>' : '<p class="vp-hint">' + (ctiOn() ? (!S.cti.ext ? 'برای تماس، «داخلی من» را بالا ذخیره کنید.' : 'سانترال دفتر در دسترس نیست.') : '') + '</p>') +
      '<button type="button" class="vp-mini" data-copy-sheet="' + esc(S.sheet) + '">کپی شماره</button> <button type="button" class="vp-mini" data-close-sheet>انصراف</button></div>';
  }
  function startCall(t) {
    S.sheet = ''; S.error = ''; S.callMsg = 'در حال ارسال درخواست…'; render();
    window.MSApi.raw('POST', 'cti/call', { target: t }).then(function (r) { S.callMsg = 'داخلی شما در حال زنگ خوردن است؛ گوشی را بردارید.'; render(); pollCall(r.id, 0); },
      function (e) { S.callMsg = ''; S.error = errText(e); render(); });
  }
  function pollCall(id, n) {
    if (n > 7) return;
    setTimeout(function () {
      window.MSApi.raw('GET', 'cti/call/' + id).then(function (r) {
        if (r.status === 'failed') { S.callMsg = ''; S.error = 'تماس برقرار نشد' + (r.message ? ': ' + r.message : '.'); render(); }
        else if (r.status === 'ringing') { S.callMsg = 'داخلی شما زنگ می‌خورد؛ گوشی را بردارید تا شماره گرفته شود.'; render(); }
        else pollCall(id, n + 1);
      }, function () { /* ignore */ });
    }, 2000);
  }
  // the picture of each first entry (assets/art/tiles/voip-<name>.webp); an entry without one simply shows no picture
  var IC = { e01: 'management', e02: 'sales', e03: 'office-accountant', e04: 'factory-accountant', e05: 'factory-sales-coordination', e06: 'factory-management',
    e07: 'product-warehouse', e08: 'raw-warehouse', e09: 'production-planner', e10: 'sales-assistant', e11: 'it' };
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  var fa = function (s) { return String(s).replace(/\d/g, function (d) { return FA.charAt(d); }); };
  var latin = function (s) { return String(s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return latin(String(s == null ? '' : s)).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').toLowerCase(); };
  var canEdit = function () { return !!(S.profile && S.profile.active !== false && (S.profile.role === 'manager' || S.profile.role === 'ceo')); };
  function errText(e) {
    var c = (e && e.code) || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ این کار را ندارید، یا قوانین سرور هنوز به‌روز نشده است.';
    return (e && e.message) || 'خطا: ' + (c || 'نامشخص');
  }
  function parseExts(v) { return latin(v).split(/[^\d]+/).filter(function (x) { return x; }); }

  function card(e) {
    var chips = (e.exts || []).map(function (x) {
      return '<button type="button" class="vp-ext" data-copy="' + esc(x) + '" title="کپی شماره" aria-label="داخلی ' + esc(fa(x)) + '، برای کپی بزنید"><b>' + esc(fa(x)) + '</b></button>';
    }).join('');
    var ic = IC[e.id] ? '<img class="vp-ic" src="./assets/art/tiles/voip-' + IC[e.id] + '.webp" alt="" width="52" height="52" loading="lazy" decoding="async" onerror="this.remove()">' : '';
    return '<li class="vp-card" data-id="' + esc(e.id) + '"><div class="vp-info">' + ic + '<div class="vp-tx"><h2>' + esc(e.label) + '</h2>' + (e.person ? '<p>' + esc(e.person) + '</p>' : '') + '</div></div>' +
      '<div class="vp-exts" data-no-ctx>' + chips + '</div>' +
      (S.edit ? '<div class="vp-tools"><button type="button" class="vp-mini" data-edit="' + esc(e.id) + '">ویرایش</button><button type="button" class="vp-mini bad" data-del="' + esc(e.id) + '">حذف</button></div>' : '') + '</li>';
  }
  function formView() {
    var f = S.form; if (!f) return '';
    return '<form class="vp-form" id="vpForm"><h3>' + (f.id ? 'ویرایش' : 'افزودن') + ' داخلی</h3>' +
      '<label>عنوان (واحد یا سمت)<input name="label" maxlength="80" required value="' + esc(f.label) + '"></label>' +
      '<label>نام شخص (اختیاری)<input name="person" maxlength="60" value="' + esc(f.person) + '"></label>' +
      '<label>شمارهٔ داخلی (چند شماره را با فاصله یا ویرگول جدا کنید)<input name="exts" dir="ltr" inputmode="numeric" required value="' + esc(f.exts) + '"></label>' +
      '<label>ترتیب نمایش<input name="order" dir="ltr" inputmode="numeric" value="' + esc(f.order) + '"></label>' +
      '<div class="vp-row"><button class="vp-primary" type="submit"' + (S.busy ? ' disabled' : '') + '>ذخیره</button><button type="button" class="vp-mini" data-cancel>انصراف</button></div></form>';
  }
  function render() {
    if (S.loading) { root.innerHTML = '<p class="vp-note">در حال بارگذاری…</p>'; return; }
    if (!S.user) { root.innerHTML = '<p class="vp-note">برای دیدن شماره‌های داخلی وارد حساب خود شوید.</p><a class="vp-primary" href="./panel.html">ورود</a>'; return; }
    var q = norm(S.q);
    var list = S.list.filter(function (e) { return !q || norm(e.label + ' ' + (e.person || '') + ' ' + (e.exts || []).join(' ')).indexOf(q) >= 0; });
    root.innerHTML = '<header class="vp-head"><div><h1>داخلی‌ها</h1><p>شمارهٔ داخلی واحدها و همکاران؛ برای کپی، روی شماره بزنید.</p></div>' +
      (canEdit() ? '<button type="button" class="vp-mini" data-toggle-edit>' + (S.edit ? 'پایان ویرایش' : 'ویرایش فهرست') + '</button>' : '') + '</header>' +
      '<div class="vp-bar"><input type="search" id="vpQ" placeholder="جست‌وجوی نام، واحد یا شماره" value="' + esc(S.q) + '" aria-label="جست‌وجو"></div>' +
      ctiBar() + sheetHtml() + (S.callMsg ? '<p class="vp-ok" role="status">' + esc(S.callMsg) + '</p>' : '') +
      (S.error ? '<p class="vp-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.msg ? '<p class="vp-ok" role="status">' + esc(S.msg) + '</p>' : '') +
      (S.edit && canEdit() ? '<button type="button" class="vp-primary" data-add>افزودن داخلی</button>' : '') + formView() +
      (list.length ? '<ul class="vp-list">' + list.map(card).join('') + '</ul>' : '<p class="vp-note">' + (S.list.length ? 'موردی پیدا نشد.' : 'هنوز شماره‌ای ثبت نشده است.') + '</p>') +
      '<p class="vp-foot">این فهرست فقط برای همکارانِ واردشده دیده می‌شود.</p>';
    var qi = document.getElementById('vpQ');
    if (qi && document.activeElement === document.body && S.focusQ) { qi.focus(); try { qi.setSelectionRange(qi.value.length, qi.value.length); } catch (e) { /* ignore */ } }
  }
  function load() {
    return db.collection('phone_directory').get().then(function (qs) {
      var a = []; qs.forEach(function (d) { var x = d.data(); x.id = d.id; if (Array.isArray(x.exts)) a.push(x); });
      a.sort(function (x, y) { return (x.order || 0) - (y.order || 0) || String(x.label).localeCompare(String(y.label), 'fa'); });
      S.list = a;
    });
  }
  function save(form) {
    var exts = parseExts(form.exts.value), label = form.label.value.trim(), person = form.person.value.trim();
    var order = parseInt(latin(form.order.value || '0'), 10); if (isNaN(order) || order < 0) order = 0; if (order > 999) order = 999;
    if (label.length < 2) { S.error = 'عنوان را بنویسید.'; return render(); }
    if (!exts.length || exts.length > 4 || exts.some(function (x) { return x.length < 2 || x.length > 5; })) { S.error = 'شمارهٔ داخلی ۲ تا ۵ رقم است؛ حداکثر چهار شماره.'; return render(); }
    var id = S.form.id || db.collection('phone_directory').doc().id;
    var d = { exts: exts, label: label, order: order, updatedAt: Date.now(), updatedBy: S.user.uid }; if (person) d.person = person;
    S.busy = true; S.error = ''; S.msg = ''; render();
    db.collection('phone_directory').doc(id).set(d).then(function () { S.form = null; S.msg = 'ذخیره شد.'; return load(); }, function (er) { S.error = errText(er); })
      .then(function () { S.busy = false; render(); });
  }
  root.addEventListener('input', function (e) { if (e.target.id === 'vpQ') { S.q = e.target.value; S.focusQ = true; var pos = e.target.selectionStart; render(); var qi = document.getElementById('vpQ'); if (qi) { qi.focus(); try { qi.setSelectionRange(pos, pos); } catch (x) { /* ignore */ } } } });
  root.addEventListener('submit', function (e) {
    if (e.target.id === 'vpForm') { e.preventDefault(); save(e.target); }
    if (e.target.id === 'vpExt') {
      e.preventDefault();
      S.error = ''; S.msg = '';
      window.MSApi.raw('PUT', 'cti/ext', { ext: e.target.ext.value }).then(function (r) { S.msg = r.ext ? 'داخلی شما ذخیره شد.' : 'داخلی شما حذف شد.'; return loadCti(); }, function (er) { S.error = errText(er); }).then(render);
    }
  });
  function copyNum(n) {
    var done = function () { S.msg = 'داخلی ' + fa(n) + ' کپی شد.'; S.error = ''; S.sheet = ''; render(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(n).then(done, done); else done();
  }
  // right click / long press on an extension card (assets/ctxmenu.js): copy each number, or call it when the phone connection is on
  (window.MSCtxQ = window.MSCtxQ || []).push(['.vp-card[data-id]', function (el) {
    var items = [];
    Array.prototype.forEach.call(el.querySelectorAll('.vp-ext[data-copy]'), function (b) {
      var n = b.getAttribute('data-copy');
      if (ctiOn()) items.push({ ico: 'act', label: 'تماس با داخلی ' + fa(n), run: function () { S.sheet = n; S.msg = ''; S.error = ''; render(); } });
      items.push({ ico: 'copy', label: 'کپی داخلی ' + fa(n), run: function () { copyNum(n); } });
    });
    return items;
  }]);
  root.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-copy')) {
      var n = t.getAttribute('data-copy');
      if (ctiOn()) { S.sheet = n; S.msg = ''; S.error = ''; render(); return; }     // with the phone connection a tap offers «call» and «copy»
      copyNum(n);
      return;
    }
    if (t.hasAttribute('data-copy-sheet')) { copyNum(t.getAttribute('data-copy-sheet')); return; }
    if (t.hasAttribute('data-close-sheet')) { S.sheet = ''; render(); return; }
    if (t.hasAttribute('data-dial')) { startCall(t.getAttribute('data-dial')); return; }
    if (t.hasAttribute('data-toggle-edit')) { S.edit = !S.edit; S.form = null; S.msg = ''; S.error = ''; return render(); }
    if (t.hasAttribute('data-add')) { S.form = { id: '', label: '', person: '', exts: '', order: String(S.list.length ? (S.list[S.list.length - 1].order || 0) + 1 : 1) }; return render(); }
    if (t.hasAttribute('data-cancel')) { S.form = null; return render(); }
    if (t.hasAttribute('data-edit')) {
      var x = S.list.filter(function (y) { return y.id === t.getAttribute('data-edit'); })[0];
      if (x) { S.form = { id: x.id, label: x.label || '', person: x.person || '', exts: (x.exts || []).join(' '), order: String(x.order || 0) }; render(); }
      return;
    }
    if (t.hasAttribute('data-del')) {
      if (t.getAttribute('data-armed') !== '1') { t.setAttribute('data-armed', '1'); t.textContent = 'مطمئنید؟ دوباره بزنید'; return; }
      db.collection('phone_directory').doc(t.getAttribute('data-del')).delete().then(function () { S.msg = 'حذف شد.'; S.error = ''; return load(); }, function (er) { S.error = errText(er); }).then(render);
    }
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.list = [];
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false) { S.loading = false; render(); return null; }
      return Promise.all([load(), loadCti()]);
    }).then(function () { S.loading = false; render(); }, function (er) { S.loading = false; S.error = errText(er); render(); });
  });
  // incoming calls and the state of the office connection refresh while the page is open and visible
  setInterval(function () {
    if (document.hidden || !ctiOn() || !S.user) return;
    loadCti().then(function () {
      var box = document.getElementById('vpCtiRecent'); if (box) box.innerHTML = recentHtml();
      var dot = document.querySelector('.vp-dot'); if (dot) dot.className = 'vp-dot ' + (S.cti && S.cti.online ? 'on' : 'off');
    });
  }, 8000);
  render();
})();

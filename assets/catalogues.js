// catalogues.html: the catalogues of the company as downloadable files. Everyone with the «catalogues» area downloads; the people with
// «cataloguesEdit» (management) add a catalogue, write its title and description, and upload each file in a format they choose.
// Data: catalogues/<id> {title, about, files:[{id,name,kind,label,size,at}], active, order}; the files themselves live on the Max Silver
// server (POST catalogues/<id>/files, GET catalogues/files/<fileId>), because a static site cannot store uploads.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('ct');
  if (!root) return;
  if (!cfg || !window.firebase) { root.innerHTML = '<p class="ct-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var faInt = new Intl.NumberFormat('fa-IR');
  // the format the person picks for a file: it decides the badge and the default label
  var KINDS = [
    ['pdf', 'PDF (برای ارسال به مشتری)', 'PDF'], ['layered', 'فایل لایه‌باز (InDesign، Illustrator، Photoshop، DesignCraft…)', 'لایه‌باز'], ['image', 'تصویر (PNG، JPG، WebP)', 'تصویر'],
    ['office', 'Word، Excel یا PowerPoint', 'Office'], ['zip', 'فایل فشرده (ZIP، RAR)', 'ZIP'], ['bim', 'مدل سه‌بعدی یا BIM (IFC، DWG، BIMCraft…)', 'BIM'], ['other', 'سایر', 'فایل']
  ];
  var S = { user: null, profile: null, loading: true, list: [], form: null, adding: '', busy: '', msg: '', error: '' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var can = function (a) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, a)); };
  var onServer = function () { return !!(window.MSApi && window.MSApi.signedIn && window.MSApi.signedIn()); };
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ این کار را ندارید، یا قوانین سرور هنوز به‌روز نشده است.';
    return (e && e.message) || 'خطا: ' + (c || 'نامشخص');
  }
  function mb(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' مگابایت' : Math.max(1, Math.round(b / 1024)) + ' کیلوبایت'; }
  function kindOf(k) { return KINDS.filter(function (x) { return x[0] === k; })[0] || KINDS[KINDS.length - 1]; }

  function fileHtml(c, f) {
    var k = kindOf(f.kind), ext = (String(f.name).split('.').pop() || '').slice(0, 5).toUpperCase() || k[2];
    return '<span class="ct-fwrap"><button type="button" class="ct-file" data-dl="' + esc(f.id) + '" data-name="' + esc(f.name) + '"><b>' + esc(ext) + '</b><span>' + esc(f.label || k[2]) + '<small>' + esc(mb(f.size || 0)) + '</small></span><em>دانلود</em></button>' +
      (can('cataloguesEdit') ? '<button type="button" class="ct-x" data-rmfile="' + esc(c.id) + '|' + esc(f.id) + '" aria-label="حذف فایل" title="حذف فایل">×</button>' : '') + '</span>';
  }
  function cardHtml(c) {
    var edit = can('cataloguesEdit'), files = c.files || [];
    var add = S.adding === c.id ? addForm(c) : '';
    return '<article class="ct-card' + (c.active === false ? ' off' : '') + '"><img class="ct-art" src="./assets/art/tiles/catalogues.webp" alt="" width="96" height="96" decoding="async" onerror="this.remove()">' +
      '<div class="ct-body"><h2>' + esc(c.title) + (c.active === false ? ' <small>(پنهان)</small>' : '') + '</h2>' + (c.about ? '<p>' + esc(c.about) + '</p>' : '') +
      '<div class="ct-files">' + (files.length ? files.map(function (f) { return fileHtml(c, f); }).join('') : '<span class="ct-soon">هنوز فایلی بارگذاری نشده است.</span>') + '</div>' + add +
      (edit ? '<div class="ct-acts"><button type="button" class="ct-btn alt" data-addfile="' + esc(c.id) + '">افزودن فایل</button><button type="button" class="ct-btn alt" data-edit="' + esc(c.id) + '">ویرایش</button>' +
        '<button type="button" class="ct-btn alt" data-toggle="' + esc(c.id) + '">' + (c.active === false ? 'نمایش' : 'پنهان کردن') + '</button><button type="button" class="ct-btn danger" data-del="' + esc(c.id) + '">حذف</button></div>' : '') + '</div></article>';
  }
  function addForm(c) {
    if (!onServer()) return '<p class="ct-err">بارگذاری فایل فقط روی سرور مکث‌سیلور ممکن است (با حساب سرور وارد شوید).</p>';
    return '<form class="ct-add" data-addform="' + esc(c.id) + '"><label>قالب فایل<select name="kind">' + KINDS.map(function (k) { return '<option value="' + k[0] + '">' + esc(k[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label>عنوان دکمه<input type="text" name="label" maxlength="60" placeholder="مثلاً PDF فارسی، فایل InDesign"></label>' +
      '<label class="ct-pick"><input type="file" name="file" required><span>انتخاب فایل (تا ۲۰۰ مگابایت)</span></label>' +
      '<div class="ct-acts"><button type="submit" class="ct-btn"' + (S.busy ? ' disabled' : '') + '>' + (S.busy === 'up' ? 'در حال بارگذاری…' : 'بارگذاری') + '</button><button type="button" class="ct-btn alt" data-cancel>انصراف</button></div></form>';
  }
  function formHtml() {
    var f = S.form;
    return '<section class="ct-form"><h2>' + (f.id ? 'ویرایش کاتالوگ' : 'کاتالوگ تازه') + '</h2><label>عنوان<input type="text" data-k="title" maxlength="120" value="' + esc(f.title) + '" placeholder="مثلاً کاتالوگ فرهای طرح پیتزا مستر؛ سری ۷۰۰"></label>' +
      '<label>توضیح<textarea data-k="about" rows="3" maxlength="600" placeholder="این کاتالوگ چیست، برای چه کسی و چه محصولاتی دارد">' + esc(f.about) + '</textarea></label>' +
      '<div class="ct-acts"><button type="button" class="ct-btn" data-save>ذخیره</button><button type="button" class="ct-btn alt" data-cancel>انصراف</button></div></section>';
  }
  function view() {
    if (S.loading) return window.MSSkel ? window.MSSkel() : '<p class="ct-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="ct-note">ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="ct-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('catalogues')) return '<p class="ct-note">این بخش برای نقش شما فعال نیست.</p>';
    var list = S.list.filter(function (c) { return c.active !== false || can('cataloguesEdit'); });
    return '<header class="ct-head"><h1>کاتالوگ‌ها</h1><p>فایل‌های کاتالوگ برای فروش و معرفی محصولات؛ هر فایل را در قالب مناسب (PDF برای مشتری، لایه‌باز برای طراح) بگیرید.</p>' +
      (can('cataloguesEdit') && !S.form ? '<button type="button" class="ct-btn" data-new>افزودن کاتالوگ</button>' : '') + '</header>' +
      (S.msg ? '<p class="ct-ok" role="status">' + esc(S.msg) + '</p>' : '') + (S.error ? '<p class="ct-err" role="alert">' + esc(S.error) + '</p>' : '') +
      (S.form ? formHtml() : '') + '<div class="ct-list">' + (list.map(cardHtml).join('') || '<p class="ct-note">هنوز کاتالوگی ثبت نشده است.</p>') + '</div>';
  }
  function render() { root.innerHTML = view(); if (window.MSGate) window.MSGate.apply(); }
  function load() {
    return db.collection('catalogues').get().then(function (qs) {
      S.list = []; qs.forEach(function (s) { var d = s.data(); d.id = s.id; if (!Array.isArray(d.files)) d.files = []; S.list.push(d); });
      S.list.sort(function (a, b) { return (a.order || 0) - (b.order || 0) || (b.updatedAt || 0) - (a.updatedAt || 0); });
    }, function (er) { S.error = errText(er); });
  }
  function put(c, patch) {
    var d = { title: c.title, about: c.about || '', files: c.files || [], active: c.active !== false, order: c.order || 0 };
    Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    d.updatedAt = Date.now(); d.updatedBy = S.user.uid;
    return db.collection('catalogues').doc(c.id).set(d).then(function () { Object.assign(c, d); });
  }
  root.addEventListener('click', function (e) {
    var t, c = function (id) { return S.list.filter(function (x) { return x.id === id; })[0]; };
    if (e.target.closest('[data-new]')) { S.form = { id: '', title: '', about: '' }; S.msg = ''; S.error = ''; render(); return; }
    if ((t = e.target.closest('[data-edit]'))) { var o = c(t.getAttribute('data-edit')); if (o) { S.form = { id: o.id, title: o.title, about: o.about || '' }; S.error = ''; render(); window.scrollTo(0, 0); } return; }
    if (e.target.closest('[data-cancel]')) { S.form = null; S.adding = ''; S.error = ''; render(); return; }
    if (e.target.closest('[data-save]')) {
      var f = S.form, ttl = String(f.title || '').trim();
      if (ttl.length < 2) { S.error = 'عنوان را بنویسید.'; render(); return; }
      var rec = f.id ? c(f.id) : { id: db.collection('catalogues').doc().id, files: [], order: -Date.now() };
      put(rec, { title: ttl.slice(0, 120), about: String(f.about || '').trim().slice(0, 600) }).then(function () { if (!f.id) S.list.unshift(rec); S.form = null; S.msg = 'ذخیره شد.'; S.error = ''; }, function (er) { S.error = errText(er); }).then(render);
      return;
    }
    if ((t = e.target.closest('[data-addfile]'))) { S.adding = t.getAttribute('data-addfile'); S.error = ''; S.msg = ''; render(); return; }
    if ((t = e.target.closest('[data-toggle]'))) { var q = c(t.getAttribute('data-toggle')); if (q) put(q, { active: q.active === false }).then(render, function (er) { S.error = errText(er); render(); }); return; }
    if ((t = e.target.closest('[data-del]'))) {
      var z = c(t.getAttribute('data-del')); if (!z || !window.confirm('این کاتالوگ و فایل‌هایش حذف شود؟')) return;
      var rm = (z.files || []).map(function (ff) { return onServer() ? window.MSApi.catalogueFileDelete(ff.id).then(null, function () { /* already gone */ }) : null; });
      Promise.all(rm).then(function () { return db.collection('catalogues').doc(z.id).delete(); }).then(function () { S.list = S.list.filter(function (x) { return x.id !== z.id; }); S.msg = 'حذف شد.'; }, function (er) { S.error = errText(er); }).then(render);
      return;
    }
    if ((t = e.target.closest('[data-rmfile]'))) {
      var p = t.getAttribute('data-rmfile').split('|'), cc = c(p[0]); if (!cc || !window.confirm('این فایل حذف شود؟')) return;
      (onServer() ? window.MSApi.catalogueFileDelete(p[1]).then(null, function () { /* already gone */ }) : Promise.resolve()).then(function () { return put(cc, { files: cc.files.filter(function (x) { return x.id !== p[1]; }) }); }).then(function () { S.msg = 'فایل حذف شد.'; }, function (er) { S.error = errText(er); }).then(render);
      return;
    }
    if ((t = e.target.closest('[data-dl]'))) {
      var b = t; b.disabled = true;
      window.MSApi.download('catalogues/files/' + encodeURIComponent(t.getAttribute('data-dl')), t.getAttribute('data-name')).then(null, function (er) { S.error = (er && er.message) || 'دانلود نشد.'; render(); }).then(function () { b.disabled = false; });
    }
  });
  root.addEventListener('input', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (k && S.form) S.form[k] = e.target.value; });
  root.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-addform]'); if (!form) return;
    e.preventDefault();
    var cc = S.list.filter(function (x) { return x.id === form.getAttribute('data-addform'); })[0], file = form.elements.file.files[0]; if (!cc || !file) return;
    if (file.size > 200 * 1048576) { S.error = 'فایل بزرگ‌تر از ۲۰۰ مگابایت است.'; render(); return; }
    var kind = form.elements.kind.value, label = form.elements.label.value.trim() || kindOf(kind)[2];
    var fd = new FormData(); fd.append('file', file); fd.append('kind', kind); fd.append('label', label.slice(0, 60));
    S.busy = 'up'; S.error = ''; render();
    window.MSApi.catalogueFileUpload(cc.id, fd).then(function (m) {
      return put(cc, { files: (cc.files || []).concat([{ id: m.id, name: m.name, kind: m.kind, label: m.label, size: m.size, at: Date.now() }]) });
    }).then(function () { S.adding = ''; S.msg = 'فایل بارگذاری شد.'; }, function (er) { S.error = errText(er); }).then(function () { S.busy = ''; render(); });
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.list = [];
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('catalogues')) { S.loading = false; render(); return null; }
      return load();
    }).then(function () { S.loading = false; render(); }, function (er) { S.loading = false; S.error = errText(er); render(); });
  });
  render();
})();

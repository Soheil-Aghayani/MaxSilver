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

  // buttons are pictures with a tooltip instead of words
  var IC = {
    plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>', edit: '<path d="m4 20 4-1 11-11-3-3L5 16zM14 6l3 3"/>', eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.2 4M6.5 7.2C3.9 8.9 2 12 2 12s3.6 6.5 10 6.5a9.6 9.6 0 0 0 4-.9"/>',
    more: '<circle cx="12" cy="5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="19" r="1.7" fill="currentColor"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', ok: '<path d="m5 12 5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'
  };
  var ic = function (k) { return '<svg class="ct-i" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[k] + '</svg>'; };
  var ibtn = function (attr, k, label, cls) { return '<button type="button" class="ct-ico ' + (cls || '') + '" ' + attr + ' title="' + label + '" aria-label="' + label + '">' + ic(k) + '</button>'; };

  function fileHtml(c, f) {
    var k = kindOf(f.kind), ext = (String(f.name).split('.').pop() || '').slice(0, 5).toUpperCase() || k[2];
    return '<span class="ct-fwrap"><button type="button" class="ct-file" data-dl="' + esc(f.id) + '" data-name="' + esc(f.name) + '"><b>' + esc(ext) + '</b><span>' + esc(f.label || k[2]) + '<small>' + esc(mb(f.size || 0)) + '</small></span>' + ic('down') + '</button>' +
      (can('cataloguesEdit') ? '<button type="button" class="ct-x" data-rmfile="' + esc(c.id) + '|' + esc(f.id) + '" aria-label="حذف فایل" title="حذف فایل">×</button>' : '') + '</span>';
  }
  // the options of a catalogue: one three-dot button on the far side of the card opens a small menu
  function moreMenu(c) {
    var open = S.menu === c.id, item = function (attr, k, label, cls) { return '<button type="button" role="menuitem" ' + attr + (cls ? ' class="' + cls + '"' : '') + '>' + ic(k) + '<span>' + label + '</span></button>'; };
    return '<div class="ct-more"><button type="button" class="ct-dots" data-menu="' + esc(c.id) + '" aria-haspopup="menu" aria-expanded="' + open + '" title="گزینه‌ها" aria-label="گزینه‌ها">' + ic('more') + '</button>' +
      (open ? '<div class="ct-menu" role="menu">' + item('data-addfile="' + esc(c.id) + '"', 'up', 'افزودن فایل') + item('data-edit="' + esc(c.id) + '"', 'edit', 'ویرایش') +
        item('data-toggle="' + esc(c.id) + '"', c.active === false ? 'eye' : 'eyeoff', c.active === false ? 'نمایش' : 'پنهان کردن') + item('data-del="' + esc(c.id) + '"', 'trash', 'حذف', 'danger') + '</div>' : '') + '</div>';
  }
  function cardHtml(c) {
    var edit = can('cataloguesEdit'), files = c.files || [];
    var add = S.adding === c.id ? addForm(c) : '';
    return '<article class="ct-card' + (c.active === false ? ' off' : '') + '">' + (c.cover ? '<img class="ct-art cover" src="' + esc(c.cover) + '" alt="" width="96" height="96" decoding="async">' : '<img class="ct-art" src="./assets/art/tiles/catalogues.webp" alt="" width="96" height="96" decoding="async" onerror="this.remove()">') +
      '<div class="ct-body"><h2>' + esc(c.title) + (c.active === false ? ' <small>(پنهان)</small>' : '') + '</h2>' + (c.about ? '<p>' + esc(c.about) + '</p>' : '') +
      '<div class="ct-files">' + (files.length ? files.map(function (f) { return fileHtml(c, f); }).join('') : '<span class="ct-soon">هنوز فایلی بارگذاری نشده است.</span>') + '</div>' + add +
      '</div>' + (edit ? moreMenu(c) : '') + '</article>';
  }
  function addForm(c) {
    if (!onServer()) return '<p class="ct-err">بارگذاری فایل فقط روی سرور مکث‌سیلور ممکن است (با حساب سرور وارد شوید).</p>';
    return '<form class="ct-add" data-addform="' + esc(c.id) + '"><label>قالب فایل<select name="kind">' + KINDS.map(function (k) { return '<option value="' + k[0] + '">' + esc(k[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label>عنوان دکمه<input type="text" name="label" maxlength="60" placeholder="مثلاً PDF فارسی، فایل InDesign"></label>' +
      '<label class="ct-pick"><input type="file" name="file" required><span>انتخاب فایل (تا ۲۰۰ مگابایت)</span></label>' +
      '<div class="ct-acts"><button type="submit" class="ct-ico"' + (S.busy ? ' disabled' : '') + ' title="' + (S.busy === 'up' ? 'در حال بارگذاری…' : 'بارگذاری') + '" aria-label="بارگذاری">' + ic(S.busy === 'up' ? 'down' : 'up') + '</button>' + ibtn('data-cancel', 'x', 'انصراف', 'alt') + '</div></form>';
  }
  function formHtml() {
    var f = S.form;
    var cover = '<div class="ct-coverpick"><span class="ct-cvr">' + (f.cover ? '<img src="' + esc(f.cover) + '" alt="">' : '<img src="./assets/art/tiles/catalogues.webp" alt="" onerror="this.remove()">') + '</span>' +
      '<label class="ct-ico alt" title="عکس کاتالوگ" aria-label="عکس کاتالوگ"><input type="file" accept="image/*" id="ctCover">' + window.MSImg.camera.replace('<svg ', '<svg class="ct-i" ') + '</label>' + (f.cover ? ibtn('data-rmcover', 'x', 'برداشتن عکس', 'alt') : '') + '</div>';
    return '<section class="ct-form"><h2>' + (f.id ? 'ویرایش کاتالوگ' : 'کاتالوگ تازه') + '</h2>' + cover + '<label>عنوان<input type="text" data-k="title" maxlength="120" value="' + esc(f.title) + '" placeholder="مثلاً کاتالوگ فرهای طرح پیتزا مستر؛ سری ۷۰۰"></label>' +
      '<label>توضیح<textarea data-k="about" rows="3" maxlength="600" placeholder="این کاتالوگ چیست، برای چه کسی و چه محصولاتی دارد">' + esc(f.about) + '</textarea></label>' +
      '<div class="ct-acts">' + ibtn('data-save', 'ok', 'ذخیره') + ibtn('data-cancel', 'x', 'انصراف', 'alt') + '</div></section>';
  }
  function view() {
    if (S.loading) return window.MSSkel ? window.MSSkel() : '<p class="ct-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="ct-note">ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="ct-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('catalogues')) return '<p class="ct-note">این بخش برای نقش شما فعال نیست.</p>';
    var list = S.list.filter(function (c) { return c.active !== false || can('cataloguesEdit'); });
    return '<header class="ct-head"><div><h1>کاتالوگ‌ها</h1><p>فایل‌های کاتالوگ برای فروش و معرفی محصولات؛ هر فایل را در قالب مناسب (PDF برای مشتری، لایه‌باز برای طراح) بگیرید.</p></div>' +
      (can('cataloguesEdit') && !S.form ? ibtn('data-new', 'plus', 'کاتالوگ تازه') : '') + '</header>' +
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
    if (c.cover) d.cover = c.cover;
    Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
    if (!d.cover) delete d.cover;
    d.updatedAt = Date.now(); d.updatedBy = S.user.uid;
    return db.collection('catalogues').doc(c.id).set(d).then(function () { Object.assign(c, d); if (!d.cover) delete c.cover; });
  }
  root.addEventListener('click', function (e) {
    var t, c = function (id) { return S.list.filter(function (x) { return x.id === id; })[0]; };
    if (S.menu && !e.target.closest('[data-menu]')) S.menu = '';
    if (e.target.closest('[data-new]')) { S.form = { id: '', title: '', about: '', cover: '' }; S.msg = ''; S.error = ''; render(); return; }
    if ((t = e.target.closest('[data-edit]'))) { var o = c(t.getAttribute('data-edit')); if (o) { S.form = { id: o.id, title: o.title, about: o.about || '', cover: o.cover || '' }; S.error = ''; render(); window.scrollTo(0, 0); } return; }
    if ((t = e.target.closest('[data-menu]'))) { var mid = t.getAttribute('data-menu'); S.menu = S.menu === mid ? '' : mid; render(); return; }
    if (e.target.closest('[data-rmcover]')) { if (S.form) { S.form.cover = ''; render(); } return; }
    if (e.target.closest('[data-cancel]')) { S.form = null; S.adding = ''; S.error = ''; render(); return; }
    if (e.target.closest('[data-save]')) {
      var f = S.form, ttl = String(f.title || '').trim();
      if (ttl.length < 2) { S.error = 'عنوان را بنویسید.'; render(); return; }
      var rec = f.id ? c(f.id) : { id: db.collection('catalogues').doc().id, files: [], order: -Date.now() };
      put(rec, { title: ttl.slice(0, 120), about: String(f.about || '').trim().slice(0, 600), cover: f.cover || '' }).then(function () { if (!f.id) S.list.unshift(rec); S.form = null; S.msg = 'ذخیره شد.'; S.error = ''; }, function (er) { S.error = errText(er); }).then(render);
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
  document.addEventListener('click', function (e) { if (S.menu && !e.target.closest('.ct-more')) { S.menu = ''; render(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.menu) { S.menu = ''; render(); } });
  root.addEventListener('change', function (e) {
    if (e.target.id !== 'ctCover' || !e.target.files || !e.target.files[0] || !S.form) return;
    window.MSImg.fromFile(e.target.files[0], 320).then(function (u) { S.form.cover = u; S.error = ''; }, function (er) { S.error = er.message || 'عکس خوانده نشد.'; }).then(render);
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

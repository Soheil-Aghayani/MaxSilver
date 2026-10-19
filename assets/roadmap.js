// roadmap.html: the milestones of the project as a timeline of cards, for management, the CEO and the sales manager.
// Right to left: what is finished sits on the right (scroll right to look back), what is coming sits on the left (scroll left to look ahead),
// and the page opens centred on the milestone being worked on. The content is NOT in this file (the site is public): it is a JSON document
// kept in Firestore (intel/roadmap, readable only by those three roles) and uploaded here by management from the file milestones_for_app.json.
(function () {
  'use strict';
  var root = document.getElementById('rm');
  if (!root) return;
  var ST = { done: ['انجام‌شده', 'done'], now: ['در جریان', 'now'], next: ['بعدی', 'next'], later: ['آینده', 'later'] };
  var S = { user: null, profile: null, loading: true, data: null, error: '', busy: false, msg: '' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fa = function (n) { return String(n).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  var can = function () { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, 'roadmap')); };
  var canUpload = function () { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, 'roleAdmin')); };
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';

  function byCode(d) { var m = {}; d.items.forEach(function (i) { m[i.code] = i; }); return m; }
  function needChips(i, m) {
    var out = (i.needs || []).map(function (c) {
      var x = m[c], done = x && x.status === 'done';
      return '<a class="rm-need' + (done ? ' ok' : '') + '" href="#' + esc(c) + '" data-go="' + esc(c) + '" title="' + esc(x ? x.title : c) + '">' + (done ? CHECK : '') + '<b>' + esc(c) + '</b></a>';
    });
    if (i.needsText) out.push('<span class="rm-need txt">' + esc(i.needsText) + '</span>');
    return out.length ? '<div class="rm-sec"><h4>نیازمندی‌ها</h4><div class="rm-needs">' + out.join('') + '</div></div>' : '';
  }
  function card(i, k, d, m) {
    var st = ST[i.status] || ST.later, foc = d.focus === i.code;
    var ach = (i.achieved || []).length ? '<div class="rm-sec"><h4>' + (i.status === 'done' ? 'آنچه ساخته شد' : 'تا اینجا') + '</h4><ul>' + i.achieved.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>' : '';
    return '<li class="rm-card st-' + st[1] + (foc ? ' focus' : '') + '" id="' + esc(i.code) + '" data-code="' + esc(i.code) + '" style="--i:' + Math.min(k, 14) + '">' +
      '<div class="rm-node" aria-hidden="true"><i>' + (i.status === 'done' ? CHECK : '') + '</i></div>' +
      '<article><div class="rm-top"><span class="rm-code">' + esc(i.code) + '</span><span class="rm-grp">' + esc(d.groups[i.group] || '') + '</span><span class="rm-st">' + st[0] + '</span></div>' +
      '<h3>' + esc(i.title) + '</h3><p class="rm-del">' + esc(i.delivers) + '</p>' + ach + needChips(i, m) +
      (i.note ? '<p class="rm-note2">' + esc(i.note) + '</p>' : '') +
      '<div class="rm-meta">' + (i.date ? '<span class="d">' + esc(i.date) + '</span>' : '') + (i.status === 'done' ? '' : '<span>' + esc(i.avail) + '</span><span>' + esc(i.cost) + '</span><span>' + esc(i.effort) + '</span>') + '</div></article></li>';
  }
  function board(d) {
    var m = byCode(d), n = d.items.length, done = d.items.filter(function (i) { return i.status === 'done'; }).length, f = m[d.focus];
    var pct = Math.round(done * 100 / n);
    return '<header class="rm-head"><h1>نقشهٔ راه</h1><p class="rm-lead">سمت راست کارهایی است که انجام شده؛ سمت چپ کارهای پیش رو. صفحه روی مرحلهٔ جاری باز می‌شود.</p>' +
      '<div class="rm-sum"><div class="rm-bar" role="img" aria-label="پیشرفت"><i style="width:' + pct + '%"></i></div><p><b>' + fa(done) + '</b> از <b>' + fa(n) + '</b> مرحله انجام شده' +
      (f ? ' <span></span> اکنون: <button type="button" class="rm-link" data-go="' + esc(f.code) + '"><b>' + esc(f.code) + '</b> ' + esc(f.title) + '</button>' : '') + '</p></div>' +
      '<div class="rm-nav"><button type="button" class="rm-btn" data-dir="1" aria-label="گذشته">' + ARROW.replace('m9 5 7 7-7 7', 'm9 5 7 7-7 7') + '<span>گذشته</span></button>' +
      '<button type="button" class="rm-btn now" data-go="' + esc(d.focus) + '">مرحلهٔ جاری</button>' +
      '<button type="button" class="rm-btn" data-dir="-1" aria-label="آینده"><span>آینده</span>' + ARROW + '</button></div></header>' +
      '<div class="rm-lane" tabindex="0" role="region" aria-label="خط زمانی مرحله‌ها"><ol class="rm-track">' + d.items.map(function (i, k) { return card(i, k, d, m); }).join('') + '</ol></div>' +
      '<p class="rm-foot">آخرین به‌روزرسانی: ' + esc(d.updated || '') + '. زمان‌ها و میزان کار برآورد است، نه تعهد.' + (canUpload() ? ' <button type="button" class="rm-link" data-upload>بارگذاری فایل تازه</button>' : '') + '</p>';
  }
  function upload() {
    return '<section class="rm-empty"><img src="./assets/art/tiles/activity-log.webp" alt="" width="120" height="120">' +
      '<h2>نقشهٔ راه هنوز بارگذاری نشده</h2><p>فایل <b dir="ltr">milestones_for_app.json</b> را از پوشهٔ Roadmap بارگذاری کنید. محتوا فقط برای مدیریت، CEO و مدیر فروش دیده می‌شود (فقط تکنولوژی ارتباطات سازمانی آن را بارگذاری می‌کند) و در کد عمومی سایت نیست.</p>' +
      (canUpload() ? '<label class="rm-pick"><input type="file" accept="application/json,.json" data-file hidden><span class="rm-btn now">انتخاب فایل</span></label>' : '<p class="rm-note2">فقط تکنولوژی ارتباطات سازمانی نقشهٔ راه را بارگذاری یا عوض می‌کند.</p>') +
      (S.msg ? '<p class="rm-msg" role="status">' + esc(S.msg) + '</p>' : '') + '</section>';
  }
  function view() {
    if (S.loading) return '<p class="rm-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="rm-note">برای دیدن این بخش ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!can()) return '<p class="rm-note">این بخش فقط برای مدیریت، CEO و مدیر فروش است.</p>';
    if (S.error) return '<p class="rm-note rm-bad">' + esc(S.error) + '</p>';
    return S.data ? board(S.data) : upload();
  }
  var lane = function () { return root.querySelector('.rm-lane'); };
  function center(code, smooth) {
    var el = code && document.getElementById(code); if (!el || !root.contains(el)) return;
    try { el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { el.scrollIntoView(); }
    Array.prototype.forEach.call(root.querySelectorAll('.rm-card.pulse'), function (x) { x.classList.remove('pulse'); });
    el.classList.add('pulse'); setTimeout(function () { el.classList.remove('pulse'); }, 1600);
  }
  function render() {
    root.innerHTML = view();
    if (S.data) {
      var h = (location.hash || '').slice(1), d = S.data;
      setTimeout(function () { center(h && document.getElementById(h) ? h : d.focus, false); }, 30);
    }
  }
  // the document must look like a milestone list before it is kept
  function valid(d) {
    return d && typeof d === 'object' && Array.isArray(d.items) && d.items.length && d.groups && typeof d.groups === 'object' &&
      d.items.every(function (i) { return i && typeof i.code === 'string' && typeof i.title === 'string' && /^(done|now|next|later)$/.test(i.status) && typeof i.group === 'string'; });
  }
  function save(text) {
    var d; try { d = JSON.parse(text); } catch (e) { S.msg = 'فایل JSON درست نیست.'; render(); return; }
    if (!valid(d)) { S.msg = 'این فایل نقشهٔ راه نیست (مرحله‌ها یا وضعیت‌ها درست نیست).'; render(); return; }
    S.busy = true; S.msg = 'در حال ذخیره…'; render();
    db.collection('intel').doc('roadmap').set({ title: 'roadmap', payload: JSON.stringify(d), updatedAt: Date.now(), by: S.user.uid }).then(function () {
      S.data = d; S.busy = false; S.msg = ''; render();
    }, function () { S.busy = false; S.msg = 'ذخیره نشد. اجازهٔ این کار را ندارید یا قوانین Firestore هنوز منتشر نشده است.'; render(); });
  }
  var db = null, auth = null;
  root.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); var c = g.getAttribute('data-go'); center(c, true); try { history.replaceState(null, '', '#' + c); } catch (x) { /* ignore */ } return; }
    var b = e.target.closest('[data-dir]');
    if (b) { var l = lane(), c0 = root.querySelector('.rm-card'); if (l && c0) l.scrollBy({ left: Number(b.getAttribute('data-dir')) * (c0.getBoundingClientRect().width + 16) * 1, behavior: 'smooth' }); return; }
    if (e.target.closest('[data-upload]')) { S.data = null; render(); }
  });
  root.addEventListener('change', function (e) {
    var f = e.target.closest('[data-file]'); if (!f || !f.files || !f.files[0]) return;
    var r = new FileReader(); r.onload = function () { save(String(r.result || '')); }; r.readAsText(f.files[0], 'utf-8');
  });
  // with a mouse the track can be dragged (a finger already scrolls it)
  var drag = null;
  root.addEventListener('pointerdown', function (e) {
    var l = e.target.closest && e.target.closest('.rm-lane'); if (!l || e.pointerType !== 'mouse' || e.button || e.target.closest('a,button')) return;
    drag = { l: l, x: e.clientX, s: l.scrollLeft }; l.classList.add('drag');
  });
  window.addEventListener('pointermove', function (e) { if (drag) drag.l.scrollLeft = drag.s - (e.clientX - drag.x); });
  window.addEventListener('pointerup', function () { if (drag) { drag.l.classList.remove('drag'); drag = null; } });
  window.addEventListener('hashchange', function () { var h = (location.hash || '').slice(1); if (S.data && h) center(h, true); });

  window.MSRoadmap = { show: function (d) { S.loading = false; S.user = S.user || {}; S.profile = S.profile || { role: 'manager', active: true }; S.data = d; render(); } };

  if (!window.MS_FIREBASE || !window.firebase) { root.innerHTML = '<p class="rm-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(window.MS_FIREBASE);
  auth = firebase.auth(); db = firebase.firestore();
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.data = null;
    if (!u) { S.loading = false; render(); return; }
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!can()) return null;
      return db.collection('intel').doc('roadmap').get().then(function (d) {
        if (d.exists) { try { var x = JSON.parse(d.data().payload || 'null'); if (valid(x)) S.data = x; else S.error = 'محتوای ذخیره‌شده خراب است؛ فایل را دوباره بارگذاری کنید.'; } catch (e) { S.error = 'محتوای ذخیره‌شده خراب است؛ فایل را دوباره بارگذاری کنید.'; } }
      });
    }).then(function () { S.loading = false; render(); }, function () { S.loading = false; S.error = 'خواندن نقشهٔ راه ممکن نشد. دوباره تلاش کنید.'; render(); });
  });
  render();
})();

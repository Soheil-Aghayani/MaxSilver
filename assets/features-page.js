// features.html: the technology lead (role manager) turns parts of the site on and off. Saved in public_config/features; assets/features.js
// reads it on every page. A part that is off disappears for everyone: tile, bottom bar, menu, banner slides, the news about it, and the page.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('ft'), F = window.MSFeatures;
  if (!root) return;
  if (!cfg || !window.firebase || !F) { root.innerHTML = '<p class="ft-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore(), DOC = db.collection('public_config').doc('features');
  var S = { user: null, profile: null, loading: true, busy: '', off: {} };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fa = function (n) { return String(n).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  var can = function () { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, 'features')); };
  function view() {
    if (S.loading) return '<p class="ft-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="ft-note">برای دیدن این بخش ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!can()) return '<p class="ft-note">این بخش فقط برای مسئول فناوری است.</p>';
    var groups = [], by = {};
    F.list.forEach(function (f) { if (!by[f.group]) { by[f.group] = []; groups.push(f.group); } by[f.group].push(f); });
    var offN = Object.keys(S.off).filter(function (k) { return S.off[k]; }).length;
    return '<h1>ویژگی‌ها</h1><p class="ft-lead">هر بخش را که خاموش کنید برای دیگران ناپدید می‌شود و فقط شما (مسئول فناوری) آن را با برچسب «خاموش برای دیگران» می‌بینید: کاشی صفحهٔ اصلی، نوار پایین، منو، اسلایدهای بنر، خبرهای «تازه‌ها» و خود صفحه. هر وقت دوباره روشنش کنید همه‌چیز برمی‌گردد و چیزی پاک نمی‌شود.</p>' +
      '<p class="ft-sum"><b>' + fa(F.list.length - offN) + '</b> روشن <span></span><b>' + fa(offN) + '</b> خاموش</p>' +
      groups.map(function (g) {
        var GA = { 'فروش و مشتری': 'group-sales-customers', 'انبار و مالی': 'group-warehouse-finance', 'بازار و رشد': 'group-market-growth', 'مدیریت و تحلیل': 'group-management-analysis' };
        return '<section class="ft-grp"><h2>' + (GA[g] ? '<img class="ft-gimg" src="./assets/art/tiles/' + GA[g] + '.webp" alt="" width="44" height="44" decoding="async">' : '') + esc(g) + '</h2><ul class="ft-list">' + by[g].map(function (f) {
          var on = !S.off[f.id];
          return '<li class="' + (on ? '' : 'off') + '"><div><b>' + esc(f.label) + '</b><small>' + esc(f.info) + '</small></div>' +
            '<button type="button" class="ft-sw" role="switch" aria-checked="' + on + '" data-id="' + f.id + '" aria-label="' + esc(f.label) + '"' + (S.busy ? ' disabled' : '') + '><i></i><span>' + (on ? 'روشن' : 'خاموش') + '</span></button></li>';
        }).join('') + '</ul></section>';
      }).join('') +
      '<p class="ft-foot">بخش‌های اصلی (صفحهٔ اصلی، حساب من، تماس، نسخهٔ پشتیبان و همین صفحه) قابل خاموش شدن نیستند. تغییر برای هر کاربر تا چند دقیقه بعد، هنگام باز کردن صفحهٔ بعدی، دیده می‌شود.</p>';
  }
  function render() { root.innerHTML = view(); }
  // the switch is changed in place (not redrawn) so it can glide; if the save fails it glides back
  function paintSw(b, on) {
    b.setAttribute('aria-checked', String(on)); b.querySelector('span').textContent = on ? 'روشن' : 'خاموش';
    b.closest('li').classList.toggle('off', !on);
  }
  function sum() {
    var offN = Object.keys(S.off).filter(function (k) { return S.off[k]; }).length, el = root.querySelector('.ft-sum');
    if (el) el.innerHTML = '<b>' + fa(F.list.length - offN) + '</b> روشن <span></span><b>' + fa(offN) + '</b> خاموش';
  }
  function save(b, id) {
    var next = Object.assign({}, S.off); next[id] = !next[id];
    S.busy = id; paintSw(b, !next[id]);
    Array.prototype.forEach.call(root.querySelectorAll('.ft-sw'), function (x) { x.disabled = true; });
    var hidden = {}; Object.keys(next).forEach(function (k) { if (next[k]) hidden[k] = true; });
    DOC.set({ hidden: hidden, at: Date.now(), by: S.user.uid }).then(function () { S.off = next; F.set(hidden); sum(); }, function () { paintSw(b, !!next[id]); /* the save message at the bottom says why */ })
      .then(function () { S.busy = ''; Array.prototype.forEach.call(root.querySelectorAll('.ft-sw'), function (x) { x.disabled = false; }); });
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('.ft-sw'); if (!b || S.busy) return;
    save(b, b.getAttribute('data-id'));
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null;
    if (!u) { S.loading = false; render(); return; }
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      return DOC.get().then(function (d) { S.off = d.exists && d.data().hidden ? d.data().hidden : {}; }, function () { S.off = F.all(); });
    }).then(function () { S.loading = false; render(); }, function () { S.loading = false; render(); });
  });
  render();
})();

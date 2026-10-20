// permissions.html: the owner (role manager) names the people who may load or replace data. Saved in Firestore settings/permissions
// (the tasks of assets/perm.js) and settings/price_editors (at most two people). A task without a list keeps its default roles.
(function () {
  'use strict';
  var root = document.getElementById('pm'), cfg = window.MS_FIREBASE, M = window.MSPerm;
  if (!root) return;
  if (!cfg || !window.firebase || !M) { root.innerHTML = '<p class="pm-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore();
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var S = { user: null, profile: null, loading: true, team: [], perm: {}, editors: { uids: [], names: {} }, draft: {}, msg: '', error: '', busy: '' };
  var CARDS = [
    ['roadmapEdit', 'نقشهٔ راه', 'کسی که می‌تواند فایل نقشهٔ راه را بارگذاری یا جایگزین کند.', 'پیش‌فرض: فقط شما'],
    ['competitorsEdit', 'فایل تحلیل رقبا', 'کسی که می‌تواند فایل دادهٔ رقبا را بارگذاری یا جایگزین کند.', 'پیش‌فرض: فقط شما'],
    ['warehouseEdit', 'موجودی انبار', 'کسانی که موجودی را دستی یا با فایل Excel ثبت می‌کنند.', 'پیش‌فرض: نقش انبار و شما']
  ];
  var can = function () { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, 'roleAdmin')); };
  var roleLabel = function (r) { return window.MSRoles ? window.MSRoles.label(r) : r; };
  var nameOf = function (id) { var u = S.team.filter(function (x) { return x.id === id; })[0]; return u ? (u.name || u.email || id) : ((S.perm.names && S.perm.names[id]) || id); };

  function person(cap, u, on) {
    return '<label class="pm-p' + (on ? ' on' : '') + '"><input type="checkbox" data-cap="' + cap + '" value="' + esc(u.id) + '"' + (on ? ' checked' : '') + '><span><b>' + esc(u.name || u.email || u.id) + '</b><small>' + esc(roleLabel(u.role)) + '</small></span></label>';
  }
  function card(c) {
    var cap = c[0], cur = Array.isArray(S.draft[cap]) ? S.draft[cap] : (Array.isArray(S.perm[cap]) ? S.perm[cap] : null);
    var who = cur ? (cur.length ? cur.map(nameOf).join('، ') + ' (و شما)' : 'فقط شما') : c[3];
    return '<section class="pm-card"><h2>' + esc(c[1]) + '</h2><p class="pm-d">' + esc(c[2]) + '</p><p class="pm-who"><b>الان:</b> ' + esc(who) + '</p>' +
      '<details><summary>انتخاب افراد</summary><div class="pm-list">' + S.team.map(function (u) { return person(cap, u, !!(cur && cur.indexOf(u.id) >= 0)); }).join('') + '</div>' +
      '<div class="pm-acts"><button type="button" class="pm-btn" data-save="' + cap + '"' + (S.busy ? ' disabled' : '') + '>ذخیره</button>' +
      (Array.isArray(S.perm[cap]) ? '<button type="button" class="pm-btn alt" data-reset="' + cap + '"' + (S.busy ? ' disabled' : '') + '>برگرداندن به پیش‌فرض</button>' : '') + '</div></details></section>';
  }
  function priceCard() {
    var ed = S.editors.uids, cur = Array.isArray(S.draft.price) ? S.draft.price : ed;
    return '<section class="pm-card"><h2>تغییر قیمت</h2><p class="pm-d">حداکثر دو نفر قیمت‌ها را تغییر می‌دهند، فایل قیمت بارگذاری می‌کنند، درصد گروه و درصد قیمت اعتباری (چکی) را می‌زنند و کدی را کنار می‌گذارند. تا دو نفر تعیین نشوند کسی قیمت را تغییر نمی‌دهد.</p>' +
      '<p class="pm-who"><b>الان:</b> ' + esc(ed.length ? ed.map(function (id) { return (S.editors.names && S.editors.names[id]) || nameOf(id); }).join(' و ') : 'هنوز کسی تعیین نشده است') + '</p>' +
      '<details><summary>انتخاب (حداکثر دو نفر)</summary><div class="pm-list">' + S.team.filter(function (u) { return /^(manager|ceo|sales_manager)$/.test(window.MSRoles.norm(u.role)); }).map(function (u) { return person('price', u, cur.indexOf(u.id) >= 0); }).join('') + '</div>' +
      '<div class="pm-acts"><button type="button" class="pm-btn" data-save="price"' + (S.busy ? ' disabled' : '') + '>ذخیره</button></div></details></section>';
  }
  function view() {
    if (S.loading) return '<p class="pm-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="pm-note">برای دیدن این بخش ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!can()) return '<p class="pm-note">این بخش فقط برای تکنولوژی ارتباطات سازمانی است.</p>';
    return '<h1>دسترسی‌ها</h1><p class="pm-lead">فقط شما به کسی اختیار می‌دهید. برای هر کار بگویید چه کسانی می‌توانند داده را بارگذاری یا جایگزین کنند؛ همه می‌توانند ببینند. شما همیشه اختیار دارید. کاری که فهرست ندارد، همان نقش‌های پیش‌فرض را نگه می‌دارد.</p>' +
      (S.error ? '<p class="pm-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.msg ? '<p class="pm-ok" role="status">' + esc(S.msg) + '</p>' : '') +
      priceCard() + CARDS.map(card).join('') +
      '<p class="pm-foot">هر فردی که انتخاب می‌کنید باید به آن صفحه دسترسی ببیند (مثلاً برای انبار، حساب انبار یا اکانت منیجر). تغییر دسترسی چند دقیقه بعد برای او دیده می‌شود.</p>';
  }
  function render() { var open = Array.prototype.map.call(root.querySelectorAll('details'), function (d) { return d.open; }); root.innerHTML = view(); Array.prototype.forEach.call(root.querySelectorAll('details'), function (d, i) { d.open = !!open[i]; }); }
  function checked(cap) { return Array.prototype.map.call(root.querySelectorAll('input[data-cap="' + cap + '"]:checked'), function (i) { return i.value; }); }
  function done(ok, msg) { S.busy = ''; if (ok) { S.msg = msg; S.error = ''; S.draft = {}; } else { S.error = msg; S.msg = ''; } render(); }
  function savePerm(cap, list) {
    var next = Object.assign({}, S.perm); if (list == null) delete next[cap]; else next[cap] = list;
    var names = Object.assign({}, S.perm.names || {}); (list || []).forEach(function (id) { names[id] = nameOf(id); });
    var doc = { names: names, at: Date.now(), by: S.user.uid, byName: S.profile.name || '' };
    ['roadmapEdit', 'competitorsEdit', 'warehouseEdit'].forEach(function (k) { if (Array.isArray(next[k])) doc[k] = next[k]; });
    S.busy = cap; render();
    db.collection('settings').doc('permissions').set(doc).then(function () { S.perm = doc; M.set(doc); done(true, list == null ? 'به پیش‌فرض برگشت.' : 'ذخیره شد.'); }, function () { done(false, 'ذخیره نشد. قوانین Firestore را منتشر کرده‌اید؟'); });
  }
  function savePrice(list) {
    if (list.length > 2) { S.error = 'حداکثر دو نفر.'; render(); return; }
    var names = {}; list.forEach(function (id) { names[id] = nameOf(id); });
    var doc = { uids: list, names: names, at: Date.now(), by: S.user.uid, byName: S.profile.name || '' };
    S.busy = 'price'; render();
    db.collection('settings').doc('price_editors').set(doc).then(function () { S.editors = { uids: list, names: names }; done(true, 'مسئولان تغییر قیمت ذخیره شد.'); }, function () { done(false, 'ذخیره نشد. قوانین Firestore را منتشر کرده‌اید؟'); });
  }
  root.addEventListener('change', function (e) {
    var i = e.target.closest('input[data-cap]'); if (!i) return;
    var cap = i.getAttribute('data-cap'), list = checked(cap);
    if (cap === 'price' && list.length > 2) { i.checked = false; S.error = 'حداکثر دو نفر برای تغییر قیمت.'; render(); return; }
    S.draft[cap] = list; i.closest('label').classList.toggle('on', i.checked);
  });
  root.addEventListener('click', function (e) {
    var s = e.target.closest('[data-save]'), r = e.target.closest('[data-reset]');
    if (s) { var cap = s.getAttribute('data-save'); if (cap === 'price') savePrice(checked('price')); else savePerm(cap, checked(cap)); }
    else if (r) { if (window.confirm('این کار به نقش‌های پیش‌فرض برگردد؟')) savePerm(r.getAttribute('data-reset'), null); }
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null;
    if (!u) { S.loading = false; render(); return; }
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!can()) return null;
      return Promise.all([db.collection('users').get(), db.collection('settings').doc('permissions').get(), db.collection('settings').doc('price_editors').get()]).then(function (res) {
        S.team = []; res[0].forEach(function (s) { var d = s.data(); if (d.active !== false && window.MSRoles.norm(d.role) !== 'visitor' && s.id !== u.uid) S.team.push({ id: s.id, name: d.name, email: d.email, role: d.role }); });
        S.team.sort(function (a, b) { return String(a.name || '').localeCompare(String(b.name || ''), 'fa'); });
        S.perm = res[1].exists ? res[1].data() : {}; M.set(S.perm);
        var e0 = res[2].exists ? res[2].data() : null; S.editors = e0 && Array.isArray(e0.uids) ? { uids: e0.uids.slice(0, 2), names: e0.names || {} } : { uids: [], names: {} };
      });
    }).then(function () { S.loading = false; render(); }, function () { S.loading = false; S.error = 'خواندن اطلاعات ممکن نشد. دوباره تلاش کنید.'; render(); });
  });
  render();
})();

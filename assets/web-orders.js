// web-orders.html: what visitors of maxsilver.ir sent (W1). Quote requests today; comments and orders appear here when the site sends them.
// Salespeople see the ones routed to them; sales leads and managers see all and can hand one to another person.
(function () {
  'use strict';
  var root = document.getElementById('wo'), api = window.MSApi;
  if (!root || !api) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fa = function (s) { return String(s).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  var S = { items: [], people: [], canAssign: false, enabled: [], filter: 'open', loading: true, error: '', note: '', busy: 0, edit: 0 };
  var TYPE = { quote_request: 'درخواست قیمت', comment: 'نظر', purchase_order: 'سفارش' };
  var STATUS = { new: 'بدون مسئول', assigned: 'در انتظار پیگیری', handled: 'انجام شد', spam: 'اسپم' };
  var VIA = { city: 'هم‌شهری', province: 'هم‌استانی', fallback: 'بدون منطقه', manual: 'ارجاع دستی' };
  var FILTERS = [['open', 'باز'], ['handled', 'انجام‌شده'], ['spam', 'اسپم'], ['all', 'همه']];

  function when(at) { try { return new Date(String(at).replace(' ', 'T') + 'Z').toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return ''; } }
  function visible(e) { return S.filter === 'all' || (S.filter === 'open' ? (e.status === 'new' || e.status === 'assigned') : e.status === S.filter); }

  function body(e) {
    var d = e.data || {}, h = '';
    if (e.type === 'quote_request') {
      h += '<div class="wo-grid"><span><small>نام</small>' + esc(d.name) + '</span><span><small>موبایل</small><a dir="ltr" href="tel:' + esc(d.phone) + '">' + esc(fa(d.phone)) + '</a></span><span><small>محل</small>' + esc(d.city) + '، ' + esc(d.province) + '</span></div>';
      h += (d.products && d.products.length) ? '<ul class="wo-prod">' + d.products.map(function (p) { return '<li>' + esc(p.name) + (p.code ? ' <bdi dir="ltr">' + esc(p.code) + '</bdi>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="wo-small">درخواست عمومی، بدون محصول مشخص.</p>';
    } else if (e.type === 'comment') {
      h += '<p><b>' + esc((d.author && d.author.name) || '') + '</b>' + (d.postTitle ? ' روی «' + esc(d.postTitle) + '»' : '') + '</p><p class="wo-text">' + esc(d.content) + '</p>' + (d.postUrl ? '<a href="' + esc(d.postUrl) + '" target="_blank" rel="noopener">باز کردن در سایت</a>' : '');
    } else if (e.type === 'purchase_order') {
      var c = d.customer || {};
      h += '<div class="wo-grid"><span><small>سفارش</small>' + esc(fa(d.number || d.orderId || '')) + '</span><span><small>مشتری</small>' + esc(c.name || '') + '</span><span><small>موبایل</small><a dir="ltr" href="tel:' + esc(c.phone || d.phone || '') + '">' + esc(fa(c.phone || d.phone || '')) + '</a></span></div>' +
        ((d.items && d.items.length) ? '<ul class="wo-prod">' + d.items.map(function (p) { return '<li>' + esc(p.name) + ' × ' + esc(fa(p.qty || 1)) + '</li>'; }).join('') + '</ul>' : '');
    } else h += '<p class="wo-small">' + esc(e.type) + '</p>';
    return h;
  }
  function card(e) {
    var h = '<article class="wo-card ' + e.status + '" data-id="' + e.id + '"><div class="wo-head"><b>' + esc(TYPE[e.type] || e.type) + '</b><span class="wo-tag ' + e.status + '">' + esc(STATUS[e.status] || e.status) + '</span>' +
      (e.duplicate ? '<span class="wo-tag dup" title="همین شماره و محصول چند دقیقه پیش هم آمده بود">احتمالاً تکراری</span>' : '') + '<time>' + esc(when(e.at)) + '</time></div>' + body(e) +
      '<p class="wo-meta">مسئول: <b>' + esc(e.assignedName || 'ندارد') + '</b>' + (e.via ? ' · ' + esc(VIA[e.via] || e.via) : '') + (e.ref ? ' · کد پیگیری سایت <bdi dir="ltr">' + esc(e.ref) + '</bdi>' : '') + '</p>' +
      (e.note ? '<p class="wo-note">یادداشت: ' + esc(e.note) + '</p>' : '');
    h += '<div class="wo-act">';
    if (e.status === 'handled' || e.status === 'spam') h += '<button type="button" data-a="reopen" data-id="' + e.id + '">بازکردن دوباره</button>';
    else h += '<button type="button" class="pri" data-a="handled" data-id="' + e.id + '">انجام شد</button><button type="button" data-a="spam" data-id="' + e.id + '">اسپم</button>';
    h += '<button type="button" data-a="note" data-id="' + e.id + '">یادداشت</button>';
    if (S.canAssign) h += '<select data-assign="' + e.id + '" aria-label="ارجاع به"><option value="">ارجاع به…</option>' + S.people.map(function (p) { return '<option value="' + p.id + '"' + (p.id === e.assignedTo ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select>';
    h += '</div>';
    if (S.edit === e.id) h += '<form class="wo-form" data-note-form="' + e.id + '"><input name="note" maxlength="500" value="' + esc(e.note || '') + '" placeholder="مثلاً: تماس گرفتم، فردا پیگیری"><button class="pri">ذخیره</button></form>';
    return h + '</article>';
  }
  function render() {
    var n = S.items.filter(function (e) { return e.status === 'new' || e.status === 'assigned'; }).length;
    var list = S.items.filter(visible);
    root.innerHTML = '<section class="wo-top"><div><h1>سفارش‌های سایت مکث‌سیلور</h1><p>آنچه بازدیدکنندگان maxsilver.ir فرستاده‌اند' + (S.canAssign ? ' (همه، با امکان ارجاع)' : ' (فقط موارد ارجاع‌شده به شما)') + '.</p></div>' + (n ? '<span class="wo-count">' + fa(n) + ' مورد باز</span>' : '') + '</section>' +
      '<nav class="wo-filters" aria-label="فیلتر">' + FILTERS.map(function (f) { return '<button type="button" data-f="' + f[0] + '"' + (S.filter === f[0] ? ' class="on"' : '') + '>' + f[1] + '</button>'; }).join('') + '</nav>' +
      (S.error ? '<p class="wo-err" role="alert">' + esc(S.error) + '</p>' : '') + (S.note ? '<p class="wo-ok" role="status">' + esc(S.note) + '</p>' : '') +
      (S.loading ? '<p class="wo-small">در حال دریافت…</p>' : list.length ? '<div class="wo-list">' + list.map(card).join('') + '</div>' : '<p class="wo-empty">' + (S.filter === 'open' ? 'مورد بازی نیست.' : 'موردی نیست.') + '</p>') +
      '<p class="wo-small">' + (S.enabled.indexOf('comment') < 0 && S.enabled.indexOf('purchase_order') < 0 ? 'فعلاً فقط «درخواست قیمت» فعال است؛ نظر و سفارش وقتی سایت بفرستد فعال می‌شوند.' : '') + '</p>';
  }
  function load(quiet) {
    api.raw('GET', 'w1/events').then(function (j) {
      S.items = j.items || []; S.people = j.people || []; S.canAssign = !!j.canAssign; S.enabled = j.enabled || []; S.loading = false; if (!quiet) S.error = '';
      if (!S.edit) render();
    }, function (e) { S.loading = false; if (e && e.status === 401) S.error = 'برای دیدن این صفحه وارد حساب شوید.'; else if (!quiet) S.error = (e && e.message) || 'دریافت نشد.'; render(); });
  }
  function patch(id, d, done) {
    api.raw('PATCH', 'w1/events/' + id, d).then(function () { S.note = done || 'ذخیره شد.'; S.edit = 0; load(); setTimeout(function () { S.note = ''; render(); }, 2500); }, function (e) { S.error = (e && e.message) || 'انجام نشد.'; render(); });
  }
  root.addEventListener('click', function (ev) {
    var f = ev.target.closest('[data-f]'); if (f) { S.filter = f.getAttribute('data-f'); render(); return; }
    var b = ev.target.closest('[data-a]'); if (!b) return;
    var id = Number(b.getAttribute('data-id')), a = b.getAttribute('data-a');
    if (a === 'handled') patch(id, { status: 'handled' }, 'علامت‌گذاری شد: انجام شد.');
    else if (a === 'spam') patch(id, { status: 'spam' }, 'به‌عنوان اسپم علامت خورد.');
    else if (a === 'reopen') patch(id, { status: 'assigned' }, 'دوباره باز شد.');
    else if (a === 'note') { S.edit = S.edit === id ? 0 : id; render(); }
  });
  root.addEventListener('change', function (ev) {
    var s = ev.target.closest('[data-assign]'); if (!s || !s.value) return;
    patch(Number(s.getAttribute('data-assign')), { assign: Number(s.value) }, 'ارجاع شد.');
  });
  root.addEventListener('submit', function (ev) {
    var f = ev.target.closest('[data-note-form]'); if (!f) return; ev.preventDefault();
    patch(Number(f.getAttribute('data-note-form')), { note: f.elements.note.value.trim() }, 'یادداشت ذخیره شد.');
  });
  if (!api.enabled() || !api.signedIn()) { S.loading = false; S.error = 'برای دیدن این صفحه وارد حساب شوید.'; render(); return; }
  render(); load();
  setInterval(function () { if (!S.edit && !document.hidden) load(true); }, 30000);
})();

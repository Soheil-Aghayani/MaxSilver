// Feature switches. The person in charge of technology (role manager) can turn a part of the site off on the page «ویژگی‌ها».
// A part that is off disappears for everyone: its tile on the home page, its entry in the bottom bar and the top menu, its banner slides,
// the news about it (assets/updates.js), and the page itself (it shows «این بخش فعلاً خاموش است»).
// The switches live in one public document (public_config/features, readable by everyone, writable only by the manager). This file reads
// it with a plain request (no sign-in and no Firebase library needed, so it works on the public pages too) and keeps a copy in the browser
// so the next page opens already knowing what is off.
(function (w) {
  'use strict';
  var KEY = 'ms-features';
  var PROJECT = 'maxsilver-portal', API = 'AIzaSyD6Askz1Z4G6Nb1r7cdScFh9IaeLMdepS8';
  // id = the id the bottom bar uses; locked parts can never be switched off
  var FEATURES = [
    { id: 'customers', label: 'مشتریان', group: 'فروش و مشتری', page: 'customers.html', info: 'پایگاه مشتریان و صفحهٔ هر مشتری' },
    { id: 'crm', label: 'درخواست‌های خرید', group: 'فروش و مشتری', page: 'crm.html', info: 'پیگیری درخواست‌ها، مرحله‌ها و تحویل' },
    { id: 'catalog', label: 'کاتالوگ محصولات', group: 'فروش و مشتری', page: 'product-catalog.html', info: 'جست‌وجو، مقایسه و ساخت پیش‌فاکتور' },
    { id: 'process', label: 'نقشهٔ فروش', group: 'فروش و مشتری', page: 'sales-process.html', info: 'نه مرحلهٔ فروش و مسئول هر مرحله' },
    { id: 'planner', label: 'طراح کافه و رستوران', group: 'فروش و مشتری', page: 'planner.html', info: 'فرم عمومی مشتری؛ اگر خاموش شود مشتری‌ها نمی‌توانند درخواست بدهند' },
    { id: 'track', label: 'پیگیری درخواست', group: 'فروش و مشتری', page: 'track.html', info: 'صفحهٔ عمومی پیگیری با کد' },
    { id: 'warehouse', label: 'انبار و موجودی', group: 'انبار و مالی', page: 'warehouse.html', info: 'موجودی لحظه‌ای و آماده‌سازی سفارش' },
    { id: 'banks', label: 'حساب‌های بانکی', group: 'انبار و مالی', page: 'banks.html', info: 'حساب‌های پیش‌فاکتور' },
    { id: 'prices', label: 'قیمت‌ها', group: 'انبار و مالی', page: 'prices.html', info: 'ویرایش و ممیزی قیمت' },
    { id: 'fairs', label: 'نمایشگاه‌ها', group: 'بازار و رشد', page: 'fairs.html', info: 'فهرست نمایشگاه‌ها و اسلایدهای نمایشگاه بنر' },
    { id: 'events', label: 'مناسبت‌ها', group: 'بازار و رشد', page: 'events.html', info: 'تقویم مناسبت‌ها و اسلایدهای تبریک' },
    { id: 'competitors', label: 'تحلیل رقبا', group: 'بازار و رشد', page: 'competitors.html', info: 'کارت‌ها، مقایسه و شاخص‌ها' },
    { id: 'advertising', label: 'استراتژی تبلیغات', group: 'بازار و رشد', page: 'advertising.html', info: 'درخت رسانه‌ها و اهداف' },
    { id: 'brand', label: 'برندبوک‌ها', group: 'بازار و رشد', page: 'brand-books.html', info: 'هویت چهار برند' },
    { id: 'dashboard', label: 'داشبورد CEO', group: 'مدیریت و تحلیل', page: 'ceo-dashboard.html', info: 'نقشهٔ استان‌ها و مقایسهٔ سال‌ها' },
    { id: 'analysis', label: 'تحلیل جزئیات فروش', group: 'مدیریت و تحلیل', page: 'sales-analysis.html', info: 'گزارش مشتری و کالا' }
  ];
  // news entries (assets/updates.js) that belong to a part, by id; an entry can also carry feature: '<id>'
  var NEWS = [[/^customers/, 'customers'], [/^competitors/, 'competitors'], [/^fairs|^home-tiles-compact-fairs/, 'fairs'], [/^order-|^crm-|^proforma|^send-to-am|^doc-number/, 'crm'],
    [/^prices|^retired|^rial-to-toman/, 'prices'], [/^events|^evt-|^lunar/, 'events'], [/^planner/, 'planner'], [/^sales-map/, 'process'], [/^cutout|^art-3d/, 'catalog']];

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  var state = load(), H = state.hidden || {}, touched = [];
  function byPage(p) { for (var i = 0; i < FEATURES.length; i++) if (FEATURES[i].page === p) return FEATURES[i]; return null; }
  function page() { return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
  function hidden(id) { return !!H[id]; }
  function newsHidden(u) {
    var id = u && (u.feature || (function () { for (var i = 0; i < NEWS.length; i++) if (NEWS[i][0].test(u.id || '')) return NEWS[i][1]; return ''; })());
    return !!(id && H[id]);
  }
  function hide(el) { touched.push([el, el.hidden, el.style.display]); el.hidden = true; el.style.display = 'none'; }
  function reset() { touched.forEach(function (t) { t[0].hidden = t[1]; t[0].style.display = t[2]; }); touched = []; }

  function apply() {
    if (!document.body) return;
    reset();
    var off = FEATURES.filter(function (f) { return H[f.id]; });
    off.forEach(function (f) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-feature="' + f.id + '"]'), hide);
      Array.prototype.forEach.call(document.querySelectorAll('a[href="./' + f.page + '"]'), function (a) {
        var slide = a.closest('.hs-slide'), li = a.closest('li'), wrap = a.closest('.pc-wrap');
        if (slide) hide(slide);
        else if (a.classList.contains('portal-card')) { hide(a); if (wrap) hide(wrap); }
        else if (li && li.parentNode && /ms-nav-links/.test(li.parentNode.className || '')) hide(li);
        else if (a.closest('.ms-nav-links')) { /* the brand link etc. */ }
      });
    });
    // a section whose tiles are all off is not shown
    Array.prototype.forEach.call(document.querySelectorAll('.hm-sec:not(.anon)'), function (s) {
      var any = Array.prototype.some.call(s.querySelectorAll('.portal-card'), function (a) { return !a.hidden && a.style.display !== 'none'; });
      if (!any) hide(s);
    });
    gate();
    try { w.dispatchEvent(new CustomEvent('ms-features')); } catch (e) { /* ignore */ }
  }
  // the page of a part that is off
  function gate() {
    var f = byPage(page());
    var old = document.getElementById('msOff');
    if (!f || !H[f.id]) { if (old) old.remove(); return; }
    Array.prototype.forEach.call(document.body.children, function (el) { if (!el.matches('header.ms-sitebar, footer, script, link, dialog, style, #msOff, .ms-save, .ms-upd-bar, .ms-pill, nav')) hide(el); });
    if (old) return;
    var m = document.createElement('main');
    m.id = 'msOff';
    m.style.cssText = 'width:min(560px,calc(100% - 32px));margin:48px auto;padding:28px 22px;border:1px solid #d7dfeb;border-radius:20px;background:#fff;text-align:center;line-height:2';
    m.innerHTML = '<h1 style="margin:0 0 8px;font-size:20px;color:#071b36">این بخش فعلاً خاموش است</h1><p style="margin:0 0 16px;color:#5b6a80">«' + f.label + '» را مسئول فناوری موقتاً بسته است.</p><a href="./index.html" style="display:inline-block;padding:10px 20px;border-radius:12px;background:#071b36;color:#fff;font-weight:800;text-decoration:none">بازگشت به صفحهٔ اصلی</a>';
    var foot = document.querySelector('footer'); document.body.insertBefore(m, foot || null);
  }
  function parse(doc) {
    var out = {}, f = doc && doc.fields && doc.fields.hidden && doc.fields.hidden.mapValue && doc.fields.hidden.mapValue.fields || {};
    Object.keys(f).forEach(function (k) { if (f[k] && f[k].booleanValue === true) out[k] = true; });
    return out;
  }
  function set(h) { H = h || {}; state = { hidden: H, at: Date.now() }; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } apply(); }
  function sync(force) {
    if (!force && state.at && Date.now() - state.at < 90000) return;
    var url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/public_config/features?key=' + API;
    fetch(url, { cache: 'no-store' }).then(function (r) { return r.status === 404 ? { fields: {} } : (r.ok ? r.json() : null); }).then(function (d) {
      if (d) { var n = parse(d); if (JSON.stringify(n) !== JSON.stringify(H) || !state.at) set(n); else { state.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify({ hidden: H, at: state.at })); } catch (e) { /* ignore */ } } }
    }).catch(function () { /* offline: the copy in the browser stays */ });
  }
  w.MSFeatures = { list: FEATURES, hidden: hidden, newsHidden: newsHidden, apply: apply, sync: sync, set: set, all: function () { return H; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(); sync(); }); else { apply(); sync(); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) sync(); });
  // the pages draw some of their parts later (bottom bar, banner slides, home tiles): the switches are applied again
  var t1 = setTimeout(apply, 900), t2 = setTimeout(apply, 2500);
})(window);

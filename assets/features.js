// Feature switches. The person in charge of technology (role manager) can turn a part of the site off on the page «ویژگی‌ها».
// A part that is off disappears for everyone: its tile on the home page, its entry in the bottom bar and the top menu, its banner slides,
// the news about it (assets/updates.js), and the page itself (it shows «این بخش فعلاً خاموش است»).
// The switches live in one public document (public_config/features, readable by everyone, writable only by the manager). This file reads
// it with the Firebase library (no sign-in needed, so it works on the public pages too) and keeps a copy in the browser
// so the next page opens already knowing what is off.
(function (w) {
  'use strict';
  var KEY = 'ms-features';
    // id = the id the bottom bar uses; locked parts can never be switched off
  var FEATURES = [
    { id: 'customers', label: 'مشتریان', group: 'فروش و مشتری', page: 'customers.html', info: 'پایگاه مشتریان و صفحهٔ هر مشتری' },
    { id: 'crm', label: 'درخواست‌های خرید', group: 'فروش و مشتری', page: 'crm.html', info: 'پیگیری درخواست‌ها، مرحله‌ها و تحویل' },
    { id: 'catalog', label: 'کاتالوگ محصولات', group: 'فروش و مشتری', page: 'product-catalog.html', info: 'جست‌وجو، مقایسه و ساخت پیش‌فاکتور' },
    { id: 'assistant', label: 'دستیار کاتالوگ', group: 'فروش و مشتری', page: 'assistant.html', info: 'پرسش دربارهٔ کالا و پیدا کردن نزدیک‌ترین کالاها با قیمت' },
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
    { id: 'roadmap', label: 'نقشهٔ راه', group: 'مدیریت و تحلیل', page: 'roadmap.html', info: 'خط زمانی مرحله‌های پروژه؛ فقط مدیریت، CEO و مدیر فروش' },
    { id: 'analysis', label: 'تحلیل جزئیات فروش', group: 'مدیریت و تحلیل', page: 'sales-analysis.html', info: 'گزارش مشتری و کالا' },
    { id: 'permissions', label: 'دسترسی‌ها', group: 'مدیریت و تحلیل', page: 'permissions.html', info: 'تعیین کسانی که بارگذاری و تغییر قیمت می‌کنند؛ فقط شما آن را می‌بینید' },
    { id: 'backup', label: 'پشتیبان‌گیری', group: 'مدیریت و تحلیل', page: 'backup.html', info: 'نسخهٔ پشتیبان از داده‌ها' },
    { id: 'soon', label: 'بخش «به‌زودی»', group: 'مدیریت و تحلیل', page: '', info: 'کاشی‌های خاکستری قابلیت‌های آینده در صفحهٔ اصلی' },
    { id: 'invoices', label: 'پیش‌فاکتورها', group: 'فروش و مشتری', page: '', info: 'کاشی پیش‌فاکتورها در صفحهٔ اصلی (خود پنل باز می‌ماند)' },
    { id: 'tickets', label: 'تیکت‌های پشتیبانی', group: 'فروش و مشتری', page: '', info: 'کاشی تیکت‌ها در صفحهٔ اصلی (خود پنل باز می‌ماند)' },
    { id: 'panel', label: 'پنل من و ورود', group: 'بازدیدکننده و مشتری', page: '', info: 'کاشی ورود در جعبهٔ بازدیدکننده؛ صفحهٔ ورود همیشه باز است' },
    { id: 'contact', label: 'تماس با ما', group: 'بازدیدکننده و مشتری', page: 'contact.html', info: 'صفحهٔ تماس عمومی' }
  ];
  // news entries (assets/updates.js) that belong to a part, by id; an entry can also carry feature: '<id>'
  var NEWS = [[/^customers/, 'customers'], [/^competitors/, 'competitors'], [/^fairs|^home-tiles-compact-fairs/, 'fairs'], [/^order-|^crm-|^proforma|^send-to-am|^doc-number/, 'crm'],
    [/^prices|^retired|^rial-to-toman/, 'prices'], [/^events|^evt-|^lunar/, 'events'], [/^planner/, 'planner'], [/^roadmap/, 'roadmap'], [/^sales-map/, 'process'], [/^cutout|^art-3d/, 'catalog']];

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  var state = load(), H = state.hidden || {}, touched = [];
  function byPage(p) { for (var i = 0; i < FEATURES.length; i++) if (FEATURES[i].page === p) return FEATURES[i]; return null; }
  function page() { return (location.pathname.split('/').pop() || 'index.html').toLowerCase(); }
  function hidden(id) { return !!H[id]; }
  function newsHidden(u) {
    var id = u && (u.feature || (function () { for (var i = 0; i < NEWS.length; i++) if (NEWS[i][0].test(u.id || '')) return NEWS[i][1]; return ''; })());
    return !!(id && H[id] && !owner());
  }
  // The owner (role manager, the technology lead) is never locked out: a part that is off disappears for everyone else, and he sees it marked «خاموش برای دیگران».
  function owner() { try { var r = localStorage.getItem('ms-role') || ''; return (window.MSRoles ? window.MSRoles.norm(r) : r) === 'manager'; } catch (e) { return false; } }
  var marked = [];
  function hide(el) {
    if (owner()) { el.classList.add('ms-feat-off'); marked.push(el); return; }
    touched.push([el, el.hidden, el.style.display]); el.hidden = true; el.style.display = 'none';
  }
  function reset() {
    touched.forEach(function (t) { t[0].hidden = t[1]; t[0].style.display = t[2]; }); touched = [];
    marked.forEach(function (el) { el.classList.remove('ms-feat-off'); }); marked = [];
  }

  function apply() {
    if (!document.body) return;
    reset();
    var off = FEATURES.filter(function (f) { return H[f.id]; });
    off.forEach(function (f) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-feature~="' + f.id + '"]'), hide);
      if (f.page) Array.prototype.forEach.call(document.querySelectorAll('a[href="./' + f.page + '"]'), function (a) {
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
    var f = page() ? byPage(page()) : null;
    var old = document.getElementById('msOff'), bar = document.getElementById('msOffBar');
    if (owner()) {
      if (old) old.remove();
      if (!f || !H[f.id]) { if (bar) bar.remove(); return; }
      if (!bar) {
        bar = document.createElement('div'); bar.id = 'msOffBar'; bar.setAttribute('role', 'status');
        bar.style.cssText = 'margin:8px auto 0;width:min(900px,calc(100% - 24px));padding:8px 14px;border-radius:12px;background:#fff4d1;color:#7a4b00;font:800 13px/1.8 Estedad,Tahoma,sans-serif;text-align:center';
        bar.textContent = 'این بخش برای دیگران خاموش است؛ فقط شما آن را می‌بینید.';
        var hd = document.querySelector('header.ms-sitebar'); if (hd && hd.parentNode) hd.parentNode.insertBefore(bar, hd.nextSibling); else document.body.insertBefore(bar, document.body.firstChild);
      }
      return;
    }
    if (bar) bar.remove();
    if (!f || !H[f.id]) { if (old) old.remove(); return; }
    Array.prototype.forEach.call(document.body.children, function (el) { if (!el.matches('header.ms-sitebar, footer, script, link, dialog, style, #msOff, .ms-save, .ms-upd-bar, .ms-pill, nav')) hide(el); });
    if (old) return;
    var m = document.createElement('main');
    m.id = 'msOff';
    m.style.cssText = 'width:min(560px,calc(100% - 32px));margin:48px auto;padding:28px 22px;border:1px solid #d7dfeb;border-radius:20px;background:#fff;text-align:center;line-height:2';
    m.innerHTML = '<img src="./assets/art/tiles/feature-off.webp" alt="" width="120" height="120" style="display:block;margin:0 auto 8px;width:120px;height:120px;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(7,27,54,.18))"><h1 style="margin:0 0 8px;font-size:20px;color:#071b36">این بخش فعلاً خاموش است</h1><p style="margin:0 0 16px;color:#5b6a80">«' + f.label + '» را مسئول فناوری موقتاً بسته است.</p><a href="./index.html" style="display:inline-block;padding:10px 20px;border-radius:12px;background:#071b36;color:#fff;font-weight:800;text-decoration:none">بازگشت به صفحهٔ اصلی</a>';
    var foot = document.querySelector('footer'); document.body.insertBefore(m, foot || null);
  }
  function parse(doc) {
    var out = {}, f = doc && doc.fields && doc.fields.hidden && doc.fields.hidden.mapValue && doc.fields.hidden.mapValue.fields || {};
    Object.keys(f).forEach(function (k) { if (f[k] && f[k].booleanValue === true) out[k] = true; });
    return out;
  }
  function set(h) { H = h || {}; state = { hidden: H, at: Date.now() }; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } apply(); }
  // The switches are read with the Firebase library (the plain web address of the database does not answer a browser). Pages that already have
  // the library use it; the others load it a few seconds after the page is ready, at most once every 15 minutes on that device.
  function loadScript(src) {
    return new Promise(function (ok, no) {
      if (document.querySelector('script[data-ms-sdk="' + src + '"]')) { ok(); return; }
      var s = document.createElement('script'); s.src = src; s.setAttribute('data-ms-sdk', src); s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
  }
  function sdk() {
    if (w.firebase && w.firebase.firestore && w.MS_FIREBASE) return Promise.resolve();
    var v = '10.12.5';
    return loadScript('./assets/vendor/firebase-app-compat-' + v + '.js').then(function () { return loadScript('./assets/vendor/firebase-firestore-compat-' + v + '.js'); })
      .then(function () { return w.MS_FIREBASE ? null : loadScript('./assets/firebase-config.js?v=' + (document.currentScript && document.currentScript.src.split('v=')[1] || '')); });
  }
  var busy = false;
  function sync(force) {
    var age = state.at ? Date.now() - state.at : Infinity, hasLib = !!(w.firebase && w.firebase.firestore && w.MS_FIREBASE);
    if (busy || (!force && age < (hasLib ? 90000 : 900000))) return;
    busy = true;
    var run = function () {
      sdk().then(function () {
        var app; try { app = w.firebase.apps.length ? w.firebase.app() : w.firebase.initializeApp(w.MS_FIREBASE, 'ms-features'); } catch (e) { app = w.firebase.app(); }
        return app.firestore().collection('public_config').doc('features').get();
      }).then(function (snap) {
        var n = {}, d = snap && snap.exists ? snap.data() : null, h = d && d.hidden || {};
        Object.keys(h).forEach(function (k) { if (h[k] === true) n[k] = true; });
        if (JSON.stringify(n) !== JSON.stringify(H) || !state.at) set(n); else { state.at = Date.now(); try { localStorage.setItem(KEY, JSON.stringify({ hidden: H, at: state.at })); } catch (e) { /* ignore */ } }
      }).catch(function () { /* offline: the copy in the browser stays */ }).then(function () { busy = false; });
    };
    if (hasLib || force) run(); else if (w.requestIdleCallback) setTimeout(function () { w.requestIdleCallback(run, { timeout: 4000 }); }, 2500); else setTimeout(run, 3500);
  }
  w.MSFeatures = { list: FEATURES, hidden: hidden, owner: owner, newsHidden: newsHidden, apply: apply, sync: sync, set: set, all: function () { return H; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(); sync(); }); else { apply(); sync(); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) sync(); });
  // the pages draw some of their parts later (bottom bar, banner slides, home tiles): the switches are applied again
  var t1 = setTimeout(apply, 900), t2 = setTimeout(apply, 2500);
})(window);

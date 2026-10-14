// Notifications that are always in view: a red count on the profile icon of the navigation bar, on every page, and the list
// itself at the top of the panel. What is counted is only what waits for this person: tickets that need their reply, outside
// messages for their role, and commission steps they must review or approve.
// The count is cached on the device so every page can paint it at once; it is refreshed in the background (at most every
// ten minutes, and right after an action in the panel). No push: a message cannot reach a closed app without paid cloud functions.
(function (w) {
  'use strict';
  var KEY = 'ms-notify-v1', TTL = 10 * 60 * 1000;
  var fa = new Intl.NumberFormat('fa-IR');
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  function role() { try { return w.MSRoles ? w.MSRoles.norm(localStorage.getItem('ms-role') || '') : ''; } catch (e) { return ''; } }
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
  // proformas saved on this device and not yet sent: only the vendors who issue them, counted from the device itself.
  // Online they normally send themselves within moments, so a short grace avoids flashing; offline they count at once.
  function pending() {
    try {
      if (!w.MSRoles || !w.MSRoles.hasField(localStorage.getItem('ms-role') || '', 'proformas')) return null;
      var c = JSON.parse(localStorage.getItem('ms-profile-v1') || 'null'), uid = c && c.uid || '';
      var arch = JSON.parse(localStorage.getItem('ms-proforma-archive-v1') || '[]'), now = Date.now(), off = navigator.onLine === false, n = 0;
      if (!Array.isArray(arch)) return null;
      arch.forEach(function (d) {
        if (d && d.synced !== true && d.docNo && (!d.ownerUid || d.ownerUid === uid) && (off || now - (d.createdAt || 0) > 3 * 60 * 1000)) n++;
      });
      return n ? { kind: 'pending', n: n, text: fa.format(n) + ' پیش‌فاکتور هنوز ارسال نشده؛ فقط روی همین دستگاه است', href: './product-catalog.html' } : null;
    } catch (e) { return null; }
  }
  function items() {
    var c = read(), list = c && c.items && c.role === role() ? c.items.slice() : [], p = pending();   // a count cached for another role is never shown
    if (p) list.unshift(p);
    return list;
  }
  function total(list) { return list.reduce(function (s, x) { return s + (x.n || 1); }, 0); }

  function paint() {
    var link = document.querySelector('.ms-nav-links a[href="./panel.html"]');
    if (!link) return;
    var n = total(items()), b = link.querySelector('.ms-badge');
    if (!n) { if (b) b.remove(); link.setAttribute('aria-label', 'حساب من'); return; }
    if (!b) { b = document.createElement('i'); b.className = 'ms-badge'; link.appendChild(b); }
    b.textContent = n > 9 ? '+۹' : fa.format(n);
    link.setAttribute('aria-label', 'حساب من، ' + fa.format(n) + ' اعلان');
  }

  // what waits for this person, from the database
  function compute(db, uid, r) {
    var list = [], jobs = [], R = w.MSRoles;
    var tk = db.collection('tickets');
    var qs = r === 'manager' ? [tk.get()] : [tk.where('audience', 'array-contains', 'uid:' + uid).get(), tk.where('audience', 'array-contains', 'role:' + r).get()];
    jobs.push(Promise.all(qs).then(function (res) {
      var seen = {}, n = 0, mine = ['uid:' + uid, 'role:' + r];
      res.forEach(function (snap) { snap.forEach(function (s) {
        if (seen[s.id]) return; seen[s.id] = 1;
        var x = s.data();
        if (x.status === 'open' && x.lastBy !== uid && (x.audience || []).some(function (a) { return mine.indexOf(a) >= 0; })) n++;
      }); });
      if (n) list.push({ kind: 'ticket', n: n, text: fa.format(n) + ' درخواست منتظر پاسخ شماست', target: 'tickets' });
    }));
    if (r === 'manager' || r === 'ceo' || r === 'sales_manager' || r === 'service') {
      var pub = db.collection('public_requests');
      var pq = r === 'sales_manager' ? pub.where('to', '==', 'sales') : (r === 'service' ? pub.where('to', '==', 'service') : pub);
      jobs.push(pq.get().then(function (snap) {
        var n = 0; snap.forEach(function (s) { if (s.data().status !== 'closed') n++; });
        if (n) list.push({ kind: 'public', n: n, text: fa.format(n) + ' پیام بیرونی بدون پاسخ', target: 'public' });
      }));
    }
    if (R && R.can(r, 'commission')) {
      var approve = R.can(r, 'commissionApprove'), review = R.can(r, 'commissionReview');
      var want = approve ? 'reviewed' : (review ? 'draft' : '');
      if (want) {
        var verb = approve ? 'منتظر تأیید نهایی شماست' : 'منتظر بررسی شماست';
        jobs.push(db.collection('commission_rates').get().then(function (snap) {
          snap.forEach(function (s) { var x = s.data(); if (x.status === want) list.push({ kind: 'commission', n: 1, text: 'نرخ‌های سال ' + fa.format(Number(x.year)).replace(/٬/g, '') + ' ' + verb, target: 'commission' }); });
        }));
        jobs.push(db.collection('commission_months').get().then(function (snap) {
          snap.forEach(function (s) {
            var x = s.data();
            if (x.status === want) list.push({ kind: 'commission', n: 1, text: 'پایهٔ ' + (MONTHS[parseInt(x.month, 10) - 1] || x.month) + ' ' + fa.format(Number(x.year)).replace(/٬/g, '') + ' ' + verb, target: 'commission' });
          });
        }));
      }
    }
    return Promise.all(jobs.map(function (p) { return p.then(null, function () { return null; }); })).then(function () { return list; });
  }

  // load the SDK only when a count is actually due
  function load(src) {
    return new Promise(function (ok, no) {
      if (document.querySelector('script[data-ms-sdk="' + src + '"]')) { ok(); return; }
      var s = document.createElement('script'); s.src = src; s.setAttribute('data-ms-sdk', src);
      s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
  }
  function ensureSdk() {
    if (w.firebase && w.firebase.firestore && w.MS_FIREBASE) return Promise.resolve();
    var v = '10.12.5';
    return load('./assets/vendor/firebase-app-compat-' + v + '.js')
      .then(function () { return load('./assets/vendor/firebase-auth-compat-' + v + '.js'); })
      .then(function () { return load('./assets/vendor/firebase-firestore-compat-' + v + '.js'); })
      .then(function () { return w.MS_FIREBASE ? null : load('./assets/firebase-config.js'); });
  }
  var running = false;
  function refresh(force) {
    var r = role();
    if (!r || running) return Promise.resolve();
    var c = read();
    if (!force && c && c.role === r && Date.now() - (c.at || 0) < TTL) return Promise.resolve();
    running = true;
    return ensureSdk().then(function () {
      var app = w.firebase.apps.length ? w.firebase.app() : w.firebase.initializeApp(w.MS_FIREBASE);
      var auth = w.firebase.auth(app), db = w.firebase.firestore(app);
      return new Promise(function (ok) {
        var off = auth.onAuthStateChanged(function (u) { off(); ok(u); });
      }).then(function (u) {
        if (!u) return null;
        return compute(db, u.uid, r).then(function (list) {
          write({ at: Date.now(), role: r, uid: u.uid, items: list });
          paint();
          try { w.dispatchEvent(new CustomEvent('ms-notify')); } catch (e) { /* ignore */ }
        });
      });
    }).then(null, function () { /* offline or rules not published: keep the last count */ }).then(function () { running = false; });
  }

  function start() {
    if (!role()) { var c = read(); if (c) write({ at: 0, items: [] }); paint(); return; }
    paint();
    setTimeout(function () { refresh(false); }, 1200);
    setInterval(paint, 60 * 1000);                    // a proforma that has waited past the grace appears without a reload
  }
  w.MSNotify = { items: items, total: function () { return total(items()); }, refresh: refresh, paint: paint };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);

// Notifications that are always in view and live.
//  - A red count on the profile icon of the navigation bar (every page) and the list at the top of the panel.
//  - Live: listeners on the database keep the count current while any page of the app is open; a new message pops up at once.
//  - Channels, chosen by each person in the panel: push (system notification + in-page pop-up, the default) or none.
//  - Delivery receipts: when this device sees a new message it records "received" on the conversation; opening it records "seen".
// What is counted is only what waits for this person: conversations that need their reply, outside messages for their role,
// and commission steps they must review or approve, plus proformas still unsent on this device.
// Honest limits: a notification can only appear while the app is open or running in the background of the device. Reaching a
// closed phone needs a server that sends it.
(function (w) {
  'use strict';
  var KEY = 'ms-notify-v1', SEEN = 'ms-notify-seen-v1', PREFS = 'ms-notify-prefs-v1';
  var fa = new Intl.NumberFormat('fa-IR');
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

  function role() { try { return w.MSRoles ? w.MSRoles.norm(localStorage.getItem('ms-role') || '') : ''; } catch (e) { return ''; } }
  function j(key, fb) { try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return v == null ? fb : v; } catch (e) { return fb; } }
  function put(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  // only two choices exist; anything older (email, both) behaves as push
  function prefs() { var p = j(PREFS, null) || {}; return { channels: p.channels === 'none' ? 'none' : 'push' }; }
  function setPrefs(p) { put(PREFS, { channels: p.channels === 'none' ? 'none' : 'push' }); }

  // proformas saved on this device and not yet sent: only the vendors who issue them, counted from the device itself.
  // Online they normally send themselves within moments, so a short grace avoids flashing; offline they count at once.
  function pending() {
    try {
      if (!w.MSRoles || !w.MSRoles.hasField(localStorage.getItem('ms-role') || '', 'proformas')) return null;
      var c = j('ms-profile-v1', null), uid = c && c.uid || '';
      var arch = j('ms-proforma-archive-v1', []), now = Date.now(), off = navigator.onLine === false, n = 0;
      if (!Array.isArray(arch)) return null;
      arch.forEach(function (d) {
        if (d && d.synced !== true && d.docNo && (!d.ownerUid || d.ownerUid === uid) && (off || now - (d.createdAt || 0) > 3 * 60 * 1000)) n++;
      });
      return n ? { kind: 'pending', n: n, text: fa.format(n) + ' پیش‌فاکتور هنوز ارسال نشده؛ فقط روی همین دستگاه است', href: './product-catalog.html' } : null;
    } catch (e) { return null; }
  }
  function items() {
    var c = j(KEY, null), list = c && c.items && c.role === role() ? c.items.slice() : [], p = pending();   // a count cached for another role is never shown
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

  // ---- in-page pop-up and system notification
  var popEl = null, popTimer = 0;
  function popup(title, body, url) {
    if (!popEl) {
      popEl = document.createElement('div');
      popEl.className = 'ms-toast ms-note'; popEl.setAttribute('role', 'status'); popEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(popEl);
    }
    clearTimeout(popTimer);
    popEl.setAttribute('data-state', 'info');
    popEl.innerHTML = '<span class="ms-toast-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.300 20a2 2 0 0 0 3.400 0"/></svg></span>' +
      '<a class="ms-toast-text" href="' + (url || './panel.html') + '"><b>' + esc(title) + '</b><br>' + esc(body) + '</a>' +
      '<button type="button" class="ms-toast-x" aria-label="بستن"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';
    popEl.hidden = false;
    popEl.querySelector('.ms-toast-x').addEventListener('click', function () { popEl.hidden = true; });
    popTimer = setTimeout(function () { popEl.hidden = true; }, 9000);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function announce(title, body, url, tag) {
    var p = prefs();
    if (p.channels !== 'push') return;
    var visible = document.visibilityState === 'visible' && (!document.hasFocus || document.hasFocus());
    if (visible || !('Notification' in w) || Notification.permission !== 'granted') { popup(title, body, url); return; }
    var opts = { body: body, tag: tag || 'ms', icon: './assets/branding/maxsilver-pwa-192.png', badge: './assets/branding/maxsilver-pwa-192.png', dir: 'rtl', lang: 'fa', data: { url: url || './panel.html' } };
    var viaWorker = navigator.serviceWorker && navigator.serviceWorker.getRegistration ? navigator.serviceWorker.getRegistration() : Promise.resolve(null);
    viaWorker.then(function (reg) {
      if (reg && reg.showNotification) return reg.showNotification(title, opts);
      var n = new Notification(title, opts); n.onclick = function () { w.focus(); location.href = opts.data.url; };
      return null;
    }).then(null, function () { popup(title, body, url); });
  }
  function askPermission() {
    if (!('Notification' in w)) return Promise.resolve('unsupported');
    if (Notification.permission !== 'default') return Promise.resolve(Notification.permission);
    try { return Promise.resolve(Notification.requestPermission()); } catch (e) { return Promise.resolve('default'); }
  }

  // ---- database (loaded only when a person is signed in)
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
      .then(function () { return w.MS_FIREBASE ? null : load('./assets/firebase-config.js?v=20261307'); });
  }
  var db = null, me = '', parts = {}, started = false, unsubs = [], baseline = {};
  var seenMap = j(SEEN, {});
  function commit() {
    var list = [];
    ['ticket', 'public', 'commission', 'requests', 'fulfil'].forEach(function (k) { (parts[k] || []).forEach(function (x) { list.push(x); }); });
    put(KEY, { at: Date.now(), role: role(), uid: me, items: list });
    paint();
    try { w.dispatchEvent(new CustomEvent('ms-notify')); } catch (e) { /* ignore */ }
  }
  function remember(id, at) { seenMap[id] = at; put(SEEN, seenMap); }
  // a change is "new" when it is newer than anything this device has already shown for that id
  function fresh(id, at) {
    var first = seenMap[id] === undefined;
    if (!baseline.done) { if (first || at > seenMap[id]) remember(id, at); return false; }
    var isNew = first || at > seenMap[id];
    if (isNew) remember(id, at);
    return isNew;
  }

  function watchTickets(r) {
    var tk = db.collection('tickets'), cache = {};
    var qs = r === 'manager' ? [tk] : [tk.where('audience', 'array-contains', 'uid:' + me), tk.where('audience', 'array-contains', 'role:' + r)];
    var minePool = ['uid:' + me, 'role:' + r];
    function onData() {
      var n = 0, fresher = [];
      Object.keys(cache).forEach(function (id) {
        var x = cache[id];
        var addressed = (x.audience || []).some(function (a) { return minePool.indexOf(a) >= 0; });
        if (x.status === 'open' && x.lastBy !== me && addressed) {
          n++;
          if (fresh(id, x.updatedAt || 0)) fresher.push(x);
          // delivery receipt: this device now has the message
          if ((x['recv_' + me] || 0) < (x.updatedAt || 0)) { var u = {}; u['recv_' + me] = x.updatedAt || 0; tk.doc(id).update(u).then(null, function () { /* ignore */ }); }
        } else { fresh(id, x.updatedAt || 0); }
      });
      parts.ticket = n ? [{ kind: 'ticket', n: n, text: fa.format(n) + ' گفت‌وگو منتظر پاسخ شماست', target: 'tickets' }] : [];
      commit();
      fresher.forEach(function (x) { var big = x.kind === 'proforma' || x.kind === 'proforma-refusal';
      announce(x.kind === 'proforma' ? 'پیش‌فاکتور تازه · ' + (x.fromName || '') : x.kind === 'proforma-refusal' ? 'رد پیش‌فاکتور · ' + (x.fromName || '') : (x.lastByName || 'پیام تازه'), big ? (x.title || '') : (x.lastText || x.title || ''), './panel.html#tickets', 'tk-' + x.id); });
    }
    qs.forEach(function (q) {
      unsubs.push(q.onSnapshot(function (snap) {
        snap.forEach(function (s) { var d = s.data(); d.id = s.id; cache[s.id] = d; });
        onData();
      }, function () { /* offline or rules not published: keep the last count */ }));
    });
  }
  function watchPublic(r) {
    var pub = db.collection('public_requests');
    var q = r === 'sales_manager' ? pub.where('to', '==', 'sales') : (r === 'service' ? pub.where('to', '==', 'service') : pub);
    unsubs.push(q.onSnapshot(function (snap) {
      var n = 0, fresher = [];
      snap.forEach(function (s) { var x = s.data(); if (x.status !== 'closed') { n++; if (fresh('pub-' + s.id, x.createdAt || 0)) fresher.push(x); } });
      parts.public = n ? [{ kind: 'public', n: n, text: fa.format(n) + ' پیام بیرونی بدون پاسخ', target: 'public' }] : [];
      commit();
      fresher.forEach(function (x) { announce('پیام بیرونی تازه', (x.name ? x.name + ': ' : '') + (x.text || ''), './panel.html#public', 'pub'); });
    }, function () { /* ignore */ }));
  }
  // purchase requests: management sees the new ones; a salesperson the new ones given to them and every later stage of theirs
  // (accepted, rejected, warehouse, shipped…) until they open it; the account manager the accepted orders that still need a route
  var STAGE_LABEL = { accepted: 'تأیید اکانت منیجر', rejected: 'رد اکانت منیجر', warehouse: 'در انبار', production: 'در تولید', ready: 'آمادهٔ ارسال', shipped: 'ارسال شد', delivered: 'تحویل شد', returned: 'مرجوع شد', cancelled: 'لغو شد' };
  function stageOf(x) {
    if (x.stage) return x.stage;
    return x.status === 'won' ? 'delivered' : x.status === 'lost' ? 'cancelled' : x.status === 'quoted' ? 'preinvoice' : x.status === 'contacted' ? 'confirmed' : 'request';
  }
  var ACK = 'ms-stage-ack-v1', reqRecount = null;
  function watchRequests(r) {
    var col = db.collection('requests'), lead = r === 'manager' || r === 'ceo' || r === 'sales_manager', am = r === 'account_manager';
    var q = lead || am ? col : col.where('assignee', '==', me), cache = {};
    function onData(loud) {
      var ack = j(ACK, {}), n = 0, fresher = [], moves = [], routes = [], newMoves = [], newRoutes = [];
      Object.keys(cache).forEach(function (id) {
        var x = cache[id], st = stageOf(x);
        if (!am && x.status === 'new' && st === 'request') { n++; if (fresh('req-' + id, x.createdAt || 0)) fresher.push(x); }
        if (r === 'visitor' && STAGE_LABEL[st] && ack[id] !== st) { moves.push(x); if (fresh('stg-' + id + '-' + st, x.updatedAt || 0)) newMoves.push({ x: x, st: st }); }
        if (am && st === 'accepted') { routes.push(x); if (fresh('am-' + id, x.updatedAt || 0)) newRoutes.push(x); }
      });
      var list = [];
      if (n) list.push({ kind: 'request', n: n, text: fa.format(n) + ' درخواست خرید تازه', href: './crm.html' });
      if (moves.length) list.push({ kind: 'stage', n: moves.length, text: fa.format(moves.length) + ' درخواست شما مرحلهٔ تازه دارد', href: './crm.html' });
      if (routes.length) list.push({ kind: 'route', n: routes.length, text: fa.format(routes.length) + ' سفارش تأییدشده منتظر تعیین مسیر انبار یا تولید است', href: './crm.html' });
      parts.requests = list;
      commit();
      if (!loud) return;
      fresher.forEach(function (x) { announce('درخواست خرید تازه', ((x.customer && x.customer.name) || '') + (x.plan ? ' · ' + x.plan.concept : ''), './crm.html', 'req'); });
      newMoves.forEach(function (m) { announce('مرحلهٔ درخواست عوض شد', (m.x.code || '') + ' · ' + STAGE_LABEL[m.st], './crm.html', 'stg'); });
      newRoutes.forEach(function (x) { announce('سفارش تأیید شد', (x.code || '') + ' · مسیر انبار یا تولید را تعیین کنید', './crm.html', 'am'); });
    }
    reqRecount = function () { onData(false); };
    unsubs.push(q.onSnapshot(function (snap) {
      snap.forEach(function (s) { cache[s.id] = s.data(); });
      onData(true);
    }, function () { /* ignore */ }));
  }
  // orders routed to the warehouse or production (their list), and the team's «ready» report (the account manager)
  function watchFulfilment(r) {
    var am = r === 'account_manager' || r === 'manager';
    unsubs.push(db.collection('fulfilment').onSnapshot(function (snap) {
      var wait = 0, ready = 0, fw = [], fr = [];
      snap.forEach(function (s) {
        var x = s.data(), mine = r === 'operations' ? x.route === 'warehouse' : r === 'production' ? x.route === 'production' : true, live = x.stage === 'warehouse' || x.stage === 'production';
        if (!mine || !live) return;
        if (!x.ready) { if (!am) { wait++; if (fresh('ful-' + s.id, x.updatedAt || 0)) fw.push(x); } }
        else if (am) { ready++; if (fresh('rdy-' + s.id, x.readyAt || 0)) fr.push(x); }
      });
      var list = [];
      if (wait) list.push({ kind: 'fulfil', n: wait, text: fa.format(wait) + ' سفارش منتظر آماده‌سازی شماست', href: './warehouse.html' });
      if (ready) list.push({ kind: 'ready', n: ready, text: fa.format(ready) + ' سفارش را انبار یا تولید آماده اعلام کرده؛ مرحله را ثبت کنید', href: './crm.html' });
      parts.fulfil = list; commit();
      fw.forEach(function (x) { announce('سفارش تازه برای آماده‌سازی', (x.orderCode || x.code || '') + ' · ' + ((x.lines || []).length) + ' قلم', './warehouse.html', 'ful'); });
      fr.forEach(function (x) { announce('سفارش آماده است', (x.orderCode || x.code || '') + (x.readyByName ? ' · ' + x.readyByName : ''), './crm.html', 'rdy'); });
    }, function () { /* ignore */ }));
  }
  function watchCommission(r) {
    var R = w.MSRoles, approve = R.can(r, 'commissionApprove'), review = R.can(r, 'commissionReview');
    var want = approve ? 'reviewed' : (review ? 'draft' : '');
    if (!want) return;
    var verb = approve ? 'منتظر تأیید نهایی شماست' : 'منتظر بررسی شماست';
    var rates = [], months = [];
    function flush() { parts.commission = rates.concat(months); commit(); }
    unsubs.push(db.collection('commission_rates').onSnapshot(function (snap) {
      rates = [];
      snap.forEach(function (s) { var x = s.data(); if (x.status === want) rates.push({ kind: 'commission', n: 1, text: 'نرخ‌های سال ' + fa.format(Number(x.year)).replace(/٬/g, '') + ' ' + verb, target: 'commission' }); });
      flush();
    }, function () { /* ignore */ }));
    unsubs.push(db.collection('commission_months').onSnapshot(function (snap) {
      months = [];
      snap.forEach(function (s) {
        var x = s.data();
        if (x.status === want) months.push({ kind: 'commission', n: 1, text: 'پایهٔ ' + (MONTHS[parseInt(x.month, 10) - 1] || x.month) + ' ' + fa.format(Number(x.year)).replace(/٬/g, '') + ' ' + verb, target: 'commission' });
      });
      flush();
    }, function () { /* ignore */ }));
  }

  // "online" is a heartbeat written once a minute while a page is visible, and cleared when the page is hidden or closed
  var beatTimer = 0;
  function beat(on) {
    if (!db || !me) return;
    db.collection('presence').doc(me).set({ online: on, lastSeen: Date.now() }, { merge: true }).then(null, function () { /* ignore */ });
  }
  function heartbeat() {
    if (beatTimer) return;
    beat(document.visibilityState === 'visible');
    beatTimer = setInterval(function () { if (document.visibilityState === 'visible') beat(true); }, 60 * 1000);
    document.addEventListener('visibilitychange', function () { beat(document.visibilityState === 'visible'); });
    w.addEventListener('pagehide', function () { beat(false); });
  }

  function start() {
    var r = role();
    if (!r) { if (j(KEY, null)) put(KEY, { at: 0, items: [] }); paint(); return; }
    paint();
    if (started) return;
    started = true;
    setTimeout(function () {
      ensureSdk().then(function () {
        var app = w.firebase.apps.length ? w.firebase.app() : w.firebase.initializeApp(w.MS_FIREBASE);
        var auth = w.firebase.auth(app); db = w.firebase.firestore(app);
        var off = auth.onAuthStateChanged(function (u) {
          if (typeof off === 'function') off();
          if (!u) return;
          me = u.uid;
          watchTickets(r);
          heartbeat();
          if (r === 'manager' || r === 'ceo' || r === 'sales_manager' || r === 'service') watchPublic(r);
          if (w.MSRoles.can(r, 'commission')) watchCommission(r);
          if (w.MSRoles.can(r, 'crm')) watchRequests(r);
          if (r === 'operations' || r === 'production' || r === 'account_manager' || r === 'manager') watchFulfilment(r);
          // everything that existed before this visit is the baseline: only later changes pop up
          setTimeout(function () { baseline.done = true; }, 4000);
        });
      }).then(null, function () { /* offline: the cached count stays */ });
    }, 900);
    setInterval(paint, 60 * 1000);                    // a proforma that has waited past the grace appears without a reload
  }

  w.MSNotify = {
    items: items, total: function () { return total(items()); }, paint: paint,
    refresh: function () { start(); return Promise.resolve(); },
    prefs: prefs, setPrefs: setPrefs, askPermission: askPermission,
    permission: function () { return 'Notification' in w ? Notification.permission : 'unsupported'; },
    announce: announce,
    // the person opened a request: its current stage no longer counts as new
    ack: function (code, stage) { var a = j(ACK, {}); a[code] = stage; put(ACK, a); if (reqRecount) reqRecount(); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  w.addEventListener('storage', function (e) { if (e.key === 'ms-role') { started = false; start(); } });
})(window);

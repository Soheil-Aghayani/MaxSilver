(function () {
  'use strict';
  // Optional cloud sync on top of the local-first archive in catalog.js.
  //  - The Firebase SDK (~170 KB gzipped) is only fetched when a session exists or the user opens the account sheet.
  //  - Everything works offline / without VPN: the profile is cached, saves go to the device first, a queue is retried later.
  var cfg = window.MS_FIREBASE, A = window.MSArchive;
  var btn = document.getElementById('accBtn');
  if (!cfg || !A || !btn) { if (btn) btn.hidden = true; return; }

  var SDK = ['app', 'auth', 'firestore'].map(function (n) { return './assets/vendor/firebase-' + n + '-compat-10.12.5.js'; });
  var CACHE_KEY = 'ms-profile-v1', TIMEOUT = 15000, RETRY = 5 * 60 * 1000;
  var S = { user: null, profile: null, busy: false, signing: false, last: 0, error: '', ready: false, booting: false };
  var auth = null, db = null, bootPromise = null;

  var faTime = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
  var faInt = new Intl.NumberFormat('fa-IR');
  var dlg = document.createElement('dialog');
  dlg.className = 'cat-dialog acc-dialog';
  dlg.setAttribute('aria-labelledby', 'accTitle');
  document.body.appendChild(dlg);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function errText(e) {
    var c = e && e.code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'ایمیل یا رمز عبور درست نیست.';
    if (/network|unavailable|deadline|failed-precondition|timeout|sdk/.test(c)) return 'ارتباط با سرویس برقرار نشد (بدون VPN یا اینترنت). کار شما روی همین دستگاه ذخیره است و بعداً خودکار ارسال می‌شود.';
    if (/permission-denied/.test(c)) return 'دسترسی این حساب هنوز توسط مدیر فعال نشده است.';
    if (/too-many-requests/.test(c)) return 'تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید.';
    if (/user-disabled/.test(c)) return 'این حساب غیرفعال شده است.';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  function withTimeout(p, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject({ code: 'timeout' }); }, ms || TIMEOUT);
      p.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  // ----- cached identity: lets numbering, role and name work with no connection at all
  function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } }
  function writeCache(uid, profile) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ uid: uid, profile: profile })); } catch (e) { /* ignore */ } }
  function clearIdentity() { try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem('ms-role'); } catch (e) { /* ignore */ } if (window.MSGate) window.MSGate.apply(); }
  var cached = readCache();
  if (cached && cached.profile && cached.profile.active !== false) {
    // offline start-up: role-aware navigation and the receipt name must not wait for the network
    try { localStorage.setItem('ms-role', cached.profile.role || ''); } catch (e) { /* ignore */ }
    A.setIssuer(cached.profile.name);
  }
  function activeProfile() { var p = S.profile || (cached && cached.profile); return p && p.active !== false ? p : null; }
  function currentUid() { return S.user ? S.user.uid : (cached ? cached.uid : ''); }
  function approved() { return !!(currentUid() && activeProfile()); }
  function live() { return !!(db && S.user); }
  function hasSession() {
    try { for (var i = 0; i < localStorage.length; i++) if (/^firebase:authUser:/.test(localStorage.key(i))) return true; } catch (e) { /* ignore */ }
    return false;
  }

  // ----- sync
  function clean(d) { var o = JSON.parse(JSON.stringify(d)); delete o.synced; return o; }
  function pendingDocs() {
    var uid = currentUid();
    return A.list().filter(function (d) { return d.synced !== true && d.docNo && (!d.ownerUid || d.ownerUid === uid); });
  }
  function pushPending() {
    if (!live() || !approved()) return Promise.resolve();
    var uid = S.user.uid, pend = pendingDocs(), p = activeProfile();
    var batch = db.batch();
    pend.forEach(function (d) {
      d.ownerUid = uid;
      d.ownerName = p.name || S.user.email || '';
      d.updatedAt = d.updatedAt || d.createdAt || Date.now();
      batch.set(db.collection('invoices').doc(uid + '_' + d.docNo), clean(d));
    });
    batch.set(db.collection('prices').doc(uid), { map: A.prices(), updatedAt: Date.now() });
    return withTimeout(batch.commit()).then(function () {
      pend.forEach(function (d) { d.synced = true; });
      A.save();
      if (window.MSNotify) window.MSNotify.paint();
    });
  }
  function loadProfile() {
    return withTimeout(db.collection('users').doc(S.user.uid).get()).then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (S.profile) writeCache(S.user.uid, S.profile); else clearIdentity();
      try { localStorage.setItem('ms-role', activeProfile() ? (S.profile.role || '') : ''); } catch (e) { /* ignore */ }
      if (window.MSGate) window.MSGate.apply();
      if (S.profile) A.setIssuer(S.profile.name);
    });
  }
  function sync() {
    if (!live() || S.busy) return Promise.resolve();
    S.busy = true; render();
    var uid = S.user.uid;
    var first = S.profile ? Promise.resolve() : loadProfile();
    return first.then(function () {
      if (!approved()) return null;
      var manager = !!(window.MSRoles && window.MSRoles.can(activeProfile().role, 'invoices'));
      var q = manager ? db.collection('invoices') : db.collection('invoices').where('ownerUid', '==', uid);
      return withTimeout(Promise.all([q.get(), db.collection('prices').doc(uid).get()])).then(function (res) {
        var mine = [], others = [];
        res[0].forEach(function (s) { var d = s.data(); (d.ownerUid === uid ? mine : others).push(d); });
        var byNo = {};
        A.list().forEach(function (d) { byNo[d.docNo] = d; });
        mine.forEach(function (r) {
          var l = byNo[r.docNo];
          if (!l || (l.synced === true && (r.updatedAt || 0) > (l.updatedAt || l.createdAt || 0))) byNo[r.docNo] = Object.assign({}, r, { synced: true });
        });
        var merged = Object.keys(byNo).map(function (k) { return byNo[k]; }).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        var remotePrices = res[1].exists && res[1].data().map || {};
        A.replace(merged, Object.assign({}, remotePrices, A.prices()));
        A.setForeign(others.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }));
        return pushPending();
      });
    }).then(function () { S.last = Date.now(); S.error = ''; }, function (e) { S.error = errText(e); })
      .then(function () { S.busy = false; render(); });
  }
  function trySync() {
    if (S.busy) return;
    if (live()) sync(); else if (hasSession()) boot().then(null, function () { /* offline */ });
  }

  // ----- lazy SDK
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = resolve; s.onerror = function () { reject({ code: 'sdk-unavailable' }); };
      document.head.appendChild(s);
    });
  }
  function boot() {
    if (bootPromise) return bootPromise;
    S.booting = true; render();
    bootPromise = SDK.reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve()).then(function () {
      firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.firestore();
      S.ready = true; S.booting = false;
      auth.onAuthStateChanged(onAuth);
    }, function (e) { S.booting = false; S.error = errText(e); bootPromise = null; render(); throw e; });
    return bootPromise;
  }
  function onAuth(user) {
    S.user = user; S.error = '';
    if (!user) { S.profile = null; cached = null; clearIdentity(); A.setForeign([]); render(); return; }
    if (cached && cached.uid === user.uid) S.profile = cached.profile;
    render();
    if (S.profile) { sync(); loadProfile().then(render, function () { /* keep the cached profile */ }); } else sync();
  }

  window.MSSync = {
    uid: function () { return approved() ? currentUid() : ''; },
    code: function () { var p = activeProfile(); return approved() ? String(p.code || currentUid().slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '') : ''; },
    push: function () {
      render();
      if (live()) pushPending().then(function () { S.last = Date.now(); S.error = ''; }, function (e) { S.error = errText(e); }).then(render);
      else if (hasSession()) boot().then(null, function () { /* offline: stays queued */ });
    },
    // may this person send a proforma to account management? (signed in and approved; the account manager does not send to themself)
    canSend: function () {
      var p = activeProfile();
      return approved() && !!p && (window.MSRoles ? window.MSRoles.norm(p.role) : p.role) !== 'account_manager';
    },
    // opens a ticket addressed to the account manager role; the proforma itself is pushed to the cloud first (best effort)
    sendProforma: function (doc, text) {
      if (!approved()) return Promise.reject({ code: 'not-signed-in' });
      var ready = live() ? Promise.resolve() : boot();
      return ready.then(function () {
        if (!live()) throw { code: 'unavailable' };
        return pushPending().then(null, function () { /* the ticket still goes; the copy follows on the next sync */ });
      }).then(function () {
        var p = activeProfile(), me = S.user.uid, now = Date.now(), name = p.name || S.user.email || '';
        var role = window.MSRoles ? window.MSRoles.norm(p.role) : p.role, ref = db.collection('tickets').doc();
        var head = {
          title: ('پیش‌فاکتور ' + doc.docNo + (doc.customer ? ' · ' + doc.customer : '')).slice(0, 120),
          fromUid: me, fromName: name, fromRole: role, toRole: 'account_manager', toUid: '', toName: '',
          kind: 'proforma', docNo: doc.docNo, status: 'open', createdAt: now, updatedAt: now,
          lastText: String(text).slice(0, 140), lastBy: me, lastByName: name, audience: ['uid:' + me, 'role:account_manager']
        };
        var b = db.batch();
        b.set(ref, head);
        b.set(ref.collection('messages').doc(), { uid: me, name: name, role: role, text: text, at: now });
        return withTimeout(b.commit());
      });
    },
    remove: function (docNo) { if (live() && approved() && docNo) db.collection('invoices').doc(S.user.uid + '_' + docNo).delete().catch(function () { /* local copy removed; cloud copy remains */ }); }
  };

  // ----- account sheet
  function render() {
    var on = approved(), n = on ? pendingDocs().length : 0;
    btn.classList.toggle('on', on);
    if (n) btn.setAttribute('data-pending', faInt.format(n)); else btn.removeAttribute('data-pending');
    var p = activeProfile(), who = on ? (p.name || (S.user && S.user.email) || '') : '';
    btn.title = on ? 'حساب: ' + who + (n ? ' · ' + faInt.format(n) + ' مورد در انتظار ارسال' : '') : 'ورود به حساب';
    btn.setAttribute('aria-label', btn.title);
    if (dlg.open) dlg.innerHTML = content();
  }
  function content() {
    var head = '<div class="dlg-bar"><h2 id="accTitle">حساب کاربری</h2><button type="button" class="dlg-x" data-acc-close aria-label="بستن">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>';
    var err = S.error ? '<p class="acc-err" role="alert">' + esc(S.error) + '</p>' : '';
    var p = activeProfile();
    if (S.booting && !S.ready && !approved()) return head + '<div class="acc-body"><p class="acc-note">در حال آماده‌سازی…</p>' + err + '</div>';
    if (!S.ready && !approved()) {
      return head + '<div class="acc-body"><p class="acc-note">سرویس حساب بارگذاری نشد.</p>' + err + '<button type="button" class="acc-primary" data-acc-retry>تلاش دوباره</button></div>';
    }
    if (S.ready && !S.user && !approved()) {
      return head + '<form class="acc-body" id="accForm"><p class="acc-note">با ورود، پیش‌فاکتورها و قیمت‌های شما بین دستگاه‌ها همگام می‌شود. بدون ورود هم همه‌چیز روی همین دستگاه کار می‌کند. ورود فقط بار اول به اینترنت بدون محدودیت یا VPN نیاز دارد.</p>' +
        '<label>ایمیل<input type="email" name="email" dir="ltr" autocomplete="username" required></label>' +
        '<label>رمز عبور<input type="password" name="password" dir="ltr" autocomplete="current-password" required></label>' + err +
        '<button type="submit" class="acc-primary"' + (S.signing ? ' disabled' : '') + '>' + (S.signing ? 'در حال ورود…' : 'ورود') + '</button></form>';
    }
    if (S.user && !p && !cached) {
      return head + '<div class="acc-body"><p class="acc-note">ورود انجام شد، اما حساب شما هنوز توسط مدیر فعال نشده است یا اتصال برقرار نیست. این شناسه را به مدیر بدهید:</p>' +
        '<p class="acc-uid" dir="ltr">' + esc(S.user.uid) + '</p>' + err + '<button type="button" class="acc-secondary" data-acc-out>خروج</button></div>';
    }
    if (!p) {
      return head + '<div class="acc-body"><p class="acc-note">این حساب توسط مدیر غیرفعال شده است.</p>' + err + '<button type="button" class="acc-secondary" data-acc-out>خروج</button></div>';
    }
    var n = pendingDocs().length, role = window.MSRoles ? window.MSRoles.label(p.role) : 'ویزیتور';
    var status = S.busy ? 'در حال همگام‌سازی…' : S.last ? 'آخرین همگام‌سازی: ' + esc(faTime.format(new Date(S.last))) : 'هنوز در این نشست همگام‌سازی نشده است.';
    return head + '<div class="acc-body"><div class="acc-id"><b>' + esc(p.name || (S.user && S.user.email) || '') + '</b><span class="acc-role">' + role + '</span></div>' +
      '<p class="acc-note" dir="ltr">' + esc((S.user && S.user.email) || '') + '</p>' +
      '<p class="acc-note">' + status + '</p>' +
      (n ? '<p class="acc-warn">' + faInt.format(n) + ' پیش‌فاکتور هنوز ارسال نشده است. روی همین دستگاه ذخیره‌اند و وقتی اتصال برقرار شود خودکار ارسال می‌شوند.</p>' : '') + err +
      '<a class="acc-primary acc-link" href="./panel.html">پنل کاربری</a>' +
      '<button type="button" class="acc-secondary" data-acc-sync' + (S.busy || !live() ? ' disabled' : '') + '>همگام‌سازی اکنون</button>' +
      '<button type="button" class="acc-secondary" data-acc-out>خروج از حساب</button>' +
      '<p class="acc-note">با خروج، پیش‌فاکتورهای ذخیره‌شده روی این دستگاه باقی می‌مانند.</p></div>';
  }
  function open() {
    dlg.innerHTML = content();
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  }
  btn.addEventListener('click', function () { open(); if (!bootPromise) boot().then(null, function () { /* shown in the sheet */ }); });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-acc-close]')) { dlg.close(); return; }
    if (e.target.closest('[data-acc-sync]')) sync();
    if (e.target.closest('[data-acc-retry]')) { S.error = ''; boot().then(null, function () { /* shown in the sheet */ }); }
    if (e.target.closest('[data-acc-out]')) { if (auth) auth.signOut(); else { cached = null; S.profile = null; clearIdentity(); render(); } }
  });
  dlg.addEventListener('submit', function (e) {
    if (e.target.id !== 'accForm' || !auth) return;
    e.preventDefault();
    var f = e.target;
    S.signing = true; S.error = ''; render();
    withTimeout(auth.signInWithEmailAndPassword(f.elements.email.value.trim(), f.elements.password.value), 25000).then(null, function (err) { S.error = errText(err); })
      .then(function () { S.signing = false; render(); });
  });

  // ----- start-up and retries
  render();
  if (hasSession()) {
    var start = function () { boot().then(null, function () { /* offline: the cached identity keeps working */ }); };
    if (document.readyState === 'complete') setTimeout(start, 300); else window.addEventListener('load', function () { setTimeout(start, 300); });
  }
  window.addEventListener('online', trySync);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') trySync(); });
  setInterval(function () { if (pendingDocs().length) trySync(); }, RETRY);
})();

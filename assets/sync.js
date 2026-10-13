(function () {
  'use strict';
  // Cloud sync on top of the local-first archive in catalog.js. The page keeps working when this file, the SDK or the network is missing.
  var cfg = window.MS_FIREBASE, A = window.MSArchive;
  var btn = document.getElementById('accBtn');
  if (!cfg || !A || !btn || !window.firebase) { if (btn) btn.hidden = true; return; }

  var auth, db;
  try {
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.firestore();
  } catch (e) { btn.hidden = true; return; }

  var S = { user: null, profile: null, busy: false, signing: false, last: 0, error: '', checking: true };
  var faTime = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' });
  var dlg = document.createElement('dialog');
  dlg.className = 'cat-dialog acc-dialog';
  dlg.setAttribute('aria-labelledby', 'accTitle');
  document.body.appendChild(dlg);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function errText(e) {
    var c = e && e.code || '';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return 'ایمیل یا رمز عبور درست نیست.';
    if (/network|unavailable|deadline|failed-precondition/.test(c)) return 'اتصال برقرار نشد. اینترنت یا VPN را بررسی کنید؛ برنامه همچنان بدون همگام‌سازی کار می‌کند.';
    if (/permission-denied/.test(c)) return 'دسترسی این حساب هنوز توسط مدیر فعال نشده است.';
    if (/too-many-requests/.test(c)) return 'تلاش‌های زیاد؛ چند دقیقه بعد دوباره امتحان کنید.';
    if (/user-disabled/.test(c)) return 'این حساب غیرفعال شده است.';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  function approved() { return !!(S.user && S.profile && S.profile.active !== false); }

  // ----- sync
  function clean(d) {
    var o = JSON.parse(JSON.stringify(d));
    delete o.synced;
    return o;
  }
  function pushPending() {
    if (!approved()) return Promise.resolve();
    var uid = S.user.uid;
    var pend = A.list().filter(function (d) { return d.synced !== true && d.docNo && (!d.ownerUid || d.ownerUid === uid); });
    var batch = db.batch();
    pend.forEach(function (d) {
      d.ownerUid = uid;
      d.ownerName = S.profile.name || S.user.email || '';
      d.updatedAt = d.updatedAt || d.createdAt || Date.now();
      batch.set(db.collection('invoices').doc(uid + '_' + d.docNo), clean(d));
    });
    batch.set(db.collection('prices').doc(uid), { map: A.prices(), updatedAt: Date.now() });
    return batch.commit().then(function () {
      pend.forEach(function (d) { d.synced = true; });
      A.save();
    });
  }
  function sync() {
    if (!approved() || S.busy) return Promise.resolve();
    S.busy = true; render();
    var uid = S.user.uid, manager = S.profile.role === 'manager';
    var q = manager ? db.collection('invoices') : db.collection('invoices').where('ownerUid', '==', uid);
    return Promise.all([q.get(), db.collection('prices').doc(uid).get()]).then(function (res) {
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
    }).then(function () { S.last = Date.now(); S.error = ''; }, function (e) { S.error = errText(e); })
      .then(function () { S.busy = false; render(); });
  }

  window.MSSync = {
    uid: function () { return approved() ? S.user.uid : ''; },
    code: function () { return approved() ? String(S.profile.code || S.user.uid.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '') : ''; },
    push: function () { if (approved()) pushPending().then(function () { S.last = Date.now(); S.error = ''; render(); }, function (e) { S.error = errText(e); render(); }); },
    remove: function (docNo) { if (approved() && docNo) db.collection('invoices').doc(S.user.uid + '_' + docNo).delete().catch(function () { /* removed locally; stays in the cloud until the next manual delete */ }); }
  };

  // ----- account sheet
  function render() {
    var on = approved();
    btn.classList.toggle('on', on);
    btn.title = on ? 'حساب: ' + (S.profile.name || S.user.email) : 'ورود به حساب';
    btn.setAttribute('aria-label', btn.title);
    if (dlg.open) dlg.innerHTML = content();
  }
  function content() {
    var head = '<div class="dlg-bar"><h2 id="accTitle">حساب کاربری</h2><button type="button" class="dlg-x" data-acc-close aria-label="بستن">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>';
    var err = S.error ? '<p class="acc-err" role="alert">' + esc(S.error) + '</p>' : '';
    if (S.checking) return head + '<div class="acc-body"><p class="acc-note">در حال بررسی…</p></div>';
    if (!S.user) {
      return head + '<form class="acc-body" id="accForm"><p class="acc-note">با ورود، پیش‌فاکتورها و قیمت‌های شما بین دستگاه‌ها همگام می‌شود. بدون ورود هم همه‌چیز روی همین دستگاه کار می‌کند.</p>' +
        '<label>ایمیل<input type="email" name="email" dir="ltr" autocomplete="username" required></label>' +
        '<label>رمز عبور<input type="password" name="password" dir="ltr" autocomplete="current-password" required></label>' + err +
        '<button type="submit" class="acc-primary"' + (S.signing ? ' disabled' : '') + '>' + (S.signing ? 'در حال ورود…' : 'ورود') + '</button></form>';
    }
    if (!S.profile || S.profile.active === false) {
      return head + '<div class="acc-body"><p class="acc-note">' + (S.profile ? 'این حساب توسط مدیر غیرفعال شده است.' : 'ورود انجام شد، اما حساب شما هنوز توسط مدیر فعال نشده است. این شناسه را به مدیر بدهید:') + '</p>' +
        '<p class="acc-uid" dir="ltr">' + esc(S.user.uid) + '</p>' + err + '<button type="button" class="acc-secondary" data-acc-out>خروج</button></div>';
    }
    var role = S.profile.role === 'manager' ? 'مدیر' : 'ویزیتور';
    return head + '<div class="acc-body"><div class="acc-id"><b>' + esc(S.profile.name || S.user.email) + '</b><span class="acc-role">' + role + '</span></div>' +
      '<p class="acc-note" dir="ltr">' + esc(S.user.email) + '</p>' +
      '<p class="acc-note">' + (S.busy ? 'در حال همگام‌سازی…' : S.last ? 'آخرین همگام‌سازی: ' + esc(faTime.format(new Date(S.last))) : 'هنوز همگام‌سازی نشده است.') + '</p>' + err +
      '<a class="acc-primary acc-link" href="./panel.html">پنل کاربری</a>' +
      '<button type="button" class="acc-secondary" data-acc-sync' + (S.busy ? ' disabled' : '') + '>همگام‌سازی اکنون</button>' +
      '<button type="button" class="acc-secondary" data-acc-out>خروج از حساب</button>' +
      '<p class="acc-note">با خروج، پیش‌فاکتورهای ذخیره‌شده روی این دستگاه باقی می‌مانند.</p></div>';
  }
  function open() {
    dlg.innerHTML = content();
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  }
  btn.addEventListener('click', open);
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-acc-close]')) { dlg.close(); return; }
    if (e.target.closest('[data-acc-sync]')) sync();
    if (e.target.closest('[data-acc-out]')) { auth.signOut(); S.error = ''; }
  });
  dlg.addEventListener('submit', function (e) {
    if (e.target.id !== 'accForm') return;
    e.preventDefault();
    var f = e.target;
    S.signing = true; S.error = ''; render();
    auth.signInWithEmailAndPassword(f.elements.email.value.trim(), f.elements.password.value).then(null, function (err) { S.error = errText(err); })
      .then(function () { S.signing = false; render(); });
  });

  // ----- session
  auth.onAuthStateChanged(function (user) {
    S.user = user; S.profile = null; S.checking = false; S.error = '';
    if (!user) { try { localStorage.removeItem('ms-role'); } catch (x) { /* ignore */ } A.setForeign([]); render(); return; }
    db.collection('users').doc(user.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      try { localStorage.setItem('ms-role', approved() ? (S.profile.role || '') : ''); } catch (x) { /* ignore */ }
      if (S.profile) A.setIssuer(S.profile.name);
      render();
      return sync();
    }, function (e) { S.error = errText(e); render(); });
  });
  window.addEventListener('online', function () { sync(); });
  render();
})();

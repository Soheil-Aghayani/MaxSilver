// Public web-app identifiers for the Firebase project. They are not secrets: access is enforced by Firebase Authentication
// and the rules in firestore.rules, never by hiding these values.
window.MS_FIREBASE = {
  apiKey: 'AIzaSyD6Askz1Z4G6Nb1r7cdScFh9IaeLMdepS8',
  authDomain: 'maxsilver-portal.firebaseapp.com',
  projectId: 'maxsilver-portal',
  storageBucket: 'maxsilver-portal.firebasestorage.app',
  messagingSenderId: '496466651938',
  appId: '1:496466651938:web:7604cb3f8029411324537b'
};

// A save is never silent: every write the app makes shows a small message at the bottom ("saving" if it is slow, "saved", or the reason
// it failed, and after 20 seconds a note that the database did not answer). Writes that are only background bookkeeping are left alone.
(function () {
  if (!window.firebase || !firebase.firestore || firebase.__msSaveTrack) return;
  firebase.__msSaveTrack = true;
  var QUIET = /^(presence|notify_prefs|request_status|request_counters|public_requests|item_status|profiles)(\/|$)/;
  var el = null, timers = [], busy = 0;
  function say(kind, text, keep) {
    if (!document.body) return;
    if (!el) {
      var s = document.createElement('style');
      s.textContent = '.ms-save{position:fixed;inset-inline:12px;bottom:96px;z-index:2147483000;margin:0 auto;width:fit-content;max-width:calc(100vw - 24px);display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;color:#fff;box-shadow:0 12px 30px rgba(5,25,52,.35);font:800 13px/1.6 Estedad,Tahoma,sans-serif;pointer-events:none;transition:opacity .25s}' +
        '.ms-save.saving{background:#071b36}.ms-save.ok{background:#14804a}.ms-save.err{background:#b42318;pointer-events:auto}' +
        '.ms-save i{width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:ms-spin .8s linear infinite}@keyframes ms-spin{to{transform:rotate(360deg)}}' +
        '@media(prefers-reduced-motion:reduce){.ms-save i{animation:none}}';
      document.head.appendChild(s);
      el = document.createElement('div'); el.className = 'ms-save'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el);
    }
    clearTimeout(timers.hide);
    el.className = 'ms-save ' + kind; el.style.opacity = '1';
    el.innerHTML = (kind === 'saving' ? '<i></i>' : '') + '<span></span>'; el.lastChild.textContent = text;
    if (!keep) timers.hide = setTimeout(function () { el.style.opacity = '0'; }, kind === 'err' ? 7000 : 1700);
  }
  function why(e) {
    var c = (e && e.code) || '', m = (e && e.message) || '';
    if (/permission-denied/.test(c)) return 'ذخیره نشد: اجازهٔ این کار را ندارید.';
    if (/unavailable|network|deadline/.test(c)) return 'ذخیره نشد: اتصال برقرار نیست (اینترنت یا VPN).';
    if (/invalid|nested|undefined/i.test(c + ' ' + m)) return 'ذخیره نشد: داده برای پایگاه داده مناسب نیست.';
    return 'ذخیره نشد' + (c ? ' (' + c + ')' : '') + '.';
  }
  function track(p, path) {
    if (!p || typeof p.then !== 'function' || QUIET.test(String(path || ''))) return p;
    busy++;
    var slow = setTimeout(function () { say('saving', 'در حال ذخیره…', true); }, 900);
    var hang = setTimeout(function () { say('err', 'پایگاه داده جواب نمی‌دهد؛ اتصال اینترنت یا VPN را بررسی کنید. اگر ذخیره بعداً انجام شد، پیام «ذخیره شد» می‌آید.', true); }, 20000);
    return p.then(function (r) { busy--; clearTimeout(slow); clearTimeout(hang); say('ok', 'ذخیره شد'); return r; },
      function (e) { busy--; clearTimeout(slow); clearTimeout(hang); say('err', why(e)); throw e; });
  }
  try {
    var F = firebase.firestore, D = F.DocumentReference && F.DocumentReference.prototype, C = F.CollectionReference && F.CollectionReference.prototype;
    ['set', 'update', 'delete'].forEach(function (k) {
      if (!D || !D[k]) return; var o = D[k];
      D[k] = function () { return track(o.apply(this, arguments), this.path); };
    });
    if (C && C.add) { var add = C.add; C.add = function () { return track(add.apply(this, arguments), this.path); }; }
  } catch (e) { /* the SDK shape differs: saving still works, only the message is missing */ }
  // batches and transactions belong to the database object, which exists after initializeApp
  var init = firebase.initializeApp;
  firebase.initializeApp = function () {
    var app = init.apply(firebase, arguments);
    try {
      var db = app.firestore();
      if (!db.__msTrack) {
        db.__msTrack = true;
        var rt = db.runTransaction; db.runTransaction = function () { return track(rt.apply(db, arguments), ''); };
        var bt = db.batch; db.batch = function () { var b = bt.apply(db, arguments), c = b.commit; b.commit = function () { return track(c.apply(b, arguments), ''); }; return b; };
      }
    } catch (e) { /* ignore */ }
    return app;
  };
})();

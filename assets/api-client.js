(function (w) {
  'use strict';
  // Data adapter for the Laravel backend (/api/v1). Off by default: the portal keeps using Firebase until a base address is saved.
  // The address is chosen on backend.html and kept only in this browser. No secret is ever stored here: the token is a short-lived session token.
  var BASE_KEY = 'ms-api-base', TOKEN_KEY = 'ms-api-token';

  function base() { if (/\.github\.io$/i.test(location.hostname)) return ''; var u = ''; try {   // the GitHub Pages copy is the Firebase fallback: a server address saved earlier in this browser must not override it
    u = localStorage.getItem(BASE_KEY) || ''; } catch (e) { /* ignore */ } return (u || w.MS_API_BASE || '').replace(/\/+$/, ''); }
  // the session token lives in this tab; when the person ticked «remember me» a copy also stays on this device (the server gives that token 30 days)
  function token() { try { return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY + '-p') || ''; } catch (e) { return ''; } }
  function setToken(t, persist) {
    try {
      if (t) { sessionStorage.setItem(TOKEN_KEY, t); if (persist) localStorage.setItem(TOKEN_KEY + '-p', t); else localStorage.removeItem(TOKEN_KEY + '-p'); }
      else { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY + '-p'); }
      wipeCache();
    } catch (e) { /* ignore */ }
  }
  // the remembered-browser token that lets a sign-in or a site update skip the six-digit code (the password is always asked)
  function device() { try { return localStorage.getItem('ms-device') || ''; } catch (e) { return ''; } }
  function setDevice(t) { try { if (t) localStorage.setItem('ms-device', t); else localStorage.removeItem('ms-device'); } catch (e) { /* ignore */ } }

  // ----- last good answers: when the server cannot be reached, a read is answered from the copy saved by the last good one, so the screen
  // keeps its data and a small bar says so. The copy lives in sessionStorage only (gone when the tab closes, wiped at sign-in and sign-out).
  var OC = 'ms-oc:', OC_MAX = 600000, offlineBar = null, offlineTimer = null;
  function cacheable(method, path, anon) { return method === 'GET' && !anon && !/^(auth|portal|app|ping|public)(\/|$)/.test(path); }
  function wipeCache() { try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf(OC) === 0) sessionStorage.removeItem(k); }); } catch (e) { /* ignore */ } }
  function cachePut(path, j) {
    try { var t = JSON.stringify(j); if (t.length <= OC_MAX) sessionStorage.setItem(OC + path, t); } catch (e) { wipeCache(); }
  }
  function cacheGet(path) { try { var t = sessionStorage.getItem(OC + path); return t ? { v: JSON.parse(t) } : null; } catch (e) { return null; } }
  function offlineNote(on) {
    if (!document.body) return;
    if (!on) { if (offlineBar) offlineBar.hidden = true; return; }
    if (!offlineBar) {
      var st = document.createElement('style');
      st.textContent = '.ms-offbar{position:fixed;inset-inline:12px;bottom:96px;z-index:2147482000;margin:0 auto;width:fit-content;max-width:calc(100vw - 24px);padding:9px 14px;border-radius:14px;background:#7a4b00;color:#fff;font:600 13px/1.5 inherit;box-shadow:0 8px 24px rgba(0,0,0,.25)}.ms-offbar[hidden]{display:none}';
      document.head.appendChild(st);
      offlineBar = document.createElement('div'); offlineBar.className = 'ms-offbar'; offlineBar.setAttribute('role', 'status');
      offlineBar.textContent = 'اتصال به سرور برقرار نیست؛ آخرین داده‌های ذخیره‌شده نمایش داده می‌شود و تغییرات ذخیره نمی‌شود.';
      document.body.appendChild(offlineBar);
    }
    offlineBar.hidden = false;
  }
  function setBase(u) {
    u = String(u || '').trim().replace(/\/+$/, '');
    if (u && !/^https?:\/\/[\w.\-]+(:\d+)?$/.test(u)) throw new Error('آدرس باید مثل http://192.168.1.10:8080 باشد.');
    try { if (u) localStorage.setItem(BASE_KEY, u); else localStorage.removeItem(BASE_KEY); } catch (e) { /* ignore */ }
  }

  // the server answers in English; people read Persian
  var FA = [
    [/at least 8 characters/i, 'رمز دست‌کم ۸ نویسه باشد.'],
    [/uppercase and one lowercase/i, 'رمز باید هم حرف بزرگ و هم حرف کوچک انگلیسی داشته باشد.'],
    [/Unauthenticated/i, 'نشست شما تمام شده است؛ دوباره وارد شوید.'],
    [/Email, password or code is wrong/i, 'ایمیل، رمز یا کد درست نیست.'],
    [/Password or code is wrong/i, 'رمز یا کد درست نیست.'],
    [/Code is wrong/i, 'کد درست نیست.'],
    [/Two-factor is required for this role/i, 'برای نقش این حساب ورود دومرحله‌ای الزامی است و نمی‌شود آن را خاموش کرد.'],
    [/At least one active manager/i, 'دست‌کم یک مدیر فعال باید بماند.'],
    [/Nobody removes their own account/i, 'کسی حساب خودش را حذف نمی‌کند.'],
    [/Too Many Attempts|Too many/i, 'تلاش بیش از حد؛ کمی بعد دوباره امتحان کنید.'],
    [/This action is unauthorized|Forbidden/i, 'این کار برای نقش شما مجاز نیست.']
  ];
  function fa(m) { for (var i = 0; i < FA.length; i++) if (FA[i][0].test(m)) return FA[i][1]; return m; }

  function call(method, path, body, anon) {
    var b = base();
    if (!b) return Promise.reject({ status: 0, message: 'آدرس سرور تنظیم نشده است.' });
    var h = { 'Accept': 'application/json' };
    var isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isForm) h['Content-Type'] = 'application/json';
    if (!anon && token()) h['Authorization'] = 'Bearer ' + token();
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, isForm ? 180000 : 15000);
    return fetch(b + '/api/v1/' + path, { method: method, headers: h, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body), signal: ctl.signal, credentials: 'omit' })
      .then(function (r) {
        clearTimeout(t);
        if (r.status === 204) return null;
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) { var m = j.message || 'خطا'; if (j.errors) m = Object.keys(j.errors).map(function (k) { return j.errors[k][0]; }).join(' '); throw { status: r.status, message: fa(m), data: j }; }
          if (cacheable(method, path, anon)) { cachePut(path, j); offlineNote(false); }
          return j;
        });
      }, function () {
        clearTimeout(t);
        var hit = cacheable(method, path, anon) && token() ? cacheGet(path) : null;
        if (hit) { offlineNote(true); return hit.v; }
        throw { status: 0, message: 'ارتباط با سرور برقرار نشد.' };
      });
  }

  function remember(user) {
    // the portal's role gate reads ms-role: write it after a good sign-in and clear it on sign-out
    try { if (user && user.role) localStorage.setItem('ms-role', user.role); else if (localStorage.getItem('ms-show') !== '1') localStorage.removeItem('ms-role'); } catch (e) { /* ignore */ }   // ms-show: local presentation mode (show.html) keeps the role while the server is down
    if (w.MSGate) w.MSGate.apply();
  }

  w.MSApi = {
    enabled: function () { return !!base(); },
    base: base, setBase: setBase, token: token,
    raw: call,
    forget: function () { setToken(''); try { localStorage.removeItem('ms-role'); } catch (e) { /* ignore */ } },
    ping: function () { return call('GET', 'ping'); },
    device: device,
    forgetDevices: function () { return call('POST', 'auth/devices/forget').then(function () { setDevice(''); }); },
    login: function (email, password, code, rememberMe) {
      var d = { email: email, password: password }; if (code) d.code = code; if (device()) d.device = device(); if (rememberMe) d.remember = true;
      return call('POST', 'auth/login', d).then(function (r) { setToken(r.token, !!rememberMe && !r.must_enroll_2fa); if (r.device_token) setDevice(r.device_token); if (r.user) remember(r.user); return r; });
    },
    twoFactorStart: function () { return call('POST', 'auth/2fa/start'); },
    twoFactorConfirm: function (code) { return call('POST', 'auth/2fa/confirm', { code: code }).then(function (r) { setToken(r.token); remember(r.user); return r; }); },
    me: function () { return call('GET', 'me'); },
    logout: function () { return call('POST', 'auth/logout').then(null, function () { /* the token may already be gone */ }).then(function () { setToken(''); remember(null); }); },
    // visitors with no account (no token is sent)
    submitRequest: function (d) { return call('POST', 'public/requests', d, true); },
    track: function (code) { return call('GET', 'public/track/' + encodeURIComponent(code), undefined, true); },
    sendMessage: function (d) { return call('POST', 'public/messages', d, true); },
    publicConfig: function (key) { return call('GET', 'public/config/' + key, undefined, true); },
    signedIn: function () { return !!(base() && token()); },
    pricesState: function () { return call('GET', 'prices/state'); },
    priceLog: function () { return call('GET', 'prices/log?limit=300'); },
    priceCandidates: function () { return call('GET', 'prices/candidates'); },
    putPrice: function (id, d) { return call('PUT', 'prices/' + encodeURIComponent(id), d); },
    batchPrices: function (items) { return call('POST', 'prices/batch', { items: items }); },
    deletePrice: function (id) { return call('DELETE', 'prices/' + encodeURIComponent(id)); },
    putStatus: function (id, d) { return call('PUT', 'item-status/' + encodeURIComponent(id), d); },
    deleteStatus: function (id) { return call('DELETE', 'item-status/' + encodeURIComponent(id)); },
    putSetting: function (key, d) { return call('PUT', 'settings/' + key, d); },
    putConfig: function (key, d) { return call('PUT', 'config/' + key, d); },
    appInfo: function () { return call('GET', 'app/android/info'); },
    appUpload: function (fd) { return call('POST', 'portal/app', fd); },
    fetchBlob: function (path) {
      var b = base(); if (!b || !token()) return Promise.reject({ status: 401, message: 'وارد حساب شوید.' });
      return fetch(b + '/api/v1/' + path, { headers: { 'Authorization': 'Bearer ' + token(), 'Accept': '*/*' }, credentials: 'omit' }).then(function (r) { if (!r.ok) throw { status: r.status, message: 'فایل باز نشد.' }; return r.blob(); });
    },
    // a file that only signed-in people may fetch: it is read with the session token and saved from memory
    download: function (path, name) {
      var b = base(); if (!b || !token()) return Promise.reject({ status: 401, message: 'برای دانلود باید وارد حساب شوید.' });
      return fetch(b + '/api/v1/' + path, { headers: { 'Authorization': 'Bearer ' + token(), 'Accept': '*/*' }, credentials: 'omit' }).then(function (r) {
        if (!r.ok) throw { status: r.status, message: r.status === 404 ? 'فایل هنوز روی سرور نیست.' : 'دانلود انجام نشد.' };
        return r.blob();
      }).then(function (blob) {
        var u = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
      });
    },
    portal: function () { return call('GET', 'portal'); },
    portalUpdate: function (fd) { return call('POST', 'portal/update', fd); },
    portalRollback: function (d) { return call('POST', 'portal/rollback', d); },
    twoFactorBegin: function () { return call('POST', 'auth/2fa/begin'); },
    twoFactorVerify: function (code) { return call('POST', 'auth/2fa/verify', { code: code }); },
    twoFactorDisable: function (d) { return call('POST', 'auth/2fa/disable', d); },
    users: function () { return call('GET', 'users'); },
    setUserPassword: function (id, pw) { return call('PUT', 'users/' + id + '/password', { password: pw }); },
    deleteUser: function (id) { return call('DELETE', 'udocs/' + id); },
    createUser: function (d) { return call('POST', 'users', d); },
    updateUser: function (id, d) { return call('PATCH', 'users/' + id, d); }
  };

  // Pages that show prices (catalog, planner, assistant): when staff are signed in on the Max Silver server, apply its edited prices,
  // cheque percentages and retired codes on top of the price list file, the same way sync.js does for Firebase.
  function applyPrices() {
    if (!w.MSApi.signedIn() || !w.MSPrices) return;
    w.MSApi.pricesState().then(function (st) {
      var m = {}, sm = {};
      Object.keys(st.list_prices).forEach(function (id) { var d = st.list_prices[id]; m[id] = { p: d.p || 0, s: d.s || 'p', c: d.c || 0, at: d.at || 0, by: d.byName || '' }; });
      w.MSPrices.setEdits(m);
      if (st.cheque_markup && w.MSPrices.setMarkup) w.MSPrices.setMarkup(st.cheque_markup);
      if (w.MSStatus) { Object.keys(st.item_status).forEach(function (id) { var d = st.item_status[id]; sm[id] = { rep: d.rep || '', note: d.note || '', at: d.at || 0, by: d.byName || '' }; }); w.MSStatus.setAll(sm); }
    }, function () { /* offline or signed out: the last prices read stay */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPrices); else setTimeout(applyPrices, 0);
})(window);

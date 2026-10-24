(function (w) {
  'use strict';
  // Data adapter for the Laravel backend (/api/v1). Off by default: the portal keeps using Firebase until a base address is saved.
  // The address is chosen on backend.html and kept only in this browser. No secret is ever stored here: the token is a short-lived session token.
  var BASE_KEY = 'ms-api-base', TOKEN_KEY = 'ms-api-token';

  function base() { var u = ''; try { u = localStorage.getItem(BASE_KEY) || ''; } catch (e) { /* ignore */ } return (u || w.MS_API_BASE || '').replace(/\/+$/, ''); }
  function token() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) sessionStorage.setItem(TOKEN_KEY, t); else sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } }
  function setBase(u) {
    u = String(u || '').trim().replace(/\/+$/, '');
    if (u && !/^https?:\/\/[\w.\-]+(:\d+)?$/.test(u)) throw new Error('آدرس باید مثل http://192.168.1.10:8080 باشد.');
    try { if (u) localStorage.setItem(BASE_KEY, u); else localStorage.removeItem(BASE_KEY); } catch (e) { /* ignore */ }
  }

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
          if (!r.ok) { var m = j.message || 'خطا'; if (j.errors) m = Object.keys(j.errors).map(function (k) { return j.errors[k][0]; }).join(' '); throw { status: r.status, message: m, data: j }; }
          return j;
        });
      }, function () { clearTimeout(t); throw { status: 0, message: 'ارتباط با سرور برقرار نشد.' }; });
  }

  function remember(user) {
    // the portal's role gate reads ms-role: write it after a good sign-in and clear it on sign-out
    try { if (user && user.role) localStorage.setItem('ms-role', user.role); else localStorage.removeItem('ms-role'); } catch (e) { /* ignore */ }
    if (w.MSGate) w.MSGate.apply();
  }

  w.MSApi = {
    enabled: function () { return !!base(); },
    base: base, setBase: setBase, token: token,
    raw: call,
    forget: function () { setToken(''); try { localStorage.removeItem('ms-role'); } catch (e) { /* ignore */ } },
    ping: function () { return call('GET', 'ping'); },
    login: function (email, password, code) {
      var d = { email: email, password: password }; if (code) d.code = code;
      return call('POST', 'auth/login', d).then(function (r) { setToken(r.token); if (r.user) remember(r.user); return r; });
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
    portal: function () { return call('GET', 'portal'); },
    portalUpdate: function (fd) { return call('POST', 'portal/update', fd); },
    portalRollback: function (d) { return call('POST', 'portal/rollback', d); },
    users: function () { return call('GET', 'users'); },
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

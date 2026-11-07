// Web push for this device: «wake me when a notice arrives». The wake-up carries no text (the server only taps the phone);
// the service worker shows a fixed line and opens the portal, and the details are read after signing in.
(function () {
  'use strict';
  var w = window, api = w.MSApi;
  var ok = !!(w.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in w && 'Notification' in w);
  function b64(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), o = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
  function reg() { return navigator.serviceWorker.ready; }
  function device() { var u = navigator.userAgent || '', m = /Android|iPhone|iPad|Windows|Mac OS|Linux/.exec(u); return (m ? m[0] : 'device') + ' / ' + (/Edg|Chrome|Firefox|Safari/.exec(u) || ['browser'])[0]; }

  // 'unsupported' | 'blocked' | 'off' | 'on'
  function state() {
    if (!ok || !api || !api.enabled || !api.enabled()) return Promise.resolve('unsupported');
    if (Notification.permission === 'denied') return Promise.resolve('blocked');
    return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (s) { return s ? 'on' : 'off'; }, function () { return 'unsupported'; });
  }
  function enable() {
    if (!ok) return Promise.reject(new Error('این مرورگر اعلان پس‌زمینه را پشتیبانی نمی‌کند.'));
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') throw new Error('اجازهٔ اعلان داده نشد.');
      return Promise.all([reg(), api.raw('GET', 'push/key')]);
    }).then(function (x) {
      return x[0].pushManager.getSubscription().then(function (s) { return s || x[0].pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(x[1].key) }); });
    }).then(function (s) { return api.raw('POST', 'push/subscribe', { endpoint: s.endpoint, device: device() }); }).then(function () { return 'on'; });
  }
  function disable() {
    if (!ok) return Promise.resolve('unsupported');
    return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (s) {
      if (!s) return 'off';
      var ep = s.endpoint;
      return s.unsubscribe().then(function () { return api.raw('POST', 'push/unsubscribe', { endpoint: ep }).catch(function () { return null; }); }).then(function () { return 'off'; });
    });
  }
  // a signed-in person who already allowed it: make sure the server still knows this device (the browser may have rotated it)
  function refresh() {
    if (!ok || !api || !api.signedIn || !api.signedIn() || Notification.permission !== 'granted') return;
    reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (s) { if (s) api.raw('POST', 'push/subscribe', { endpoint: s.endpoint, device: device() }).catch(function () { /* later */ }); }, function () { /* ignore */ });
  }
  w.MSPush = { supported: ok, state: state, enable: enable, disable: disable };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(refresh, 3000); }); else setTimeout(refresh, 3000);
})();

(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var base = new URL('./', location.href);
  navigator.serviceWorker.register(new URL('service-worker.js', base), { scope: base.pathname }).catch(function () {});
})();
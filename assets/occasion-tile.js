(function () {
  'use strict';
  // One home tile that shows the occasion that is close right now (from MSEvents.active, the same engine as the calendar and the banner).
  // Who sees it is decided by role-gate.js (data-manager-only="occasions"); this script only fills it and unhides it when an occasion is near.
  var ICON = {
    yalda: 'event-yalda', nowruz: 'event-nowruz', chaharshanbe: 'event-chaharshanbe', mother: 'event-mother-father', father: 'event-mother-father',
    valentine: 'event-valentine', esfandgan: 'event-valentine', christmas: 'event-christmas-newyear', newyear: 'event-christmas-newyear',
    chef: 'event-chef-day', tree: 'event-earth-day', fitr: 'event-eid-fitr', coffee: 'event-coffee-day', tea: 'event-tea-day', women: 'event-women-day', halloween: 'event-halloween'
  };
  function run() {
    var a = document.getElementById('occTile');
    if (!a || !window.MSEvents) return;
    var x;
    try { x = window.MSEvents.active(); } catch (e) { x = null; }
    if (!x) return;
    var img = a.querySelector('img');
    if (img) img.src = './assets/art/tiles/' + (ICON[x.id] || 'event-generic') + '.webp';
    a.setAttribute('href', x.id === 'halloween' ? './blog-halloween.html' : './events.html');
    a.setAttribute('title', x.title + '؛ ' + x.when + ' · ایدهٔ پست و پیام تبریک در تقویم مناسبت‌ها');
    var h = a.querySelector('h2');
    if (h) h.textContent = x.title;
    a.hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();

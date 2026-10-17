// Morphing highlight: the "selected" look of a group of buttons is one pill that slides and stretches to the next choice, instead of
// jumping. The pages redraw their HTML on every change, so the box of the old choice is measured first (snapAll), the page is redrawn,
// and the new pill starts at the old box and travels to the new one (playAll). Used by the dock, the request filters and the planner.
(function (w) {
  'use strict';
  var MS = 300, EASE = 'cubic-bezier(.4,0,.2,1)', pills = [];
  function calm() { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function keyOf(g, i) { return g.getAttribute('aria-label') || g.getAttribute('data-morph') || String(i); }
  function box(el) { return { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }; }
  function put(pill, b) { pill.style.left = b.l + 'px'; pill.style.top = b.t + 'px'; pill.style.width = b.w + 'px'; pill.style.height = b.h + 'px'; }
  function groups(scope, sel) { return Array.prototype.slice.call(scope.querySelectorAll(sel)); }

  // [{ key, idx, box }] for every group, taken before the page is redrawn; idx is -1 when nothing is selected
  function snapAll(scope, groupSel, itemSel, activeSel) {
    return groups(scope, groupSel).map(function (g, i) {
      var items = Array.prototype.slice.call(g.querySelectorAll(itemSel)), a = g.querySelector(activeSel), idx = a ? items.indexOf(a) : -1;
      return { key: keyOf(g, i), idx: idx, box: a ? box(a) : null };
    });
  }
  // after the redraw: one pill per group behind the selected item; if the selection moved, the pill travels from where it was
  function playAll(scope, groupSel, itemSel, activeSel, prev, o) {
    o = o || {};
    var cls = o.cls || 'ms-pill', ms = o.ms || MS;
    prev = prev || [];
    groups(scope, groupSel).forEach(function (g, i) {
      Array.prototype.forEach.call(g.querySelectorAll(':scope > .ms-pill'), function (p) { p.remove(); });
      var items = Array.prototype.slice.call(g.querySelectorAll(itemSel)), a = g.querySelector(activeSel);
      if (!a) { g.classList.remove('has-pill'); return; }
      if (w.getComputedStyle(g).position === 'static') g.style.position = 'relative';
      var pill = document.createElement('i'); pill.className = 'ms-pill ' + cls; pill.setAttribute('aria-hidden', 'true');
      g.insertBefore(pill, g.firstChild); g.classList.add('has-pill');
      var cs = w.getComputedStyle(a); if (o.copyRadius) pill.style.borderRadius = cs.borderRadius;
      var to = box(a), key = keyOf(g, i), was = prev.filter(function (p) { return p.key === key; })[0];
      pill._g = g; pill._a = a;
      pills.push(pill);
      if (!was || !was.box || was.idx === items.indexOf(a) || calm()) { put(pill, to); return; }
      put(pill, was.box); void g.offsetWidth;
      pill.style.transition = ['left', 'top', 'width', 'height'].map(function (k) { return k + ' ' + ms + 'ms ' + EASE; }).join(',');
      put(pill, to);
      setTimeout(function () { pill.style.transition = 'none'; if (pill._a.isConnected) put(pill, box(pill._a)); }, ms + 40);
    });
  }
  w.addEventListener('resize', function () {
    pills = pills.filter(function (p) { return p.isConnected; });
    pills.forEach(function (p) { if (p._a.isConnected) { p.style.transition = 'none'; put(p, box(p._a)); } });
  });
  w.MSMorph = { snapAll: snapAll, playAll: playAll, MS: MS };
})(window);

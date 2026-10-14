// Advertising tree: tabs (tree / original map), branch picker and a search that keeps the path to every match.
(function () {
  'use strict';
  var root = document.getElementById('ad');
  if (!root) return;
  var tree = document.getElementById('viewTree'), map = document.getElementById('viewMap');
  var q = document.getElementById('adQ'), empty = document.getElementById('adEmpty');
  var pick = 'all';
  function norm(s) { return String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); }

  function paint() {
    var s = norm(q && q.value), any = false;
    var branches = root.querySelectorAll('.t-kids#adTree > .t');
    Array.prototype.forEach.call(branches, function (b) {
      var inPick = pick === 'all' || b.getAttribute('data-branch') === pick;
      var shown = inPick && mark(b, s);
      b.hidden = !shown;
      if (shown) any = true;
    });
    if (empty) empty.hidden = any;
  }
  // true when this item (or something under it) should be visible; matches are highlighted
  function mark(li, s) {
    var node = li.children[0], kids = li.children[1];
    var self = !!s && norm(node.querySelector('.t-t').textContent).indexOf(s) >= 0;
    node.classList.toggle('hit', self);
    var childShown = false;
    if (kids) Array.prototype.forEach.call(kids.children, function (c) {
      var ok = mark(c, s);
      c.hidden = !!s && !ok && !self;
      if (ok) childShown = true;
    });
    return !s || self || childShown;
  }

  root.addEventListener('click', function (e) {
    var v = e.target.closest('[data-view]');
    if (v) {
      var showMap = v.getAttribute('data-view') === 'map';
      tree.hidden = showMap; map.hidden = !showMap;
      Array.prototype.forEach.call(root.querySelectorAll('[data-view]'), function (b) { b.setAttribute('aria-selected', String(b === v)); });
      return;
    }
    var p = e.target.closest('[data-pick]');
    if (p) {
      pick = p.getAttribute('data-pick');
      Array.prototype.forEach.call(root.querySelectorAll('[data-pick]'), function (b) { b.setAttribute('aria-pressed', String(b === p)); });
      paint();
    }
  });
  if (q) q.addEventListener('input', paint);

  // Wide screens: connectors are drawn from the real positions of the nodes, so a line can never be broken or misaligned.
  var wrap = root.querySelector('.ad-treewrap'), NS = 'http://www.w3.org/2000/svg', wires = null, mq = window.matchMedia('(min-width:900px)');
  function wire() {
    if (!wrap) return;
    if (wires && wires.parentNode) wires.parentNode.removeChild(wires);
    wires = null;
    if (!mq.matches || tree.hidden) return;
    var box = wrap.getBoundingClientRect(), sl = wrap.scrollLeft, st = wrap.scrollTop, R = 14, GAP = 18;
    wires = document.createElementNS(NS, 'svg');
    wires.setAttribute('class', 'ad-wires');
    wires.setAttribute('width', wrap.scrollWidth); wires.setAttribute('height', wrap.scrollHeight);
    var byColor = {};
    function rect(el) { var r = el.getBoundingClientRect(); return { l: r.left - box.left + sl, r: r.right - box.left + sl, y: r.top + r.height / 2 - box.top + st }; }
    Array.prototype.forEach.call(wrap.querySelectorAll('li.t'), function (li) {
      var node = li.children[0], kids = li.children[1];
      if (!kids || kids.tagName !== 'UL' || li.hidden || li.classList.contains('t-rootli') || node.classList.contains('meta')) return;
      var br = li.closest('[data-branch]'), col = br ? getComputedStyle(br).getPropertyValue('--tc').trim() : '#cfd8e6';
      var p = rect(node), d = byColor[col] || (byColor[col] = []);
      var shown = Array.prototype.filter.call(kids.children, function (k) { return !k.hidden && k.children[0]; });
      shown.forEach(function (k) {
        var c = rect(k.children[0]), mid = p.l - GAP, dy = c.y - p.y;
        if (Math.abs(dy) < 1) { d.push('M' + p.l + ' ' + p.y + 'H' + c.r); return; }
        var s = dy > 0 ? 1 : -1, rr = Math.min(R, Math.abs(dy) / 2);
        d.push('M' + p.l + ' ' + p.y + 'H' + mid + 'V' + (c.y - s * rr) + 'Q' + mid + ' ' + c.y + ' ' + (mid - rr) + ' ' + c.y + 'H' + c.r);
      });
    });
    Object.keys(byColor).forEach(function (col) {
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', byColor[col].join(''));
      path.setAttribute('stroke', col || '#cfd8e6');
      wires.appendChild(path);
    });
    wrap.appendChild(wires);
  }
  var queued = 0;
  function schedule() { cancelAnimationFrame(queued); queued = requestAnimationFrame(wire); }
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if ('ResizeObserver' in window && wrap) new ResizeObserver(schedule).observe(wrap.firstElementChild);
  root.addEventListener('click', function () { setTimeout(schedule, 0); });
  if (q) q.addEventListener('input', schedule);
  schedule();
})();

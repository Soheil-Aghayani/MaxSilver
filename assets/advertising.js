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
})();

// Advertising tree: tabs (tree / original map), expand-collapse all, and a search that opens only the branches that match.
(function () {
  'use strict';
  var root = document.getElementById('ad');
  if (!root) return;
  var tree = document.getElementById('viewTree'), map = document.getElementById('viewMap');
  function norm(s) { return String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); }

  root.addEventListener('click', function (e) {
    var v = e.target.closest('[data-view]');
    if (v) {
      var showMap = v.getAttribute('data-view') === 'map';
      tree.hidden = showMap; map.hidden = !showMap;
      Array.prototype.forEach.call(root.querySelectorAll('[data-view]'), function (b) { b.setAttribute('aria-selected', String(b === v)); });
      return;
    }
    var x = e.target.closest('[data-expand]');
    if (x) {
      var open = x.getAttribute('data-expand') === 'open';
      Array.prototype.forEach.call(root.querySelectorAll('details.ad-d'), function (d) { d.open = open; });
    }
  });

  var q = document.getElementById('adQ'), empty = document.getElementById('adEmpty');
  if (q) q.addEventListener('input', function () {
    var s = norm(q.value), any = false;
    var leaves = root.querySelectorAll('.ad-leaf');
    Array.prototype.forEach.call(leaves, function (li) {
      var hit = !!s && norm(li.getAttribute('data-q')).indexOf(s) >= 0;
      li.classList.toggle('hit', hit);
      li.hidden = !!s && !hit;
      if (hit) any = true;
    });
    // groups and branches with nothing to show are hidden; the ones with a match are opened
    Array.prototype.forEach.call(root.querySelectorAll('.ad-group, .ad-branch, .ad-marketing'), function (g) {
      var has = !!g.querySelector('.ad-leaf:not([hidden])');
      g.hidden = !!s && !has;
      if (s && has) Array.prototype.forEach.call(g.querySelectorAll('details'), function (d) { d.open = true; });
    });
    if (empty) empty.hidden = !s || any;
  });
})();

(function () {
  'use strict';
  var card = document.querySelector('.flow-card');
  var svg = card && card.querySelector('.flow-line');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var STROKE = 6;
  var PAD = 14;          // distance of the vertical runs from the card edge
  var MAX_RADIUS = 70;

  function color() {
    return getComputedStyle(document.documentElement).getPropertyValue('--ms-navy').trim() || '#071b36';
  }
  function centers(row) {
    var box = card.getBoundingClientRect();
    return Array.prototype.map.call(row.querySelectorAll('.node'), function (node) {
      var r = node.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    });
  }
  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    return node;
  }
  function arrow(x, y, pointsLeft, fill) {
    var a = pointsLeft ? [x - 5, y, x + 5, y - 7, x + 5, y + 7] : [x + 5, y, x - 5, y - 7, x - 5, y + 7];
    return el('polygon', { points: a.join(' '), fill: fill });
  }

  // One continuous path for the whole snake, so there are no joins or gaps to misalign.
  function draw() {
    svg.replaceChildren();
    if (window.matchMedia('(max-width: 980px)').matches) return;
    var rows = Array.prototype.map.call(card.querySelectorAll('.row'), centers);
    if (rows.length < 3 || rows.some(function (r) { return r.length < 2; })) return;
    var width = card.clientWidth, fill = color();
    var y1 = rows[0][0].y, y2 = rows[1][0].y, y3 = rows[2][0].y;
    var left = PAD, right = width - PAD;
    var r = Math.max(8, Math.min(MAX_RADIUS, (y2 - y1) / 2, (y3 - y2) / 2));
    var d = ['M', right, y1, 'H', left + r, 'A', r, r, 0, 0, 0, left, y1 + r, 'V', y2 - r, 'A', r, r, 0, 0, 0, left + r, y2,
      'H', right - r, 'A', r, r, 0, 0, 1, right, y2 + r, 'V', y3 - r, 'A', r, r, 0, 0, 1, right - r, y3, 'H', left].join(' ');
    svg.appendChild(el('path', { d: d, fill: 'none', stroke: fill, 'stroke-width': STROKE, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    // direction arrows halfway between neighbouring nodes; row 2 runs left to right
    rows.forEach(function (row, index) {
      for (var i = 0; i < row.length - 1; i++) {
        svg.appendChild(arrow((row[i].x + row[i + 1].x) / 2, row[i].y, index !== 1, fill));
      }
    });
  }

  var queued = 0;
  function schedule() { cancelAnimationFrame(queued); queued = requestAnimationFrame(draw); }
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(card);
  // Print / PDF: freeze the current layout width (so the drawn line stays aligned) and fit it to the page.
  var printBtn = document.getElementById('printMap');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });
  window.addEventListener('beforeprint', function () {
    if (window.matchMedia('(max-width: 980px)').matches) return;
    var width = card.getBoundingClientRect().width;
    card.style.width = width + 'px';
    card.style.zoom = String(Math.min(1, 1400 / width));
    draw();
  });
  window.addEventListener('afterprint', function () { card.style.width = ''; card.style.zoom = ''; schedule(); });
  schedule();
})();
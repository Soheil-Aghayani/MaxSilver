(function () {
  'use strict';
  var isSheet = /[?&]print=1/.test(location.search);   // the same page, rendered at a fixed print width inside a hidden frame
  if (isSheet) document.documentElement.classList.add('print-sheet');
  var card = document.querySelector('.flow-card');
  var svg = card && card.querySelector('.flow-line');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var STROKE = 6, PAD = 14, MAX_RADIUS = 70;
  var PAGE_W = 1480, PAGE_H = 1010;   // A3 landscape minus margins, in CSS pixels

  function color() { return getComputedStyle(document.documentElement).getPropertyValue('--ms-navy').trim() || '#071b36'; }
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
  // The print layout must equal the screen layout (the line is drawn in screen pixels), so the width and the
  // fit-to-one-page zoom are published as CSS variables that the @media print rules read.
  function publishPrintFit() {
    var root = document.documentElement.style, portal = document.querySelector('.portal');
    if (!portal || window.matchMedia('(max-width: 980px)').matches) { root.removeProperty('--flow-w'); root.removeProperty('--print-zoom'); return; }
    var w = card.getBoundingClientRect().width, h = portal.getBoundingClientRect().height;
    root.setProperty('--flow-w', Math.round(w) + 'px');
    root.setProperty('--print-zoom', Math.min(1, PAGE_W / w, PAGE_H / h).toFixed(4));
  }
  // One continuous path for the whole snake, so there are no joins or gaps to misalign.
  function draw() {
    svg.replaceChildren();
    publishPrintFit();
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
    rows.forEach(function (row, index) {
      for (var i = 0; i < row.length - 1; i++) svg.appendChild(arrow((row[i].x + row[i + 1].x) / 2, row[i].y, index !== 1, fill));
    });
  }

  var queued = 0;
  function schedule() { cancelAnimationFrame(queued); queued = requestAnimationFrame(draw); }
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule);
  if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(card);
  var printBtn = document.getElementById('printMap');
  // Printing happens from a hidden frame with a fixed, wide layout, so the result is the same on every screen
  // and always fits on one A3 page.
  function printSheet() {
    var frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-99999px;top:0;width:1500px;height:1100px;border:0;visibility:hidden';
    frame.src = location.pathname + '?print=1';
    frame.onload = function () {
      var w = frame.contentWindow;
      var go = function () { setTimeout(function () { try { w.focus(); w.print(); } catch (e) { window.print(); } }, 350); };
      if (w.document.fonts && w.document.fonts.ready) w.document.fonts.ready.then(go); else go();
    };
    document.body.appendChild(frame);
    setTimeout(function () { if (frame.parentNode) frame.parentNode.removeChild(frame); }, 120000);
  }
  if (printBtn) printBtn.addEventListener('click', printSheet);
  schedule();
})();
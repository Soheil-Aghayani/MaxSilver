(function () {
  'use strict';
  // Jalali (Persian) calendar helpers and a tap-to-pick date sheet. Dates travel as 'YYYY/MM/DD' strings with Latin digits
  // internally; inputs show Persian digits. Conversion follows the arithmetic Jalali algorithm (valid for 1 .. 3177).
  var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var WEEK = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']; // Saturday first

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  function jalCal(jy, withoutLeap) {
    var bl = BREAKS.length, gy = jy + 621, leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap, leapG, march, n, i;
    if (jy < jp || jy >= BREAKS[bl - 1]) throw new Error('Invalid Jalali year ' + jy);
    for (i = 1; i < bl; i += 1) {
      jm = BREAKS[i]; jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (withoutLeap) return { gy: gy, march: march };
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }
  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  }
  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1, gm = mod(div(i, 153), 12) + 1, gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }
  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }
  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy, false), jdn1f = g2d(gy, 3, r.march), k = jdn - jdn1f, jm, jd;
    if (k >= 0) {
      if (k <= 185) { return { jy: jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }; }
      k -= 186;
    } else {
      jy -= 1; k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30); jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }
  function isLeap(jy) { return jalCal(jy, false).leap === 0; }
  function monthLength(jy, jm) { return jm <= 6 ? 31 : jm <= 11 ? 30 : (isLeap(jy) ? 30 : 29); }

  // ----- string helpers
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function latin(s) {
    return String(s == null ? '' : s).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; });
  }
  function persian(s) { return String(s).replace(/[0-9]/g, function (d) { return FA[Number(d)]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(j) { return j.jy + '/' + pad(j.jm) + '/' + pad(j.jd); }
  function parse(str) {
    var m = /^(\d{3,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/.exec(latin(str).trim());
    if (!m) return null;
    var jy = +m[1], jm = +m[2], jd = +m[3];
    if (jm < 1 || jm > 12 || jd < 1 || jy < 1 || jy > 3000 || jd > monthLength(jy, jm)) return null;
    return { jy: jy, jm: jm, jd: jd };
  }
  function fromDate(date) { return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate())); }
  function toDate(j) { var g = d2g(j2d(j.jy, j.jm, j.jd)); return new Date(g.gy, g.gm - 1, g.gd); }
  function today() { return fmt(fromDate(new Date())); }
  function addDays(str, n) {
    var j = parse(str) || parse(today());
    return fmt(d2j(j2d(j.jy, j.jm, j.jd) + n));
  }
  function toISO(str) {
    var j = parse(str);
    if (!j) return '';
    var g = d2g(j2d(j.jy, j.jm, j.jd));
    return g.gy + '-' + pad(g.gm) + '-' + pad(g.gd);
  }
  function fromISO(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? fmt(d2j(g2d(+m[1], +m[2], +m[3]))) : '';
  }
  function weekdayIndex(j) { return mod(j2d(j.jy, j.jm, 1) + 2, 7); } // 0 = Saturday

  // ----- picker sheet
  var dlg = null, state = null;
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'jd-dialog';
    dlg.setAttribute('aria-label', 'انتخاب تاریخ');
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { dlg.close(); return; }
      var b = e.target.closest('[data-jd]');
      if (!b) return;
      var a = b.getAttribute('data-jd');
      if (a === 'close') dlg.close();
      else if (a === 'today') { var t = parse(today()); choose(t); }
      else if (a === 'day') choose({ jy: state.view.jy, jm: state.view.jm, jd: Number(b.getAttribute('data-d')) });
      else {
        var v = state.view, step = { py: [-12, 0], pm: [-1, 0], nm: [1, 0], ny: [12, 0] }[a];
        if (!step) return;
        var idx = v.jy * 12 + (v.jm - 1) + step[0];
        state.view = { jy: div(idx, 12), jm: mod(idx, 12) + 1 };
        draw();
      }
    });
    document.body.appendChild(dlg);
  }
  function choose(j) {
    var cb = state.cb;
    dlg.close();
    cb(fmt(j));
  }
  function draw() {
    var v = state.view, first = weekdayIndex({ jy: v.jy, jm: v.jm }), len = monthLength(v.jy, v.jm), t = parse(today()), sel = state.sel;
    var cells = '';
    for (var i = 0; i < first; i++) cells += '<span></span>';
    for (var d = 1; d <= len; d++) {
      var isSel = sel && sel.jy === v.jy && sel.jm === v.jm && sel.jd === d;
      var isToday = t.jy === v.jy && t.jm === v.jm && t.jd === d;
      var fri = (first + d - 1) % 7 === 6;
      cells += '<button type="button" data-jd="day" data-d="' + d + '" class="jd-day' + (isSel ? ' sel' : '') + (isToday ? ' today' : '') + (fri ? ' fri' : '') + '"' +
        (isSel ? ' aria-pressed="true"' : '') + '>' + persian(d) + '</button>';
    }
    dlg.innerHTML =
      '<div class="jd-head"><button type="button" data-jd="py" aria-label="سال قبل">«</button><button type="button" data-jd="pm" aria-label="ماه قبل">‹</button>' +
      '<b>' + MONTHS[v.jm - 1] + ' ' + persian(v.jy) + '</b>' +
      '<button type="button" data-jd="nm" aria-label="ماه بعد">›</button><button type="button" data-jd="ny" aria-label="سال بعد">»</button></div>' +
      '<div class="jd-week">' + WEEK.map(function (w, k) { return '<span' + (k === 6 ? ' class="fri"' : '') + '>' + w + '</span>'; }).join('') + '</div>' +
      '<div class="jd-grid">' + cells + '</div>' +
      '<div class="jd-foot"><button type="button" data-jd="today">امروز</button><button type="button" data-jd="close" class="ghost">بستن</button></div>';
  }
  // pick(current, callback): opens the sheet on `current` (or today) and calls back with 'YYYY/MM/DD'.
  function pick(current, cb) {
    if (!dlg) build();
    var cur = parse(current), base = cur || parse(today());
    state = { cb: cb, sel: cur, view: { jy: base.jy, jm: base.jm } };
    draw();
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
  }

  // inputs marked data-jdate open the sheet on tap and always show Persian digits; typing is not needed
  document.addEventListener('click', function (e) {
    var input = e.target.closest('input[data-jdate]');
    if (!input) return;
    e.preventDefault();
    pick(input.value, function (str) {
      input.value = persian(str);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('input[data-jdate]')) { e.preventDefault(); e.target.click(); }
  });

  window.MSJDate = {
    today: today, addDays: addDays, parse: parse, toISO: toISO, fromISO: fromISO, fromDate: fromDate, toDate: toDate,
    format: fmt, persian: persian, latin: latin, pick: pick, monthLength: monthLength, isLeap: isLeap
  };
})();

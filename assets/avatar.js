// Profile faces: the «beam» avatar of Boring Avatars (MIT licence; drawn here, nothing is loaded from the internet), with rounded corners.
// MSAvatar.beam(key) returns an SVG string that is always the same for the same key.
(function () {
  'use strict';
  var COL = ['#ffcc2a', '#071b36', '#3858e9', '#ce1f39', '#0d9488', '#7f54b3', '#ff6a00', '#0891b2'], MEMO = {};
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; } return Math.abs(h); }
  function unit(n, range, idx) { var v = n % range; return idx && (Math.floor(n / Math.pow(10, idx)) % 10) % 2 === 0 ? -v : v; }
  function ink(c) { var r = parseInt(c.substr(1, 2), 16), g = parseInt(c.substr(3, 2), 16), b = parseInt(c.substr(5, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) >= 128 ? '#071b36' : '#ffffff'; }
  function beam(key) {
    key = String(key || ''); if (MEMO[key]) return MEMO[key];
    var n = hash(key), L = COL.length, SZ = 36, wrap = COL[n % L], bg = COL[(n + 13) % L]; if (bg === wrap) bg = COL[(n + 14) % L];
    var tx = unit(n, 10, 1), ty = unit(n, 10, 2); tx = tx < 5 ? tx + SZ / 9 : tx; ty = ty < 5 ? ty + SZ / 9 : ty;
    var rot = unit(n, 360), sc = 1 + unit(n, SZ / 12) / 10, open = n % 2 === 0, round = (Math.floor(n / 10) % 2) === 0;
    var eye = unit(n, 5), mouth = unit(n, 3), frot = unit(n, 10, 3), k = ink(wrap);
    var ftx = tx > SZ / 6 ? tx / 2 : unit(n, 8, 1), fty = ty > SZ / 6 ? ty / 2 : unit(n, 7, 2);
    return MEMO[key] = '<svg viewBox="0 0 36 36" fill="none" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect width="36" height="36" rx="10" fill="' + bg + '"/>' +
      '<rect x="0" y="0" width="36" height="36" transform="translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ') rotate(' + rot + ' 18 18) scale(' + sc.toFixed(2) + ')" fill="' + wrap + '" rx="' + (round ? 36 : 6) + '"/>' +
      '<g transform="translate(' + ftx.toFixed(2) + ' ' + fty.toFixed(2) + ') rotate(' + frot + ' 18 18)">' +
      (open ? '<path d="M15 ' + (19 + mouth) + 'c2 1 4 1 6 0" stroke="' + k + '" fill="none" stroke-linecap="round"/>' : '<path d="M13 ' + (21 + mouth) + 'a1 0.75 0 0 0 10 0Z" fill="' + k + '"/>') +
      '<rect x="' + (14 - eye) + '" y="14" width="1.5" height="2" rx="1" fill="' + k + '"/><rect x="' + (20 + eye) + '" y="14" width="1.5" height="2" rx="1" fill="' + k + '"/></g></svg>';
  }
  window.MSAvatar = { beam: beam };
})();

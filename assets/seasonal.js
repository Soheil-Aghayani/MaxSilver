(function () {
  'use strict';
  // elements with data-season="MM-DD:MM-DD" are shown only inside that window of the year (device date)
  var n = new Date(), k = (n.getMonth() + 1) * 100 + n.getDate();
  Array.prototype.forEach.call(document.querySelectorAll('[data-season]'), function (el) {
    var p = String(el.getAttribute('data-season')).split(':');
    var a = p[0].split('-'), z = (p[1] || p[0]).split('-'), from = +a[0] * 100 + +a[1], to = +z[0] * 100 + +z[1];
    if (k >= from && k <= to) el.hidden = false;
  });
})();

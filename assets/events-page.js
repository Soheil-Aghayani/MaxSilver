// events.html: the occasions of the next twelve months, grouped by Jalali month, with a filter and a countdown.
(function () {
  'use strict';
  var E = window.MSEvents, root = document.getElementById('ev');
  if (!E || !root) return;
  var FILTERS = [['all', 'همه'], ['imp', 'مهم‌ها'], ['ایرانی', 'ایرانی'], ['مذهبی', 'مذهبی'], ['جهانی', 'جهانی'], ['آشپزی', 'آشپزی']];
  var f = 'all', SEP = '<i class="ms-sep" aria-hidden="true"></i>';
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function eventPicture(id, eager) {
    var safeId = esc(id);
    var load = eager ? ' fetchpriority="high"' : ' loading="lazy"';
    return '<picture class="ev-picture" aria-hidden="true">' +
      '<source media="(max-width:620px)" srcset="./assets/art/events/' + safeId + '-mobile.webp">' +
      '<source media="(max-width:1024px)" srcset="./assets/art/events/' + safeId + '-tablet.webp">' +
      '<img src="./assets/art/events/' + safeId + '-pc.webp" alt="" decoding="async"' + load + '></picture>';
  }
  function row(x) {
    return '<li class="ev-row" data-tone="' + x.tone + '"><div class="ev-ic" aria-hidden="true"><img src="./assets/art/events/icons/' + esc(x.id) + '.webp" alt="" width="52" height="52" loading="lazy" decoding="async"></div><div class="ev-main"><div class="ev-t"><b>' + esc(x.title) + '</b>' +
      (x.important ? '<span class="ev-imp">مهم</span>' : '') + '<span class="ev-g">' + esc(x.group) + '</span></div>' +
      '<div class="ev-d">' + x.weekday + ' ' + x.jalali + ' ' + E.fa(x.jy) + SEP + x.gregorian + (x.approx ? SEP + '<em class="ev-ap" title="تاریخ با ماه قمری محاسبه شده؛ پس از انتشار تقویم رسمی تأیید می‌شود">تقریبی</em>' : '') + '</div>' +
      (x.idea ? '<p class="ev-idea">' + esc(x.idea) + '</p>' : '') + '</div><span class="ev-left' + (x.days <= 7 ? ' soon' : '') + '">' + x.when + '</span></li>';
  }
  function render() {
    var all = E.upcoming(365), list = all.filter(function (x) { return f === 'all' ? true : f === 'imp' ? x.important : x.group === f; });
    var next = all.filter(function (x) { return x.important; })[0] || all[0];
    var h = '<h1>مناسبت‌ها</h1><p class="ev-lead">مناسبت‌های ایرانی، مذهبی، جهانی و آشپزی یک سال آینده؛ برای آماده‌کردن پیام تبریک و کمپین. مناسبت‌های مهم چند روز پیش از موعد در بنر صفحهٔ اصلی و در زنگ دیده می‌شوند.</p>';
    if (next) {
      h += '<section class="ev-next" data-tone="' + next.tone + '"><div class="ev-nt"><span class="ev-nl">مناسبت مهم بعدی</span><h2>' + esc(next.title) + '</h2><p>' + next.weekday + ' ' + next.jalali + SEP + next.gregorian + '</p><span class="ev-left big">' + next.when + '</span></div>' +
        '<div class="ev-nart">' + eventPicture(next.id, true) + '</div></section>';
    }
    h += '<div class="ev-chips" role="group" aria-label="دسته">' + FILTERS.map(function (c) {
      return '<button type="button" class="ev-chip" data-f="' + c[0] + '" aria-pressed="' + (f === c[0]) + '">' + c[1] + '</button>';
    }).join('') + '</div>';
    if (!list.length) h += '<p class="ev-empty">مناسبتی در این دسته نیست.</p>';
    var key = '', open = false;
    list.forEach(function (x) {
      var k = x.jy + '-' + x.jmonth;
      if (k !== key) {
        if (open) h += '</ul></section>';
        h += '<section class="ev-month"><h3>' + E.MONTHS[x.jmonth - 1] + ' ' + E.fa(x.jy) + '</h3><ul class="ev-list">';
        key = k; open = true;
      }
      h += row(x);
    });
    if (open) h += '</ul></section>';
    root.innerHTML = h;
  }
  root.addEventListener('click', function (e) {
    var c = e.target.closest('[data-f]');
    if (!c) return;
    f = c.getAttribute('data-f'); render();
  });
  render();
})();

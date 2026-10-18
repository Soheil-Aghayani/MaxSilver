// fairs.html: the trade fairs Max Silver follows, with a countdown. Every fact below was read from the organizer's own page on the
// date in COLLECTED; a fact the page did not state is shown as «در منبع ذکر نشده». Banners are the owner's pictures:
// put assets/art/fairs/<id>.webp (1280 x 360) and the card shows it; without a file the card shows a colour block.
(function () {
  'use strict';
  var E = window.MSEvents, root = document.getElementById('fr');
  if (!E || !root) return;
  var COLLECTED = '۱۴۰۵/۰۷/۲۶';
  var MON_G = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
  // from/to are Jalali [year, month, day] when the source gives Jalali dates; gFrom/gTo are Gregorian [year, month, day] when it gives those
  var FAIRS = [
    { id: 'iran-retail-show', title: 'نمایشگاه بین‌المللی ایران ریتیل شو', en: 'Iran Retail Show', edition: 'هشتمین دوره', from: [1405, 9, 17], to: [1405, 9, 20],
      venue: 'محل دائمی نمایشگاه‌های بین‌المللی تهران', city: 'تهران (از نام محل)', organizer: 'شرکت تجارت طلایی نیک‌روش',
      contact: ['۰۲۱-۶۶۳۹۹۲۴۳', '۰۲۱-۶۶۳۹۹۲۴۱'], site: '', register: 'برای ثبت‌نام با ستاد برگزاری تماس بگیرید؛ مهلت در متن فراخوان ذکر نشده است.',
      note: 'فراخوان در ۲۸ شهریور ۱۴۰۵ منتشر شده است.', tone: 'sky',
      source: 'https://gbm.ir/fa/news/4600/%D9%81%D8%B1%D8%A7%D8%AE%D9%88%D8%A7%D9%86-%D8%AF%D8%B9%D9%88%D8%AA-%D8%A8%D9%87-%D9%85%D8%B4%D8%A7%D8%B1%DA%A9%D8%AA-%D8%AF%D8%B1-%D9%87%D8%B4%D8%AA%D9%85%DB%8C%D9%86-%D8%AF%D9%88%D8%B1%D9%87-%D9%86%D9%85%D8%A7%DB%8C%D8%B4%DA%AF%D8%A7%D9%87-%D8%A8%DB%8C%D9%86-%D8%A7%D9%84%D9%85%D9%84%D9%84%DB%8C-%D8%A7%DB%8C%D8%B1%D8%A7%D9%86-%D8%B1%DB%8C%D8%AA%DB%8C%D9%84-%D8%B4%D9%88',
      sourceName: 'gbm.ir' },
    { id: 'iran-coffex', title: 'نمایشگاه قهوه ایران (ایران کافکس)', en: 'IRAN COFFEX 2026', edition: 'چهارمین دوره', from: [1405, 8, 26], to: [1405, 8, 29],
      venue: 'مرکز نمایشگاه و همایش‌های بین‌المللی ایران‌مال', city: '', organizer: 'انجمن قهوه ایران (از طریق ستاد برگزاری)',
      contact: [], site: 'WWW.IRANCOFFEX.COM', register: 'پیش‌ثبت‌نام از دوشنبه ۲ شهریور ۱۴۰۵ ساعت ۱۰ صبح و به مدت یک هفته بود؛ برای ثبت‌نام و اطلاعات بیشتر به وب‌سایت نمایشگاه مراجعه شود.',
      note: 'تاریخ میلادی در منبع: ۱۷ تا ۲۰ نوامبر ۲۰۲۶.', tone: 'sun',
      source: 'https://iranca.coffee/%DA%86%D9%87%D8%A7%D8%B1%D9%85%DB%8C%D9%86-%D9%86%D9%85%D8%A7%DB%8C%D8%B4%DA%AF%D8%A7%D9%87-%D9%82%D9%87%D9%88%D9%87-%D8%A7%DB%8C%D8%B1%D8%A7%D9%86/',
      sourceName: 'iranca.coffee' },
    { id: 'midex', title: 'نمایشگاه بین‌المللی میدکس', en: 'MIDEX', edition: 'هفدهمین دوره', from: [1405, 11, 4], to: [1405, 11, 7],
      venue: 'محل دائمی نمایشگاه‌های بین‌المللی تهران', city: 'تهران (از نام محل)', organizer: 'شرکت نمانگر (عضو موسس انجمن برگزارکنندگان نمایشگاه‌های بین‌المللی ایران و عضو اتحادیه جهانی نمایشگاه‌ها)',
      contact: ['۰۲۱-۸۸۲۰۳۰۲۰', '۰۲۱-۸۸۲۰۸۴۲۳', 'info@midex.ir'], site: 'midex.ir',
      register: 'ثبت‌نام بازدیدکنندگان و غرفه‌داران در صفحهٔ نمایشگاه لینک شده است؛ مهلت و هزینه در صفحه ذکر نشده است.', note: '', tone: 'mint',
      source: 'https://www.midex.ir/%d9%81%d8%b1%d8%a7%d8%ae%d9%88%d8%a7%d9%86-%d8%ab%d8%a8%d8%aa-%d9%86%d8%a7%d9%85-%d8%af%d8%b1-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d9%85%db%8c%d8%af%da%a9%d8%b3/',
      sourceName: 'midex.ir' },
    { id: 'iran-food-hospitality', title: 'ایران فود + هاسپیتالیتی (بخشی از ایران اگروفود ۲۰۲۷)', en: 'Iran food + hospitality', edition: 'سی‌وچهارمین دوره', gFrom: [2027, 5, 10], gTo: [2027, 5, 13],
      venue: 'محل دائمی نمایشگاه‌های بین‌المللی تهران', city: 'تهران', organizer: 'fairtrade Messe با همکاری شریک محلی «پلار سامانه»',
      contact: [], site: 'iran-agrofood.com', register: 'صفحه مهلت و هزینه ندارد؛ به صفحه‌های «Become an exhibitor» و «How to exhibit» و فرم تماس لینک می‌دهد.',
      note: 'تاریخ شمسی در منبع نیست؛ تاریخ شمسی بالا محاسبه‌شده است.', tone: 'rose',
      source: 'https://www.iran-agrofood.com/iran-food-hospitality', sourceName: 'iran-agrofood.com' }
  ];

  var fa = E.fa, esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var JM = E.MONTHS, SEP = '<i class="ms-sep" aria-hidden="true"></i>';
  function dates(f) {
    var a, b;
    if (f.from) { a = E.fromJ(f.from[0], f.from[1], f.from[2]); b = E.fromJ(f.to[0], f.to[1], f.to[2]); }
    else { a = new Date(f.gFrom[0], f.gFrom[1] - 1, f.gFrom[2]); b = new Date(f.gTo[0], f.gTo[1] - 1, f.gTo[2]); }
    return { a: a, b: b };
  }
  function jText(d1, d2) {
    var p = E.toJ(d1), q = E.toJ(d2);
    return fa(p.jd) + (p.jm === q.jm ? '' : ' ' + JM[p.jm - 1]) + ' تا ' + fa(q.jd) + ' ' + JM[q.jm - 1] + ' ' + fa(q.jy);
  }
  function gText(d1, d2) {
    var m1 = d1.getMonth(), m2 = d2.getMonth();
    return fa(d1.getDate()) + (m1 === m2 ? '' : ' ' + MON_G[m1]) + ' تا ' + fa(d2.getDate()) + ' ' + MON_G[m2] + ' ' + fa(d2.getFullYear());
  }
  function status(d) {
    var now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), day = 86400000;
    var toStart = Math.round((d.a - t0) / day), toEnd = Math.round((d.b - t0) / day);
    if (toEnd < 0) return { k: 'past', text: 'برگزار شده' };
    if (toStart <= 0) return { k: 'now', text: 'در حال برگزاری' };
    return { k: 'next', text: toStart === 1 ? 'فردا شروع می‌شود' : fa(toStart) + ' روز تا شروع', days: toStart };
  }
  function row(k, v) { return v ? '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; }
  function card(f, big) {
    var d = dates(f), st = status(d), gj = f.from;
    var when = gj ? jText(d.a, d.b) + SEP + gText(d.a, d.b) : gText(d.a, d.b) + SEP + jText(d.a, d.b) + ' <em class="fr-calc">(محاسبه‌شده)</em>';
    var contact = f.contact.map(function (c) { return /@/.test(c) ? '<a href="mailto:' + esc(c) + '" dir="ltr">' + esc(c) + '</a>' : '<span dir="ltr">' + esc(c) + '</span>'; }).join(' · ');
    return '<article class="fr-card' + (big ? ' big' : '') + (st.k === 'past' ? ' past' : '') + '" data-tone="' + f.tone + '">' +
      '<div class="fr-banner"><span class="fr-ph" aria-hidden="true">' + esc(f.en) + '</span><img src="./assets/art/fairs/' + esc(f.id) + '.webp" alt="" loading="lazy" decoding="async" onerror="this.remove()"></div>' +
      '<div class="fr-body"><div class="fr-top"><span class="fr-ed">' + esc(f.edition) + '</span><span class="fr-st ' + st.k + '">' + st.text + '</span></div>' +
      '<h3>' + esc(f.title) + '</h3><p class="fr-when">' + when + '</p><dl class="fr-facts">' +
      row('محل برگزاری', esc(f.venue)) + row('شهر', f.city ? esc(f.city) : '<span class="fr-na">در منبع ذکر نشده</span>') + row('برگزارکننده', esc(f.organizer)) +
      row('ثبت‌نام', esc(f.register)) + row('تماس', contact) + row('وب‌سایت', f.site ? '<span dir="ltr">' + esc(f.site) + '</span>' : '') +
      (f.note ? row('یادداشت', esc(f.note)) : '') + '</dl>' +
      '<p class="fr-src">منبع: <a href="' + esc(f.source) + '" target="_blank" rel="noopener" dir="ltr">' + esc(f.sourceName) + '</a>' + SEP + 'خوانده‌شده در ' + COLLECTED + '</p></div></article>';
  }
  function render() {
    var items = FAIRS.map(function (f) { return { f: f, d: dates(f) }; }).sort(function (x, y) { return x.d.a - y.d.a; });
    var up = items.filter(function (x) { return status(x.d).k !== 'past'; }), past = items.filter(function (x) { return status(x.d).k === 'past'; });
    var h = '<h1>نمایشگاه‌ها</h1><p class="fr-lead">نمایشگاه‌هایی که برای مکث‌سیلور مهم‌اند؛ اطلاعات از صفحهٔ رسمی برگزارکننده خوانده شده و منبع هر مورد زیر آن است. «مشارکت مکث‌سیلور» هنوز ثبت نشده است.</p>';
    if (up.length) h += '<section class="fr-sec"><h2>در پیش رو</h2><div class="fr-grid">' + up.map(function (x, i) { return card(x.f, i === 0); }).join('') + '</div></section>';
    if (past.length) h += '<section class="fr-sec"><h2>برگزارشده</h2><div class="fr-grid">' + past.map(function (x) { return card(x.f, false); }).join('') + '</div></section>';
    h += '<p class="fr-note">تصویر بنر هر نمایشگاه را در <b dir="ltr">assets/art/fairs/&lt;id&gt;.webp</b> بگذارید (۱۲۸۰×۳۶۰)؛ شناسه‌ها: ' + FAIRS.map(function (f) { return '<b dir="ltr">' + esc(f.id) + '</b>'; }).join('، ') + '.</p>';
    root.innerHTML = h;
  }
  render();
})();

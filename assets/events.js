// Occasions calendar: Iranian, religious, global and food-service days that matter for greetings and campaigns.
// Used by the home banner (a greeting slide near an occasion), the bell (a reminder for marketing before the important ones)
// and events.html (the full calendar). Dates are computed, not typed per year, except lunar occasions: those move every year
// and are listed with their Jalali date for the years in `y`. Add the next year's dates there when they are published (time.ir).
(function () {
  'use strict';
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var GMONTHS = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
  var WEEK = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

  // ----- Jalali <-> Gregorian (arithmetic algorithm, same as jdate.js; kept here so this file stands alone)
  var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }
  function jalCal(jy, withoutLeap) {
    var bl = BREAKS.length, gy = jy + 621, leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap, leapG, march, n, i;
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
  function j2d(jy, jm, jd) { var r = jalCal(jy, true); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1; }
  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy, false), jdn1f = g2d(gy, 3, r.march), k = jdn - jdn1f, jm, jd;
    if (k >= 0) {
      if (k <= 185) return { jy: jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
      k -= 186;
    } else {
      jy -= 1; k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30); jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }
  function jDate(jy, jm, jd) { var g = d2g(j2d(jy, jm, jd)); return new Date(g.gy, g.gm - 1, g.gd); }
  function toJ(date) { return d2j(g2d(date.getFullYear(), date.getMonth() + 1, date.getDate())); }
  function day0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function diff(from, to) { return Math.round((day0(to) - day0(from)) / 86400000); }
  function fa(s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); }

  // k: 'j' fixed Jalali date, 'g' fixed Gregorian date, 'y' Jalali date given per Jalali year (lunar or computed occasions).
  // imp: gets a greeting slide and a bell reminder. lead: days the slide shows before the day. rem: days of the bell reminder.
  // grp: ایرانی، مذهبی، جهانی، آشپزی. idea: a suggestion for marketing, not a company fact.
  var EVENTS = [
    { id: 'nowruz', t: 'نوروز', k: 'j', d: [1, 1], grp: 'ایرانی', imp: true, lead: 7, rem: 21, tone: 'mint', art: ['🌱', '🥚', '🌸'],
      hello: 'نوروزتان پیروز؛ سالی پر از رونق و کار نو برای شما و همکارانتان آرزو می‌کنیم.', idea: 'بزرگ‌ترین مناسبت سال: پیام تبریک به مشتریان و همکاران، و آماده‌سازی محتوای افتتاحیه‌های بهاری.' },
    { id: 'chaharshanbe', t: 'چهارشنبه‌سوری', k: 'y', y: { 1405: [12, 25] }, grp: 'ایرانی', tone: 'sun', art: ['🔥', '✨', '🎆'],
      hello: 'چهارشنبه‌سوری امسال شاد و ایمن باشد.', idea: 'محتوای ایمنی و تبریک؛ بدون تبلیغ مستقیم.' },
    { id: 'yalda', t: 'شب یلدا', k: 'j', d: [9, 30], grp: 'ایرانی', imp: true, lead: 5, rem: 14, tone: 'rose', art: ['🍉', '🌙', '✨'],
      hello: 'شب یلدا مبارک؛ بلندترین شب سال را با گرمی دور هم بگذرانید.', idea: 'پیام تبریک و محتوای ویژهٔ کافه و رستوران‌ها برای شب‌های پرمشتری.' },
    { id: 'sadeh', t: 'جشن سده', k: 'j', d: [11, 10], grp: 'ایرانی', tone: 'sun', art: ['🔥', '✨', '🌟'], hello: 'جشن سده، جشن آتش و گرمی، مبارک.', idea: 'پست کوتاه فرهنگی.' },
    { id: 'esfandgan', t: 'اسپندگان و روز عشق', k: 'j', d: [11, 29], grp: 'ایرانی', tone: 'rose', art: ['❤️', '🌷', '✨'], hello: 'اسپندگان، روز عشق ایرانی، مبارک.', idea: 'جایگزین ایرانی ولنتاین.' },
    { id: 'tree', t: 'روز درخت‌کاری', k: 'j', d: [12, 15], grp: 'ایرانی', tone: 'mint', art: ['🌳', '🌱', '🍃'], hello: 'روز درخت‌کاری مبارک.', idea: '' },
    { id: 'engineer', t: 'روز مهندس', k: 'j', d: [12, 5], grp: 'ایرانی', tone: 'sky', art: ['⚙️', '🛠️', '📐'], hello: 'روز مهندس بر همهٔ مهندسان و همکاران فنی ما مبارک.', idea: 'تبریک به تیم فنی و تولید.' },
    { id: 'accountant', t: 'روز حسابدار', k: 'j', d: [9, 15], grp: 'ایرانی', tone: 'sky', art: ['🧮', '📊', '✨'], hello: 'روز حسابدار مبارک.', idea: 'تبریک داخلی به تیم مالی.' },
    { id: 'quality', t: 'روز ملی کیفیت', k: 'j', d: [8, 18], grp: 'ایرانی', tone: 'gold', art: ['🏅', '✅', '⭐'], hello: 'روز ملی کیفیت؛ تعهد ما، کیفیت هر دستگاه است.', idea: 'محتوای کنترل کیفیت در کارخانه.' },
    { id: 'mother', t: 'روز مادر و زن (ولادت حضرت فاطمه)', k: 'y', y: { 1405: [9, 9] }, grp: 'مذهبی', imp: true, lead: 3, rem: 10, tone: 'rose', art: ['🌷', '💐', '❤️'],
      hello: 'روز مادر و روز زن مبارک.', idea: 'پیام تبریک؛ کمپین هدیه برای کافه‌داران و آشپزهای بانو.' },
    { id: 'father', t: 'روز پدر (ولادت امام علی)', k: 'y', y: { 1405: [10, 2] }, grp: 'مذهبی', imp: true, lead: 3, rem: 10, tone: 'sky', art: ['👔', '🎁', '⭐'],
      hello: 'روز پدر مبارک.', idea: 'پیام تبریک به مشتریان و همکاران.' },
    { id: 'shaban', t: 'جشن نیمه شعبان', k: 'y', y: { 1405: [11, 4] }, grp: 'مذهبی', tone: 'sun', art: ['🌟', '🎉', '✨'], hello: 'جشن نیمه شعبان مبارک.', idea: '' },
    { id: 'fitr', t: 'عید فطر', k: 'y', y: { 1405: [12, 19] }, grp: 'مذهبی', imp: true, lead: 2, rem: 10, tone: 'sky', art: ['🌙', '⭐', '✨'],
      hello: 'عید فطر مبارک.', idea: 'اعلام تعطیلی یا ساعت کاری؛ پیام تبریک.' },
    { id: 'coffee', t: 'روز جهانی قهوه', k: 'g', d: [10, 1], grp: 'آشپزی', imp: true, lead: 2, rem: 7, tone: 'gold', art: ['☕', '🥐', '🫘'],
      hello: 'روز جهانی قهوه مبارک؛ به پاس همهٔ کافه‌داران.', idea: 'محتوای ویژهٔ دستگاه‌های کافه: اسپرسوساز، آسیاب و دم‌آور.' },
    { id: 'food', t: 'روز جهانی غذا', k: 'g', d: [10, 16], grp: 'آشپزی', tone: 'gold', art: ['🍽️', '🥘', '🍲'], hello: 'روز جهانی غذا؛ غذای خوب از آشپزخانهٔ خوب شروع می‌شود.', idea: '' },
    { id: 'chef', t: 'روز جهانی سرآشپز', k: 'g', d: [10, 20], grp: 'آشپزی', imp: true, lead: 2, rem: 7, tone: 'gold', art: ['👨‍🍳', '🔥', '🍳'],
      hello: 'روز جهانی سرآشپز بر همهٔ سرآشپزان و آشپزهای ما مبارک.', idea: 'محتوای قدردانی از سرآشپزها؛ معرفی تجهیزات آشپزخانهٔ حرفه‌ای.' },
    { id: 'halloween', t: 'هالووین', k: 'g', d: [10, 31], grp: 'جهانی', imp: true, lead: 3, rem: 10, tone: 'plum', art: ['🎃', '👻', '🦇'],
      hello: 'هالووین شاد؛ شب ترسناک و خوشمزهٔ کافه‌ها و رستوران‌ها.', idea: 'ایدهٔ منوی ویژه برای کافه‌ها؛ محتوای فصلی سرگرم‌کننده.' },
    { id: 'men', t: 'روز جهانی مرد', k: 'g', d: [11, 19], grp: 'جهانی', tone: 'sky', art: ['👔', '☕', '⭐'], hello: 'روز جهانی مرد مبارک.', idea: '' },
    { id: 'christmas', t: 'کریسمس', k: 'g', d: [12, 25], grp: 'جهانی', imp: true, lead: 3, rem: 10, tone: 'mint', art: ['🎄', '🎁', '⭐'],
      hello: 'کریسمس مبارک.', idea: 'محتوای فصلی کافه‌ها و کیک و شیرینی.' },
    { id: 'newyear', t: 'سال نو میلادی', k: 'g', d: [1, 1], grp: 'جهانی', lead: 2, tone: 'sky', art: ['🎆', '🥂', '✨'], hello: 'سال نو میلادی مبارک.', idea: '' },
    { id: 'valentine', t: 'ولنتاین', k: 'g', d: [2, 14], grp: 'جهانی', imp: true, lead: 3, rem: 10, tone: 'rose', art: ['❤️', '🍰', '🌹'],
      hello: 'ولنتاین مبارک.', idea: 'محتوای ویژهٔ کافه‌ها و شیرینی‌فروشی‌ها.' },
    { id: 'women', t: 'روز جهانی زن', k: 'g', d: [3, 8], grp: 'جهانی', tone: 'rose', art: ['🌷', '💐', '⭐'], hello: 'روز جهانی زن مبارک.', idea: '' },
    { id: 'burger', t: 'روز جهانی همبرگر', k: 'g', d: [5, 28], grp: 'آشپزی', tone: 'sun', art: ['🍔', '🍟', '🥤'], hello: 'روز جهانی همبرگر؛ فست‌فودی‌ها روزتان مبارک.', idea: 'محتوای تجهیزات فست‌فود: گریل، سرخ‌کن و شوت.' },
    { id: 'tea', t: 'روز جهانی چای', k: 'g', d: [5, 21], grp: 'آشپزی', tone: 'mint', art: ['🍵', '🫖', '🍃'], hello: 'روز جهانی چای مبارک.', idea: '' }
  ];

  function occurrences(from, to) {
    var out = [], gy0 = from.getFullYear(), jy0 = toJ(from).jy;
    EVENTS.forEach(function (e) {
      var dates = [], y;
      if (e.k === 'g') for (y = gy0 - 1; y <= to.getFullYear() + 1; y++) dates.push(new Date(y, e.d[0] - 1, e.d[1]));
      else if (e.k === 'j') for (y = jy0 - 1; y <= toJ(to).jy + 1; y++) dates.push(jDate(y, e.d[0], e.d[1]));
      else Object.keys(e.y).forEach(function (yy) { dates.push(jDate(+yy, e.y[yy][0], e.y[yy][1])); });
      dates.forEach(function (d) { if (d >= day0(from) && d <= day0(to)) out.push({ e: e, date: d }); });
    });
    return out.sort(function (a, b) { return a.date - b.date; });
  }
  function label(o, now) {
    var j = toJ(o.date), n = diff(now || new Date(), o.date);
    return {
      id: o.e.id, title: o.e.t, group: o.e.grp, important: !!o.e.imp, tone: o.e.tone, art: o.e.art, hello: o.e.hello, idea: o.e.idea || '',
      date: o.date, days: n, year: j.jy,
      jalali: fa(j.jd) + ' ' + MONTHS[j.jm - 1], weekday: WEEK[o.date.getDay()],
      gregorian: fa(o.date.getDate()) + ' ' + GMONTHS[o.date.getMonth()] + ' ' + fa(o.date.getFullYear()),
      jmonth: j.jm, jy: j.jy,
      when: n === 0 ? 'امروز' : n === 1 ? 'فردا' : n > 0 ? fa(n) + ' روز دیگر' : fa(-n) + ' روز پیش'
    };
  }
  // occasions in the next `days` days (default one year), starting today
  function upcoming(days, now) {
    now = day0(now || new Date());
    var to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (days || 365));
    return occurrences(now, to).map(function (o) { return label(o, now); });
  }
  // the occasion whose greeting slide should show today: the nearest important one inside its lead window
  function active(now) {
    now = day0(now || new Date());
    var list = upcoming(30, now).filter(function (x) {
      var e = EVENTS.filter(function (z) { return z.id === x.id; })[0];
      return e && e.imp && x.days >= 0 && x.days <= (e.lead || 3);
    });
    return list[0] || null;
  }
  var REMIND_ROLES = ['marketing', 'sales_manager', 'ceo', 'manager'];
  // bell items, shaped like the entries of UPDATES in updates.js
  function reminders(now) {
    now = day0(now || new Date());
    var jn = toJ(now), today = jn.jy + '/' + (jn.jm < 10 ? '0' : '') + jn.jm + '/' + (jn.jd < 10 ? '0' : '') + jn.jd;
    return upcoming(30, now).filter(function (x) {
      var e = EVENTS.filter(function (z) { return z.id === x.id; })[0];
      return e && e.imp && x.days >= 0 && x.days <= (e.rem || 10);
    }).map(function (x) {
      return {
        id: 'evt-' + x.id + '-' + x.jy, date: today, tag: 'مناسبت', roles: REMIND_ROLES,
        title: x.title + (x.days === 0 ? ' امروز است' : ' نزدیک است'),
        summary: x.days === 0 ? 'امروز ' + x.title + ' است؛ پیام تبریک و محتوا باید منتشر شود.' : fa(x.days) + ' روز تا ' + x.title + ' مانده است؛ وقت آماده‌کردن پیام و کمپین.',
        details: [x.title + ': ' + x.weekday + ' ' + x.jalali + ' (' + x.gregorian + ').'].concat(x.idea ? ['پیشنهاد: ' + x.idea] : []).concat(['همهٔ مناسبت‌ها در صفحهٔ «مناسبت‌ها» است.'])
      };
    });
  }

  window.MSEvents = { upcoming: upcoming, active: active, reminders: reminders, fa: fa, MONTHS: MONTHS, toJ: toJ };
})();

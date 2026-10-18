// The fairs the company follows, as data: the four main fairs (facts read from each organizer's own page on 1405/07/26, below) and the
// owner's regional list of Iran and Türkiye events (assets/expos-data.js, made by tools/import_regional_expos.py). Used by fairs.html
// and by the home banner (a fair that starts within 30 days gets a slide).
(function (w) {
  'use strict';
  var E = w.MSEvents;
  if (!E) return;
  var COLLECTED = '۱۴۰۵/۰۷/۲۶';
  var MAIN = [
    { id: 'iran-retail-show', title: 'نمایشگاه بین‌المللی ایران ریتیل شو', en: 'Iran Retail Show', edition: 'هشتمین دوره', from: [1405, 9, 17], to: [1405, 9, 20],
      venue: 'محل دائمی نمایشگاه‌های بین‌المللی تهران', city: 'تهران', organizer: 'شرکت تجارت طلایی نیک‌روش',
      contact: ['۰۲۱-۶۶۳۹۹۲۴۳', '۰۲۱-۶۶۳۹۹۲۴۱'], site: '', register: 'برای ثبت‌نام با ستاد برگزاری تماس بگیرید؛ مهلت در متن فراخوان ذکر نشده است.',
      note: 'فراخوان در ۲۸ شهریور ۱۴۰۵ منتشر شده است.', tone: 'sky',
      source: 'https://gbm.ir/fa/news/4600/%D9%81%D8%B1%D8%A7%D8%AE%D9%88%D8%A7%D9%86-%D8%AF%D8%B9%D9%88%D8%AA-%D8%A8%D9%87-%D9%85%D8%B4%D8%A7%D8%B1%DA%A9%D8%AA-%D8%AF%D8%B1-%D9%87%D8%B4%D8%AA%D9%85%DB%8C%D9%86-%D8%AF%D9%88%D8%B1%D9%87-%D9%86%D9%85%D8%A7%DB%8C%D8%B4%DA%AF%D8%A7%D9%87-%D8%A8%DB%8C%D9%86-%D8%A7%D9%84%D9%85%D9%84%D9%84%DB%8C-%D8%A7%DB%8C%D8%B1%D8%A7%D9%86-%D8%B1%DB%8C%D8%AA%DB%8C%D9%84-%D8%B4%D9%88',
      sourceName: 'gbm.ir' },
    { id: 'iran-coffex', title: 'نمایشگاه قهوه ایران (ایران کافکس)', en: 'IRAN COFFEX 2026', edition: 'چهارمین دوره', from: [1405, 8, 26], to: [1405, 8, 29],
      venue: 'مرکز نمایشگاه و همایش‌های بین‌المللی ایران‌مال', city: 'تهران', organizer: 'انجمن قهوه ایران (از طریق ستاد برگزاری)',
      contact: [], site: 'WWW.IRANCOFFEX.COM', register: 'پیش‌ثبت‌نام از دوشنبه ۲ شهریور ۱۴۰۵ ساعت ۱۰ صبح و به مدت یک هفته بود؛ برای ثبت‌نام و اطلاعات بیشتر به وب‌سایت نمایشگاه مراجعه شود.',
      note: 'تاریخ میلادی در منبع: ۱۷ تا ۲۰ نوامبر ۲۰۲۶.', tone: 'sun',
      source: 'https://iranca.coffee/%DA%86%D9%87%D8%A7%D8%B1%D9%85%DB%8C%D9%86-%D9%86%D9%85%D8%A7%DB%8C%D8%B4%DA%AF%D8%A7%D9%87-%D9%82%D9%87%D9%88%D9%87-%D8%A7%DB%8C%D8%B1%D8%A7%D9%86/',
      sourceName: 'iranca.coffee' },
    { id: 'midex', title: 'نمایشگاه بین‌المللی میدکس', en: 'MIDEX', edition: 'هفدهمین دوره', from: [1405, 11, 4], to: [1405, 11, 7],
      venue: 'محل دائمی نمایشگاه‌های بین‌المللی تهران', city: 'تهران', organizer: 'شرکت نمانگر (عضو موسس انجمن برگزارکنندگان نمایشگاه‌های بین‌المللی ایران و عضو اتحادیه جهانی نمایشگاه‌ها)',
      contact: ['۰۲۱-۸۸۲۰۳۰۲۰', '۰۲۱-۸۸۲۰۸۴۲۳', 'info@midex.ir'], site: 'midex.ir',
      register: 'ثبت‌نام بازدیدکنندگان و غرفه‌داران در صفحهٔ نمایشگاه لینک شده است؛ مهلت و هزینه در صفحه ذکر نشده است.', note: '', tone: 'mint',
      source: 'https://www.midex.ir/%d9%81%d8%b1%d8%a7%d8%ae%d9%88%d8%a7%d9%86-%d8%ab%d8%a8%d8%aa-%d9%86%d8%a7%d9%85-%d8%af%d8%b1-%d9%86%d9%85%d8%a7%db%8c%d8%b4%da%af%d8%a7%d9%87-%d9%85%db%8c%d8%af%da%a9%d8%b3/',
      sourceName: 'midex.ir' },
    { id: 'iran-food-hospitality', art: 'iran-agrofood', title: 'ایران فود + هاسپیتالیتی (بخشی از ایران اگروفود ۲۰۲۷)', en: 'Iran food + hospitality', edition: 'سی‌وچهارمین دوره', gFrom: [2027, 5, 10], gTo: [2027, 5, 13],
      venue: 'محل دائمی نمایشگاه‌های بین‌المللی تهران', city: 'تهران', organizer: 'fairtrade Messe با همکاری شریک محلی «پلار سامانه»',
      contact: [], site: 'iran-agrofood.com', register: 'صفحه مهلت و هزینه ندارد؛ به صفحه‌های «Become an exhibitor» و «How to exhibit» و فرم تماس لینک می‌دهد.',
      note: 'تاریخ شمسی در منبع نیست؛ تاریخ شمسی بالا محاسبه‌شده است.', tone: 'rose',
      source: 'https://www.iran-agrofood.com/iran-food-hospitality', sourceName: 'iran-agrofood.com' }
  ];

  function dateOf(arr, g) { return g ? new Date(arr[0], arr[1] - 1, arr[2]) : E.fromJ(arr[0], arr[1], arr[2]); }
  // { a, b } start and end day, or null when the source gave no usable dates
  function dates(f) {
    if (f.from) return { a: dateOf(f.from), b: dateOf(f.to) };
    if (f.gFrom) return { a: dateOf(f.gFrom, true), b: dateOf(f.gTo, true) };
    if (f.jf) return { a: dateOf(f.jf), b: dateOf(f.jt) };
    if (f.gf) return { a: dateOf(f.gf, true), b: dateOf(f.gt, true) };
    return null;
  }
  function status(d) {
    var now = new Date(), t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()), day = 86400000, fa = E.fa;
    var toStart = Math.round((d.a - t0) / day), toEnd = Math.round((d.b - t0) / day);
    if (toEnd < 0) return { k: 'past', text: 'برگزار شده', days: -1 };
    if (toStart <= 0) return { k: 'now', text: 'در حال برگزاری', days: 0 };
    return { k: 'next', text: toStart === 1 ? 'فردا شروع می‌شود' : fa(toStart) + ' روز تا شروع', days: toStart };
  }
  // every fair and event in one list, by start date
  function items() {
    var out = [];
    MAIN.forEach(function (f) { var d = dates(f); if (d) out.push({ kind: 'main', id: f.id, title: f.title, f: f, d: d, tone: f.tone || 'sky', art: f.art || f.id, ext: '.webp' }); });
    ((w.MS_EXPOS && w.MS_EXPOS.events) || []).forEach(function (e) {
      var d = dates(e); if (!d) return;
      var m = /^(.*?)(\.[a-z]+)$/i.exec(e.art || '');
      out.push({ kind: 'expo', id: e.id, title: e.title, f: e, d: d, tone: e.region === 'turkey' ? 'sun' : 'sky', art: m ? m[1] : '', ext: m ? m[2] : '' });
    });
    return out.sort(function (x, y) { return x.d.a - y.d.a; });
  }
  // what is running or starts within `days` days
  function soon(days) {
    return items().map(function (x) { x.st = status(x.d); return x; }).filter(function (x) { return x.st.k === 'now' || (x.st.k === 'next' && x.st.days <= days); });
  }
  w.MSFairs = { MAIN: MAIN, COLLECTED: COLLECTED, dates: dates, status: status, items: items, soon: soon };
})(window);

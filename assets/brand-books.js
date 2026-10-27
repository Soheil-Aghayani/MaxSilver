(function () {
  'use strict';

  // Facts below come from each brand's public website and Instagram page; wording of voice/usage rules is a proposal for management approval.
  var BRANDS = [
    {
      key: 'maxsilver', no: 'BB-01', name: 'مکث‌سیلور', latin: 'MAX SILVER', site: 'maxsilver.ir', role: 'شرکت مادر و مرجع هویت گروه',
      logo: './assets/branding/maxsilver-logo.svg',
      about: 'تولیدکنندهٔ تجهیزات آشپزخانهٔ صنعتی (فست‌فود، رستوران و کافی‌شاپ). مکث‌سیلور شرکت مادر است و قالب همهٔ اسناد رسمی گروه، از جمله پیش‌فاکتور، از هویت آن پیروی می‌کند.',
      colors: [
        ['طلایی مکث', '#FFCC2A', 'رنگ اصلی لوگو، سربرگ و ردیف عنوان جدول‌ها'],
        ['گرافیت', '#4C5158', 'بخش دوم لوگو و متن‌های ثانویه'],
        ['سرمه‌ای', '#051934', 'متن اسناد، فوتر و عنوان‌ها'],
        ['کهربایی', '#EEAD16', 'تأکید در وب‌سایت و دکمه‌ها'],
        ['خاکستری روشن', '#F3F5F7', 'ردیف‌های متناوب جدول و پس‌زمینه'],
        ['سفید', '#FFFFFF', 'پس‌زمینهٔ اصلی اسناد']
      ],
      fonts: [
        ['اسناد رسمی و پیش‌فاکتور', 'Estedad', 'فونت استاندارد اسناد گروه؛ فونت متغیر با اعداد فارسی'],
        ['پورتال و اپلیکیشن', 'Estedad', 'همان فونت منتشرشده در این پورتال'],
        ['وب‌سایت', 'TMT (اختصاصی)', 'فونت سفارشی سایت maxsilver.ir']
      ],
      voice: ['اقتدار صنعتی و اعتماد: تولیدکنندهٔ بزرگ تجهیزات آشپزخانه در ایران', 'زبان رسمی، کوتاه و دقیق؛ بدون اغراق', 'همیشه نام «مکث‌سیلور» با نیم‌فاصله و املای یکسان'],
      channels: [['وب‌سایت', 'maxsilver.ir', 'https://maxsilver.ir'], ['اینستاگرام', '@maxsilver.ir', ''], ['اینستاگرام کیش', '@maxsilver.kish', ''], ['اینستاگرام مکس‌استیل آریا', '@maxsteelarya', '']]
    },
    {
      key: 'wintora', no: 'BB-02', name: 'وینتورا', latin: 'WINTORA', site: 'wintora.ir', role: 'برند دستگاه‌های پخت سریع فست‌فود',
      logo: './assets/branding/wintora-logo.png', logoWhite: './assets/branding/wintora-logo-white.png',
      about: 'برند تجهیزات پخت فست‌فود؛ نمونهٔ شاخص سرخ‌کن‌های تحت‌فشار برای مرغ سوخاری و غذاهای فست‌فودی.',
      colors: [
        ['قرمز وینتورا', '#BF0E22', 'رنگ اصلی برند و دکمه‌ها'],
        ['سرخابی', '#CC3366', 'رنگ تأکیدی لینک‌ها و جزئیات'],
        ['زغالی', '#33373D', 'متن اصلی و عنوان‌ها'],
        ['خاکستری روشن', '#ECECEC', 'پس‌زمینه و جداکننده‌ها'],
        ['سفید', '#FFFFFF', 'پس‌زمینهٔ اصلی']
      ],
      fonts: [
        ['وب‌سایت و محتوا', 'Yekan Bakh', 'فونت سایت wintora.ir'],
        ['اسناد گروه', 'Estedad', 'اسناد رسمی با فونت و سربرگ شرکت مادر']
      ],
      voice: ['پرانرژی و مستقیم؛ تمرکز بر سرعت و کیفیت پخت', 'مزیت‌ها را با ویژگی فنی بیان کنید (فشار، یکنواختی، ظرفیت)', 'نام مدل لاتین را بدون ترجمه بنویسید'],
      channels: [['وب‌سایت', 'wintora.ir', 'https://wintora.ir']]
    },
    {
      key: 'chefmarket', no: 'BB-03', name: 'شف‌مارکت', latin: 'CHEF MARKET', site: 'chefmarket.ir', role: 'فروشگاه اینترنتی تجهیزات آشپزخانهٔ صنعتی',
      logo: './assets/branding/chefmarket-logo.png',
      about: 'فروشگاه تخصصی لوازم و تجهیزات آشپزخانهٔ صنعتی، فست‌فود و رستوران از برندهای معتبر روز دنیا.',
      colors: [
        ['قرمز شف', '#EB1D36', 'رنگ اصلی فروشگاه (theme-color سایت)'],
        ['سبز موجودی', '#39B156', 'تأکید مثبت: موجودی، تخفیف و تأیید'],
        ['زغالی', '#212529', 'متن اصلی'],
        ['خاکستری', '#616161', 'متن ثانویه'],
        ['خاکستری روشن', '#F5F5F5', 'پس‌زمینهٔ کارت‌ها'],
        ['سفید', '#FFFFFF', 'پس‌زمینهٔ اصلی']
      ],
      fonts: [
        ['وب‌سایت', 'فونت sans سیستمی', 'سایت به فونت اختصاصی وابسته نیست'],
        ['اسناد گروه', 'Estedad', 'اسناد رسمی با فونت و سربرگ شرکت مادر']
      ],
      voice: ['فروشگاهی و راهنما: انتخاب آسان از میان برندهای مختلف', 'دسته‌بندی روشن (بن‌ماری، فر پیتزا، تجهیزات سرد، خط پخت)', 'پیشنهاد ویژه را شفاف و بدون ابهام بنویسید'],
      channels: [['وب‌سایت', 'chefmarket.ir', 'https://chefmarket.ir']]
    },
    {
      key: 'turbomax', no: 'BB-04', name: 'توربومکس', latin: 'TURBOMAX', site: 'turbomax.ir', role: 'برند تجهیزات قنادی و مخلوط‌کن دیجیتال',
      logo: './assets/branding/turbomax-logo.png',
      about: 'برند تجهیزات حرفه‌ای قنادی و کافه؛ میکسر، مخلوط‌کن و دستگاه‌های دیجیتال، در کنار برندهای همکار مانند FAIMA.',
      colors: [
        ['مشکی سرمه‌ای', '#111827', 'متن اصلی و لوگو'],
        ['خاکستری متوسط', '#667085', 'متن ثانویه'],
        ['خاکستری تیره', '#475467', 'عنوان‌های فرعی'],
        ['مرز', '#CBD5E1', 'خطوط و کادرها'],
        ['خاکستری روشن', '#F7F8FA', 'پس‌زمینهٔ صفحه'],
        ['سفید', '#FFFFFF', 'پس‌زمینهٔ کارت‌ها']
      ],
      fonts: [
        ['وب‌سایت', 'TurboMax Variable', 'فونت متغیر اختصاصی سایت'],
        ['اسناد گروه', 'Estedad', 'اسناد رسمی با فونت و سربرگ شرکت مادر']
      ],
      voice: ['مدرن، دقیق و فنی؛ مشخصات (حجم، قدرت، برنامه‌ها) را ردیف کنید', 'عنوان محصول: نوع دستگاه + مدل + ظرفیت + برند', 'ظاهر ساده و تک‌رنگ؛ بدون رنگ‌های تزئینی'],
      channels: [['وب‌سایت', 'turbomax.ir', 'https://turbomax.ir']]
    }
  ];

  // layered logo files that signed-in people with access to this page can download (Illustrator .ai, vector .svg, preview .png)
  var LOGO_FILES = {"maxsilver": [["لوگوی مکث‌سیلور (CMYK)", "maxsilver/MaxSilver_Logo-CMYK", ["ai"]], ["American Range؛ نشان با شعار", "american-range/american-renge-wordmark-tagline-smooth-v2", ["ai", "svg", "png"]]], "wintora": [["نشان گرد قرمز", "wintora/wintora-red-circle-badge-refined-v3", ["ai", "svg", "png"]], ["آرم سیاه‌وسفید", "wintora/wintora-wordmark-black-white-refined-v3", ["ai", "svg", "png"]], ["آرم با شعار", "wintora/wintora-wordmark-tagline-black-white-refined-v3", ["ai", "svg", "png"]]], "turbomax": [["توربومکس؛ آرم مشکی", "turbomax/turbomax-black-wordmark-smooth-v2", ["ai", "svg", "png"]], ["توربومکس؛ آرم سفید", "turbomax/turbomax-white-wordmark-smooth-v2", ["ai", "svg", "png"]], ["توربومکس؛ آرم سفید (نسخهٔ منبع)", "turbomax/turbomax-white-wordmark-source-dd-smooth-v2", ["ai", "svg", "png"]], ["ویتامکس؛ آرم مشکی", "vitamax/vitamax-black-wordmark-smooth-v2", ["ai", "svg", "png"]]]};
  var FMT = { ai: 'AI (لایه‌باز)', svg: 'SVG', png: 'PNG' };
  function filesHtml(b) {
    var l = LOGO_FILES[b.key] || [];
    if (!l.length) return '<p class="doc-line">فایل لایه‌باز این برند هنوز بارگذاری نشده است.</p>';
    return '<table class="doc-table"><thead><tr><th>فایل</th><th class="no-print">دانلود</th></tr></thead><tbody>' + l.map(function (f) {
      return '<tr><td>' + esc(f[0]) + '<br><small dir="ltr">' + esc(f[1].split('/').pop()) + '</small></td><td class="no-print"><div class="dl-wrap">' + f[2].map(function (x) { return '<a class="dl-btn" href="./assets/branding/files/' + esc(f[1]) + '.' + x + '" download>' + esc(FMT[x] || x) + '</a>'; }).join('') + '</div></td></tr>';
    }).join('') + '</tbody></table>';
  }
  var RULES = [
    ['فضای امن', 'اطراف لوگو دست‌کم نصف ارتفاع لوگو فضای خالی بگذارید.'],
    ['حداقل اندازه', 'عرض لوگو در چاپ کمتر از ۲۵ میلی‌متر و در صفحه کمتر از ۹۶ پیکسل نشود.'],
    ['تغییر نکنید', 'لوگو را کشیده، چرخانده، سایه‌دار یا با رنگ دیگر استفاده نکنید.'],
    ['پس‌زمینه', 'لوگو روی زمینهٔ روشن و آرام قرار گیرد؛ روی تصویر شلوغ از نوار سفید استفاده شود.']
  ];

  var IG_TAB = { key: 'instagram', no: 'BB-IG', name: 'اینستاگرام', latin: 'INSTAGRAM', colors: [['', '#E1306C']] };
  var IG_KEY = 'ms-ig-v1';
  var ig = { accounts: ['maxsilver.ir', 'maxsilver.kish', 'maxsteelarya'], entries: [] };
  try { var savedIg = JSON.parse(localStorage.getItem(IG_KEY) || 'null'); if (savedIg && Array.isArray(savedIg.entries)) ig = Object.assign(ig, savedIg); } catch (e) { /* storage unavailable */ }
  function igSave() { try { localStorage.setItem(IG_KEY, JSON.stringify(ig)); } catch (e) { /* ignore */ } }

  var faInt = new Intl.NumberFormat('fa-IR');
  var fa2 = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 });
  var $ = function (id) { return document.getElementById(id); };
  var current = BRANDS[0];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].join(', '); }
  function today() { try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return ''; } }
  // label colour for a swatch: white, navy or black, whichever has the best WCAG contrast on that colour
  function textOn(hex) {
    var lum = function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (acc, v, i) { return acc + v * [0.2126, 0.7152, 0.0722][i]; }, 0); };
    var ratio = function (x, y) { return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    var l = lum(hex), best = null;
    ['#FFFFFF', '#051934', '#000000'].forEach(function (c) { var r = ratio(l, lum(c)); if (!best || r > best.r + 0.0001) best = { c: c, r: r }; });
    return best.c;
  }

  function num(v) {
    return Number(String(v == null ? '' : v).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[^0-9.]/g, '')) || 0;
  }
  function liveDigits(input) {
    var raw = input.value, pos = input.selectionStart == null ? raw.length : input.selectionStart;
    var before = num(raw.slice(0, pos)) === 0 && !/[0-9۰-۹٠-٩]/.test(raw.slice(0, pos)) ? 0 : raw.slice(0, pos).replace(/[^0-9۰-۹٠-٩]/g, '').length;
    var digits = raw.replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/\D/g, '');
    var out = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '٬').replace(/[0-9]/g, function (d) { return String.fromCharCode(1776 + Number(d)); });
    if (out === raw) return;
    var idx = 0, seen = 0;
    while (idx < out.length && seen < before) { if (/[۰-۹]/.test(out[idx])) seen++; idx++; }
    input.value = out;
    try { input.setSelectionRange(idx, idx); } catch (e) { /* ignore */ }
  }
  function faDate(iso) { try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso + 'T00:00:00')); } catch (e) { return iso; } }
  function isoToday() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function er(e) { return e.followers ? (e.likes + e.comments) / e.followers * 100 : 0; }
  function spark(vals) {
    if (vals.length < 2) return '<span class="ig-na">—</span>';
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = max - min || 1, w = 110, h = 30;
    var pts = vals.map(function (v, i) { return (i / (vals.length - 1) * (w - 6) + 3).toFixed(1) + ',' + (h - 4 - (v - min) / span * (h - 8)).toFixed(1); }).join(' ');
    var up = vals[vals.length - 1] >= vals[0];
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="' + (up ? '#14804a' : '#b42318') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function renderIg() {
    var byAcc = {};
    ig.entries.forEach(function (e) { (byAcc[e.acc] = byAcc[e.acc] || []).push(e); });
    Object.keys(byAcc).forEach(function (k) { byAcc[k].sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }); });
    var rows = ig.accounts.map(function (acc) {
      var l = byAcc[acc] || [], last = l[l.length - 1], prev = l[l.length - 2];
      if (!last) return '<tr><td dir="ltr">@' + esc(acc) + '</td><td colspan="8" class="ig-na">هنوز داده‌ای ثبت نشده است</td></tr>';
      var d = prev ? last.followers - prev.followers : null, pct = prev && prev.followers ? d / prev.followers * 100 : null;
      var cls = d == null ? '' : d >= 0 ? 'up' : 'down';
      return '<tr><td dir="ltr">@' + esc(acc) + '</td><td>' + faInt.format(last.followers) + '</td>' +
        '<td class="' + cls + '" dir="ltr">' + (d == null ? '—' : (d >= 0 ? '+' : '') + faInt.format(d)) + '</td>' +
        '<td class="' + cls + '" dir="ltr">' + (pct == null ? '—' : (pct >= 0 ? '+' : '') + fa2.format(pct) + '٪') + '</td>' +
        '<td>' + faInt.format(last.posts) + '</td><td>' + faInt.format(last.likes) + '</td><td>' + faInt.format(last.comments) + '</td>' +
        '<td><b>' + fa2.format(er(last)) + '٪</b></td><td>' + spark(l.map(function (x) { return x.followers; })) + '</td></tr>';
    }).join('');
    var list = ig.entries.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).map(function (e) {
      var i = ig.entries.indexOf(e);
      return '<tr><td>' + esc(faDate(e.date)) + '</td><td dir="ltr">@' + esc(e.acc) + '</td><td>' + faInt.format(e.followers) + '</td><td>' + faInt.format(e.posts) + '</td><td>' + faInt.format(e.likes) + '</td><td>' + faInt.format(e.comments) + '</td><td>' + fa2.format(er(e)) + '٪</td>' +
        '<td class="no-print"><button type="button" class="ig-del" data-ig-del="' + i + '" aria-label="حذف ثبت">×</button></td></tr>';
    }).join('');
    $('bbDoc').innerHTML =
      '<div class="doc-head"><div class="doc-brand"><img src="./assets/branding/maxsilver-logo.svg" alt="مکث سیلور · MAX SILVER" width="150" height="26"></div>' +
        '<dl class="doc-ref"><div><dt>شماره سند:</dt><dd dir="ltr">' + IG_TAB.no + '</dd></div><div><dt>تاریخ:</dt><dd>' + esc(today()) + '</dd></div></dl></div>' +
      '<h2 class="doc-title">تحلیل صفحه‌های اینستاگرام <small dir="ltr">INSTAGRAM</small></h2>' +
      '<p class="doc-line">داده‌ها را هر هفته یا هر ماه از صفحهٔ هر حساب (پروفایل یا بخش Insights) وارد کنید. نرخ تعامل = (میانگین لایک + میانگین کامنت) ÷ دنبال‌کننده × ۱۰۰. داده فقط در همین دستگاه ذخیره می‌شود.</p>' +
      '<h3>۱. مقایسهٔ حساب‌ها</h3>' +
      '<div class="ig-scroll"><table class="doc-table"><thead><tr><th>حساب</th><th>دنبال‌کننده</th><th>تغییر</th><th>رشد</th><th>پست</th><th>میانگین لایک</th><th>میانگین کامنت</th><th>نرخ تعامل</th><th>روند</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<h3 class="no-print">۲. ثبت داده</h3>' +
      '<form class="ig-form no-print" id="igForm" autocomplete="off">' +
        '<label>حساب<select name="acc">' + ig.accounts.map(function (a) { return '<option value="' + esc(a) + '">@' + esc(a) + '</option>'; }).join('') + '</select></label>' +
        '<label>تاریخ<input type="text" name="jdate" data-jdate readonly inputmode="none" value="' + (window.MSJDate ? window.MSJDate.persian(window.MSJDate.today()) : '') + '" required></label>' +
        '<label>دنبال‌کننده<input type="text" inputmode="numeric" name="followers" placeholder="۰" required></label>' +
        '<label>تعداد پست<input type="text" inputmode="numeric" name="posts" placeholder="۰"></label>' +
        '<label>میانگین لایک هر پست<input type="text" inputmode="numeric" name="likes" placeholder="۰"></label>' +
        '<label>میانگین کامنت هر پست<input type="text" inputmode="numeric" name="comments" placeholder="۰"></label>' +
        '<button type="submit" class="ig-save">ثبت</button>' +
      '</form>' +
      '<form class="ig-add no-print" id="igAdd"><label>افزودن حساب جدید<input type="text" name="handle" dir="ltr" placeholder="username"></label><button type="submit">افزودن</button></form>' +
      '<h3>۳. سوابق ثبت‌شده</h3>' +
      (list ? '<div class="ig-scroll"><table class="doc-table"><thead><tr><th>تاریخ</th><th>حساب</th><th>دنبال‌کننده</th><th>پست</th><th>لایک</th><th>کامنت</th><th>نرخ تعامل</th><th class="no-print"></th></tr></thead><tbody>' + list + '</tbody></table></div>' : '<p class="doc-line ig-na">هنوز ثبتی وجود ندارد.</p>') +
      '<div class="doc-foot">تحلیل اینستاگرام | گروه مکث‌سیلور</div>';
  }

  function renderTabs() {
    $('bbTabs').innerHTML = BRANDS.concat([IG_TAB]).map(function (x) {
      return '<button type="button" role="tab" data-brand="' + x.key + '" aria-selected="' + (x === current) + '" style="--c:' + x.colors[0][1] + '"><i></i><span>' + esc(x.name) + '</span></button>';
    }).join('');
  }

  function render() {
    var b = current;
    renderTabs();
    if (b === IG_TAB) { $('bbDoc').style.setProperty('--b', IG_TAB.colors[0][1]); renderIg(); return; }
    var chs = b.channels.map(function (c) {
      return '<tr><td>' + esc(c[0]) + '</td><td dir="ltr">' + (c[2] ? '<a href="' + esc(c[2]) + '" target="_blank" rel="noopener">' + esc(c[1]) + '</a>' : esc(c[1])) + '</td></tr>';
    }).join('');
    $('bbDoc').innerHTML =
      '<div class="doc-head"><div class="doc-brand"><img src="./assets/branding/maxsilver-logo.svg" alt="مکث سیلور · MAX SILVER" width="150" height="26"></div>' +
        '<dl class="doc-ref"><div><dt>شماره سند:</dt><dd dir="ltr">' + b.no + '</dd></div><div><dt>تاریخ:</dt><dd>' + esc(today()) + '</dd></div></dl></div>' +
      '<h2 class="doc-title">برندبوک ' + esc(b.name) + ' <small dir="ltr">' + esc(b.latin) + '</small></h2>' +
      '<p class="doc-line"><strong>جایگاه:</strong> ' + esc(b.role) + '</p>' +
      '<p class="doc-line"><strong>وب‌سایت:</strong> <a dir="ltr" href="https://' + esc(b.site) + '" target="_blank" rel="noopener">' + esc(b.site) + '</a></p>' +
      '<p class="doc-line"><strong>معرفی:</strong> ' + esc(b.about) + '</p>' +
      '<h3>۱. لوگو</h3>' +
      '<div class="logo-row"><figure class="logo-box"><img src="' + esc(b.logo) + '" alt="لوگوی ' + esc(b.name) + '"><span class="logo-fallback" hidden>' + esc(b.latin) + '</span></figure>' +
        '<figure class="logo-box on-dark' + (b.logoWhite ? ' native' : '') + '"><img src="' + esc(b.logoWhite || b.logo) + '" alt=""><span class="logo-fallback" hidden>' + esc(b.latin) + '</span></figure></div>' +
      '<table class="doc-table"><thead><tr><th>قاعده</th><th>شرح</th></tr></thead><tbody>' +
        RULES.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<h3 class="no-print">فایل‌های لوگو (دانلود)</h3><div class="no-print">' + filesHtml(b) + '</div>' +
      '<h3>۲. رنگ‌ها</h3>' +
      '<table class="doc-table"><thead><tr><th>نمونه</th><th>نام</th><th>HEX / RGB</th><th>کاربرد</th></tr></thead><tbody>' +
        b.colors.map(function (c) {
          return '<tr><td><button type="button" class="sw" data-hex="' + c[1] + '" style="background:' + c[1] + ';color:' + textOn(c[1]) + '" aria-label="کپی ' + c[1] + '">' + faInt.format(0).replace('۰', '') + 'کپی</button></td>' +
            '<td>' + esc(c[0]) + '</td><td dir="ltr" class="mono">' + c[1] + '<br><small>' + rgb(c[1]) + '</small></td><td>' + esc(c[2]) + '</td></tr>';
        }).join('') + '</tbody></table>' +
      '<h3>۳. فونت‌ها</h3>' +
      '<table class="doc-table"><thead><tr><th>کاربرد</th><th>فونت</th><th>توضیح</th></tr></thead><tbody>' +
        b.fonts.map(function (f) { return '<tr><td>' + esc(f[0]) + '</td><td dir="ltr">' + esc(f[1]) + '</td><td>' + esc(f[2]) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<h3>۴. لحن و پیام (پیشنهادی)</h3><ul class="doc-list">' + b.voice.map(function (v) { return '<li>' + esc(v) + '</li>'; }).join('') + '</ul>' +
      '<h3>۵. اسناد و پیش‌فاکتور</h3>' +
      '<p class="doc-line">همهٔ اسناد رسمی گروه، از جمله پیش‌فاکتور، فقط با <strong>قالب مکث‌سیلور</strong> (سربرگ طلایی، جدول با ردیف عنوان طلایی و نوار پایین) صادر می‌شود. نام این برند در ستون «برند» ردیف کالا می‌آید و قالب جداگانه ندارد.</p>' +
      '<h3>۶. کانال‌های ارتباطی</h3>' +
      '<table class="doc-table"><thead><tr><th>کانال</th><th>نشانی</th></tr></thead><tbody>' + chs + '</tbody></table>' +
      '<div class="doc-foot">برندبوک ' + esc(b.name) + ' | گروه مکث‌سیلور</div>';
    $('bbDoc').style.setProperty('--b', b.colors[0][1]);
    $('bbDoc').querySelectorAll('.logo-box img').forEach(function (img) {
      img.addEventListener('error', function () { img.hidden = true; img.nextElementSibling.hidden = false; }, { once: true });
    });
  }

  function select(key, push) {
    current = BRANDS.concat([IG_TAB]).filter(function (b) { return b.key === key; })[0] || BRANDS[0];
    render();
    if (push) { try { history.replaceState(null, '', '#' + current.key); } catch (e) { /* ignore */ } }
  }

  document.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-brand]');
    if (tab) { select(tab.getAttribute('data-brand'), true); return; }
    var sw = e.target.closest('[data-hex]');
    if (sw && navigator.clipboard) {
      navigator.clipboard.writeText(sw.getAttribute('data-hex')).then(function () {
        var old = sw.textContent; sw.textContent = 'کپی شد'; setTimeout(function () { sw.textContent = old; }, 1100);
      }, function () { /* clipboard blocked */ });
    }
  });
  $('bbPrint').addEventListener('click', function () { window.print(); });
  $('bbDoc').addEventListener('input', function (e) {
    if (e.target.form && e.target.form.id === 'igForm' && e.target.type === 'text') liveDigits(e.target);
  });
  $('bbDoc').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, v = function (n) { return f.elements[n].value; };
    if (f.id === 'igAdd') {
      var h = v('handle').trim().replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
      if (h && ig.accounts.indexOf(h) < 0) { ig.accounts.push(h); igSave(); renderIg(); }
      return;
    }
    if (f.id === 'igForm') {
      var followers = num(v('followers'));
      var iso = window.MSJDate ? window.MSJDate.toISO(v('jdate')) : '';
      if (!followers || !iso) return;
      ig.entries.push({ acc: v('acc'), date: iso, followers: followers, posts: num(v('posts')), likes: num(v('likes')), comments: num(v('comments')) });
      igSave(); renderIg();
    }
  });
  $('bbDoc').addEventListener('click', function (e) {
    var del = e.target.closest('[data-ig-del]');
    if (del) { ig.entries.splice(Number(del.getAttribute('data-ig-del')), 1); igSave(); renderIg(); }
  });

  select(location.hash.replace('#', ''), false);
})();

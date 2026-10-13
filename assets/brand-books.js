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

  var RULES = [
    ['فضای امن', 'اطراف لوگو دست‌کم نصف ارتفاع لوگو فضای خالی بگذارید.'],
    ['حداقل اندازه', 'عرض لوگو در چاپ کمتر از ۲۵ میلی‌متر و در صفحه کمتر از ۹۶ پیکسل نشود.'],
    ['تغییر نکنید', 'لوگو را کشیده، چرخانده، سایه‌دار یا با رنگ دیگر استفاده نکنید.'],
    ['پس‌زمینه', 'لوگو روی زمینهٔ روشن و آرام قرار گیرد؛ روی تصویر شلوغ از نوار سفید استفاده شود.']
  ];

  var faInt = new Intl.NumberFormat('fa-IR');
  var $ = function (id) { return document.getElementById(id); };
  var current = BRANDS[0];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255].join(', '); }
  function today() { try { return new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); } catch (e) { return ''; } }
  function dark(hex) { var n = parseInt(hex.slice(1), 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 < 140; }

  function render() {
    var b = current;
    $('bbTabs').innerHTML = BRANDS.map(function (x) {
      return '<button type="button" role="tab" data-brand="' + x.key + '" aria-selected="' + (x === b) + '" style="--c:' + x.colors[0][1] + '"><i></i><span>' + esc(x.name) + '</span></button>';
    }).join('');
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
      '<h3>۲. رنگ‌ها</h3>' +
      '<table class="doc-table"><thead><tr><th>نمونه</th><th>نام</th><th>HEX / RGB</th><th>کاربرد</th></tr></thead><tbody>' +
        b.colors.map(function (c) {
          return '<tr><td><button type="button" class="sw" data-hex="' + c[1] + '" style="background:' + c[1] + ';color:' + (dark(c[1]) ? '#fff' : '#051934') + '" aria-label="کپی ' + c[1] + '">' + faInt.format(0).replace('۰', '') + 'کپی</button></td>' +
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
    current = BRANDS.filter(function (b) { return b.key === key; })[0] || BRANDS[0];
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

  select(location.hash.replace('#', ''), false);
})();

// What's new: the list of changes shown to signed-in people. The home page shows the newest three as short teasers
// («ادامه» opens the full text in a popup) and the bell on the banner holds the whole list. A glowing red dot means
// something has not been read yet. To announce a change, add an entry at the TOP of UPDATES.
(function () {
  'use strict';
  // id: unique and never reused. date: Jalali. quiet: true = old news, does not light the dot. roles: who it concerns (omit for everyone).
  var ALL_SALES = ['visitor', 'sales_manager', 'account_manager', 'finance', 'ceo', 'manager'];
  var UPDATES = [
    { id: 'cutout-photos', date: '1405/07/25', tag: 'بهبود', title: 'عکس‌های بدون زمینه برای ۶۰ محصول',
      summary: 'عکس وینتورا، توربومکس و مکث‌سیلور برای ۶۰ محصول با زمینهٔ شفاف و حجم کم (WebP) عوض شد.',
      details: ['گریل‌ها، اجاق‌ها، سرخ‌کن‌ها، شوت‌ها، تاپینگ و یخچال‌های وینتورا و چند محصول توربومکس و مکث‌سیلور حالا عکس بدون زمینه دارند.',
        'سه محصول وینتورا (سرخ‌کن مبلهٔ سه و چهار لگن و مرینیتور ساده) که عکس نداشتند حالا عکس دارند.',
        'هر عکس حدود ۲۰ کیلوبایت است و ۵۴ عکس قدیمی که دیگر جایی استفاده نمی‌شد حذف شد.'] },
    { id: 'events', date: '1405/07/25', tag: 'جدید', title: 'مناسبت‌ها: یلدا، نوروز، هالووین و…',
      summary: 'تقویم ۲۴ مناسبت با بنر تبریک سه‌بعدی در صفحهٔ اصلی و یادآور در زنگ برای تیم بازاریابی و مدیران.',
      details: ['صفحهٔ «مناسبت‌ها» مناسبت‌های ایرانی، مذهبی، جهانی و آشپزی یک سال آینده را با شمارش معکوس نشان می‌دهد؛ مثل نوروز، شب یلدا، روز مادر، هالووین، کریسمس، روز جهانی قهوه و روز سرآشپز.',
        'چند روز پیش از هر مناسبت، یک اسلاید تبریک با تصویر سه‌بعدی و رنگ همان مناسبت به بنر صفحهٔ اصلی اضافه می‌شود (فقط برای کسانی که وارد شده‌اند).',
        'برای بازاریابی، مدیر فروش، مدیریت و تکنولوژی سازمانی، چند روز پیش از مناسبت‌های مهم در زنگ یادآوری می‌آید تا پیام و کمپین آماده شود.',
        'تاریخ مناسبت‌های قمری هر سال عوض می‌شود و فعلاً برای سال ۱۴۰۵ ثبت شده است؛ بقیه خودکار محاسبه می‌شوند.'] },
    { id: 'art-3d', date: '1405/07/25', tag: 'بهبود', title: 'تصویرهای سه‌بعدی برای طراح و بنر',
      summary: 'کارت‌های «چه کسب‌وکاری می‌خواهید راه بیندازید؟» و اسلایدهای بنر حالا تصویر سه‌بعدی با زمینهٔ شفاف دارند.',
      details: ['هر کسب‌وکار (کافه، فست‌فود، رستوران، پیتزا، نانوایی، نوشیدنی) یک آیکون سه‌بعدی و دو دستگاه شاخص دارد که با حرکت موس یا انگشت کمی می‌چرخند.',
        'اسلایدهای بنر صفحهٔ اصلی از طرح‌های جدید با اندازهٔ جدا برای رایانه، تبلت و گوشی استفاده می‌کنند.',
        'همهٔ تصویرها WebP سبک هستند؛ جمعاً حدود ۵۰۰ کیلوبایت.'] },
    { id: 'home-slides', date: '1405/07/23', tag: 'جدید', title: 'بنر صفحهٔ اصلی اسلاید شد',
      summary: 'بنر بالای درگاه حالا چند اسلاید با عکس واقعی دستگاه‌ها دارد: طراح کافه، کاتالوگ و برندها.',
      details: ['اسلاید اول همان «درگاه مدیریتی مکث‌سیلور» است؛ بعد از آن طراح کسب‌وکار، کاتالوگ و برندبوک‌ها می‌آید.',
        'با نقطه‌ها، کشیدن انگشت یا کلید جهت‌دار جابه‌جا می‌شود و با دکمهٔ توقف، نمایش خودکار متوقف می‌شود.',
        'اگر دستگاه شما «کاهش حرکت» را روشن کرده باشد، اسلایدها خودکار عوض نمی‌شوند.'] },
    { id: 'planner', date: '1405/07/23', tag: 'جدید', title: 'طراح کافه و رستوران',
      summary: 'برای کسی که تازه می‌خواهد کافه یا رستوران بزند: چند انتخاب ساده و برای هر کار یک دستگاه پیشنهادی.',
      details: ['نوع کسب‌وکار، اندازه و چیزهایی که سرو می‌کنید را انتخاب می‌کنید؛ بدون جزئیات فنی.',
        'برای هر کار (پخت، سرما، نوشیدنی، سرو…) یک دستگاه از کاتالوگ پیشنهاد می‌شود. هر کدام را می‌توانید با نمونهٔ مشابه عوض یا حذف کنید.',
        'مواردی که معمولاً فراموش می‌شود، مثل هود یا یخچال، با برچسب «تکمیل‌کننده» اضافه می‌شود.',
        'با «افزودن به پیش‌فاکتور» طرح به پیش‌فاکتور می‌رود تا با مشتری وارد جزئیات و قیمت شوید.'] },
    { id: 'dock-home', date: '1405/07/23', tag: 'جدید', title: 'نوار پایین را خودتان بچینید',
      summary: 'همهٔ بخش‌ها در درگاه مدیریت است؛ با ستارهٔ هر بخش آن را به نوار پایین اضافه یا از آن برمی‌دارید.',
      details: ['دکمهٔ «همه» از نوار پایین برداشته شد.',
        'همهٔ بخش‌هایی که به آن‌ها دسترسی دارید در صفحهٔ «درگاه مدیریت» است. روی ستارهٔ هر کارت بزنید تا در نوار پایین بماند و دوباره بزنید تا برداشته شود.',
        'در گوشی تا ۳ بخش و در صفحهٔ بزرگ تا ۶ بخش جا دارد. انتخاب شما روی همین دستگاه نگه‌داری می‌شود.',
        'تازه‌ها همین‌جا و با زنگ بالای صفحه نشان داده می‌شود؛ نقطهٔ قرمز یعنی خبر خوانده‌نشده دارید.'] },
    { id: 'rial-to-toman', date: '1405/07/23', tag: 'بهبود', roles: ALL_SALES, title: 'پیش‌فاکتورهای ریالی به تومان تبدیل شد',
      summary: 'پیش‌فاکتورهای قبلی که به ریال ساخته شده بودند، یک‌بار خودکار به تومان تبدیل می‌شوند.',
      details: ['هر پیش‌فاکتوری که تا امروز با واحد «ریال» ذخیره شده بود، یک‌بار به تومان تبدیل می‌شود: قیمت هر ردیف، تخفیف مبلغی، سهم نقد و مبلغ چک‌ها بر ۱۰ تقسیم می‌شود.',
        'قیمت‌های یادآوری‌شدهٔ کالاها هم هم‌راه تبدیل می‌شود تا پیش‌فاکتور بعدی عدد غلط نگیرد.',
        'از این پس اگر در فرم پیش‌فاکتور واحد پول را عوض کنید، مبلغ‌ها هم تبدیل می‌شود، نه فقط برچسب.',
        'این تبدیل روی هر دستگاه هنگام باز شدن کاتالوگ انجام می‌شود و با همگام‌سازی به همه می‌رسد.'] },
    { id: 'customers-toman', date: '1405/07/23', tag: 'بهبود', roles: ALL_SALES, title: 'فروش مشتریان به تومان',
      summary: 'گزارش حسابداری ریالی است؛ همهٔ مبلغ‌های صفحهٔ مشتریان حالا به تومان نمایش داده می‌شود.',
      details: ['مبلغ‌های فروش در فهرست مشتریان، صفحهٔ هر مشتری و شمارنده‌ها به تومان است.',
        'فایل نمونهٔ Excel هم ستون‌های فروش را به تومان می‌گیرد: «فروش 1405 (تومان)».'] },
    { id: 'customers-db', date: '1405/07/22', tag: 'جدید', quiet: true, roles: ALL_SALES, title: 'پایگاه مشتریان',
      summary: 'هر مشتری صفحهٔ خودش را دارد: فروش سال‌ها، گروه، مسئول و اطلاعات تماس.',
      details: ['فهرست مشتریان با جست‌وجو و فیلتر وضعیت و گروه.',
        'صفحهٔ هر مشتری: فروش هر سال و تغییر نسبت به سال قبل، سهم و رتبه، شهر و منطقه، پیش‌فاکتورهای ثبت‌شده و کالاهای آن‌ها.',
        'گروه‌ها همان همکاران مسئول‌اند؛ هر کارشناس فقط مشتریان خودش را می‌بیند.',
        'مدیر فروش می‌تواند از فایل‌های حسابداری یا فایل نمونهٔ Excel مشتری وارد کند.'] },
    { id: 'proforma-review', date: '1405/07/22', tag: 'جدید', quiet: true, roles: ['visitor', 'sales_manager', 'account_manager', 'ceo', 'manager'], title: 'بررسی و رد پیش‌فاکتور',
      summary: 'اکانت منیجر پیش‌فاکتور را تأیید یا با نوشتن دلیل رد می‌کند و مدیر فروش دربارهٔ رد تصمیم می‌گیرد.',
      details: ['اکانت منیجر در «پیش‌فاکتورها» هر مورد را تأیید یا با دلیل رد می‌کند؛ رد به‌صورت نامه برای مدیر فروش می‌رود.',
        'اگر مدیر فروش رد را بپذیرد، پیش‌فاکتور از برنامه برداشته و در بایگانی نگه داشته می‌شود؛ اگر نپذیرد، پیش‌فاکتور معتبر می‌ماند.',
        'کارشناس فروش نتیجه را در گفت‌وگوها و فهرست پیش‌فاکتورهای خودش می‌بیند.'] },
    { id: 'doc-number', date: '1405/07/22', tag: 'بهبود', quiet: true, roles: ALL_SALES, title: 'شمارهٔ سند یکتا و نقش‌دار',
      summary: 'شمارهٔ پیش‌فاکتور خودکار است و دو حرف اولش نشان می‌دهد چه کسی آن را ساخته.',
      details: ['قالب شماره: نقش، تاریخ شمسی، کد فرد، شماره؛ مثلاً SE-051018-AB-003.',
        'SM مدیر فروش، SE کارشناس فروش، AM اکانت منیجر، FN مالی، CE مدیریت و IT تکنولوژی سازمانی.',
        'شماره را نمی‌شود دستی نوشت و اگر دستگاه دیگری همان شماره را گرفته باشد، خودکار شمارهٔ بعدی داده می‌شود.'] },
    { id: 'send-to-am', date: '1405/07/21', tag: 'جدید', quiet: true, roles: ['visitor', 'sales_manager', 'account_manager', 'ceo', 'manager'], title: 'ارسال پیش‌فاکتور به اکانت منیجر',
      summary: 'با یک ضربه، پیش‌فاکتور برای بررسی به اکانت منیجر می‌رود و او اعلان می‌گیرد.',
      details: ['در برگهٔ پیش‌فاکتور، دکمهٔ «ارسال به اکانت منیجر» یک گفت‌وگو با خلاصهٔ پیش‌فاکتور باز می‌کند.',
        'اگر اینترنت نباشد، پیش‌فاکتور در صف می‌ماند و با وصل‌شدن خودکار فرستاده می‌شود.'] },
    { id: 'profile-look', date: '1405/07/21', tag: 'جدید', quiet: true, title: 'پروفایل: عکس، رنگ و اطلاعات شخصی',
      summary: 'عکس و رنگ خودتان را انتخاب کنید و اطلاعات شخصی‌تان را در یک بخش ببینید.',
      details: ['در پنل ← تنظیمات من عکس (حداکثر ۱ مگابایت) و رنگ پروفایل را انتخاب کنید؛ روی گفت‌وگوها نمایش داده می‌شود.',
        'نام، تلفن، کد ملی و تاریخ تولد را فقط منابع انسانی یا مدیریت تغییر می‌دهد؛ ایمیل تماس را خودتان می‌نویسید.'] },
    { id: 'sales-map-9', date: '1405/07/21', tag: 'بهبود', quiet: true, title: 'نقشهٔ فروش نه‌مرحله‌ای',
      summary: 'نقشهٔ فروش با مسئول هر مرحله، فرایند تسویه، کنترل‌ها و گزارش‌ها به‌روز شد.',
      details: ['نه مرحله از آماده‌سازی تا پایش بازار، با مسئول هر مرحله.',
        'فرایند تسویه (واریز، چک، اعتباری)، سه کنترل مستقل تجاری، مالی و عملیاتی، و تفاوت مدیر CRM با اکانت منیجر.',
        'فهرست گزارش‌های مدیریتی و اسناد لازم.'] }
  ];
  var SEEN_KEY = 'ms-upd-seen-v1';

  function role() { try { return localStorage.getItem('ms-role') || ''; } catch (e) { return ''; } }
  function signed() {
    if (role()) return true;
    try { for (var i = 0; i < localStorage.length; i++) if (/^firebase:authUser:/.test(localStorage.key(i))) return true; } catch (e) { /* ignore */ }
    return false;
  }
  // the occasions calendar adds reminders for marketing a few days before an important occasion
  function all() {
    var extra = [];
    try { extra = window.MSEvents ? window.MSEvents.reminders() : []; } catch (e) { extra = []; }
    return extra.concat(UPDATES);
  }
  function visible() {
    if (!signed()) return [];
    var r = role(), nr = window.MSRoles && r ? window.MSRoles.norm(r) : r;
    return all().filter(function (u) { return !u.roles || (nr && u.roles.indexOf(nr) >= 0); });
  }
  function seen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]') || []; } catch (e) { return []; } }
  function mark(ids) {
    var s = seen();
    ids.forEach(function (id) { if (s.indexOf(id) < 0) s.push(id); });
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    paintDot();
  }
  function unseen() { var s = seen(); return visible().filter(function (u) { return !u.quiet && s.indexOf(u.id) < 0; }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fa(s) { return String(s).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); }

  var BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10.3 20a2 2 0 0 0 3.4 0"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';

  function body(u) {
    return u.details.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
  }
  var dlg = null;
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'upd-dialog';
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('[data-upd-close]')) dlg.close(); });
    document.body.appendChild(dlg);
    return dlg;
  }
  function openAll() {
    var list = visible(), s = seen(), d = ensureDialog();
    d.setAttribute('aria-label', 'تازه‌ها');
    d.innerHTML = '<div class="upd-dbar"><h2>تازه‌ها</h2><button type="button" class="upd-x" data-upd-close aria-label="بستن">' + CLOSE + '</button></div>' +
      (list.length ? '<ul class="upd-all">' + list.map(function (u) {
        return '<li><div class="upd-meta"><span class="upd-tag">' + esc(u.tag || '') + '</span><time>' + fa(u.date) + '</time>' + (!u.quiet && s.indexOf(u.id) < 0 ? '<i class="upd-new" title="خوانده‌نشده"></i>' : '') + '</div><h3>' + esc(u.title) + '</h3>' + body(u) + '</li>';
      }).join('') + '</ul>' : '<p class="upd-empty">فعلاً تازه‌ای نیست.</p>');
    if (!d.open) d.showModal();
    mark(list.map(function (u) { return u.id; }));
    paintSection();
  }
  function openOne(id) {
    var u = all().filter(function (x) { return x.id === id; })[0], d = ensureDialog();
    if (!u) return;
    d.setAttribute('aria-label', u.title);
    d.innerHTML = '<div class="upd-dbar"><h2>' + esc(u.title) + '</h2><button type="button" class="upd-x" data-upd-close aria-label="بستن">' + CLOSE + '</button></div>' +
      '<div class="upd-meta"><span class="upd-tag">' + esc(u.tag || '') + '</span><time>' + fa(u.date) + '</time></div><div class="upd-one">' + body(u) + '</div>';
    if (!d.open) d.showModal();
    mark([id]);
    paintSection();
  }

  function paintDot() {
    var n = unseen().length;
    var bell = document.getElementById('updBell');
    if (bell) {
      bell.hidden = !visible().length;
      bell.classList.toggle('lit', n > 0);
      bell.setAttribute('aria-label', n ? 'تازه‌ها؛ ' + fa(n) + ' مورد خوانده‌نشده' : 'تازه‌ها');
      var hero = bell.closest('.hero'); if (hero) hero.classList.toggle('has-bell', !bell.hidden);
    }
    var home = document.querySelector('.ms-nav-links a[data-dock=home]');
    if (home) home.classList.toggle('has-upd', n > 0);
  }
  function paintSection() {
    var sec = document.getElementById('updSection');
    if (!sec) return;
    var list = visible().slice(0, 3), s = seen();
    sec.hidden = !list.length;
    var box = document.getElementById('updList');
    if (!box) return;
    box.innerHTML = list.map(function (u) {
      var fresh = !u.quiet && s.indexOf(u.id) < 0;
      return '<article class="upd-card' + (fresh ? ' fresh' : '') + '"><div class="upd-meta"><span class="upd-tag">' + esc(u.tag || '') + '</span><time>' + fa(u.date) + '</time>' + (fresh ? '<i class="upd-new" title="خوانده‌نشده"></i>' : '') + '</div>' +
        '<h3>' + esc(u.title) + '</h3><p class="upd-sum">' + esc(u.summary) + '</p>' +
        '<button type="button" class="upd-more" data-upd-open="' + u.id + '">ادامه</button></article>';
    }).join('');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#updBell') || e.target.closest('[data-upd-all]')) { openAll(); return; }
    var one = e.target.closest('[data-upd-open]');
    if (one) openOne(one.getAttribute('data-upd-open'));
  });
  function apply() { paintDot(); paintSection(); }
  var G = window.MSGate;
  if (G && !G.__upd) { var orig = G.apply; G.apply = function () { orig.apply(G, arguments); apply(); }; G.__upd = true; }
  window.addEventListener('storage', function (e) { if (e.key === 'ms-role' || e.key === SEEN_KEY) apply(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  window.MSUpdates = { paintDot: paintDot, unseen: function () { return unseen().length; }, openAll: openAll };
})();

// What's new: the list of changes shown to signed-in people. The home page shows the newest three as short teasers
// («ادامه» opens the full text in a popup) and the bell on the banner holds the whole list. A glowing red dot means
// something has not been read yet. To announce a change, add an entry at the TOP of UPDATES. Only the newest entries live here; older ones are in
// assets/updates-archive.js, which is loaded when someone opens the full list («همهٔ تازه‌ها»). When UPDATES passes about 15 entries, move the oldest to the archive.
(function () {
  'use strict';
  // id: unique and never reused. date: Jalali. quiet: true = old news, does not light the dot. roles: who it concerns (omit for everyone).
  var ALL_SALES = ['visitor', 'sales_manager', 'account_manager', 'finance', 'ceo', 'manager'];
  var UPDATES = [
    { id: 'roadmap-footer-style', date: '1405/07/27', tag: 'بهبود', title: 'نوار پایین نقشهٔ راه زیباتر شد', roles: ['manager', 'ceo', 'sales_manager'],
      summary: 'تاریخ آخرین به‌روزرسانی، یادآوری برآورد بودن زمان‌ها و دکمهٔ بارگذاری فایل تازه حالا در یک کارت مرتب با آیکن آمده‌اند.' },
    { id: 'features-owner-sees', date: '1405/07/27', tag: 'بهبود', title: 'بخش خاموش‌شده برای مسئول فناوری پنهان نمی‌شود', roles: ['manager'],
      summary: 'وقتی یک بخش را در «ویژگی‌ها» خاموش می‌کنید، برای بقیه ناپدید می‌شود ولی برای شما می‌ماند و با برچسب «خاموش برای دیگران» دیده می‌شود؛ صفحهٔ آن هم باز می‌شود و نواری بالای آن می‌گوید برای دیگران خاموش است.' },
    { id: 'permissions-page', date: '1405/07/27', tag: 'جدید', title: 'صفحهٔ «دسترسی‌ها»: چه کسی بارگذاری و جایگزینی کند', roles: ['manager'],
      summary: 'مسئول فناوری برای هر کار مشخص می‌کند چه کسانی اختیار دارند: نقشهٔ راه، فایل تحلیل رقبا و موجودی انبار، و دو نفر مسئول قیمت. بارگذاری گزارش مشتریان محدود به شما نیست و مثل قبل با نقش‌های فروش است. بقیه فقط می‌بینند. کاری که فهرست ندارد همان نقش‌های پیش‌فرض را نگه می‌دارد.',
      details: ['این محدودیت در پایگاه داده هم اعمال می‌شود، نه فقط روی دکمه‌ها.'] },
    { id: 'owner-only-authority', date: '1405/07/27', tag: 'امنیت', title: 'اختیار دادن فقط با تکنولوژی ارتباطات سازمانی', roles: ['manager', 'ceo', 'sales_manager', 'finance', 'account_manager', 'hr'],
      summary: 'ساختن حساب و تعیین نقش، تعیین دو مسئول قیمت و بارگذاری یا جایگزینی فایل‌های داده (نقشهٔ راه، تحلیل رقبا) فقط با تکنولوژی ارتباطات سازمانی است. بقیه، از جمله مدیر فروش و CEO، آن‌ها را می‌بینند ولی نمی‌توانند عوض کنند.',
      details: ['این محدودیت در پایگاه داده هم اعمال می‌شود، نه فقط روی دکمه‌ها.'] },
    { id: 'three-price-types', date: '1405/07/27', tag: 'جدید', title: 'سه نوع قیمت: نقدی، چکی و توافقی', roles: ['manager', 'ceo', 'sales_manager', 'finance', 'account_manager', 'visitor'], feature: 'prices',
      summary: 'هر کالا حالا قیمت نقدی، قیمت چکی و حالت «توافقی» دارد. قیمت چکی = نقدی + یک درصد که دو مسئول قیمت برای هر گروه می‌گذارند (یا قیمت جدا برای یک کالا). در کاتالوگ هر دو قیمت دیده می‌شود و قیمت توافقی عدد ندارد.',
      details: ['فایل قالب قیمت (Excel) ستون نقدی و چکی دارد و در Google Sheets هم باز می‌شود؛ بعد از ویرایش به‌صورت .xlsx دانلود و در صفحهٔ قیمت‌ها بارگذاری می‌شود.', 'در پیش‌فاکتور سطرها با قیمت نقدی نوشته می‌شود و وقتی «چکی» یا «نقد و چک» را بزنید، سهم چکی با قیمت چکی حساب می‌شود و ردیف «افزایش قیمت بخش چکی» اضافه می‌شود.'] },
    { id: 'price-editors-two', date: '1405/07/27', tag: 'امنیت', title: 'تغییر قیمت فقط با دو نفر تعیین‌شده', roles: ['manager', 'ceo', 'sales_manager', 'finance', 'account_manager'], feature: 'prices',
      summary: 'از این پس فقط دو نفری که تکنولوژی ارتباطات سازمانی در صفحهٔ «قیمت‌ها» تعیین می‌کند می‌توانند قیمت را عوض کنند، فایل بازبینی بارگذاری کنند، درصد گروه را بزنند یا کدی را کنار بگذارند. بقیه قیمت‌ها را فقط می‌بینند.',
      details: ['این محدودیت در خود پایگاه داده هم اعمال می‌شود، نه فقط روی دکمه‌ها. تا دو نفر تعیین نشوند کسی قیمت را تغییر نمی‌دهد.'] },
    { id: 'prices-mehr-1405-group-percent', date: '1405/07/27', tag: 'جدید', title: 'قیمت‌های مهرماه ۱۴۰۵ و تغییر درصدی قیمت یک گروه', roles: ['manager', 'ceo', 'sales_manager', 'finance', 'account_manager', 'visitor'], feature: 'prices',
      summary: 'قیمت لیست کالاها از فهرست‌های مهرماه مکث‌سیلور، وینتورا و توربومکس به‌روز شد (۱۸۷ کالا) و چند کد توربومکس مطابق فهرست اصلاح شد. در صفحهٔ «قیمت‌ها» می‌توانید یک درصد را روی همهٔ کالاهای یک گروه، نوع کالا یا برند بزنید؛ اول پیش‌نمایش می‌بینید و بعد اعمال می‌کنید.',
      details: ['مثال: گروه «تجهیزات پخت»، درصد ۱۰، گرد کردن به ۱۰٬۰۰۰ تومان ← پیش‌نمایش ← اعمال.', 'کالاهای «استعلام» و «شارژ» تغییر نمی‌کنند و قیمت‌های ویرایش‌شدهٔ قبلی با همین تغییر جدید جایگزین می‌شود.'] },
    { id: 'roadmap-timeline', date: '1405/07/27', tag: 'جدید', title: 'نقشهٔ راه: خط زمانی مرحله‌های پروژه', roles: ['manager', 'ceo', 'sales_manager'], feature: 'roadmap',
      summary: 'صفحهٔ تازهٔ «نقشهٔ راه» (فقط مدیریت، CEO و مدیر فروش): کارت‌های مرحله‌ها روی یک خط زمانی؛ سمت راست انجام‌شده‌ها و سمت چپ پیش رو. صفحه روی مرحلهٔ جاری باز می‌شود. در صفحهٔ اصلی هم بخش خاکستری «به‌زودی» نشان می‌دهد هر بخش آینده با کدام مرحله فعال می‌شود.',
      details: ['برای دیدن مرحله‌ها یک بار فایل نقشهٔ راه را تکنولوژی ارتباطات سازمانی بارگذاری می‌کند؛ محتوا فقط در پایگاه داده است و در کد عمومی سایت نیست.'] },
    { id: 'fairs-visitors-slides-only', date: '1405/07/27', tag: 'بهبود', title: 'نمایشگاه‌ها برای بازدیدکننده‌ها فقط اسلاید است',
      summary: 'کسی که وارد حساب نشده است نمایشگاه‌ها را فقط در اسلایدهای صفحهٔ اصلی می‌بیند؛ دکمه و آیکن نمایشگاه‌ها در منو و نوار پایین نیست و صفحهٔ نمایشگاه‌ها برایش باز نمی‌شود.' },
    { id: 'clay-icons-3', date: '1405/07/27', tag: 'بهبود', title: 'آیکن‌های سه‌بعدی تازه در سراسر برنامه',
      summary: 'بالای صفحهٔ مشتریان، سبد پیش‌فاکتور، نوار نسخهٔ تازه، نوار آفلاین، صفحهٔ بخش خاموش، «چیزی پیدا نشد»، ثبت موفق درخواست و گروه‌های صفحهٔ ویژگی‌ها حالا آیکن سه‌بعدی دارند.' },
    { id: 'speed-round-2', date: '1405/07/27', tag: 'بهبود', title: 'صفحه‌ها فوراً باز می‌شوند',
      summary: 'صفحه‌هایی که قبلاً دیده‌اید از حافظهٔ گوشی بلافاصله باز می‌شود و نسخهٔ تازه‌اش پشت صحنه می‌آید. فهرست «تازه‌ها» هم سبک‌تر شد (قدیمی‌ها فقط با «همهٔ تازه‌ها» بارگذاری می‌شود) و تصویرهای کاشی‌ها حدود یک‌پنجم سبک‌تر شد، بدون افت کیفیت.' },
    { id: 'popup-fast-chat-fab', date: '1405/07/27', tag: 'بهبود', title: 'پنجرهٔ گفت‌وگوها و پیش‌فاکتورها سریع‌تر شد؛ دکمهٔ مدادی مثل تلگرام',
      summary: 'پنجره‌های گفت‌وگوها و پیش‌فاکتورها چند ثانیه بعد از باز شدن صفحه پشت صحنه آماده می‌شوند و با یک ضربه فوراً بالا می‌آیند؛ تا لحظهٔ آماده شدن اسکلت بارگذاری نشان داده می‌شود. به‌جای دکمهٔ «گفت‌وگوی تازه» یک دکمهٔ گردِ مدادی روی فهرست گفت‌وگوها شناور است.' },
    { id: 'splash-intro', date: '1405/07/27', tag: 'جدید', title: 'انیمیشن شروع برنامه',
      summary: 'وقتی برنامهٔ نصب‌شده را باز می‌کنید، بعد از صفحهٔ زرد گوشی، لوگو می‌جهد، موج‌ها پخش می‌شوند، آیکن‌های سه‌بعدی محصولات دور آن می‌نشینند، نام مکث‌سیلور حرف‌به‌حرف بالا می‌آید و صفحه مثل دریچه باز می‌شود.',
      details: ['هر بار که برنامه را تازه باز کنید یک بار پخش می‌شود و با یک ضربه رد می‌شود. برای دیدن آن در مرورگر به نشانی هر صفحه ?splash=1 اضافه کنید.'] },
    { id: 'proforma-customer-form', date: '1405/07/27', tag: 'بهبود', title: 'فرم مشتری پیش‌فاکتور کامل‌تر شد',
      summary: 'هنگام ساخت پیش‌فاکتور از طراح کافه و رستوران: نام و نام خانوادگی، موبایل، استان و سپس شهر، کد پستی، نشانی کامل و اینکه خود مشتری تحویل می‌گیرد یا شخص دیگری.',
      details: ['همهٔ بخش‌ها الزامی است؛ مشخصات گیرنده فقط وقتی خواسته می‌شود که «شخص دیگری» را بزنید.', 'در صفحهٔ اصلی برای بازدیدکننده‌ها دیگر کاشی نمایشگاه‌ها نیست (فقط اسلاید آن می‌ماند) و کاشی‌ها از بنر فاصله دارند.'] },
    { id: 'planner-tiles-responsive', date: '1405/07/27', tag: 'بهبود', title: 'کاشی‌های کسب‌وکار: تعداد در هر ردیف بر اساس اندازهٔ صفحه',
      summary: 'در صفحهٔ بزرگ کاشی‌ها کوچک‌تر و بیشتر در هر ردیف می‌آید و در گوشی سه‌تا سه‌تا؛ ایرادی که با رفتن ماوس روی کاشی تصویر بقیه کاشی‌ها را می‌پراند برطرف شد.' },
    { id: 'panel-popups', date: '1405/07/27', tag: 'بهبود', title: 'گفت‌وگوها و پیش‌فاکتورها در پنجرهٔ بازشو باز می‌شود',
      summary: 'با زدن «گفت‌وگوها»، «پیش‌فاکتورها» (و پورسانت و تیم) از صفحهٔ اصلی، نوار پایین یا هر جای دیگر، پنجره‌ای از پایین بالا می‌آید و از صفحه‌ای که در آن هستید بیرون نمی‌روید. فقط آیکن آدمک شما را به پنل می‌برد.',
      details: ['پنجره را با ✕، کلید Esc، زدن بیرون پنجره یا دکمهٔ برگشت گوشی ببندید.'] },
    { id: 'tiles-swipe-update-bar', date: '1405/07/27', tag: 'بهبود', title: 'کاشی‌های کسب‌وکار، آیکن مشتریان، جهت اسلاید و نوار نسخهٔ تازه',
      summary: 'کاشی‌های «طراحی کسب‌وکار» مثل صفحهٔ اصلی شد (یک تصویر و یک نام)، آیکن‌های بالای صفحهٔ مشتریان سه‌بعدی و وسط‌چین شد، اسلاید صفحهٔ اصلی درست‌تر می‌لغزد و نوار «نسخهٔ تازه» با انیمیشن می‌آید و اگر نزنید خودش می‌رود.',
      details: ['اسلایدها: انگشت را به راست بکشید اسلاید بعدی از سمت چپ می‌آید و برعکس، مطابق جهت فارسی.', 'نوار نسخهٔ تازه بعد از حدود ۱۲ ثانیه با انیمیشن ناپدید می‌شود؛ اگر انگشت یا ماوس روی آن باشد منتظر می‌ماند.'] },
    { id: 'speed-lighter', date: '1405/07/27', tag: 'بهبود', title: 'سایت سبک‌تر و سریع‌تر شد',
      summary: 'فونت سایت از ۳۲۰ به حدود ۹۰ کیلوبایت رسید، کاتالوگ زودتر بارگذاری می‌شود و تصویر اسلایدهای صفحهٔ اصلی فقط وقتی لازم است می‌آید؛ صفحه‌ها روی گوشی زودتر باز می‌شوند.',
      details: ['طراح کافه و رستوران دیگر «سینک و شست‌وشو» را پیشنهاد نمی‌دهد.'] },
    { id: 'planner-more-businesses', date: '1405/07/27', tag: 'جدید', title: 'طراح کافه و رستوران: هفت کسب‌وکار تازه با آیکن سه‌بعدی', roles: ALL_SALES, feature: 'planner',
      summary: 'کاشی‌های انتخاب کسب‌وکار از شش به سیزده رسید: قنادی و کیک، بستنی و دسر، کبابی و چلوکبابی، شاورما و کباب ترکی، کترینگ و آشپزخانهٔ مرکزی، چایخانه و صبحانه، سلف‌سرویس و غذاخوری.',
      details: ['«شیرینی و نانوایی» دو بخش شد: نانوایی و قنادی و کیک. هر کسب‌وکار فهرست دستگاه و سؤال‌های خودش را دارد.', 'سینک و شست‌وشو هنوز در کاتالوگ نیست و در طرح با «مشورت با کارشناس» نشان داده می‌شود.'] },
    { id: 'catalog-cart-morph', date: '1405/07/27', tag: 'جدید', title: 'سبد پیش‌فاکتور با انیمیشن در کاتالوگ (گوشی)',
      summary: 'وقتی کالایی به پیش‌فاکتور اضافه می‌کنید تصویرش به سبد پرواز می‌کند؛ با پایین رفتن صفحه دکمهٔ پیش‌فاکتور به یک سبد طلایی کنار جست‌وجو تبدیل می‌شود و با برگشتن به بالا دوباره دکمهٔ پیش‌فاکتور می‌شود.',
      details: ['روی سبد تعداد کالاها دیده می‌شود و با هر کالای تازه جرقه و ضربان می‌زند. سبد را بزنید تا پیش‌فاکتور باز شود.', 'اگر در گوشی «کاهش حرکت» روشن باشد انیمیشن‌ها نمایش داده نمی‌شود.'] },
    { id: 'panel-apps', date: '1405/07/27', tag: 'بهبود', title: 'پنل کاربری مثل صفحهٔ اصلی: شبکهٔ آیکن‌ها (گوشی و کامپیوتر)',
      summary: 'در گوشی بخش‌های پنل (نمای کلی، پیش‌فاکتورها، گفت‌وگوها، پورسانت، تیم، شرح وظایف و تنظیمات) به‌صورت آیکن‌های بزرگ دیده می‌شود؛ هر آیکن را بزنید تا باز شود و با «همهٔ بخش‌ها» برگردید.',
      details: ['نوار تب‌های پنل که در گوشی بیرون صفحه می‌رفت و «تنظیمات» گم می‌شد برداشته شد. روی کامپیوتر هم همین شبکه جای نوار تب‌ها آمد.', 'روی آیکن گفت‌وگوها شمارندهٔ پیام‌های بی‌پاسخ، و روی پیش‌فاکتورها (برای اکانت منیجر) شمارندهٔ منتظر بررسی دیده می‌شود.'] },
    { id: 'ux-features-tasks', date: '1405/07/26', tag: 'جدید', title: 'کارهای من، خاموش و روشن کردن بخش‌ها، بارگذاری نرم و یادآوری فیلترها',
      summary: 'صفحهٔ اصلی بالای همه نشان می‌دهد چه کارهایی منتظر شماست؛ مسئول فناوری می‌تواند بخش‌های سایت را روشن یا خاموش کند؛ صفحه‌ها هنگام بارگذاری اسکلت خاکستری دارند، قطع اینترنت اعلام می‌شود و فیلترها یادتان می‌ماند.',
      details: ['کارهای من: درخواست‌های تازه، سفارش‌های منتظر مسیر، آماده‌سازی انبار، گفت‌وگوهای بی‌پاسخ و مانند آن، با لینک مستقیم؛ از همان فهرست زنگ ساخته می‌شود.',
        'ویژگی‌ها (فقط مسئول فناوری): هر بخش که خاموش شود برای همه ناپدید می‌شود: کاشی، نوار پایین، منو، اسلاید بنر، خبرهای «تازه‌ها» و خود صفحه. دوباره روشن کنید همه‌چیز برمی‌گردد.',
        'اسکلت بارگذاری، نوار «آفلاین هستید» و یادآوری آخرین فیلتر مشتریان، تحلیل رقبا و نمایشگاه‌ها روی همین دستگاه.'] },
    { id: 'customers-visual', date: '1405/07/26', tag: 'بهبود', title: 'مشتریان: ظاهر تازه با رنگ و آیکن',
      summary: 'هر مشتری یک رنگ و حرف اول رنگی دارد؛ بالای صفحه چهار کاشی با آیکن و یک نوار پراکندگی وضعیت مشتریان آمده؛ کارت‌ها رتبهٔ پنج مشتری برتر و فلش رشد یا افت را نشان می‌دهند؛ صفحهٔ هر مشتری هم آیکن و نمودار رنگی دارد.',
      details: ['رنگ مشتری از گروه (همکار مسئول) گرفته می‌شود؛ مشتریان یک همکار هم‌رنگ‌اند و گروه‌ها را راحت‌تر می‌شود تشخیص داد. اگر گروهی ثبت نشده باشد رنگ از نام مشتری می‌آید.'] }
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
    return extra.concat(UPDATES, window.MS_UPDATES_OLD || []);
  }
  function visible() {
    if (!signed()) return [];
    var r = role(), nr = window.MSRoles && r ? window.MSRoles.norm(r) : r;
    return all().filter(function (u) { return (!u.roles || (nr && u.roles.indexOf(nr) >= 0)) && !(window.MSFeatures && window.MSFeatures.newsHidden(u)); });
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
    return (u.details || (u.summary ? [u.summary] : [])).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
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
  // the popup is a timeline: one header per date, each update a card with its summary, the details open under a button
  function dayLabel(date) {
    var E = window.MSEvents; if (!E || !E.toJ) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; }, key = function (d) { var j = E.toJ(d); return j.jy + '/' + p(j.jm) + '/' + p(j.jd); };
    var now = new Date(), yest = new Date(now.getTime() - 86400000);
    return date === key(now) ? 'امروز' : date === key(yest) ? 'دیروز' : '';
  }
  function tlCard(u, s, open) {
    var fresh = !u.quiet && s.indexOf(u.id) < 0, hasMore = u.details && u.details.length && (u.details.length > 1 || u.details[0] !== u.summary);
    return '<li class="tl-item' + (fresh ? ' fresh' : '') + '" data-id="' + esc(u.id) + '"><span class="tl-dot" aria-hidden="true"></span><article class="tl-card">' +
      '<div class="upd-meta"><span class="upd-tag">' + esc(u.tag || '') + '</span>' + (fresh ? '<i class="upd-new" title="خوانده‌نشده"></i>' : '') + '</div>' +
      '<h4>' + esc(u.title) + '</h4><p class="tl-sum">' + esc(u.summary || '') + '</p>' +
      (hasMore ? '<button type="button" class="tl-toggle" data-tl aria-expanded="' + (!!open) + '">' + (open ? 'بستن جزئیات' : 'جزئیات') + '</button><div class="tl-det' + (open ? ' open' : '') + '"><div>' + body(u) + '</div></div>' : '') +
      '</article></li>';
  }
  // the older entries are a separate file, fetched the first time the full list is opened
  var VER = ((document.currentScript && document.currentScript.src.match(/v=(\d+)/)) || [])[1] || '', archiveAsked = false;
  function withArchive(go) {
    if (window.MS_UPDATES_OLD || archiveAsked) { go(); return; }
    archiveAsked = true;
    var s = document.createElement('script'); s.src = './assets/updates-archive.js' + (VER ? '?v=' + VER : '');
    s.onload = s.onerror = function () { go(); };
    document.head.appendChild(s);
  }
  function openAll(focusId) {
    if (!window.MS_UPDATES_OLD && !archiveAsked) { withArchive(function () { openAll(focusId); }); return; }
    var list = visible(), s = seen(), d = ensureDialog(), days = [], map = {};
    list.forEach(function (u) { var k = u.date || ''; if (!map[k]) { map[k] = { date: k, items: [] }; days.push(map[k]); } map[k].items.push(u); });
    d.setAttribute('aria-label', 'تازه‌ها');
    d.innerHTML = '<div class="upd-dbar"><h2>تازه‌ها</h2><button type="button" class="upd-x" data-upd-close aria-label="بستن">' + CLOSE + '</button></div>' +
      (days.length ? '<div class="tl-wrap">' + days.map(function (g) {
        var lab = dayLabel(g.date);
        return '<section class="tl-day"><h3 class="tl-date"><time>' + fa(g.date) + '</time>' + (lab ? '<small>' + lab + '</small>' : '') + '</h3><ol class="tl">' +
          g.items.map(function (u) { return tlCard(u, s, u.id === focusId); }).join('') + '</ol></section>';
      }).join('') + '</div>' : '<p class="upd-empty">فعلاً تازه‌ای نیست.</p>');
    if (!d.open) d.showModal();
    if (focusId) { var el = d.querySelector('[data-id="' + focusId + '"]'); if (el && el.scrollIntoView) setTimeout(function () { el.scrollIntoView({ block: 'center' }); }, 60); }
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
    if (one) { openAll(one.getAttribute('data-upd-open')); return; }
    var tg = e.target.closest('[data-tl]');
    if (tg) {
      var det = tg.parentNode.querySelector('.tl-det'), on = !det.classList.contains('open');
      det.classList.toggle('open', on); tg.setAttribute('aria-expanded', on); tg.textContent = on ? 'بستن جزئیات' : 'جزئیات';
    }
  });
  function apply() { paintDot(); paintSection(); }
  var G = window.MSGate;
  if (G && !G.__upd) { var orig = G.apply; G.apply = function () { orig.apply(G, arguments); apply(); }; G.__upd = true; }
  window.addEventListener('storage', function (e) { if (e.key === 'ms-role' || e.key === SEEN_KEY) apply(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  window.MSUpdates = { paintDot: paintDot, unseen: function () { return unseen().length; }, openAll: openAll };
})();

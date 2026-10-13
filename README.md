# درگاه مدیریتی مکث‌سیلور

وب‌سایت استاتیک مدیریتی مکث‌سیلور: داشبورد CEO، تحلیل جزئیات فروش و نقشهٔ فروش منطقه‌ای.

- **سایت:** [soheil-aghayani.github.io/MaxSilver](https://soheil-aghayani.github.io/MaxSilver/)
- **مخزن:** [Soheil-Aghayani/MaxSilver](https://github.com/Soheil-Aghayani/MaxSilver)

## صفحه‌ها

| صفحه | فایل | کاربرد |
|---|---|---|
| درگاه مدیریت | [`index.html`](index.html) | ورودی و معرفی بخش‌ها |
| داشبورد CEO | [`ceo-dashboard.html`](ceo-dashboard.html) | نقشهٔ تعاملی ۳۱ استان، شش منطقه، مقایسهٔ سال‌ها، اشتراک QR و نصب PWA |
| تحلیل جزئیات فروش | [`sales-analysis.html`](sales-analysis.html) | فیلتر، نمودار، جدول و خروجی گزارش‌های مشتری و کالا |
| کاتالوگ محصولات | [`product-catalog.html`](product-catalog.html) | ۳۴۳ ردیف از سه برند؛ جست‌وجو، فیلتر و مقایسهٔ چهار محصول (داده: `assets/catalog.json` ساخته‌شده با `tools/build_catalog.py`، بدون قیمت) |
| نقشهٔ فروش | [`sales-process.html`](sales-process.html) | دوازده مرحلهٔ فروش با مسئول هر مرحله و نقاط کنترل |
| برندبوک‌ها | [`brand-books.html`](brand-books.html) | هویت چهار برند گروه (مکث‌سیلور، وینتورا، شف‌مارکت، توربومکس): لوگو، رنگ، فونت، لحن؛ خروجی PDF با قالب سند مکث‌سیلور |

هر صفحه سربرگ و پانویس مشترک را مستقیماً در HTML دارد؛ ظاهر مشترک از `assets/site-shell.2.css` می‌آید و هر صفحه فقط یک فایل CSS و یک فایل JS اختصاصی دارد.

## داده و حریم خصوصی

- **گزارش‌های خام فروش در سایت منتشر نمی‌شوند.** کاربر در صفحهٔ تحلیل فایل XLS/XLSX/CSV را انتخاب می‌کند؛ پردازش فقط در مرورگر انجام می‌شود و نتیجه در IndexedDB همان دستگاه نگه‌داری می‌شود (با دکمهٔ حذف).
- پوشهٔ `data/local/` برای فایل‌های خصوصی است و در `.gitignore` قرار دارد. هرگز آن را commit نکنید.
- صفحه‌ها `noindex` هستند و فایل‌های توسعه (`README.md`، `validate_*.mjs`، `data/transaction-schema.json`) با `_config.yml` از سایت حذف می‌شوند.
- قالب و شِمای تراکنش: [`data/transaction-schema.json`](data/transaction-schema.json) و [`data/transaction-template.csv`](data/transaction-template.csv).
- واحد مبلغ در منبع مشخص نیست؛ برچسب واحد در رابط فقط برچسب است و تبدیلی انجام نمی‌دهد.
- ستون «آخرین قیمت خرید» خوانده نمی‌شود و وارد مدل تحلیل نمی‌شود.

## اجرای محلی

```powershell
python -m http.server 8769
```

سپس `http://127.0.0.1:8769/` را باز کنید. به CDN یا سرور برنامه‌ای نیازی نیست.

## اعتبارسنجی

```powershell
node validate_dashboard.mjs
node validate_portal.mjs
node validate_pwa.mjs
```

این بررسی‌ها ساختار نقشه و مناطق، منطق تحلیل، سربرگ مشترک، نبودن فایل بی‌مصرف در `assets/` و قابلیت‌های PWA را می‌سنجند. اگر فایل‌های خصوصی در `data/local/` باشند، مجموع هر فایل با ردیف جمع آن تطبیق داده می‌شود.

## انتشار

هر تغییر در یک صفحه یا asset را با افزایش `V` در `service-worker.js` و پارامتر `?v=` صفحه‌ها همراه کنید تا کش قدیمی جایگزین شود.

## مجوزها

فونت Estedad، `qrcode-generator` و SheetJS در [`LICENSES.md`](LICENSES.md) آمده‌اند.

---

**تهیه‌کنندگان: محمود قربانی و سهیل آقایانی**
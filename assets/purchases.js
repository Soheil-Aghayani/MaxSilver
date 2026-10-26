// Purchase history on the customer page: what each customer bought, line by line, loaded from the accounting program's reports.
//  - paint(root, code): adds the history card under a customer, or the sales import card under «ورود اطلاعات»;
//  - the import reads an Excel/CSV report of sales invoice lines, maps its columns by their Persian names, shows what it found, and sends it
//    to the server in batches. The data lives on the server only (never in this public site); the server decides who may read it.
(function (w) {
  'use strict';
  var api = w.MSApi;
  function on() { return !!(api && api.enabled && api.enabled()); }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var faInt = new Intl.NumberFormat('fa-IR');
  function latin(s) { return String(s == null ? '' : s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); }); }
  function fix(s) { return String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function key(s) { return latin(fix(s)).toLowerCase(); }
  function num(v) { if (v == null || v === '') return null; var n = Number(latin(String(v)).replace(/[٬,\s]/g, '').replace(/٫/g, '.')); return isFinite(n) ? n : null; }
  function toman(rial) { return faInt.format(Math.round((Number(rial) || 0) / 10)); }

  // ---------- reading a report
  var ALIAS = {
    customer_code: ['کد مشتری', 'کد طرف حساب', 'کد طرفحساب', 'کد حساب', 'کد'],
    customer_name: ['نام مشتری', 'طرف حساب', 'نام طرف حساب', 'مشتری', 'نام و نام خانوادگی', 'نام کامل', 'عنوان'],
    invoice_no: ['شماره فاکتور', 'شماره', 'شماره سند', 'شماره فروش'],
    jdate: ['تاریخ', 'تاریخ فاکتور', 'تاریخ سند'],
    item_code: ['کد کالا', 'کد محصول', 'کد کالا/خدمت'],
    item_name: ['نام کالا', 'شرح کالا', 'کالا', 'نام کالا/خدمت', 'شرح', 'نام محصول'],
    qty: ['تعداد', 'مقدار', 'تعداد/مقدار'],
    unit: ['واحد', 'واحد شمارش', 'واحد اندازه گیری'],
    unit_price: ['فی', 'قیمت واحد', 'مبلغ واحد', 'فی واحد', 'قیمت'],
    amount: ['مبلغ', 'مبلغ کل', 'جمع', 'مبلغ ناخالص', 'قیمت کل', 'مبلغ خالص', 'مبلغ نهایی'],
    discount: ['تخفیف'],
    tax: ['مالیات', 'ارزش افزوده', 'مالیات بر ارزش افزوده', 'مالیات و عوارض'],
    pay_status: ['وضعیت پرداخت', 'وضعیت تسویه', 'وضعیت', 'وضعیت فاکتور'],
    pay_method: ['نحوه پرداخت', 'روش پرداخت', 'نوع پرداخت', 'نحوه تسویه', 'نوع فروش', 'شرایط پرداخت'],
    ship_address: ['آدرس', 'نشانی', 'آدرس مشتری', 'آدرس تحویل'],
    ship_zip: ['کد پستی'],
    phone: ['تلفن', 'شماره تماس', 'موبایل', 'تلفن همراه', 'شماره موبایل', 'همراه']
  };
  var NEEDED = ['customer_code', 'invoice_no', 'item_name'];
  var FILL = ['customer_code', 'customer_name', 'invoice_no', 'jdate', 'pay_status', 'pay_method', 'ship_address', 'ship_zip', 'phone'];   // an invoice's header values appear only on its first line in many reports

  // Gregorian date -> Jalali (for report cells that arrive as real dates)
  function g2j(gy, gm, gd) {
    var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], gy2 = gm > 2 ? gy + 1 : gy;
    var days = 355666 + 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + gdm[gm - 1];
    var jy = -1595 + 33 * Math.floor(days / 12053); days %= 12053; jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30), jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
  }
  function dateOf(v) {
    if (v instanceof Date && !isNaN(v)) { var j = g2j(v.getFullYear(), v.getMonth() + 1, v.getDate()); return pad(j); }
    var s = latin(fix(v)).replace(/[\-.\s]+/g, '/').replace(/^\/|\/$/g, ''), m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s);
    if (!m) return '';
    var y = Number(m[1]);
    if (y >= 1300 && y <= 1500) return pad([y, Number(m[2]), Number(m[3])]);
    if (y >= 1900 && y <= 2100) return pad(g2j(y, Number(m[2]), Number(m[3])));      // a Gregorian text date
    return '';
  }
  function pad(j) { return j[0] + '/' + ('0' + j[1]).slice(-2) + '/' + ('0' + j[2]).slice(-2); }

  function findHeader(matrix) {
    for (var r = 0; r < Math.min(matrix.length, 15); r++) {
      var cols = {}, hits = 0;
      (matrix[r] || []).forEach(function (h, i) {
        var k = key(h); if (!k) return;
        Object.keys(ALIAS).forEach(function (f) { if (cols[f] === undefined && ALIAS[f].map(key).indexOf(k) >= 0) { cols[f] = i; hits++; } });
      });
      if (NEEDED.every(function (f) { return cols[f] !== undefined; })) return { row: r, cols: cols };
    }
    return null;
  }
  function parse(matrix, unitIsToman) {
    var head = findHeader(matrix);
    if (!head) return { error: 'ستون‌های لازم پیدا نشد. دست‌کم «کد مشتری»، «شماره فاکتور» و «نام کالا» باید در سطر عنوان باشد.' };
    var rows = [], skipped = 0, last = {}, lineNo = {}, mult = unitIsToman ? 10 : 1, bad = 0;
    for (var i = head.row + 1; i < matrix.length; i++) {
      var rw = matrix[i] || [], rec = {};
      if (!rw.some(function (x) { return x != null && String(x).trim() !== ''; })) continue;
      Object.keys(head.cols).forEach(function (f) { rec[f] = rw[head.cols[f]]; });
      if (rec.invoice_no != null && String(rec.invoice_no).trim() !== '' && String(rec.invoice_no) !== String(last.invoice_no)) last = {};   // a new invoice starts: nothing is carried over from the previous one
      FILL.forEach(function (f) { if (rec[f] == null || String(rec[f]).trim() === '') { if (last[f] !== undefined) rec[f] = last[f]; } else last[f] = rec[f]; });
      var code = latin(fix(rec.customer_code)).replace(/\.0+$/, ''), inv = latin(fix(rec.invoice_no)).replace(/\.0+$/, ''), name = fix(rec.item_name);
      if (!code || !inv || !name || /^(جمع|جمع کل|جمع کل صفحه)$/.test(name)) { skipped++; continue; }
      var jd = dateOf(rec.jdate), year = jd ? Number(jd.slice(0, 4)) : 0;
      if (!jd) { bad++; skipped++; continue; }
      var k = year + '|' + inv; lineNo[k] = (lineNo[k] || 0) + 1;
      var zip = latin(fix(rec.ship_zip)).replace(/\D/g, '');
      var o = { customer_code: code.slice(0, 40), invoice_no: inv.slice(0, 40), line_no: lineNo[k], jdate: jd, year: year, item_name: name.slice(0, 255) };
      if (rec.customer_name) o.customer_name = fix(rec.customer_name).slice(0, 190);
      if (rec.item_code) o.item_code = latin(fix(rec.item_code)).slice(0, 60);
      if (rec.unit) o.unit = fix(rec.unit).slice(0, 30);
      var q = num(rec.qty); if (q !== null) o.qty = q;
      var up = num(rec.unit_price); if (up !== null) o.unit_price = up * mult;
      var am = num(rec.amount); o.amount = am !== null ? am * mult : (q !== null && up !== null ? q * up * mult : 0);
      var dc = num(rec.discount); if (dc !== null) o.discount = dc * mult;
      var tx = num(rec.tax); if (tx !== null) o.tax = tx * mult;
      if (rec.pay_status) o.pay_status = fix(rec.pay_status).slice(0, 40);
      if (rec.pay_method) o.pay_method = fix(rec.pay_method).slice(0, 80);
      if (rec.ship_address) o.ship_address = fix(rec.ship_address).slice(0, 400);
      if (/^\d{10}$/.test(zip)) o.ship_zip = zip;
      var ph = latin(fix(rec.phone)).replace(/[^\d+]/g, ''); if (ph) o.phone = ph.slice(0, 30);
      rows.push(o);
    }
    var inv = {}, cust = {}, years = {};
    rows.forEach(function (r) { inv[r.year + '|' + r.invoice_no] = 1; cust[r.customer_code] = 1; years[r.year] = (years[r.year] || 0) + 1; });
    return { rows: rows, skipped: skipped, badDate: bad, invoices: Object.keys(inv).length, customers: Object.keys(cust).length, years: years, mapped: Object.keys(head.cols) };
  }

  // ---------- the import card
  var S = { open: false, busy: false, res: null, msg: '', err: '', toman: false, sent: 0 };
  function ensureXlsx() {
    if (w.XLSX) return Promise.resolve(w.XLSX);
    return new Promise(function (ok, bad) { var s = document.createElement('script'); s.src = './assets/vendor/xlsx.full.min.js'; s.onload = function () { ok(w.XLSX); }; s.onerror = function () { bad(new Error('کتابخانهٔ خواندن Excel بارگذاری نشد.')); }; document.head.appendChild(s); });
  }
  function importHtml() {
    var h = '<h2>فاکتورهای فروش (تاریخچهٔ خرید)</h2>';
    if (!S.open) return h + '<p class="cu-note">گزارش «فاکتورهای فروش با اقلام» نرم‌افزار حسابداری (Excel یا CSV) را اینجا بارگذاری کنید تا خریدهای هر مشتری در صفحهٔ خودش دیده شود. داده فقط روی سرور می‌ماند.</p><button type="button" class="cu-btn" data-pu-open>شروع</button>';
    h += '<label class="cu-file"><input type="file" id="puFile" accept=".xls,.xlsx,.csv"><span>انتخاب گزارش فاکتورهای فروش</span></label>' +
      '<label class="cu-check"><input type="checkbox" id="puToman"' + (S.toman ? ' checked' : '') + '> مبلغ‌های فایل به تومان است (اگر نزده باشید، ریال فرض می‌شود، مثل گزارش‌های سپیدار)</label>';
    if (S.busy && !S.res) h += '<p class="cu-note">در حال خواندن…</p>';
    if (S.err) h += '<p class="cu-err" role="alert">' + esc(S.err) + '</p>';
    var r = S.res;
    if (r && r.rows) {
      var yrs = Object.keys(r.years).sort().map(function (y) { return faInt.format(y) + ': ' + faInt.format(r.years[y]) + ' ردیف'; }).join(' · ');
      h += '<div class="cu-kpis"><div><span>ردیف کالا</span><b>' + faInt.format(r.rows.length) + '</b></div><div><span>فاکتور</span><b>' + faInt.format(r.invoices) + '</b></div><div><span>مشتری</span><b>' + faInt.format(r.customers) + '</b></div></div>' +
        '<p class="cu-note">سال‌ها: ' + esc(yrs) + '</p>' +
        '<p class="cu-note">ستون‌های شناخته‌شده: ' + esc(r.mapped.join('، ')) + (r.skipped ? ' · ردیف‌های نادیده‌گرفته‌شده: ' + faInt.format(r.skipped) + (r.badDate ? ' (' + faInt.format(r.badDate) + ' مورد بدون تاریخ درست)' : '') : '') + '</p>' +
        '<button type="button" class="cu-btn primary" data-pu-save' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'در حال ارسال… ' + faInt.format(S.sent) + ' از ' + faInt.format(r.rows.length) : 'ذخیره در پایگاه (روی سرور)') + '</button>';
    }
    if (S.msg) h += '<p class="cu-ok" role="status">' + esc(S.msg) + '</p>';
    return h;
  }
  function readFile(file) {
    S.busy = true; S.err = ''; S.msg = ''; S.res = null; repaint();
    return ensureXlsx().then(function (X) {
      return file.arrayBuffer().then(function (buf) {
        var wb = X.read(buf, { type: 'array', cellDates: true, codepage: 65001 }), sheet = wb.Sheets[wb.SheetNames[0]];
        var matrix = X.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false });
        S.raw = matrix; var res = parse(matrix, S.toman);
        if (res.error) S.err = res.error; else S.res = res;
      });
    }).then(null, function (e) { S.err = (e && e.message) || 'خواندن فایل انجام نشد.'; }).then(function () { S.busy = false; repaint(); });
  }
  function save() {
    var rows = S.res.rows.slice(), sent = 0, total = rows.length; S.busy = true; S.sent = 0; S.err = ''; S.msg = ''; repaint();
    function next() {
      if (!rows.length) return Promise.resolve();
      var chunk = rows.splice(0, 500);
      return api.raw('POST', 'purchases/import', { rows: chunk }).then(function () { sent += chunk.length; S.sent = sent; repaint(); return next(); });
    }
    return next().then(function () { S.msg = faInt.format(total) + ' ردیف ذخیره شد. صفحهٔ هر مشتری را باز کنید تا خریدهایش را ببینید.'; S.res = null; cache = {}; },
      function (e) { S.err = (e && e.message) || 'ذخیره نشد.'; if (e && e.data && e.data.errors) S.err += ' ' + Object.keys(e.data.errors).slice(0, 2).map(function (k) { return e.data.errors[k][0]; }).join(' '); }).then(function () { S.busy = false; repaint(); });
  }

  // ---------- the history card of one customer
  var cache = {}, rootEl = null, codeNow = '';
  function load(code) {
    if (cache[code] !== undefined) return;
    cache[code] = 'loading';
    api.raw('GET', 'customers/' + encodeURIComponent(code) + '/purchases').then(function (r) { cache[code] = r; }, function () { cache[code] = { rows: [], totals: {}, none: true }; }).then(repaint);
  }
  function historyHtml(code) {
    var r = cache[code], h = '<h2>خریدهای ثبت‌شده در حسابداری</h2>';
    if (r === undefined || r === 'loading') return h + '<p class="cu-note">در حال بارگذاری…</p>';
    if (!r.rows.length) return h + '<p class="cu-note">برای این مشتری هنوز فاکتوری بارگذاری نشده است.</p>';
    var inv = {}, order = [];
    r.rows.forEach(function (x) { var k = x.year + '|' + x.invoice_no; if (!inv[k]) { inv[k] = { no: x.invoice_no, date: x.jdate, status: x.pay_status, method: x.pay_method, addr: x.ship_address, zip: x.ship_zip, lines: [], sum: 0 }; order.push(k); } inv[k].lines.push(x); inv[k].sum += Number(x.amount) || 0; });
    h += '<p class="cu-note">مبلغ‌ها به تومان است. جمع هر سال: ' + Object.keys(r.totals).sort().reverse().map(function (y) { return faInt.format(y) + ': <b>' + toman(r.totals[y]) + '</b>'; }).join(' · ') + '</p>';
    h += order.slice(0, 60).map(function (k) {
      var v = inv[k];
      return '<details class="cu-inv2"><summary><b dir="ltr">' + esc(v.no) + '</b><span>' + esc(latin(v.date || '').replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); })) + '</span><span>' + (v.status ? esc(v.status) : '') + (v.method ? ' · ' + esc(v.method) : '') + '</span><em>' + toman(v.sum) + '</em></summary>' +
        '<div class="cu-tablewrap"><table class="cu-tbl"><thead><tr><th>کالا</th><th>تعداد</th><th>فی</th><th>مبلغ</th></tr></thead><tbody>' + v.lines.map(function (l) {
          return '<tr><td>' + esc(l.item_name) + (l.item_code ? '<small dir="ltr">' + esc(l.item_code) + '</small>' : '') + '</td><td>' + faInt.format(Number(l.qty) || 0) + (l.unit ? ' ' + esc(l.unit) : '') + '</td><td>' + (l.unit_price != null ? toman(l.unit_price) : '') + '</td><td>' + toman(l.amount) + '</td></tr>';
        }).join('') + '</tbody></table></div>' + (v.addr || v.zip ? '<p class="cu-note">نشانی در فاکتور: ' + esc(v.addr || '') + (v.zip ? ' · کد پستی ' + esc(v.zip) : '') + '</p>' : '') + '</details>';
    }).join('') + (order.length > 60 ? '<p class="cu-note">نمایش ۶۰ فاکتور آخر از ' + faInt.format(order.length) + '.</p>' : '');
    return h;
  }

  function repaint() { if (rootEl) paint(rootEl, codeNow); }
  function paint(root, code) {
    rootEl = root; codeNow = code || '';
    if (!on()) return;
    var id = code ? 'cuPurch' : 'cuPurchImp', el = document.getElementById(id), html;
    if (code) { load(code); html = historyHtml(code); }
    else { if (!document.getElementById('import')) return; html = importHtml(); }
    if (!el) { el = document.createElement('section'); el.className = 'cu-card-box'; el.id = id; (code ? root : document.getElementById('import').parentNode).appendChild(el); }
    el.innerHTML = html;
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-pu-open]')) { S.open = true; repaint(); }
    else if (e.target.closest('[data-pu-save]') && S.res && !S.busy) save();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'puFile' && e.target.files && e.target.files[0]) readFile(e.target.files[0]);
    else if (e.target.id === 'puToman') { S.toman = e.target.checked; if (S.raw) { var r = parse(S.raw, S.toman); S.res = r.error ? null : r; S.err = r.error || ''; repaint(); } }
  });
  w.MSPurchases = { paint: paint, parse: parse, dateOf: dateOf, _g2j: g2j };
})(window);

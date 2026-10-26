// Hiring form (فرم استخدامی): one definition drives two outputs:
//  1. the page (fill on screen, or leave empty) with a print layout for A4 (print or «save as PDF» from the browser),
//  2. a Word file (.docx) where ONLY the candidate's boxes are fillable (Word «Restrict editing: filling in forms», optional password),
//     in the site's font (Estedad is embedded in the file) and the brand's colours.
// The company block (interview result) has no fillable box in the Word file: the candidate cannot write there.
// Later: filling the form from a resume (not built yet). Nothing here is sent anywhere: the file is made in the browser.
(function (w) {
  'use strict';
  // c: the brand colour (table heads, number badges), on: text on it, d: dark text/lines, l: light tint for labels and section bars
  var BRANDS = {
    maxsilver: { t: 'گروه صنعتی مکث‌سیلور', s: 'تولید تجهیزات آشپزخانهٔ صنعتی و خانگی', c: 'FFCC2A', on: '051934', d: '071B36', l: 'FFF3C4' },
    wintora: { t: 'مجموعه صنعتی وینتورا', s: 'تولیدکنندهٔ تجهیزات آشپزخانهٔ صنعتی و رستورانی', c: 'BF0E22', on: 'FFFFFF', d: '7A0915', l: 'FBE6E8' },
    turbomax: { t: 'توربومکس', s: 'تجهیزات حرفه‌ای قنادی و کافه', c: '111827', on: 'FFFFFF', d: '111827', l: 'E8EAEE' }
  };
  var LEVEL = 'ضعیف|متوسط|خوب|عالی';
  // field: [key, label, type, options]. type: text (default) | long (a wide box) | date (calendar) | choice (one option) | multi (any options)
  // table: tb { k, rows, cols, types (t text | s level list | d date), pre: { row: { col: text } } }
  // g2: two boxes per row (labels left and right); otherwise one box per row
  var SEC = [
    { t: 'اطلاعات شخصی', g2: 1, g: [
      ['name', 'نام و نام خانوادگی'], ['father', 'نام پدر'], ['natid', 'کد ملی'], ['idno', 'شمارهٔ شناسنامه'],
      ['issue', 'محل صدور شناسنامه'], ['birth', 'تاریخ تولد', 'date'], ['birthplace', 'محل تولد'], ['gender', 'جنسیت', 'choice', 'زن|مرد'],
      ['marital', 'وضعیت تأهل', 'choice', 'مجرد|متأهل'], ['health', 'سلامت جسمی و روحی', 'choice', 'سالم|دارای مشکل'], ['healthnote', 'در صورت مشکل توضیح دهید', 'long']] },
    { t: 'خدمت نظام وظیفه (برای آقایان)', g: [['mil', 'وضعیت', 'choice', 'انجام داده|معاف|در حال خدمت|مشمول'], ['milnote', 'نوع و علت معافیت (در صورت معافیت)', 'long']] },
    { t: 'سوابق تحصیلی', tb: { k: 'edu', rows: 2, cols: ['مدرک تحصیلی', 'رشته', 'معدل', 'تاریخ شروع', 'تاریخ پایان', 'دانشگاه یا مؤسسه', 'شهر'], types: 'tttddtt' } },
    { t: 'تجربیات شغلی (از آخرین سابقه)', tb: { k: 'job', rows: 4, cols: ['شرکت یا سازمان', 'سمت', 'تاریخ شروع', 'تاریخ پایان', 'آخرین حقوق', 'علت ترک کار'], types: 'ttddtt' } },
    { t: 'سابقهٔ کار قبلی در این شرکت', g: [['prev', 'آیا قبلاً در این شرکت کار کرده‌اید؟', 'choice', 'بلی|خیر'], ['prevwhy', 'علت قطع همکاری', 'long']] },
    { t: 'زبان‌های خارجی', tb: { k: 'lang', rows: 3, cols: ['زبان', 'خواندن', 'نوشتن', 'مکالمه'], types: 'tsss', pre: { 1: { 0: 'انگلیسی' } } } },
    { t: 'مهارت رایانه', g: [['soft', 'نرم‌افزارهای مسلط', 'multi', 'Windows|Word|Excel|PowerPoint|Access|Internet|تایپ فارسی|نرم‌افزار حسابداری'], ['softother', 'سایر نرم‌افزارها', 'long']] },
    { t: 'دوره‌های آموزشی و مهارتی', tb: { k: 'course', rows: 3, cols: ['نام دوره', 'مؤسسه برگزارکننده', 'سال', 'مدرک دارد؟'], types: 'tttt' } },
    { t: 'نوع همکاری', g: [['coop', 'تمایل به همکاری', 'multi', 'تمام وقت|پاره وقت|دورکاری یا خارج از کارگاه'], ['hours', 'در صورت پاره وقت، روزها و ساعت‌ها', 'long']] },
    { t: 'شغل درخواستی و حقوق', g2: 1, g: [['want', 'شغل مورد درخواست'], ['start', 'تاریخ آمادگی شروع کار', 'date'], ['pay', 'حقوق مورد انتظار', 'choice', 'طبق ضوابط شرکت|پیشنهادی'], ['payamt', 'مبلغ پیشنهادی (تومان)']] },
    { t: 'تخصص و توانمندی‌ها', g: [['skill', 'مواردی که در آن‌ها تجربه یا تخصص دارید', 'long']] },
    { t: 'بیمه', g2: 1, g: [
      ['ins', 'سابقهٔ پرداخت حق بیمه', 'choice', 'دارم|ندارم'], ['insnow', 'اکنون بیمهٔ فعال دارید؟', 'choice', 'بلی|خیر'],
      ['insorg', 'سازمان بیمه‌گر', 'choice', 'تأمین اجتماعی|سایر'], ['insno', 'شمارهٔ بیمه'],
      ['insyears', 'مدت سابقه (سال و ماه)'], ['insdate', 'تاریخ شروع آخرین بیمه', 'date']] },
    { t: 'نحوهٔ آشنایی با شرکت', g: [['how', 'از کجا با ما آشنا شدید؟', 'multi', 'آگهی استخدام|معرفی همکار یا آشنا|شبکه‌های اجتماعی|سایت|سایر'], ['hownote', 'توضیح (نام معرف یا نشانی آگهی)', 'long']] },
    { t: 'معرفی دو نفر آشنا (بدون نسبت فامیلی)', tb: { k: 'ref', rows: 2, cols: ['نام و نام خانوادگی', 'نسبت', 'شغل', 'محل کار', 'تلفن'], types: 'ttttt' } },
    { t: 'شرایط کاری', g: [
      ['move', 'آیا برای مأموریت یا انتقال به شهر دیگر آمادگی دارید؟', 'choice', 'بلی|خیر'], ['employed', 'اکنون مشغول به کار هستید؟', 'choice', 'بلی|خیر'],
      ['guar', 'در صورت لزوم می‌توانید تضمین بدهید؟', 'choice', 'بلی|خیر'], ['license', 'گواهینامهٔ رانندگی', 'choice', 'ندارم|پایه ۳|پایه ۲|پایه ۱|موتور'],
      ['commute', 'رفت‌وآمد', 'choice', 'سرویس شرکت|وسیلهٔ شخصی|وسیلهٔ عمومی']] },
    { t: 'افراد تحت تکفل', tb: { k: 'dep', rows: 4, cols: ['نام و نام خانوادگی', 'نسبت', 'جنسیت', 'تاریخ تولد', 'تحصیلات', 'شغل'], types: 'tttdtt' } },
    { t: 'نشانی و تماس', g2: 1, g: [['addr', 'نشانی محل سکونت', 'long'], ['house', 'نوع سکونت', 'choice', 'شخصی|اجاره‌ای|سایر'], ['phone', 'تلفن ثابت'], ['mobile', 'تلفن همراه'], ['email', 'ایمیل']] },
    { t: 'تماس اضطراری', g2: 1, g: [['emname', 'نام و نام خانوادگی'], ['emrel', 'نسبت'], ['emphone', 'تلفن همراه']] },
    { t: 'تأیید', note: 'صحت همهٔ اطلاعات این فرم را تأیید می‌کنم. تکمیل این فرم برای شرکت تعهدی دربارهٔ استخدام ایجاد نمی‌کند.', g2: 1, g: [['sign', 'نام و نام خانوادگی'], ['signdate', 'تاریخ', 'date'], ['signature', 'امضا', 'long']] }
  ];
  var COMPANY = { t: 'قسمت زیر توسط شرکت تکمیل می‌شود', rows: [['نتیجهٔ مصاحبه'], ['مصاحبه‌کننده', 'تاریخ مصاحبه'], ['امضا']] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); };
  function brandOf(brand) { return BRANDS[brand] || BRANDS.maxsilver; }
  // the page takes its colours from these custom properties (set on the sheet)
  function theme(brand) { var b = brandOf(brand); return '--hc:#' + b.c + ';--hon:#' + b.on + ';--hd:#' + b.d + ';--hl:#' + b.l; }

  // ---------------------------------------------------------------- the page
  function dateInput(name, label) {
    return '<input type="text" name="' + name + '" data-jdate data-jstart="1370" data-jclear data-jmax="' + (/^(birth|dep)/.test(name) ? 'today' : '') + '" readonly inputmode="none" placeholder="انتخاب تاریخ" aria-label="' + esc(label) + '">';
  }
  function levelSelect(name, label) {
    return '<select name="' + name + '" aria-label="' + esc(label) + '"><option value=""></option>' + LEVEL.split('|').map(function (x) { return '<option>' + x + '</option>'; }).join('') + '</select>';
  }
  function fieldHtml(f, two) {
    var k = f[0], l = f[1], t = f[2] || 'text', o = f[3] ? f[3].split('|') : [];
    if (t === 'choice' || t === 'multi') {
      return '<div class="hf-f' + (two && t === 'choice' && o.length <= 2 ? '' : ' hf-w') + '"><span class="hf-l">' + esc(l) + '</span><span class="hf-o">' + o.map(function (x, i) {
        return '<label class="hf-ck"><input type="' + (t === 'choice' ? 'radio' : 'checkbox') + '" name="' + k + (t === 'multi' ? '_' + i : '') + '" value="' + esc(x) + '"><i></i>' + esc(x) + '</label>';
      }).join('') + '</span></div>';
    }
    if (t === 'date') return '<label class="hf-f"><span class="hf-l">' + esc(l) + '</span>' + dateInput(k, l) + '</label>';
    return '<label class="hf-f' + (t === 'long' ? ' hf-w' : '') + '"><span class="hf-l">' + esc(l) + '</span><input type="text" name="' + k + '"></label>';
  }
  function tableHtml(tb) {
    var h = '<table class="hf-t"><thead><tr><th class="hf-n">ردیف</th>' + tb.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var r = 1; r <= tb.rows; r++) {
      h += '<tr><td class="hf-n">' + fa(r) + '</td>' + tb.cols.map(function (c, i) {
        var nm = tb.k + r + '_' + i, ty = tb.types.charAt(i), pre = tb.pre && tb.pre[r] && tb.pre[r][i];
        if (ty === 's') return '<td>' + levelSelect(nm, c + ' ' + r) + '</td>';
        if (ty === 'd') return '<td>' + dateInput(nm, c + ' ' + r) + '</td>';
        return '<td><input type="text" name="' + nm + '" aria-label="' + esc(c + ' ' + r) + '"' + (pre ? ' value="' + esc(pre) + '"' : '') + '></td>';
      }).join('') + '</tr>';
    }
    return h + '</tbody></table>';
  }
  function pageHtml(brand) {
    var b = brandOf(brand), n = 0;
    var h = '<header class="hf-head"><div class="hf-photo" aria-label="جای عکس">عکس ۳×۴</div><div class="hf-title"><p class="hf-god">به نام خدا</p><h1>فرم استخدامی ' + esc(b.t) + '</h1><p>' + esc(b.s) + '</p></div></header>';
    SEC.forEach(function (s) {
      n++;
      h += '<section class="hf-s"><h2><b>' + fa(n) + '</b> ' + esc(s.t) + '</h2>' + (s.note ? '<p class="hf-note">' + esc(s.note) + '</p>' : '');
      if (s.g) h += '<div class="hf-g' + (s.g2 ? ' hf-g2' : '') + '">' + s.g.map(function (f) { return fieldHtml(f, !!s.g2); }).join('') + '</div>';
      if (s.tb) h += tableHtml(s.tb);
      h += '</section>';
    });
    h += '<section class="hf-s hf-co"><h2>' + esc(COMPANY.t) + '</h2>' + COMPANY.rows.map(function (r) { return '<div class="hf-corow">' + r.map(function (x) { return '<span>' + esc(x) + ':</span><i></i>'; }).join('') + '</div>'; }).join('') + '</section>';
    return h;
  }

  // ---------------------------------------------------------------- the Word file
  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="w14"';
  var uid = 0, TOTAL = 10400, LBL = 1900, VAL = 3300;
  function run(t, o) {
    o = o || {};
    return '<w:r><w:rPr>' + (o.b ? '<w:b/><w:bCs/>' : '') + (o.c ? '<w:color w:val="' + o.c + '"/>' : '') + '<w:sz w:val="' + (o.sz || 20) + '"/><w:szCs w:val="' + (o.sz || 20) + '"/><w:rtl/></w:rPr><w:t xml:space="preserve">' + esc(t) + '</w:t></w:r>';
  }
  function para(inner, o) {
    o = o || {};
    return '<w:p><w:pPr><w:bidi/>' + (o.keep ? '<w:keepNext/>' : '') + '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after || 40) + '"/>' + (o.center ? '<w:jc w:val="center"/>' : '') + (o.shade ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shade + '"/>' : '') + '</w:pPr>' + inner + '</w:p>';
  }
  function sdtHead(tag, alias) { return '<w:alias w:val="' + esc(alias) + '"/><w:tag w:val="' + esc(tag) + '"/><w:id w:val="' + (100000 + (++uid)) + '"/><w:lock w:val="sdtLocked"/>'; }
  function sdtText(tag, alias, ph) {
    return '<w:sdt><w:sdtPr>' + sdtHead(tag, alias) + '<w:showingPlcHdr/><w:text/></w:sdtPr><w:sdtContent>' + run(ph || '............', { c: '8A8A8A' }) + '</w:sdtContent></w:sdt>';
  }
  function sdtList(tag, alias) {
    return '<w:sdt><w:sdtPr>' + sdtHead(tag, alias) + '<w:showingPlcHdr/><w:dropDownList>' + LEVEL.split('|').map(function (x) { return '<w:listItem w:displayText="' + x + '" w:value="' + x + '"/>'; }).join('') + '</w:dropDownList></w:sdtPr><w:sdtContent>' + run('انتخاب', { c: '8A8A8A' }) + '</w:sdtContent></w:sdt>';
  }
  function sdtCheck(tag, alias) {
    return '<w:sdt><w:sdtPr>' + sdtHead(tag, alias) + '<w14:checkbox><w14:checked w14:val="0"/><w14:checkedState w14:val="2612" w14:font="MS Gothic"/><w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/></w14:checkbox></w:sdtPr><w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/><w:sz w:val="22"/></w:rPr><w:t>☐</w:t></w:r></w:sdtContent></w:sdt>';
  }
  function borders(b) { return '<w:tblBorders><w:top w:val="single" w:sz="6" w:color="' + b.d + '"/><w:left w:val="single" w:sz="6" w:color="' + b.d + '"/><w:bottom w:val="single" w:sz="6" w:color="' + b.d + '"/><w:right w:val="single" w:sz="6" w:color="' + b.d + '"/><w:insideH w:val="single" w:sz="4" w:color="C9CFD8"/><w:insideV w:val="single" w:sz="4" w:color="C9CFD8"/></w:tblBorders>'; }
  function cell(inner, wd, shade, span) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + wd + '" w:type="dxa"/>' + (span ? '<w:gridSpan w:val="' + span + '"/>' : '') + (shade ? '<w:shd w:val="clear" w:color="auto" w:fill="' + shade + '"/>' : '') + '<w:vAlign w:val="center"/></w:tcPr>' + inner + '</w:tc>';
  }
  function table(b, cols, rowsXml) {
    return '<w:tbl><w:tblPr><w:tblW w:w="' + TOTAL + '" w:type="dxa"/><w:bidiVisual/>' + borders(b) + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + cols.map(function (c) { return '<w:gridCol w:w="' + c + '"/>'; }).join('') + '</w:tblGrid>' + rowsXml + '</w:tbl>';
  }
  function valueXml(f) {
    var k = f[0], l = f[1], t = f[2] || 'text', o = f[3] ? f[3].split('|') : [];
    if (t === 'choice' || t === 'multi') return o.map(function (x, i) { return sdtCheck(k + '_' + i, l + ': ' + x) + run(' ' + x + '     '); }).join('');
    if (t === 'date') return sdtText(k, l, 'مثال: ۱۴۰۵/۰۱/۰۱');
    return sdtText(k, l, t === 'long' ? 'برای نوشتن کلیک کنید' : '............');
  }
  function labelCell(b, text, wd) { return cell(para(run(text, { b: true, sz: 18, c: b.d }), { after: 0 }), wd, b.l); }
  // fields to rows: with g2 two short boxes share a row (label, box, label, box); wide boxes (long, choice, multi) take the whole row
  function fieldRows(b, fields, two) {
    var rows = '', i = 0;
    function wide(f) { var t = f[2] || 'text'; return t === 'long' || t === 'multi' || (t === 'choice' && f[3].split('|').length > 2); }
    while (i < fields.length) {
      var f = fields[i], nx = fields[i + 1];
      if (two && !wide(f) && nx && !wide(nx)) {
        rows += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + labelCell(b, f[1], LBL) + cell(para(valueXml(f), { after: 0 }), VAL) + labelCell(b, nx[1], LBL) + cell(para(valueXml(nx), { after: 0 }), VAL) + '</w:tr>'; i += 2;
      } else {
        rows += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + labelCell(b, f[1], LBL) + cell(para(valueXml(f), { after: 0 }), TOTAL - LBL, null, 3) + '</w:tr>'; i += 1;
      }
    }
    return rows;
  }
  function tableXml(b, tb) {
    var first = 600, wd = Math.floor((TOTAL - first) / tb.cols.length), cols = [first];
    tb.cols.forEach(function () { cols.push(wd); });
    function head(t) { return cell(para(run(t, { b: true, sz: 17, c: b.on }), { center: true, after: 0 }), wd, b.c); }
    var rows = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + cell(para(run('ردیف', { b: true, sz: 17, c: b.on }), { center: true, after: 0 }), first, b.c) + tb.cols.map(head).join('') + '</w:tr>';
    for (var r = 1; r <= tb.rows; r++) {
      rows += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cell(para(run(fa(r), { sz: 18 }), { center: true, after: 0 }), first) + tb.cols.map(function (c, i) {
        var ty = tb.types.charAt(i), pre = tb.pre && tb.pre[r] && tb.pre[r][i], nm = tb.k + r + '_' + i;
        var inner = ty === 's' ? sdtList(nm, c + ' ' + r) : ty === 'd' ? sdtText(nm, c + ' ' + r, ' ') : sdtText(nm, c + ' ' + r, pre || ' ');
        return cell(para(inner, { after: 0 }), wd);
      }).join('') + '</w:tr>';
    }
    return table(b, cols, rows);
  }
  function documentXml(brand) {
    var b = brandOf(brand), body = '', n = 0;
    uid = 0;
    // the brand band at the top
    body += table(b, [TOTAL], '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cell(para(run('به نام خدا', { sz: 17, c: b.on }), { center: true, after: 20 }) + para(run('فرم استخدامی ' + b.t, { b: true, sz: 34, c: b.on }), { center: true, after: 20 }) + para(run(b.s, { sz: 18, c: b.on }), { center: true, after: 0 }), TOTAL, b.c) + '</w:tr>');
    body += para(run('جای عکس ۳×۴: عکس را روی کاغذ چاپ‌شده بچسبانید.', { sz: 17, c: '666666' }), { after: 60, before: 60 });
    SEC.forEach(function (s) {
      n++;
      body += para(run(fa(n) + '  ' + s.t, { b: true, sz: 21, c: b.d }), { keep: true, before: 110, after: 40, shade: b.l });
      if (s.note) body += para(run(s.note, { sz: 18, c: '444444' }), { after: 40 });
      if (s.g) body += table(b, [LBL, VAL, LBL, VAL], fieldRows(b, s.g, !!s.g2));
      if (s.tb) body += tableXml(b, s.tb);
    });
    body += para(run(COMPANY.t, { b: true, sz: 20, c: b.on }), { keep: true, before: 160, after: 40, shade: b.d });
    body += table(b, [LBL, VAL, LBL, VAL], COMPANY.rows.map(function (r) {
      var h = '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="560" w:hRule="atLeast"/></w:trPr>';
      if (r.length === 2) return h + labelCell(b, r[0] + ':', LBL) + cell(para('', { after: 0 }), VAL) + labelCell(b, r[1] + ':', LBL) + cell(para('', { after: 0 }), VAL) + '</w:tr>';
      return h + labelCell(b, r[0] + ':', LBL) + cell(para('', { after: 0 }), TOTAL - LBL, null, 3) + '</w:tr>';
    }).join(''));
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="700" w:right="750" w:bottom="700" w:left="750" w:header="400" w:footer="400" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>';
  }
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); }
  // Word's own password hash for «restrict editing» (SHA-512, salted, 100000 rounds)
  function protection(pw) {
    if (!pw || !w.crypto || !w.crypto.subtle) return Promise.resolve('<w:documentProtection w:edit="forms" w:enforcement="1"/>');
    var salt = w.crypto.getRandomValues(new Uint8Array(16)), enc = new Uint8Array(pw.length * 2), i;
    for (i = 0; i < pw.length; i++) { enc[2 * i] = pw.charCodeAt(i) & 255; enc[2 * i + 1] = pw.charCodeAt(i) >> 8; }
    var first = new Uint8Array(salt.length + enc.length); first.set(salt, 0); first.set(enc, salt.length);
    var SPIN = 100000;
    function step(h, n) {
      if (n >= SPIN) return Promise.resolve(h);
      var m = new Uint8Array(h.length + 4); m.set(h, 0); m[h.length] = n & 255; m[h.length + 1] = (n >> 8) & 255; m[h.length + 2] = (n >> 16) & 255; m[h.length + 3] = (n >> 24) & 255;
      return w.crypto.subtle.digest('SHA-512', m).then(function (d) { return step(new Uint8Array(d), n + 1); });
    }
    return w.crypto.subtle.digest('SHA-512', first).then(function (d) { return step(new Uint8Array(d), 0); }).then(function (h) {
      return '<w:documentProtection w:edit="forms" w:enforcement="1" w:cryptProviderType="rsaAES" w:cryptAlgorithmClass="hash" w:cryptAlgorithmType="typeAny" w:cryptAlgorithmSid="14" w:cryptSpinCount="' + SPIN + '" w:hash="' + b64(h) + '" w:salt="' + b64(salt) + '"/>';
    });
  }
  // a zip with stored (not compressed) files, enough for a .docx
  var crcTable = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0, cdSize = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = f.data || enc.encode(f.text), crc = crc32(data), lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint16(30, 0, true); ch.setUint16(32, 0, true); ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      cdSize += 46 + name.length; offset += 30 + name.length + data.length;
    });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  // Word embeds a font «obfuscated»: the first 32 bytes are XORed with the font's GUID key
  function guid() { var h = '', i; for (i = 0; i < 32; i++) h += '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16)); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20); }
  function obfuscate(bytes, g) {
    var hex = g.replace(/-/g, ''), key = [], i, out = new Uint8Array(bytes);
    for (i = 0; i < 16; i++) key.push(parseInt(hex.substr(30 - 2 * i, 2), 16));
    for (i = 0; i < 32 && i < out.length; i++) out[i] = out[i] ^ key[i % 16];
    return out;
  }
  function loadFont(url) { return w.fetch(url).then(function (r) { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); }).then(function (b) { return new Uint8Array(b); }); }
  function docx(brand, password) {
    var gR = '{' + guid() + '}', gB = '{' + guid() + '}';
    return Promise.all([protection(password), loadFont('./assets/fonts/Estedad-Regular.ttf').then(function (a) { return a; }, function () { return null; }), loadFont('./assets/fonts/Estedad-Bold.ttf').then(function (a) { return a; }, function () { return null; })]).then(function (r) {
      var prot = r[0], fR = r[1], fB = r[2], emb = !!(fR && fB), head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
      var files = [
        { name: '[Content_Types].xml', text: head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="odttf" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/></Types>' },
        { name: '_rels/.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + R + '/officeDocument" Target="word/document.xml"/></Relationships>' },
        { name: 'word/_rels/document.xml.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + R + '/styles" Target="styles.xml"/><Relationship Id="rId2" Type="' + R + '/settings" Target="settings.xml"/><Relationship Id="rId3" Type="' + R + '/fontTable" Target="fontTable.xml"/></Relationships>' },
        { name: 'word/styles.xml', text: head + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Estedad" w:hAnsi="Estedad" w:cs="Estedad" w:eastAsia="Estedad"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="fa-IR" w:bidi="fa-IR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>' },
        { name: 'word/settings.xml', text: head + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + (emb ? '<w:embedTrueTypeFonts/><w:saveSubsetFonts/>' : '') + prot + '</w:settings>' },
        { name: 'word/fontTable.xml', text: head + '<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="' + R + '"><w:font w:name="Estedad"><w:charset w:val="00"/><w:family w:val="auto"/><w:pitch w:val="variable"/>' + (emb ? '<w:embedRegular r:id="rId1" w:fontKey="' + gR + '"/><w:embedBold r:id="rId2" w:fontKey="' + gB + '"/>' : '') + '</w:font></w:fonts>' },
        { name: 'word/document.xml', text: documentXml(brand) }
      ];
      if (emb) {
        files.push({ name: 'word/_rels/fontTable.xml.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="' + R + '/font" Target="fonts/font1.odttf"/><Relationship Id="rId2" Type="' + R + '/font" Target="fonts/font2.odttf"/></Relationships>' });
        files.push({ name: 'word/fonts/font1.odttf', data: obfuscate(fR, gR.slice(1, -1)) });
        files.push({ name: 'word/fonts/font2.odttf', data: obfuscate(fB, gB.slice(1, -1)) });
      }
      return zipStore(files);
    });
  }
  w.MSHiring = { BRANDS: BRANDS, theme: theme, pageHtml: pageHtml, docx: docx, documentXml: documentXml, fields: function () { return SEC; } };
})(window);

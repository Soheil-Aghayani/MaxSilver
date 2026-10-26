// Hiring form (فرم استخدامی): one definition drives three outputs:
//  1. the page (fill on screen, or leave empty) with a print layout for A4 (print or «save as PDF» from the browser),
//  2. a Word file (.docx) where ONLY the candidate's boxes are fillable (Word «Restrict editing: filling in forms», optional password),
//  3. later: filling the form from a resume (not built yet).
// The company block (interview result) has no fillable box in the Word file: the candidate cannot write there.
// Nothing here is sent anywhere: the file is made in the browser.
(function (w) {
  'use strict';
  var BRANDS = {
    maxsilver: { t: 'گروه صنعتی مکث‌سیلور', s: 'تولید تجهیزات آشپزخانهٔ صنعتی و خانگی' },
    wintora: { t: 'مجموعه صنعتی وینتورا', s: 'تولیدکنندهٔ تجهیزات آشپزخانهٔ صنعتی و رستورانی' },
    turbomax: { t: 'توربومکس', s: 'تجهیزات حرفه‌ای قنادی و کافه' }
  };
  var LEVEL = 'ضعیف|متوسط|خوب|عالی';
  // t: text (default) | choice (one of the options) | multi (any of the options) | long (a wide box)
  var SEC = [
    { t: 'اطلاعات شخصی', g: [
      ['name', 'نام و نام خانوادگی'], ['father', 'نام پدر'], ['natid', 'کد ملی'], ['idno', 'شمارهٔ شناسنامه'], ['issue', 'تاریخ و محل صدور شناسنامه'],
      ['birth', 'تاریخ تولد'], ['birthplace', 'محل تولد'], ['religion', 'دین (مذهب)'], ['nation', 'ملیت'],
      ['marital', 'وضعیت تأهل', 'choice', 'مجرد|متأهل'], ['health', 'سلامت روحی و جسمی', 'choice', 'سالم|دارای مشکل'], ['healthnote', 'در صورت مشکل توضیح دهید', 'long']] },
    { t: 'خدمت نظام وظیفه', g: [['mil', 'وضعیت', 'choice', 'انجام داده|معاف|در حال خدمت|مشمول'], ['milnote', 'نوع و علت معافیت']] },
    { t: 'سوابق تحصیلی و آموزشی', tb: { k: 'edu', rows: 2, cols: ['مدرک تحصیلی (به ترتیب آخرین مدرک)', 'رشته تحصیلی', 'معدل کل', 'تاریخ شروع', 'تاریخ پایان', 'نام مؤسسه آموزشی', 'شهر - کشور'] } },
    { t: 'تجربیات شغلی (به ترتیب از آخرین سابقه)', tb: { k: 'job', rows: 4, cols: ['نام سازمان یا شرکت', 'سمت / شغل', 'مدت سابقه', 'تاریخ شروع', 'تاریخ پایان', 'آخرین حقوق و مزایا', 'علت ترک خدمت'] } },
    { t: 'سابقهٔ کار قبلی در این شرکت', g: [['prev', 'آیا قبلاً در این شرکت اشتغال داشته‌اید؟', 'choice', 'بلی|خیر'], ['prevwhy', 'علت قطع رابطهٔ کاری', 'long']] },
    { t: 'آشنایی با زبان‌های خارجی، رایانه و دوره‌ها', g: [
      ['enread', 'زبان انگلیسی: خواندن', 'choice', LEVEL], ['enwrite', 'زبان انگلیسی: نوشتن', 'choice', LEVEL], ['enspeak', 'زبان انگلیسی: مکالمه', 'choice', LEVEL],
      ['soft', 'نرم‌افزارها', 'multi', 'Windows|Word|Excel|Access|Internet|PowerPoint|تایپ'], ['softother', 'سایر نرم‌افزارها']],
      tb: { k: 'course', rows: 3, cols: ['نام دورهٔ آموزشی / نرم‌افزار (گواهینامه دوره‌های فنی و حرفه‌ای، مؤسسات آموزشی)', 'میزان تسلط'] } },
    { t: 'فعالیت‌های علمی', g: [['sci', 'مورد', 'multi', 'تدوین کتاب یا مقالهٔ علمی|ارائهٔ سمینار|سایر فعالیت‌های علمی']] },
    { t: 'نحوهٔ همکاری', g: [['coop', 'تمایل به همکاری به صورت', 'multi', 'تمام وقت|پاره وقت|همکاری خارج از مرکز (کارگاه)'], ['hours', 'در صورت تمایل به کار پاره وقت، ساعت‌ها و روزها را دقیقاً اعلام فرمایید', 'long']] },
    { t: 'شغل مورد درخواست و آمادگی', g: [['want', 'شغل مورد درخواست'], ['start', 'چه تاریخی می‌توانید مشغول به کار شوید؟']] },
    { t: 'مواردی که در آن تجربه یا تخصص دارید', g: [['skill', 'شرح', 'long']] },
    { t: 'بیمه', g: [['ins', 'آیا سابقهٔ پرداخت حق بیمه دارید؟', 'choice', 'بلی|خیر'], ['insyears', 'در صورت مثبت بودن، چند سال و شمارهٔ بیمه']] },
    { t: 'چگونگی آشنایی شما با شرکت', g: [['how', 'شرح', 'long']] },
    { t: 'معرفی دو نفر که شما را خوب می‌شناسند (بدون نسبت فامیلی)', tb: { k: 'ref', rows: 2, cols: ['نام و نام خانوادگی', 'نسبت', 'شغل', 'نشانی و محل کار', 'تلفن'] } },
    { t: 'انتقال و شغل فعلی', g: [
      ['move', 'در صورت انتقال یا مأموریت حاضر به رفتن به شهرستان‌ها و شعبات دیگر هستید؟', 'choice', 'بلی|خیر'],
      ['employed', 'اکنون مشغول به کار هستید؟', 'choice', 'بلی|خیر'], ['guar', 'در صورت لزوم آیا می‌توانید تضمین بدهید؟', 'choice', 'بلی|خیر']] },
    { t: 'حقوق مورد انتظار', g: [['pay', 'حقوق', 'choice', 'برابر ضوابط شرکت|پیشنهادی'], ['payamt', 'مبلغ پیشنهادی']] },
    { t: 'افراد تحت تکفل', tb: { k: 'dep', rows: 5, cols: ['نام و نام خانوادگی', 'جنسیت', 'نسبت با کارمند', 'تاریخ تولد', 'میزان تحصیلات', 'شغل'] } },
    { t: 'نشانی و تماس', g: [['addr', 'آدرس و محل سکونت', 'long'], ['house', 'نوع سکونت', 'choice', 'منزل شخصی|منزل اجاره‌ای|سایر'], ['phone', 'تلفن تماس'], ['mobile', 'تلفن همراه'], ['email', 'ایمیل']] },
    { t: 'تأیید', note: 'بدین‌وسیله صحت کلیهٔ اطلاعات مندرج در این فرم را تأیید و گواهی می‌نمایم. تکمیل نمودن این فرم هیچ‌گونه تعهدی در قبال استخدام شما برای شرکت ایجاد نمی‌نماید.', g: [['sign', 'نام و نام خانوادگی'], ['signdate', 'امضا و تاریخ']] }
  ];
  var COMPANY = { t: 'قسمت زیر توسط شرکت تکمیل می‌گردد', rows: ['نتیجهٔ ارزیابی مصاحبه', 'مصاحبه‌کننده', 'امضا و تاریخ'] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); };

  // ---------------------------------------------------------------- the page
  function fieldHtml(f) {
    var k = f[0], l = f[1], t = f[2] || 'text', o = f[3] ? f[3].split('|') : [];
    if (t === 'choice' || t === 'multi') {
      return '<div class="hf-f hf-w"><span class="hf-l">' + esc(l) + '</span><span class="hf-o">' + o.map(function (x, i) {
        return '<label class="hf-ck"><input type="' + (t === 'choice' ? 'radio' : 'checkbox') + '" name="' + k + (t === 'multi' ? '_' + i : '') + '" value="' + esc(x) + '"><i></i>' + esc(x) + '</label>';
      }).join('') + '</span></div>';
    }
    return '<label class="hf-f' + (t === 'long' ? ' hf-w' : '') + '"><span class="hf-l">' + esc(l) + '</span><input type="text" name="' + k + '"></label>';
  }
  function tableHtml(tb) {
    var h = '<table class="hf-t"><thead><tr><th class="hf-n">ردیف</th>' + tb.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var r = 1; r <= tb.rows; r++) {
      h += '<tr><td class="hf-n">' + fa(r) + '</td>' + tb.cols.map(function (c, i) { return '<td><input type="text" name="' + tb.k + r + '_' + i + '" aria-label="' + esc(c + ' ' + r) + '"></td>'; }).join('') + '</tr>';
    }
    return h + '</tbody></table>';
  }
  function pageHtml(brand) {
    var b = BRANDS[brand] || BRANDS.maxsilver, n = 0;
    var h = '<header class="hf-head"><div class="hf-photo" aria-label="جای عکس">عکس ۳×۴</div><div class="hf-title"><p class="hf-god">به نام خدا</p><h1>فرم استخدامی ' + esc(b.t) + '</h1><p>' + esc(b.s) + '</p><label class="hf-f hf-date"><span class="hf-l">تاریخ مصاحبه</span><input type="text" name="idate"></label></div></header>';
    SEC.forEach(function (s) {
      n++;
      h += '<section class="hf-s"><h2><b>' + fa(n) + '</b> ' + esc(s.t) + '</h2>' + (s.note ? '<p class="hf-note">' + esc(s.note) + '</p>' : '');
      if (s.g) h += '<div class="hf-g">' + s.g.map(fieldHtml).join('') + '</div>';
      if (s.tb) h += tableHtml(s.tb);
      h += '</section>';
    });
    h += '<section class="hf-s hf-co"><h2>' + esc(COMPANY.t) + '</h2>' + COMPANY.rows.map(function (r) { return '<div class="hf-corow"><span>' + esc(r) + ':</span><i></i></div>'; }).join('') + '</section>';
    return h;
  }

  // ---------------------------------------------------------------- the Word file
  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="w14"';
  var uid = 0;
  function run(t, o) {
    o = o || {};
    return '<w:r><w:rPr>' + (o.b ? '<w:b/><w:bCs/>' : '') + (o.c ? '<w:color w:val="' + o.c + '"/>' : '') + '<w:sz w:val="' + (o.sz || 20) + '"/><w:szCs w:val="' + (o.sz || 20) + '"/><w:rtl/></w:rPr><w:t xml:space="preserve">' + esc(t) + '</w:t></w:r>';
  }
  function para(inner, o) {
    o = o || {};
    return '<w:p><w:pPr><w:bidi/>' + (o.keep ? '<w:keepNext/>' : '') + '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after || 40) + '"/>' + (o.center ? '<w:jc w:val="center"/>' : '') + (o.shade ? '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shade + '"/>' : '') + '</w:pPr>' + inner + '</w:p>';
  }
  function sdtText(tag, alias, ph) {
    return '<w:sdt><w:sdtPr><w:alias w:val="' + esc(alias) + '"/><w:tag w:val="' + esc(tag) + '"/><w:id w:val="' + (100000 + (++uid)) + '"/><w:lock w:val="sdtLocked"/><w:showingPlcHdr/><w:text/></w:sdtPr><w:sdtContent>' + run(ph || '............', { c: '8A8A8A' }) + '</w:sdtContent></w:sdt>';
  }
  function sdtCheck(tag, alias) {
    return '<w:sdt><w:sdtPr><w:alias w:val="' + esc(alias) + '"/><w:tag w:val="' + esc(tag) + '"/><w:id w:val="' + (100000 + (++uid)) + '"/><w:lock w:val="sdtLocked"/><w14:checkbox><w14:checked w14:val="0"/><w14:checkedState w14:val="2612" w14:font="MS Gothic"/><w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/></w14:checkbox></w:sdtPr><w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/><w:sz w:val="22"/></w:rPr><w:t>☐</w:t></w:r></w:sdtContent></w:sdt>';
  }
  var BORD = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="777777"/><w:left w:val="single" w:sz="4" w:color="777777"/><w:bottom w:val="single" w:sz="4" w:color="777777"/><w:right w:val="single" w:sz="4" w:color="777777"/><w:insideH w:val="single" w:sz="4" w:color="AAAAAA"/><w:insideV w:val="single" w:sz="4" w:color="AAAAAA"/></w:tblBorders>';
  var TOTAL = 10400;
  function cell(inner, wd, shade) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + wd + '" w:type="dxa"/>' + (shade ? '<w:shd w:val="clear" w:color="auto" w:fill="' + shade + '"/>' : '') + '<w:vAlign w:val="center"/></w:tcPr>' + inner + '</w:tc>';
  }
  function table(cols, rowsXml) {
    return '<w:tbl><w:tblPr><w:tblW w:w="' + TOTAL + '" w:type="dxa"/><w:bidiVisual/>' + BORD + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' + cols.map(function (c) { return '<w:gridCol w:w="' + c + '"/>'; }).join('') + '</w:tblGrid>' + rowsXml + '</w:tbl>';
  }
  function fieldRow(f) {
    var k = f[0], l = f[1], t = f[2] || 'text', o = f[3] ? f[3].split('|') : [], inner;
    if (t === 'choice' || t === 'multi') inner = o.map(function (x, i) { return sdtCheck(k + '_' + i, l + ': ' + x) + run(' ' + x + '     '); }).join('');
    else inner = sdtText(k, l, t === 'long' ? 'برای نوشتن کلیک کنید' : '............');
    return '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cell(para(run(l, { b: true, sz: 19 }), { after: 0 }), 3400, 'F3F5F7') + cell(para(inner, { after: 0 }), TOTAL - 3400) + '</w:tr>';
  }
  function tableXml(tb) {
    var n = tb.cols.length + 1, first = 600, wd = Math.floor((TOTAL - first) / tb.cols.length), cols = [first];
    tb.cols.forEach(function () { cols.push(wd); });
    var rows = '<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' + cell(para(run('ردیف', { b: true, sz: 18 }), { center: true, after: 0 }), first, 'FFCC2A') + tb.cols.map(function (c) { return cell(para(run(c, { b: true, sz: 18 }), { center: true, after: 0 }), wd, 'FFCC2A'); }).join('') + '</w:tr>';
    for (var r = 1; r <= tb.rows; r++) {
      rows += '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cell(para(run(fa(r), { sz: 18 }), { center: true, after: 0 }), first) + tb.cols.map(function (c, i) { return cell(para(sdtText(tb.k + r + '_' + i, c + ' ' + r, ' '), { after: 0 }), wd); }).join('') + '</w:tr>';
    }
    return table(cols, rows);
  }
  function documentXml(brand) {
    var b = BRANDS[brand] || BRANDS.maxsilver, body = '', n = 0;
    uid = 0;
    body += para(run('به نام خدا', { sz: 18, c: '666666' }), { center: true });
    body += para(run('فرم استخدامی ' + b.t, { b: true, sz: 32 }), { center: true, after: 20 });
    body += para(run(b.s, { sz: 18, c: '666666' }), { center: true, after: 80 });
    body += para(run('تاریخ مصاحبه: ', { b: true }) + sdtText('idate', 'تاریخ مصاحبه', '....../....../..........') + run('          جای عکس ۳×۴: چسبانده شود', { sz: 18, c: '666666' }), { after: 80 });
    SEC.forEach(function (s) {
      n++;
      body += para(run(fa(n) + '- ' + s.t, { b: true, sz: 22 }), { keep: true, before: 100, after: 40, shade: 'E9EDF3' });
      if (s.note) body += para(run(s.note, { sz: 18, c: '444444' }), { after: 40 });
      if (s.g) body += table([3400, TOTAL - 3400], s.g.map(fieldRow).join(''));
      if (s.tb) body += tableXml(s.tb);
    });
    body += para(run(COMPANY.t, { b: true, sz: 20 }), { keep: true, before: 140, after: 40, shade: 'DCE1E8' });
    body += table([3400, TOTAL - 3400], COMPANY.rows.map(function (r) { return '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="560" w:hRule="atLeast"/></w:trPr>' + cell(para(run(r + ':', { b: true, sz: 19 }), { after: 0 }), 3400, 'F3F5F7') + cell(para('', { after: 0 }), TOTAL - 3400) + '</w:tr>'; }).join(''));
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ' + NS + '><w:body>' + body +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="700" w:right="700" w:bottom="700" w:left="700" w:header="400" w:footer="400" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>';
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
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data), lh = new DataView(new ArrayBuffer(30));
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
  function docx(brand, password) {
    return protection(password).then(function (prot) {
      var head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      return zipStore([
        { name: '[Content_Types].xml', text: head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>' },
        { name: '_rels/.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
        { name: 'word/_rels/document.xml.rels', text: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>' },
        { name: 'word/styles.xml', text: head + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma" w:eastAsia="Tahoma"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="fa-IR" w:bidi="fa-IR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>' },
        { name: 'word/settings.xml', text: head + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' + prot + '</w:settings>' },
        { name: 'word/document.xml', text: documentXml(brand) }
      ]);
    });
  }
  w.MSHiring = { BRANDS: BRANDS, pageHtml: pageHtml, docx: docx, documentXml: documentXml, fields: function () { return SEC; } };
})(window);

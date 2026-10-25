// Arya's company knowledge: answers questions about the company, its fairs and the academy lessons from texts we already wrote and checked.
// No model and nothing leaves the browser. Every answer names its source and links to it; when nothing matches, Arya says so.
// Role limits: academy lessons only from the tracks of the person's role (management sees all), fairs only for roles with the fairs area.
// Never added here: prices, costs, customers, invoices or anything personal (those stay behind their own pages and rules).
(function (w) {
  'use strict';
  var MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var fa = function (n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(d); }); };
  function norm(s) {
    return String(s == null ? '' : s).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; })
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏ً-ْ]/g, '').replace(/[^؀-ۿa-z0-9]+/gi, ' ').toLowerCase().replace(/\s+/g, ' ').trim();
  }
  // words that carry no topic
  var STOP = {};
  ('چه چی چیه چیست است هست هستند هستن را رو از به در و که این آن اون با برای برا یا هم تا من ما شما ما را چطور چگونه چقدر کی کجا کدام کدوم باید میشه می شود شود کنم کنیم کن کنید دارم داره دارد بگو بگید بگویید بده بدید میخوام میخواهم لطفا خیلی یه یک ها های ای بود باشه باشد نیست بعد قبل بین وقتی اگر اگه').split(' ').forEach(function (x) { STOP[norm(x)] = 1; });
  function toks(s) { return norm(s).split(' ').filter(function (t) { return t.length > 1 && !STOP[t]; }); }
  // a question word, or a topic word of the company or the training: such a question goes to company knowledge before the catalog
  var INTENT = /(چطور|چگونه|چیست|چیه|یعنی چی|توضیح|یاد بده|آموزش|اسکریپت|مدل فروش|مراحل|روش |ساعت کاری|آدرس|نشانی|تلفن|شماره تماس|گارانتی|ضمانت|شکایت|ثبت شرکت|شناسه ملی|کد اقتصادی|کد پستی|ایمیل|نمایشگاه|فستیوال|ما کی|شما کی|کی هستیم|مشتری ما|برند|spin|challenger|bant|meddic|اعتراض|قیمت را|مذاکره)/;

  var cache = null, cacheRole = null;
  function roleName() { try { return localStorage.getItem('ms-role') || ''; } catch (e) { return ''; } }
  function can(area) { var R = w.MSRoles, r = roleName(); return !!r && (!R || R.can(r, area)); }
  function norml(r) { var R = w.MSRoles; return R && R.norm ? R.norm(r) : r; }

  function factEntries() {
    var F = w.MS_FACTS || [], get = function (k) { for (var i = 0; i < F.length; i++) if (F[i][0] === k) return F[i][1]; return ''; };
    var out = [], add = function (title, text, words) { if (text) out.push({ id: 'f:' + title, title: title, body: [text], tip: '', src: 'مشخصات شرکت (صفحهٔ «اطلاعات حقوقی»)', href: './legal.html', words: words || '', rank: 1 }); };
    add('نام و ثبت شرکت', 'نام حقوقی: ' + get('نام حقوقی') + ' (' + get('نوع شخصیت حقوقی') + '). شمارهٔ ثبت ' + get('شمارهٔ ثبت') + '، شناسهٔ ملی ' + get('شناسهٔ ملی') + '، کد اقتصادی ' + get('کد اقتصادی') + '.', 'شناسه ملی کد اقتصادی شماره ثبت نام شرکت حقوقی سهامی خاص');
    add('آدرس دفتر و کارخانه', 'دفتر مرکزی: ' + get('نشانی دفتر مرکزی') + '، کد پستی ' + get('کد پستی دفتر مرکزی') + '.\nکد پستی کارخانه: ' + get('کد پستی کارخانه') + '.\nنشانی ثبتی: ' + get('نشانی ثبتی شرکت'), 'آدرس نشانی دفتر کارخانه کد پستی کجاست');
    add('تلفن و ایمیل تماس', 'تلفن دفتر ' + get('تلفن دفتر') + '، تلفن فروش ' + get('تلفن فروش') + '، ایمیل ' + get('ایمیل') + '، وب‌سایت ' + get('وب‌سایت') + '.\nتلفن خدمات پس از فروش: ' + get('تلفن خدمات پس از فروش'), 'تلفن شماره تماس ایمیل وب سایت سایت ارتباط');
    add('ساعت کاری', get('ساعت کاری'), 'ساعت کاری ساعت کار شنبه پنجشنبه باز');
    add('گارانتی و خدمات پس از فروش', get('گارانتی و خدمات'), 'گارانتی ضمانت خدمات پس از فروش تعمیر');
    add('ثبت شکایت', get('راه ثبت شکایت'), 'شکایت انتقاد ثبت شکایت تیکت');
    return out;
  }
  function fairEntries() {
    var F = w.MSFairs, out = [];
    if (!F || !F.MAIN || !can('fairs')) return out;
    F.MAIN.forEach(function (f) {
      var when = f.from && f.to ? 'از ' + fa(f.from[2]) + ' ' + MONTHS[f.from[1] - 1] + ' تا ' + fa(f.to[2]) + ' ' + MONTHS[f.to[1] - 1] + ' ' + fa(f.to[0]) : '';
      var lines = [(f.edition ? f.edition + '، ' : '') + (when ? when + '، ' : '') + (f.venue || '') + (f.city ? '، ' + f.city : '') + '.'];
      if (f.organizer) lines.push('برگزارکننده: ' + f.organizer + '.');
      if (f.contact && f.contact.length) lines.push('تماس: ' + f.contact.map(fa).join('، ') + '.');
      if (f.register) lines.push(f.register);
      if (f.note) lines.push(f.note);
      out.push({ id: 'x:' + f.id, title: f.title, body: lines, tip: '', src: 'نمایشگاه‌ها', href: './fairs.html', words: 'نمایشگاه فستیوال ثبت نام غرفه برگزار ' + (f.en || ''), rank: 1 });
    });
    return out;
  }
  function academyEntries() {
    var A = w.MS_ACADEMY, r = norml(roleName()), all = r === 'manager' || r === 'ceo', out = [];
    if (!A || !A.tracks || !can('academy')) return out;
    A.tracks.forEach(function (t) {
      if (!all && (t.roles || []).indexOf(r) < 0) return;
      (t.days || []).forEach(function (d) {
        (d.lessons || []).forEach(function (l) {
          var body = (l.body || []).slice(), tips = l.tip ? l.tip : '';
          if (l.bullets && l.bullets.length) body = body.concat(l.bullets.map(function (b) { return '• ' + b; }));
          out.push({ id: 'a:' + t.id + d.id + l.id, title: l.t, body: body, tip: tips, src: 'آموزش › روز ' + fa(d.n) + ': ' + d.title, href: './academy.html', words: d.title + ' ' + t.title, rank: 2 });
        });
      });
    });
    return out;
  }
  function entries() {
    var r = roleName();
    if (cache && cacheRole === r && cache.sig === [!!w.MS_FACTS, !!w.MSFairs, !!w.MS_ACADEMY].join()) return cache.list;
    var list = factEntries().concat(fairEntries(), academyEntries());
    list.forEach(function (e) {
      e.t = toks(e.title); e.tt = ' ' + norm(e.title + ' ' + e.words) + ' ';
      e.all = ' ' + norm(e.title + ' ' + e.words + ' ' + e.body.join(' ') + ' ' + e.tip) + ' ';
    });
    var df = {}; list.forEach(function (e) { var seen = {}; e.all.split(' ').forEach(function (t) { if (t && !seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } }); });
    cache = { list: list, df: df, n: list.length, sig: [!!w.MS_FACTS, !!w.MSFairs, !!w.MS_ACADEMY].join() }; cacheRole = r;
    return list;
  }
  // a query word matches a text word as a whole word, or as the start of a longer one (plurals and suffixes: مشتری ~ مشتری‌ها)
  function has(hay, t) { return hay.indexOf(' ' + t) >= 0 && (hay.indexOf(' ' + t + ' ') >= 0 || t.length >= 4); }

  function find(q) {
    var list = entries(), qt = toks(q), seen = {};
    qt = qt.filter(function (t) { if (seen[t]) return false; seen[t] = 1; return true; });
    if (!qt.length || !list.length) return [];
    var n = cache.n, df = cache.df, res = [];
    list.forEach(function (e) {
      var hit = 0, score = 0;
      qt.forEach(function (t) {
        var inTitle = has(e.tt, t), inAll = inTitle || has(e.all, t);
        if (!inAll) return;
        hit++;
        score += Math.log(1 + n / (1 + (df[t] || 0))) * (inTitle ? 3 : 1);
      });
      var cover = hit / qt.length;
      if (cover < 0.6 || hit < Math.min(2, qt.length)) return;
      res.push({ e: e, score: score * cover / e.rank, cover: cover });
    });
    res.sort(function (a, b) { return b.score - a.score; });
    return res;
  }

  function clip(s, n) { s = String(s); if (s.length <= n) return s; var c = s.slice(0, n); var k = Math.max(c.lastIndexOf('. '), c.lastIndexOf('؛'), c.lastIndexOf('،'), c.lastIndexOf(' ')); return c.slice(0, k > n * 0.5 ? k : n) + '…'; }
  function answer(q) {
    var found = find(q);
    if (!found.length) return null;
    var top = found[0].e, text = '**' + top.title + '**\n\n', used = 0, parts = [];
    top.body.forEach(function (p) { if (used < 650) { parts.push(p); used += p.length; } });
    text += parts.map(function (p) { return clip(p, 420); }).join('\n\n');
    if (parts.length < top.body.length) text += '\n\n(ادامهٔ درس را در صفحهٔ آموزش بخوانید.)';
    if (top.tip) text += '\n\n**نکته:** ' + clip(top.tip, 260);
    text += '\n\nمنبع: ' + top.src;
    var chips = found.slice(1, 4).filter(function (x) { return x.e.id !== top.id; }).map(function (x) { return { label: clip(x.e.title, 34), q: x.e.title }; });
    return { text: text, links: [{ href: top.href, label: top.src.split(' ›')[0] === 'آموزش' ? 'باز کردن درس در آموزش' : 'باز کردن صفحهٔ منبع' }], chips: chips.length ? chips : null, ids: [], title: top.title, strong: found[0].cover >= 0.99 };
  }
  w.MSKnowledge = { answer: answer, find: find, intent: function (q) { return INTENT.test(norm(q)); }, count: function () { return entries().length; } };
})(window);

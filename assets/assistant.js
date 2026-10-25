// assistant.html: a chat about the products. The browser finds the matching catalog items itself (same Persian normalising, BM25 ranking and
// «no match -> say so» rule as 06_RAG/rag/*.py). When a relay is set (assets/assistant-config.js) the question and those items go to the
// relay (06_RAG/relay/worker.js), which holds the model key and returns a written answer that cites them. Without a relay, or when it
// is down, the chat still shows the closest items. Nothing is sent when no item matches, and nothing here is a secret.
(function () {
  'use strict';
  var root = document.getElementById('as');
  if (!root) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fa = new Intl.NumberFormat('fa-IR');
  var BR = { 'max-silver': 'مکث‌سیلور', wintora: 'وینتورا', 'torbo-max': 'توربومکس' };

  // ---------- normalising and tokens (same rules as 06_RAG/rag/norm.py)
  var VARIANTS = [['رو میزی', 'رومیزی'], ['زغال', 'ذغال'], ['سرخ کن', 'سرخکن'], ['یخ ساز', 'یخساز'], ['بن ماری', 'بنماری'], ['همبرگر زن', 'همبرگرزن'], ['پوست کن', 'پوستکن'], ['خمیر گیر', 'خمیرگیر'],
    ['خمیر پهن کن', 'خمیرپهنکن'], ['آب میوه', 'آبمیوه'], ['مخلوط کن', 'مخلوطکن'], ['ساندویچ ساز', 'ساندویچساز'], ['سوسیس پر کن', 'سوسیسپرکن'], ['وافل ساز', 'وافلساز'], ['کباب ترکی', 'کبابترکی'],
    ['دیس پلی', 'دیسپلی'], ['شو کیک', 'شوکیک'], ['شو کیس', 'شوکیس'], ['زیر گریل', 'زیرگریل'], ['پاستا پز', 'پاستاپز'],
    ['فریر', 'سرخکن'], ['فرایر', 'سرخکن'], ['چارکول', 'ذغالی'], ['چارگریل', 'گریل ذغالی'], ['مارینیتور', 'مرینیتور'], ['ریفریجراتور', 'یخچال'], ['گریدل', 'گریل روغنی'], ['ماریناتور', 'مرینیتور']];
  var NUM_WORDS = { 'صفر': '0', 'یک': '1', 'دو': '2', 'سه': '3', 'چهار': '4', 'پنج': '5', 'شش': '6', 'هفت': '7', 'هشت': '8', 'نه': '9', 'ده': '10' };
  var STOP = {};
  ('و در به از که را این آن با برای است شد می یک بر هم یا تا اما نیز باید شده های ها ای ی چگونه چه چند کدام آیا کنیم کنید کردن کرد دارد دارم است؟ لطفا').split(' ').forEach(function (w) { if (w) STOP[w] = 1; });
  function norm(s) {
    var t = String(s == null ? '' : s).normalize('NFKC')
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; })
      .replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/ك/g, 'ک').replace(/ۀ/g, 'ه').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/أ/g, 'ا').replace(/إ/g, 'ا').replace(/ٱ/g, 'ا')
      .replace(/‌/g, ' ').replace(/[ً-ٰٟ‍‎‏؜]/g, '').toLowerCase();
    VARIANTS.forEach(function (v) { t = t.split(v[0]).join(v[1]); });
    t = t.replace(/(^|[^\p{L}\p{N}_])(صفر|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)(?=$|[^\p{L}\p{N}_])/gu, function (_, sep, word) { return sep + NUM_WORDS[word]; });
    return t;
  }
  function tokens(s) {
    var out = [], m = norm(s).match(/[a-z0-9]+|[؀-ۿ]+/g) || [];
    m.forEach(function (w) {
      if (STOP[w]) return;
      out.push(w);
      if (w.length >= 5 && /[^\x00-\x7f]/.test(w)) for (var i = 0; i < w.length - 2; i++) out.push('~' + w.slice(i, i + 3));
    });
    return out;
  }

  // ---------- index over the catalog (same ranking as 06_RAG/rag/search.py)
  var K1 = 1.4, B = 0.75, MIN_SCORE = 6, COVER = 0.5;
  var docs = [], df = {}, avg = 0, byId = {};
  var EQ = {}, itemsById = {};
  function build(items, kb, eq) {
    EQ = eq || {}; items.forEach(function (x) { itemsById[x.id] = x; });
    (kb || []).forEach(function (g) {
      var it = { id: g.id, name: g.title, faq: true, text: g.text }, tk = tokens(g.title + ' ' + g.text), tf = {};
      tk.forEach(function (x) { tf[x] = (tf[x] || 0) + 1; });
      Object.keys(tf).forEach(function (x) { df[x] = (df[x] || 0) + 1; });
      docs.push({ it: it, len: tk.length, tf: tf }); byId[it.id] = it;
    });
    items.forEach(function (it) {
      var d = it.dims, parts = [it.name, it.code ? 'کد ' + it.code : '', 'برند ' + (BR[it.src] || it.src), 'دسته ' + (it.cat || ''), 'گروه ' + (it.grp || '')];
      if (d && d.l && d.w && d.h) parts.push('ابعاد ' + d.l + '×' + d.w + '×' + d.h + ' سانتی‌متر');
      if (it.wt) parts.push('وزن ' + it.wt + ' کیلوگرم');
      (it.specs || []).forEach(function (s) { parts.push(s[0] + ': ' + s[1]); });
      if (it.desc) parts.push(it.desc);
      if (EQ[it.id]) parts.push('مشابه در برند دیگر (احتمالی): ' + EQ[it.id].map(function (id) { var o = itemsById[id]; return o ? (BR[o.src] || o.src) + ' ' + o.name : ''; }).filter(Boolean).join('، '));
      var tk = tokens(it.name + ' ' + parts.join(' . ')), tf = {};
      tk.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      docs.push({ it: it, len: tk.length, tf: tf });
      byId[it.id] = it;
    });
    avg = docs.reduce(function (a, d) { return a + d.len; }, 0) / Math.max(1, docs.length);
    VOCAB = {}; Object.keys(df).forEach(function (w) { if (w.charAt(0) !== '~' && /^[آ-ی]{3,}$/.test(w)) VOCAB[w] = df[w]; });
    PROTECT.forEach(function (w) { tokens(w).forEach(function (x) { if (x.charAt(0) !== '~') VOCAB[x] = (VOCAB[x] || 0) + 1000; }); });
    VKEYS = Object.keys(VOCAB);
  }
  var VOCAB = {}, VKEYS = [];
  // words people use around the product names; they must never be «corrected» into catalog words
  var PROTECT = ['تماس', 'باما', 'تحویل', 'ارسال', 'ضمانت', 'گارانتی', 'نصب', 'مرجوعی', 'موجودی', 'میخوام', 'می‌خوام', 'بخرم', 'بندازم', 'راه‌اندازی', 'لازم', 'چطور', 'چگونه', 'کجا', 'بسازم', 'سفارش', 'درخواست', 'خرید', 'پیش‌فاکتور', 'مقایسه', 'ابعاد', 'اندازه', 'وزن', 'ظرفیت', 'مشخصات', 'اضافه', 'مناسبت', 'کمپین', 'تبریک', 'پیگیری', 'تشکر', 'معرفی', 'بودجه', 'میلیون', 'تومان', 'ارزان‌ترین', 'گران‌ترین', 'مالیات', 'جمع', 'نفره', 'کسب‌وکار', 'می‌شود', 'میشه', 'جا', 'فضا', 'متر', 'سانتی‌متر', 'کافه', 'رستوران', 'فست‌فود', 'پیتزا', 'نانوایی', 'قنادی', 'آبمیوه', 'بستنی', 'کبابی', 'شاورما', 'کترینگ', 'تجهیزات', 'دستگاه', 'وسایل', 'دارید', 'دارم', 'هستند', 'چیست', 'چیه'];
  // Damerau-Levenshtein distance with a cutoff (adjacent swaps count as one mistake)
  function dist(a, b, max) {
    var la = a.length, lb = b.length; if (Math.abs(la - lb) > max) return max + 1;
    var p2 = null, p1 = [], i, j;
    for (j = 0; j <= lb; j++) p1[j] = j;
    for (i = 1; i <= la; i++) {
      var cur = [i], best = i;
      for (j = 1; j <= lb; j++) {
        var c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1, v = Math.min(p1[j] + 1, cur[j - 1] + 1, p1[j - 1] + c);
        if (p2 && i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) v = Math.min(v, p2[j - 2] + 1);
        cur[j] = v; if (v < best) best = v;
      }
      if (best > max) return max + 1;
      p2 = p1; p1 = cur;
    }
    return p1[lb];
  }
  // «گریل ذغالی» spelled «گیرل ذقالی» -> the catalog words nearest to each unknown word (only used when the plain question found nothing)
  function correct(q) {
    var changed = [], parts = norm(q).split(/(\s+)/).map(function (w) {
      if (!/^[آ-ی]{4,}$/.test(w) || VOCAB[w] || STOP[w]) return w;
      var max = w.length >= 7 ? 2 : 1, best = null, bd = 9, bf = 0;
      for (var i = 0; i < VKEYS.length; i++) {
        var v = VKEYS[i]; if (Math.abs(v.length - w.length) > max) continue;
        var d = dist(w, v, max); if (d > max) continue;
        if (d < bd || (d === bd && VOCAB[v] > bf)) { best = v; bd = d; bf = VOCAB[v]; }
      }
      if (best) { changed.push([w, best]); return best; }
      return w;
    });
    return { q: changed.length ? parts.join('') : q, changed: changed };
  }
  function hasExact(text, code) {
    var from = 0, at = text.indexOf(code, from);
    while (at >= 0) {
      var before = at ? text.charAt(at - 1) : '', after = text.charAt(at + code.length);
      if ((!/[a-z0-9]/.test(before)) && (!/[a-z0-9]/.test(after))) return true;
      from = at + 1; at = text.indexOf(code, from);
    }
    return false;
  }
  function queryCodes(q) {
    var qn = norm(q), out = [];
    Object.keys(itemsById).forEach(function (id) {
      var code = norm(String(itemsById[id].code || ''));
      if (code.length >= 4 && hasExact(qn, code) && out.indexOf(code) < 0) out.push(code);
    });
    return out;
  }
  function search(q, k) {
    var n = docs.length, qt = {};
    tokens(q).forEach(function (t) { qt[t] = 1; });
    var qs = Object.keys(qt), codes = queryCodes(q), scored = [];
    docs.forEach(function (d) {
      if (PUBLIC && PUBRET[d.it.id]) return;
      var s = 0;
      qs.forEach(function (t) {
        var f = d.tf[t]; if (!f) return;
        var idf = Math.log(1 + (n - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5));
        s += idf * f * (K1 + 1) / (f + K1 * (1 - B + B * d.len / avg));
      });
      if (codes.length && d.it.faq) {
        var src = norm(d.it.name + ' ' + d.it.text);
        if (codes.some(function (c) { return hasExact(src, c); })) s += 50;
      } else if (codes.length && !d.it.faq && codes.indexOf(norm(String(d.it.code || ''))) >= 0) s += 40;
      if (s > 0) scored.push({ s: s, d: d });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, k);
  }
  // [] when nothing is a real match: the page then says so instead of showing guesses
  function retrieve(q, k, loose) {
    var qn = norm(q), blocked = ['موجودی', 'انبار', 'تخفیف', 'تحویل', 'ارسال', 'ضمانت', 'گارانتی', 'مرجوعی', 'نصب', 'ایمنی', 'قانون'];
    if (blocked.some(function (term) { return qn.indexOf(term) >= 0; })) return [];
    var hits = search(q, k), codes = queryCodes(q);
    if (codes.length) hits = hits.filter(function (h) {
      if (!h.d.it.faq) return codes.indexOf(norm(String(h.d.it.code || ''))) >= 0;
      var src = norm(h.d.it.name + ' ' + h.d.it.text);
      return codes.some(function (c) { return hasExact(src, c); });
    });
    if (!hits.length || hits[0].s < (loose ? 2 : MIN_SCORE)) return [];
    var words = Object.keys((function () { var o = {}; tokens(q).forEach(function (t) { if (t.charAt(0) !== '~') o[t] = 1; }); return o; })()), covered = {};
    hits.forEach(function (h) { Object.keys(h.d.tf).forEach(function (t) { covered[t] = 1; }); });
    if (words.length && words.filter(function (w) { return covered[w]; }).length / words.length < COVER) return [];
    return hits;
  }

  // ---------- chat (laid out like a Claude conversation: your message, then the answer as plain text that types out)
  var CFG = window.MS_ASSISTANT || {};
  // the address comes from assistant-config.js; a test address in localStorage is honoured only on localhost, so a token never goes to an address someone typed in
  function relayUrl() { if (PUBLIC) return ''; try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return localStorage.getItem('ms-assistant-relay') || CFG.relay || ''; } catch (e) { /* ignore */ } return CFG.relay || ''; }
  var KEY = 'ms-assistant-chat-v1';
  var S = { ready: false, error: '', msgs: [], busy: false, listening: false, fresh: 0 };
  // staff (a role with the «assistant» area) see prices and the pre-invoice tools; everyone else gets the public version: no prices,
  // and a purchase request that goes to sales through the same request sheet as the public planner (same checks and same terms)
  var STAFF = (function () { try { var r = localStorage.getItem('ms-role') || '', R = window.MSRoles; return !!r && !!R && R.can(r, 'assistant'); } catch (e) { return false; } })(), PUBLIC = !STAFF;
  // anybody signed in may use company knowledge and the helper notes; prices and the catalog tools still follow STAFF / PUBLIC above
  var SIGNED = (function () { try { return !!localStorage.getItem('ms-role'); } catch (e) { return false; } })();
  var REDUCE = false; try { REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }
  var PUBK = 'ms-aria-pub-v1', PUBRET = {}, RECK = 'ms-aria-recent-v1';
  var PRICEQ = /(قیمت|چنده|چند تومان|چقدر|ارزان|گران|بودجه|میلیون|تخفیف|تومان|هزینه|اعتباری|چکی|نقدی|تقسیط|قسط)/;
  var T_ADD = PUBLIC ? '+ افزودن به درخواست خرید' : '+ افزودن به پیش‌فاکتور', T_IN = PUBLIC ? '✓ در درخواست خرید' : '✓ در پیش‌فاکتور', T_ALL = PUBLIC ? '+ افزودن همهٔ این کالاها به درخواست خرید' : '+ افزودن همهٔ این کالاها به پیش‌فاکتور';
  function pubRead() { try { var a = JSON.parse(localStorage.getItem(PUBK) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function pubAdd(id, qty) {
    var a = pubRead(); if (a.some(function (x) { return x.id === id; }) || a.length >= 40) return false;
    a.push({ id: id, qty: Math.max(1, Math.min(20, Number(qty) || 1)) });
    try { localStorage.setItem(PUBK, JSON.stringify(a)); } catch (e) { return false; }
    return true;
  }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
  function listen() {
    if (!SR || !S.ready) return;
    if (rec) { try { rec.stop(); } catch (e) { /* ignore */ } return; }
    var q = document.getElementById('asQ'), base = q ? q.value : '';
    rec = new SR(); rec.lang = 'fa-IR'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = function (ev) {
      var t = ''; for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      var box = document.getElementById('asQ'); if (box) { box.value = (base ? base + ' ' : '') + t; grow(box); }
    };
    function done() { rec = null; S.listening = false; var m = document.getElementById('asMic'); if (m) m.classList.remove('on'); var b = document.getElementById('asQ'); if (b) b.focus(); }
    rec.onerror = done; rec.onend = done;
    try { rec.start(); S.listening = true; var m = document.getElementById('asMic'); if (m) m.classList.add('on'); } catch (e) { done(); }
  }
  var SUGGEST = PUBLIC ? ['می‌خواهم کافه راه‌اندازی کنم', 'گریل ۶۰ سانت ذغالی', 'سینک ۱۰۰ سانت دو لگن', 'سرخ‌کن گازی ۱۸ لیتری', 'درخواست خرید چطور است؟'] : ['گریل ۶۰ ذغالی چنده؟', 'سینک ۱۰۰ سانت دو لگن دارید؟', 'بویلر ۲۵ لیتر BUNN', 'سرخ‌کن گازی ۱۸ لیتری', 'یخچال زیر گریل ۱۸۰', 'مدل SPIN چیست؟', 'ساعت کاری شرکت', 'فستیوال قهوه کی برگزار می‌شود؟'];
  // starter questions by kind of work: sales people get the catalog and the selling lessons first, everyone else the company and their own duties
  (function () {
    var r = (function () { try { return localStorage.getItem('ms-role') || ''; } catch (e) { return ''; } })();
    if (!r) return;
    var sales = ['visitor', 'account_manager', 'sales_manager'].indexOf(r) >= 0, lead = ['manager', 'ceo'].indexOf(r) >= 0;
    if (sales) SUGGEST = ['گریل ۶۰ ذغالی چنده؟', 'مدل SPIN چیست؟', 'چطور اعتراض مشتری را جواب بدهم؟', 'اسکریپت فروش چیست؟', 'پیش‌نویس پیگیری پیش‌فاکتور', 'فستیوال قهوه کی برگزار می‌شود؟'];
    else if (!lead && r) SUGGEST = ['شرح وظایف نقش من', 'چک‌لیست روزانه', 'ساعت کاری شرکت', 'آدرس دفتر کجاست؟', 'گارانتی چطور است؟', 'پیش‌نویس درخواست خدمات پس از فروش'];
  })();
  var ICON = {
    spark: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" opacity=".7"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.2 2.6L12.8 9H19a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 17.8 19H7"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 13V4H4v9zM7 13l4 8c1.5 0 2.5-1 2.2-2.6L12.8 15H19a2 2 0 0 0 2-2.4l-1.2-6A2 2 0 0 0 17.8 5H7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>'
  };
  function price(it) {
    if (PUBLIC) return '<span class="as-p none">قیمت را کارشناس فروش در تماس اعلام می‌کند</span>';
    var P = window.MSPrices, v = P && P.get ? P.get(it.id) : null;
    if (!v) return '<span class="as-p none">قیمت ثبت نشده</span>';
    if (v.s === 'p' && v.p > 0) {
      var ch = P.cheque ? P.cheque(v, it.grp) : 0;
      return '<span class="as-p"><small>نقدی</small><b>' + fa.format(v.p) + '</b> تومان</span>' + (ch && ch !== v.p ? '<span class="as-p"><small>اعتباری (چکی)</small><b>' + fa.format(ch) + '</b> تومان</span>' : '');
    }
    return '<span class="as-p none">' + esc(P && P.label ? P.label(v) : '') + '</span>';
  }
  function card(it, n) {
    if (it.faq) return '<article class="as-card as-guide"><div class="as-body"><h3>' + (n ? '<span class="as-n">' + fa.format(n) + '</span>' : '') + esc(it.name) + '</h3><p class="as-note">' + esc(it.text) + '</p></div></article>';
    return '<article class="as-card"><div class="as-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '</div>' +
      '<div class="as-body"><h3>' + (n ? '<span class="as-n">' + fa.format(n) + '</span>' : '') + esc(it.name) + '</h3><p class="as-meta"><span class="as-br" data-brand="' + esc(it.src) + '"><i></i>' + esc(BR[it.src] || it.src) + '</span>' +
      (it.code ? '<span>کد <b dir="ltr">' + esc(it.code) + '</b></span>' : '') + (it.cat ? '<span>' + esc(it.cat) + '</span>' : '') + '</p>' +
      '<div class="as-prices">' + price(it) + '</div>' +
      (it.pl && !(it.dims || (it.specs && it.specs.length)) ? '<p class="as-note">این کالا از فهرست قیمت آمده؛ مشخصات آن هنوز در کاتالوگ نیست.</p>' : '') +
      '<a class="as-open" href="./product-catalog.html?q=' + encodeURIComponent(it.code || it.name) + '">نمایش در کاتالوگ</a>' + addBtn(it) + '</div></article>';
  }
  // a small Markdown subset: paragraphs, - and 1. lists, # headings, **bold**, `code`. Everything is escaped first.
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>'); }
  function md(text) {
    var out = [], list = null, para = [];
    function flushP() { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } }
    function flushL() { if (list) { out.push('<' + list.t + '>' + list.items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + '</' + list.t + '>'); list = null; } }
    String(text || '').split('\n').forEach(function (line) {
      var m;
      if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); }
      else if ((m = line.match(/^\s*[0-9۰-۹]+[.)]\s+(.*)$/))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); }
      else if ((m = line.match(/^#{1,4}\s+(.*)$/))) { flushP(); flushL(); out.push('<h4>' + inline(m[1]) + '</h4>'); }
      else if (!line.trim()) { flushP(); flushL(); }
      else { flushL(); para.push(line); }
    });
    flushP(); flushL();
    return out.join('');
  }
  var LOGK = 'ms-assistant-log-v1';
  function logRead() { try { var a = JSON.parse(localStorage.getItem(LOGK) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function logAdd(kind, q, ids) {
    if (!q) return;
    if (SIGNED && (kind === 'none' || kind === 'down') && window.MSKnowledge) window.MSKnowledge.report(q, kind);
    var a = logRead(); a.push({ t: new Date().toISOString(), kind: kind, q: String(q).slice(0, 300), ids: (ids || []).slice(0, 5) });
    try { localStorage.setItem(LOGK, JSON.stringify(a.slice(-300))); } catch (e) { /* ignore */ }
  }
  function logExport() {
    var a = logRead(); if (!a.length) return;
    var blob = new Blob([JSON.stringify({ app: 'maxi', exported: new Date().toISOString(), note: 'پرسش‌های بی‌پاسخ و بازخورد؛ برای آموزش مکثی', items: a }, null, 1)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), l = document.createElement('a'); l.href = url; l.download = 'maxi-questions-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function fbHtml(m, i) {
    if (m.state === 'wait' || m.state === 'stream' || m.state === 'none' && false) return '';
    return '<span class="as-fb"><button type="button" data-fb="up" data-i="' + i + '" class="' + (m.fb === 'up' ? 'on' : '') + '" aria-label="پاسخ خوب بود" aria-pressed="' + (m.fb === 'up') + '">' + ICON.up + '</button>' +
      '<button type="button" data-fb="down" data-i="' + i + '" class="' + (m.fb === 'down' ? 'on' : '') + '" aria-label="پاسخ خوب نبود" aria-pressed="' + (m.fb === 'down') + '">' + ICON.down + '</button></span>';
  }
  function hitsOf(m) { return (m.ids || []).map(function (id) { return byId[id]; }).filter(Boolean); }
  function botHtml(m, i) {
    var hits = hitsOf(m), body;
    if (m.state === 'typing') body = '<p>' + esc(m.typed || '') + '<span class="as-caret"></span></p>';
    else if (m.state === 'none') body = '<p>' + (m.nonote ? esc(m.nonote) : 'در منابع من پاسخی برای این پرسش نیست.') + '</p><p class="as-hint">نام کالا، اندازه یا کد را بنویسید یا بپرسید «چطور …»؛ مکثی حدس نمی‌زند.</p>';
    else if (m.state === 'wait') body = '<span class="as-dots" aria-label="در حال نوشتن"><i></i><i></i><i></i></span>';
    else if (m.text) body = md(m.text) + (m.state === 'stream' ? '<span class="as-caret"></span>' : '');
    else body = '<p>' + (m.note ? esc(m.note) : 'نزدیک‌ترین کالاها به پرسش شما، از میان ' + fa.format(docs.length) + ' کالای کاتالوگ:') + '</p>';
    if (m.fixed && m.fixed.length && m.state !== 'wait' && m.state !== 'typing' && m.state !== 'stream') body += '<p class="as-fix">منظورتان «' + esc(m.fixed.map(function (f) { return f[1]; }).join('، ')) + '» بود؟ (به‌جای «' + esc(m.fixed.map(function (f) { return f[0]; }).join('، ')) + '»)</p>';
    var showSrc = hits.length && m.state !== 'wait' && m.state !== 'none' && m.state !== 'typing';
    return '<div class="as-msg bot' + (i >= S.fresh || m.reveal ? ' fresh' : '') + '" data-i="' + i + '"><span class="as-av' + (m.state === 'wait' || m.state === 'stream' || m.state === 'typing' ? ' busy' : '') + '"><i class="as-ring"></i>' + ICON.spark + '</span><div class="as-col"><div class="as-md">' + body + '</div>' + extras(m) +
      (showSrc ? '<details class="as-src"' + (m.text ? '' : ' open') + '><summary>' + (m.text ? 'منابع این پاسخ' : 'کالاهای پیدا‌شده') + ' (' + fa.format(hits.length) + ')</summary><div class="as-cards">' + hits.map(function (it, k) { return card(it, m.text ? k + 1 : 0); }).join('') + '</div></details>' : '') +
      '<div class="as-acts">' + (m.text && m.state === 'done' ? '<button type="button" data-copy="' + i + '" aria-label="کپی پاسخ">' + ICON.copy + '<span>کپی</span></button>' : '') + fbHtml(m, i) + '</div></div></div>';
  }
  function recRead() { try { var a = JSON.parse(localStorage.getItem(RECK) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function recSave() {
    var first = S.msgs.filter(function (m) { return m.role === 'user'; })[0]; if (!first || S.msgs.length < 2) return;
    var keep = S.msgs.slice(-30).map(function (m) { return m.state === 'wait' || m.state === 'stream' || m.state === 'typing' ? Object.assign({}, m, { state: m.text ? 'done' : 'cards' }) : m; });
    var a = recRead().filter(function (x) { return x.t !== first.text.slice(0, 60); }); a.unshift({ t: first.text.slice(0, 60), msgs: keep });
    try { localStorage.setItem(RECK, JSON.stringify(a.slice(0, 6))); } catch (e) { /* ignore */ }
  }
  function recentsHtml() {
    var a = recRead(); if (!a.length) return '';
    return '<div class="as-recent"><h3>گفت‌وگوهای اخیر</h3>' + a.map(function (x, i) { return '<button type="button" data-recent="' + i + '">' + esc(x.t) + '</button>'; }).join('') + '<button type="button" data-recent-clear>پاک کردن این فهرست</button></div>';
  }
  function userHtml(m, i) { return '<div class="as-msg me' + (i >= S.fresh ? ' fresh' : '') + '"><p>' + esc(m.text) + '</p></div>'; }
  function view() {
    if (S.error) return '<p class="as-err" role="alert">' + esc(S.error) + '</p>';
    var empty = !S.msgs.length;
    return '<header class="as-head"><h1 class="as-name"><span class="as-logo">' + ICON.spark + '</span><span class="as-shim">مکثی</span></h1><span class="as-tools">' + (STAFF && logRead().length ? '<button type="button" class="as-new as-qlog" id="asLog2" title="دریافت فایل پرسش‌های بی‌پاسخ و بازخوردها برای آموزش مکثی">' + ICON.copy + '<span>پرسش‌ها (' + fa.format(logRead().length) + ')</span></button>' : '') + '<button type="button" class="as-new" id="asNew"' + (empty ? ' hidden' : '') + '>' + ICON.plus + '<span>گفت‌وگوی تازه</span></button></span></header>' +
      '<div class="as-scroll" id="asScroll" role="log" aria-live="polite" aria-relevant="additions text" aria-label="گفت‌وگو با مکثی" aria-busy="' + !!S.busy + '">' + (empty ? '<div class="as-hello"><span class="as-av big"><i class="as-ring"></i>' + ICON.spark + '</span><h2>سلام، من مکثی هستم! چه کمکی از دستم برمی‌آید؟</h2><p>' + (PUBLIC ? 'دربارهٔ کالاها بپرسید یا بگویید چه کسب‌وکاری می‌خواهید راه بیندازید تا فهرست تجهیزات را پیشنهاد بدهم و درخواست خرید شما را آماده کنم. قیمت را کارشناس فروش در تماس اعلام می‌کند.' : 'دربارهٔ کالاها، قیمت‌ها، بخش‌های سایت و پیش‌فاکتور بپرسید.') + ' اگر ندانم همین را می‌گویم و حدس نمی‌زنم.' +
        (relayUrl() || PUBLIC ? '' : '<br><span class="as-flag">فعلاً نزدیک‌ترین کالاها را نشان می‌دهم؛ پاسخ نوشته‌شده با اتصال به مدل زبانی فعال می‌شود.</span>') + '</p>' +
        '<div class="as-chips">' + SUGGEST.map(function (s) { return '<button type="button" data-q="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>' + recentsHtml() + '</div>' :
        '<div class="as-log" id="asLog">' + S.msgs.map(function (m, i) { return m.role === 'user' ? userHtml(m, i) : botHtml(m, i); }).join('') + '</div>') + '</div>' + (PUBLIC && pubRead().length ? '<div class="as-reqbar" role="status"><span>درخواست خرید شما: ' + fmt(pubRead().length) + ' کالا</span><a href="./planner.html?public=1&from=aria">مشاهده و ارسال</a></div>' : '') +
      '<form class="as-form' + (empty ? ' empty' : '') + '" id="asForm" aria-label="ارسال پیام به مکثی"><div class="as-box"><textarea id="asQ" rows="1" maxlength="600" enterkeyhint="send" placeholder="' + (S.ready ? 'پیام خود را بنویسید…' : 'در حال آماده‌کردن کاتالوگ…') + '" aria-label="پیام"' + (S.ready ? '' : ' disabled') + '></textarea>' +
      (SR ? '<button type="button" class="as-mic' + (S.listening ? ' on' : '') + '" id="asMic" aria-label="گفتن پیام با صدا" title="گفتن پیام با صدا"' + (S.ready ? '' : ' disabled') + '>' + ICON.mic + '</button>' : '') + '<button type="submit" class="as-send" aria-label="ارسال"' + (S.ready && !S.busy ? '' : ' disabled') + '>' + ICON.send + '</button></div>' +
      '<p class="as-fine">' + (PUBLIC ? 'مکثی ممکن است اشتباه کند؛ قیمت و شرایط را کارشناس فروش در تماس اعلام می‌کند.' : 'مکثی ممکن است اشتباه کند؛ کد، قیمت و اندازه را پیش از پیش‌فاکتور در کاتالوگ ببینید.') + '</p></form>';
  }
  function grow(q) { q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 168) + 'px'; }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(S.msgs.slice(-30).map(function (m) { return m.state === 'wait' || m.state === 'stream' || m.state === 'typing' ? Object.assign({}, m, { state: m.text ? 'done' : 'cards' }) : m; }))); } catch (e) { /* ignore */ } }
  function restore() { try { var a = JSON.parse(sessionStorage.getItem(KEY) || '[]'); if (Array.isArray(a)) S.msgs = a; } catch (e) { S.msgs = []; } }
  function scrollEnd(smooth) { var l = document.getElementById('asLog'); if (l && l.lastElementChild) { try { l.lastElementChild.scrollIntoView({ block: 'end', behavior: smooth ? 'smooth' : 'auto' }); } catch (e) { l.lastElementChild.scrollIntoView(); } } }
  function render(keep) {
    var q = document.getElementById('asQ'), v = q ? q.value : '', had = q && document.activeElement === q, sc = document.getElementById('asScroll'), st = sc ? sc.scrollTop : 0;
    root.innerHTML = view(); q = document.getElementById('asQ'); if (q) { q.value = v; grow(q); if (had) q.focus(); }
    sc = document.getElementById('asScroll'); if (sc) sc.scrollTop = st;
    S.fresh = S.msgs.length;
    if (!keep) scrollEnd(true);
  }
  // only the last answer is redrawn while it types, so nothing else flickers
  function paintBot(i, follow) {
    var el = root.querySelector('.as-msg.bot[data-i="' + i + '"]'); if (!el) { render(); return; }
    var tmp = document.createElement('div'); tmp.innerHTML = botHtml(S.msgs[i], i); el.replaceWith(tmp.firstChild);
    if (follow) scrollEnd(false);
  }
  function writing(hits, text, history, onChunk) {
    var url = relayUrl();
    if (!url || !window.MSSync || !window.MSSync.idToken) return Promise.reject({ code: 'no-relay' });
    return window.MSSync.idToken().then(function (tok) {
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ stream: true, question: text, history: history, sources: hits.map(function (it) { return { title: it.name, text: sourceText(it) }; }) }) });
    }).then(function (r) {
      if (!r.ok) throw { code: 'relay-' + r.status };
      var type = r.headers.get('Content-Type') || '';
      if (/json/.test(type) || !r.body || !r.body.getReader) return r.json().then(function (j) { if (!j || !j.answer) throw { code: 'empty' }; return typeOut(j.answer, onChunk); });
      var rd = r.body.getReader(), dec = new TextDecoder('utf-8'), acc = '';
      return (function pump() { return rd.read().then(function (x) { if (x.done) { acc += dec.decode(); if (!acc.trim()) throw { code: 'empty' }; return acc; } acc += dec.decode(x.value, { stream: true }); onChunk(acc); return pump(); }); })();
    });
  }
  // an answer that arrives whole is still revealed word by word, so it reads like it is being written
  function typeOut(full, onChunk) {
    return new Promise(function (ok) {
      var words = full.split(/(\s+)/), i = 0, acc = '';
      (function step() { var n = Math.max(1, Math.ceil(words.length / 60)); acc += words.slice(i, i + n).join(''); i += n; onChunk(acc); if (i >= words.length) ok(full); else setTimeout(step, 28); })();
    });
  }
  // the item as plain text for the model: the same fields the index was built from, plus the prices the person sees now
  function sourceText(it) {
    if (it.faq) return it.text;
    var P = window.MSPrices, v = P && P.get ? P.get(it.id) : null, parts = ['برند ' + (BR[it.src] || it.src), it.code ? 'کد ' + it.code : '', it.cat ? 'دسته ' + it.cat : ''];
    if (v && v.s === 'p' && v.p > 0) { parts.push('قیمت نقدی ' + fa.format(v.p) + ' تومان'); var ch = P.cheque ? P.cheque(v, it.grp) : 0; if (ch && ch !== v.p) parts.push('قیمت اعتباری (چکی) ' + fa.format(ch) + ' تومان'); }
    else if (v) parts.push('قیمت: ' + (P.label ? P.label(v) : ''));
    else parts.push('قیمت ثبت نشده');
    var d = it.dims; if (d && d.l && d.w && d.h) parts.push('ابعاد ' + d.l + '×' + d.w + '×' + d.h + ' سانتی‌متر');
    if (it.wt) parts.push('وزن ' + it.wt + ' کیلوگرم');
    (it.specs || []).forEach(function (s) { parts.push(s[0] + ': ' + s[1]); });
    if (it.desc) parts.push(it.desc);
    if (EQ[it.id]) parts.push('مشابه در برند دیگر (احتمالی): ' + EQ[it.id].map(function (id) { var o = itemsById[id]; return o ? (BR[o.src] || o.src) + ' ' + o.name + (o.code ? ' کد ' + o.code : '') : ''; }).filter(Boolean).join('، '));
    return parts.filter(Boolean).join(' . ');
  }
  // ---------- common sense without a model: small talk, cheapest / dearest, a brand named in the question, vague one-word questions
  var BRAND_WORDS = [['max-silver', ['مکث سیلور', 'مکسیلور', 'مکث‌سیلور', 'max silver']], ['wintora', ['وینتورا', 'wintora']], ['torbo-max', ['توربو مکس', 'توربومکس', 'turbo max', 'turbomax']]];
  var TALK = [
    [/^(سلام|درود|وقت بخیر|صبح بخیر|عصر بخیر|شب بخیر|hi|hello)[\s!.؟?]*$/i, 'سلام، خوش آمدید. کدام کالا را لازم دارید؟ نام، اندازه یا کد را بنویسید، مثلاً «گریل ۶۰ ذغالی».'],
    [/^(ممنون|مرسی|سپاس|تشکر|دستت درد نکنه|متشکرم|thanks)[\s!.]*$/i, 'خواهش می‌کنم. اگر کالای دیگری لازم بود بنویسید.'],
    [/(تو کی|شما کی|کی هستی|چه کار(ی)? (می‌?کنی|می‌?توانی|بلدی)|چیکار(ا)? (می‌?کنی|بلدی)|چه کمکی)/, 'من مکثی، دستیار هوشمند مکث‌سیلور هستم. فعلاً کالا، کد، قیمت نقدی و اعتباری (چکی) و ابعاد را پیدا می‌کنم، دو کالا را مقایسه می‌کنم، کالاهای مشابه برندهای دیگر را (احتمالی) پیشنهاد می‌دهم و معنی واژه‌های کاتالوگ را می‌گویم. کارهای بیشتر در راه است؛ آنچه در منابعم نباشد را حدس نمی‌زنم.'],
    [/^(خداحافظ|فعلا|بای|bye)[\s!.]*$/i, 'موفق باشید.']
  ];
  function smallTalk(q) { var s = norm(q).trim(); for (var i = 0; i < TALK.length; i++) if (TALK[i][0].test(s)) return TALK[i][1]; return ''; }
  function brandOf(q) { var s = norm(q); for (var i = 0; i < BRAND_WORDS.length; i++) for (var k = 0; k < BRAND_WORDS[i][1].length; k++) if (s.indexOf(norm(BRAND_WORDS[i][1][k])) >= 0) return BRAND_WORDS[i][0]; return ''; }
  function stripBrand(q) { var s = norm(q); BRAND_WORDS.forEach(function (b) { b[1].forEach(function (w) { s = s.split(norm(w)).join(' '); }); }); return s; }
  function cashOf(it) { if (PUBLIC) return 0; var P = window.MSPrices, v = P && P.get ? P.get(it.id) : null; return v && v.s === 'p' && v.p > 0 ? v.p : 0; }
  // returns { hits, note } or null when the question is plain
  function smart(q) {
    var s = norm(q), cheap = /ارزان ?ترین|کم ?ترین قیمت|ارزونترین|اقتصادی ?ترین/.test(s), dear = /گران ?ترین|بیشترین قیمت|گرونترین/.test(s), br = brandOf(q);
    if (PUBLIC) cheap = dear = false;
    if (!cheap && !dear && !br) return null;
    var topic = stripBrand(q).replace(/ارزان ?ترین|کم ?ترین قیمت|ارزونترین|اقتصادی ?ترین|گران ?ترین|بیشترین قیمت|گرونترین/g, ' ');
    var hits = retrieve(topic, 40);
    if (!hits.length) return null;
    var list = hits.map(function (h) { return h.d.it; }).filter(function (it) { return !it.faq; });
    if (br) { var f = list.filter(function (it) { return it.src === br; }); if (!f.length) return { none: true, note: 'در برند ' + BR[br] + ' کالایی با این مشخصات پیدا نکردم. ' }; list = f; }
    if (cheap || dear) {
      var priced = list.filter(cashOf);
      if (!priced.length) return { hits: list.slice(0, 5), note: 'برای این کالاها قیمت نقدی ثبت نشده و نمی‌توانم ارزان‌ترین را تعیین کنم. نزدیک‌ترین‌ها:' };
      priced.sort(function (a, b) { return cheap ? cashOf(a) - cashOf(b) : cashOf(b) - cashOf(a); });
      return { hits: priced.slice(0, 3), note: (cheap ? 'ارزان‌ترین' : 'گران‌ترین') + ' گزینه‌ها بر پایهٔ قیمت نقدی، از میان کالاهای نزدیک به پرسش' + (br ? ' در برند ' + BR[br] : '') + ' (قیمت‌ها را پیش از پیش‌فاکتور در کاتالوگ ببینید):' };
    }
    return { hits: list.slice(0, 5), note: 'نزدیک‌ترین کالاها در برند ' + BR[br] + ':' };
  }
  function fmt(n) { return fa.format(n); }
  function dimsText(it) { var d = it.dims; return d && d.l && d.w && d.h ? fmt(d.l) + '×' + fmt(d.w) + '×' + fmt(d.h) + ' سانتی‌متر (طول × عرض × ارتفاع)' : ''; }
  function facts(it) {
    var P = window.MSPrices, v = P && P.get ? P.get(it.id) : null, a = [];
    var dt = dimsText(it); if (dt) a.push('ابعاد ' + dt);
    if (it.wt) a.push('وزن ' + fmt(it.wt) + ' کیلوگرم');
    (it.specs || []).forEach(function (s) { a.push(s[0] + ': ' + s[1]); });
    if (!PUBLIC) { if (v && v.s === 'p' && v.p > 0) a.push('قیمت نقدی ' + fmt(v.p) + ' تومان'); else a.push('قیمت ثبت نشده'); }
    return a.join('، ');
  }
  // «مقایسه A و B», budget («زیر ۵۰ میلیون») and size questions («ابعاد ...») are answered from the catalog fields only
  function smart2(q) {
    var s = norm(q), m;
    if ((m = s.match(/(?:مقایسه|فرق|تفاوت)\s+(.+?)\s+(?:با|و|یا|بین)\s+(.+)$/))) {
      var a = retrieve(m[1], 1), b = retrieve(m[2].replace(/^بین\s+/, ''), 1);
      if (a.length && b.length && !a[0].d.it.faq && !b[0].d.it.faq && a[0].d.it.id !== b[0].d.it.id) {
        var x = a[0].d.it, y = b[0].d.it, pa = cashOf(x), pb = cashOf(y), t = ['**مقایسه دو کالا از کاتالوگ:**', '', '1. **' + x.name + '** (' + (BR[x.src] || x.src) + (x.code ? '، کد ' + x.code : '') + '): ' + facts(x), '2. **' + y.name + '** (' + (BR[y.src] || y.src) + (y.code ? '، کد ' + y.code : '') + '): ' + facts(y)];
        if (pa && pb && !PUBLIC) t.push('', 'اختلاف قیمت نقدی: ' + fmt(Math.abs(pa - pb)) + ' تومان؛ ارزان‌تر ' + (pa < pb ? 'مورد اول' : pb < pa ? 'مورد دوم' : 'هر دو برابر') + ' است.');
        return { ids: [x.id, y.id], text: t.join('\n') };
      }
    }
    var bud = s.match(/(?:زیر|حداکثر|تا|کمتر از|نهایتا)\s*([0-9][0-9.,٫]*)\s*(میلیون|هزار)?/);
    if (bud && !PUBLIC) {
      var val = parseFloat(bud[1].replace(/[,٫]/g, '').replace(/\.(?=\d{3}\b)/g, '')), mult = bud[2] === 'میلیون' ? 1e6 : bud[2] === 'هزار' ? 1e3 : 1;
      var topic = s.replace(bud[0], ' ').replace(/(بودجه|قیمت|تومان|کالا|دارید|هست|میخوام|می‌خواهم)/g, ' ');
      if (val && mult > 1 && tokens(topic).length) {
        var lim = val * mult, br = brandOf(q), list = retrieve(stripBrand(topic), 40).map(function (h) { return h.d.it; }).filter(function (it) { return !it.faq && (!br || it.src === br) && cashOf(it); });
        var ok = list.filter(function (it) { return cashOf(it) <= lim; }).sort(function (a, b) { return cashOf(b) - cashOf(a); });
        if (!list.length) return null;
        return ok.length ? { ids: ok.slice(0, 5).map(function (it) { return it.id; }), note: 'گزینه‌های نزدیک به پرسش با قیمت نقدی تا ' + fmt(lim) + ' تومان (گران‌ترین در بودجه اول):' } : { ids: [], none: true, note: 'برای این کالا گزینه‌ای تا ' + fmt(lim) + ' تومان پیدا نکردم؛ ارزان‌ترین گزینهٔ نزدیک ' + fmt(Math.min.apply(null, list.map(cashOf))) + ' تومان است.' };
      }
    }
    if (/(ابعاد|اندازه|وزن|ظرفیت|مشخصات)/.test(s) && !relayUrl()) {
      var h = retrieve(s.replace(/(ابعاد|اندازه|وزن|ظرفیت|مشخصات|چقدر|چنده|چیست|چیه|است)/g, ' '), 1);
      if (h.length && !h[0].d.it.faq && (h[0].d.it.dims || (h[0].d.it.specs && h[0].d.it.specs.length))) { var z = h[0].d.it; return { ids: [z.id], text: '**' + z.name + '**: ' + facts(z) + '.' }; }
    }
    return null;
  }
  // ---------- skills beyond the catalog: page guide, occasions, my tasks, message drafts, add to proforma
  var NAV = [
    { id: 'catalog', label: 'کاتالوگ محصولات', href: './product-catalog.html', page: 'product-catalog.html', keys: ['کاتالوگ', 'محصولات'], how: 'کالاها را جست‌وجو و مقایسه کنید. با دکمهٔ + کنار هر کالا آن را به پیش‌فاکتور اضافه کنید.' },
    { id: 'invoices', label: 'پیش‌فاکتورها', href: './panel.html#invoices', area: 'invoices', keys: ['پیش فاکتور', 'پیشفاکتور', 'پیش‌فاکتور', 'فاکتور'], how: 'پیش‌فاکتور از کاتالوگ ساخته می‌شود: کالاها را با + اضافه کنید، سبد پیش‌فاکتور را باز کنید، مشتری و تعداد را بنویسید. فهرست پیش‌فاکتورها در همین صفحه است.' },
    { id: 'customers', label: 'مشتریان', href: './customers.html', area: 'customers', page: 'customers.html', keys: ['مشتری', 'مشتریان'], how: 'پایگاه مشتریان؛ هر نقش فقط مشتریان مجاز خودش را می‌بیند.' },
    { id: 'prices', label: 'قیمت‌ها', href: './prices.html', area: 'pricesAudit', page: 'prices.html', keys: ['قیمت ها', 'قیمت‌ها', 'لیست قیمت', 'فهرست قیمت', 'بارگذاری قیمت', 'آپلود قیمت'], how: 'قیمت‌های کاتالوگ را ببینید و با فایل اکسل قالب قیمت (یک ستون قیمت) به‌روز کنید.' },
    { id: 'events', label: 'مناسبت‌ها', href: './events.html', area: 'events', page: 'events.html', keys: ['مناسبت', 'مناسبتها'], how: 'تقویم مناسبت‌ها و ایدهٔ پیام و کمپین هر مناسبت.' },
    { id: 'warehouse', label: 'انبار و موجودی', href: './warehouse.html', area: 'warehouse', page: 'warehouse.html', keys: ['انبار', 'موجودی'], how: 'موجودی انبار.' },
    { id: 'banks', label: 'حساب‌های بانکی', href: './banks.html', area: 'bankAccounts', page: 'banks.html', keys: ['حساب بانکی', 'حساب های بانکی', 'شماره حساب'], how: 'حساب‌هایی که روی پیش‌فاکتور می‌آیند.' },
    { id: 'crm', label: 'درخواست‌های خرید', href: './crm.html', area: 'crm', page: 'crm.html', keys: ['درخواست خرید', 'درخواست های خرید', 'سرنخ'], how: 'درخواست‌های خرید و پیگیری فروش.' },
    { id: 'process', label: 'نقشهٔ فروش', href: './sales-process.html', page: 'sales-process.html', keys: ['نقشه فروش', 'مراحل فروش', 'فرایند فروش'], how: 'مراحل فروش، مسئول هر مرحله و کنترل‌ها.' },
    { id: 'planner', label: 'طراح کافه و رستوران', href: './planner.html', page: 'planner.html', keys: ['طراح', 'طراحی کافه', 'چیدمان'], how: 'برای مشتری لیست تجهیزات پیشنهادی بسازید.' },
    { id: 'fairs', label: 'نمایشگاه‌ها', href: './fairs.html', page: 'fairs.html', keys: ['نمایشگاه'], how: 'اطلاعات نمایشگاه‌ها.' },
    { id: 'panel', label: 'حساب من', href: './panel.html', page: 'panel.html', keys: ['حساب من', 'پروفایل', 'رمز عبور', 'اطلاعات من'], how: 'اطلاعات حساب و درخواست‌های شما.' },
    { id: 'tickets', label: 'گفت‌وگوها', href: './panel.html#tickets', keys: ['گفتگو', 'گفت وگو', 'گفت‌وگو', 'پیام به'], how: 'پیام و درخواست به واحدها و همکاران.' },
    { id: 'dashboard', label: 'داشبورد CEO', href: './ceo-dashboard.html', area: 'dashboard', page: 'ceo-dashboard.html', keys: ['داشبورد'], how: 'نمای کلی فروش.' },
    { id: 'analysis', label: 'تحلیل جزئیات فروش', href: './sales-analysis.html', area: 'analysis', page: 'sales-analysis.html', keys: ['تحلیل فروش', 'گزارش فروش'], how: 'فروش به تفکیک مشتری و کالا.' },
    { id: 'competitors', label: 'تحلیل رقبا', href: './competitors.html', area: 'competitors', page: 'competitors.html', keys: ['رقبا', 'رقیب'], how: 'تحلیل رقبا.' },
    { id: 'advertising', label: 'استراتژی تبلیغات', href: './advertising.html', area: 'advertising', page: 'advertising.html', keys: ['تبلیغات', 'تبلیغ'], how: 'درخت استراتژی تبلیغات.' },
    { id: 'brand', label: 'برندبوک‌ها', href: './brand-books.html', area: 'brand', page: 'brand-books.html', keys: ['برندبوک', 'برند بوک', 'هویت بصری'], how: 'راهنمای هویت بصری برندها.' },
    { id: 'roadmap', label: 'نقشهٔ راه', href: './roadmap.html', area: 'roadmap', page: 'roadmap.html', keys: ['نقشه راه', 'مایلستون'], how: 'خط زمانی کارهای آیندهٔ سامانه.' },
    { id: 'backup', label: 'نسخهٔ پشتیبان', href: './backup.html', area: 'backup', page: 'backup.html', keys: ['پشتیبان', 'بکاپ'], how: 'دانلود نسخهٔ پشتیبان.' },
    { id: 'permissions', label: 'دسترسی‌ها', href: './permissions.html', area: 'roleAdmin', page: 'permissions.html', keys: ['دسترسی'], how: 'تعیین دسترسی نقش‌ها.' },
    { id: 'features', label: 'ویژگی‌ها', href: './features.html', area: 'features', page: 'features.html', keys: ['ویژگی', 'روشن و خاموش'], how: 'روشن و خاموش کردن بخش‌های سایت.' },
    { id: 'track', label: 'پیگیری درخواست', href: './track.html', page: 'track.html', keys: ['پیگیری', 'کد پیگیری', 'وضعیت درخواست'], how: 'با کد پیگیری ببینید درخواست شما به کجا رسیده است.' },
    { id: 'legal', label: 'قوانین', href: './legal.html', page: 'legal.html', keys: ['قوانین', 'شرایط و ضوابط', 'حریم خصوصی'], how: 'شرایط و ضوابط و حریم خصوصی.' },
    { id: 'contact', label: 'تماس با ما', href: './contact.html', page: 'contact.html', keys: ['تماس با ما'], how: 'راه‌های تماس.' }
  ];
  function myRole() { try { return localStorage.getItem('ms-role') || ''; } catch (e) { return ''; } }
  var PUB_PAGES = { planner: 1, contact: 1, track: 1, legal: 1, panel: 1 };
  function navAllowed(n) {
    if (PUBLIC) return !!PUB_PAGES[n.id];
    var R = window.MSRoles, F = window.MSFeatures;
    if (n.area && R && !R.can(myRole(), n.area)) return false;
    if (F && n.page) { var f = F.list.filter(function (x) { return x.page === n.page; })[0]; if (f && F.hidden(f.id) && !(F.owner && F.owner())) return false; }
    return true;
  }
  function pageGuide(s) {
    if (!/(کجا|چطور|چگونه|چه جوری|چجوری|باز کن|صفحه|بخش|ببرم|برو|راهنما|آموزش|بسازم|ثبت کنم)/.test(s)) return null;
    var best = null, bs = 0;
    NAV.forEach(function (n) { var c = 0; n.keys.forEach(function (k) { if (s.indexOf(norm(k)) >= 0) c += k.length; }); if (c > bs) { bs = c; best = n; } });
    if (!best) return null;
    if (/پیش.?فاکتور/.test(s) && /(بساز|ایجاد|چطور|چگونه|ثبت)/.test(s)) best = NAV[1];
    if (!navAllowed(best)) return { text: 'بخش «' + best.label + '» برای نقش شما فعال نیست. اگر لازم است از مدیر سامانه بخواهید دسترسی را بدهد.', links: [] };
    var links = [{ href: best.href, label: 'باز کردن ' + best.label }];
    if (best.id === 'invoices') links.push({ href: './product-catalog.html', label: 'رفتن به کاتالوگ' });
    return { text: '**' + best.label + '**: ' + best.how, links: links };
  }
  function myTasks(s) {
    if (!/(کارهای من|کار دارم|چه کاری|وظایف|وظیفه|اعلان|منتظر من|امروز چه)/.test(s)) return null;
    var list = []; try { list = (JSON.parse(localStorage.getItem('ms-notify-v1') || '{}') || {}).items || []; } catch (e) { list = []; }
    var F = window.MSFeatures;
    list = list.filter(function (x) {
      if (!x || !x.text) return false;
      var h = x.href || './panel.html', p = String(h).replace(/^\.\//, '').split('#')[0], f = F && F.list.filter(function (z) { return z.page === p; })[0];
      return !(f && F.hidden(f.id) && !(F.owner && F.owner()));
    });
    if (!myRole()) return { text: 'برای دیدن کارهایتان باید وارد حساب خود شوید.', links: [{ href: './panel.html', label: 'ورود' }] };
    if (!list.length) return { text: 'فعلاً کاری منتظر شما نیست.', links: [] };
    return { text: '**کارهای منتظر شما (' + fmt(list.length) + '):**\n\n' + list.slice(0, 8).map(function (x) { return '- ' + x.text; }).join('\n'), links: list.slice(0, 4).map(function (x) { return { href: x.href || './panel.html', label: String(x.text).slice(0, 34) }; }) };
  }
  function occasions(s) {
    if (!/(مناسبت|کمپین|تبریک)/.test(s)) return null;
    var E = window.MSEvents; if (!E) return null;
    var list = E.upcoming(45).slice(0, 4);
    if (!list.length) return { text: 'در ۴۵ روز آینده مناسبتی در تقویم ثبت نشده است.', links: [{ href: './events.html', label: 'تقویم مناسبت‌ها' }] };
    var x = list[0];
    if (/(کمپین|تبریک|پیام|متن)/.test(s)) {
      return { text: '**نزدیک‌ترین مناسبت: ' + x.title + '** (' + x.when + '، ' + x.weekday + ' ' + x.jalali + ')\n' + (x.idea ? '\nایدهٔ ثبت‌شده در تقویم: ' + x.idea + '\n' : '') +
        '\n**پیش‌نویس پیام (برای بازبینی):**\n\nسلام و احترام؛ به مناسبت ' + x.title + ' از طرف مجموعهٔ مکث‌سیلور صمیمانه تبریک می‌گوییم. [پیشنهاد یا تخفیف ویژه: نیاز به تأیید مدیر فروش]\n\nپیش از انتشار، متن و هر پیشنهاد قیمتی را مدیر فروش تأیید کند.', links: [{ href: './events.html', label: 'تقویم مناسبت‌ها' }] };
    }
    return { text: '**مناسبت‌های پیش رو:**\n\n' + list.map(function (e) { return '- ' + e.title + ': ' + e.when + ' (' + e.weekday + ' ' + e.jalali + ')'; }).join('\n') + '\n\nبرای پیش‌نویس تبریک بنویسید «کمپین ' + x.title + '».', links: [{ href: './events.html', label: 'تقویم مناسبت‌ها' }] };
  }
  var DRAFTS = [
    [/نمایشگاه|دعوت/, '**پیش‌نویس دعوت به نمایشگاه:**\n\nسلام [نام مشتری] عزیز، مکث‌سیلور در [نام نمایشگاه] از [تاریخ شروع] تا [تاریخ پایان] در [محل برگزاری] حضور دارد. [شمارهٔ غرفه: نیاز به تأیید] خوشحال می‌شویم شما را آنجا ببینیم.\n\nبا احترام، [نام شما]'],
    [/جلسه|خلاصه/, '**پیش‌نویس خلاصهٔ جلسه:**\n\nموضوع: [موضوع جلسه]\nتاریخ: [تاریخ]\nحاضران: [نام‌ها]\n\nتصمیم‌ها:\n• [تصمیم ۱]\n\nاقدام‌ها (هر اقدام یک مسئول و یک موعد دارد):\n• [اقدام] ـ مسئول: [نام] ـ موعد: [تاریخ]\n\nموضوع بدون تصمیم به جلسهٔ بعد: [در صورت وجود]'],
    [/خدمات|ایراد|خرابی|تعمیر/, '**پیش‌نویس درخواست خدمات پس از فروش:**\n\nنام مشتری: [نام]\nکالا: [نام کالا و کد]\nشمارهٔ فاکتور یا تاریخ خرید: [شماره یا تاریخ]\nشرح مشکل: [چه اتفاقی افتاده؟ از کی؟]\nتلفن تماس: [شماره]\n\nاین متن را در «گفت‌وگوها» برای خدمات پس از فروش بفرستید.'],

    [/پیگیری/, '**پیش‌نویس پیگیری پیش‌فاکتور:**\n\nسلام [نام مشتری] عزیز، وقت شما بخیر. پیش‌فاکتور شمارهٔ [شمارهٔ پیش‌فاکتور] را برایتان فرستاده‌ایم. اگر نکته‌ای دربارهٔ کالاها، قیمت یا شرایط پرداخت هست در خدمتیم. [تاریخ اعتبار پیش‌فاکتور: نیاز به تأیید]\n\nبا احترام، [نام شما]، مکث‌سیلور'],
    [/تشکر|سپاس/, '**پیش‌نویس تشکر از خرید:**\n\nسلام [نام مشتری] عزیز، از اعتماد شما به مکث‌سیلور سپاسگزاریم. اگر در نصب یا استفاده از [نام کالا] پرسشی داشتید در خدمتیم.\n\nبا احترام، [نام شما]'],
    [/اطلاع|تغییر قیمت|قیمت جدید/, '**پیش‌نویس اطلاع‌رسانی قیمت:**\n\nسلام [نام مشتری] عزیز، فهرست قیمت‌های تازه آماده است. برای دریافت قیمت [نام کالا یا گروه] پیام بدهید تا پیش‌فاکتور برایتان صادر شود. [تاریخ اجرای قیمت‌ها: نیاز به تأیید]\n\nبا احترام، [نام شما]، مکث‌سیلور'],
    [/معرفی/, '**پیش‌نویس معرفی:**\n\nسلام [نام مشتری] عزیز، [نام شما] از مکث‌سیلور هستم. مجموعهٔ ما تجهیزات آشپزخانهٔ صنعتی ارائه می‌کند. اگر مایلید فهرست کالاهای مناسب [نوع کسب‌وکار شما] را برایتان بفرستم.\n\nبا احترام، [نام شما]']
  ];
  function drafts(s) {
    if (!/(پیش ?نویس|بنویس|متن|پیام)/.test(s)) return null;
    for (var i = 0; i < DRAFTS.length; i++) if (DRAFTS[i][0].test(s)) return { text: DRAFTS[i][1] + '\n\nاین فقط پیش‌نویس است؛ جاهای داخل [ ] را پر کنید و پیش از ارسال بخوانید. من پیامی نمی‌فرستم.', links: [] };
    return null;
  }
  // proforma draft shared with the catalog page (same key and shape)
  var PF = 'ms-proforma-v1';
  function pfRead() { try { var v = JSON.parse(localStorage.getItem(PF) || 'null'); return v && Array.isArray(v.lines) ? v : { lines: [] }; } catch (e) { return { lines: [] }; } }
  function inProforma(id) { return (PUBLIC ? pubRead() : pfRead().lines).some(function (l) { return l.id === id; }); }
  function addProforma(id, qty) {
    if (PUBLIC) return pubAdd(id, qty);
    var inv = pfRead(); if (inv.lines.some(function (l) { return l.id === id; })) return false;
    var P = window.MSPrices, v = P && P.get ? P.get(id) : null, unit = inv.unit || 'تومان';
    inv.lines.push({ id: id, qty: qty || 1, price: v && v.s === 'p' && v.p > 0 ? v.p * (unit === 'ریال' ? 10 : 1) : 0 });
    try { localStorage.setItem(PF, JSON.stringify(inv)); } catch (e) { return false; }
    return true;
  }
  function addBtn(it) {
    if (it.faq) return '';
    var on = inProforma(it.id);
    return '<button type="button" class="as-add' + (on ? ' on' : '') + '" data-addinv="' + esc(it.id) + '">' + (on ? T_IN : T_ADD) + '</button>';
  }
  function lastItem() { for (var i = S.msgs.length - 1; i >= 0; i--) { var m = S.msgs[i]; if (m.role === 'bot' && m.ids && m.ids.length) { var it = byId[m.ids[0]]; if (it && !it.faq) return it; } } return null; }
  function addToLast(s) {
    if (!/(اضافه|بذار|بگذار|بزن).*(پیش ?فاکتور|سبد|درخواست|خرید)|(پیش ?فاکتور|سبد|درخواست|خرید).*(اضافه|بذار|بگذار)/.test(s)) return null;
    var it = lastItem(); if (!it) return { text: 'ابتدا کالایی را پیدا کنید تا به پیش‌فاکتور اضافه کنم.', links: [] };
    var ok = addProforma(it.id);
    if (PUBLIC) return { text: ok ? '«' + it.name + '» به درخواست خرید شما اضافه شد. برای ارسال به کارشناس، دکمهٔ «مشاهده و ارسال» را بزنید.' : '«' + it.name + '» از قبل در درخواست خرید شما هست.', links: [{ href: './planner.html?public=1&from=aria', label: 'مشاهده و ارسال درخواست خرید' }], ids: [it.id] };
    return { text: ok ? '«' + it.name + '» به پیش‌فاکتور شما اضافه شد. تعداد و مشتری را در سبد پیش‌فاکتور کاتالوگ تنظیم کنید.' : '«' + it.name + '» از قبل در پیش‌فاکتور شما هست.', links: [{ href: './product-catalog.html', label: 'باز کردن کاتالوگ و سبد' }], ids: [it.id] };
  }
  // ---------- quote calculator: «3 گریل ۶۰ روغنی و 2 سرخ کن گازی، با مالیات»
  var WORDNUM = { 'یک': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5, 'شش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10 };
  function bestOf(h, topic, pref) {
    var ws = tokens(topic).filter(function (w) { return w.charAt(0) !== '~'; });
    function sc(x) {
      var n = norm(x.d.it.name), toks = n.split(/\s+/).filter(Boolean), m = ws.filter(function (w) { return n.indexOf(w) >= 0; }).length;
      return m * 10 - Math.max(0, toks.length - m) * 0.7 + (pref(x.d.it) ? 5 : 0);
    }
    var best = h[0], bs = -1e9; h.forEach(function (x, i) { var v = sc(x) - i * 0.01; if (v > bs) { bs = v; best = x; } });
    return best;
  }
  function quote(s) {
    var asks = /(جمع|مجموع|محاسبه|حساب کن|برآورد|برآورد|قیمت کل|جمعا|روی هم)/.test(s);
    var parts = s.replace(/(جمع|مجموع|محاسبه|حساب کن|برآورد|قیمت کل|جمعا|روی هم|چقدر میشه|چند میشه|با مالیات|بدون مالیات|مالیات|ارزش افزوده|لطفا)/g, ' ')
      .split(/\s+و\s+|[،,+\n]|\s+با\s+(?=\d)/).map(function (x) { return x.trim(); }).filter(Boolean);
    var segs = [];
    parts.forEach(function (p) {
      var m = p.match(/^(\d+)\s*(?:تا|عدد|دستگاه|دست)?\s+(.+)$/), w = p.match(/^(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*(?:تا|عدد|دستگاه)?\s+(.+)$/);
      if (m) segs.push({ qty: parseInt(m[1], 10), topic: m[2] }); else if (w) segs.push({ qty: WORDNUM[w[1]], topic: w[2] });
      else segs.push({ qty: 0, topic: p });
    });
    var numbered = segs.filter(function (x) { return x.qty > 0; }).length;
    if (!(asks && segs.length >= 1 && numbered >= 1) && !(segs.length >= 2 && numbered === segs.length)) return null;
    var rows = [], lost = [], P = window.MSPrices, pf = pfRead(), taxPct = pf.tax != null ? pf.tax : 10, cart = [];
    segs.forEach(function (g) {
      var qty = g.qty > 0 ? g.qty : 1, h = retrieve(g.topic, 4).filter(function (x) { return !x.d.it.faq; });
      if (!h.length) { lost.push(g.topic); return; }
      var pick = bestOf(h, g.topic, cashOf), it = pick.d.it, v = P && P.get ? P.get(it.id) : null, cash = v && v.s === 'p' && v.p > 0 ? v.p : 0, ch = cash && P.cheque ? (P.cheque(v, it.grp) || cash) : 0;
      rows.push({ it: it, qty: qty, cash: cash, ch: ch }); cart.push({ id: it.id, qty: qty });
    });
    if (!rows.length) return { text: 'کالاهای این فهرست را در کاتالوگ پیدا نکردم. هر کالا را با تعداد و نام بنویسید، مثل «۳ گریل ۶۰ روغنی و ۲ سرخ‌کن گازی».', links: [] };
    var tc = 0, tch = 0, noPrice = [];
    var lines = rows.map(function (r) {
      if (!r.cash) { noPrice.push(r.it.name); return '- ' + fmt(r.qty) + ' × **' + r.it.name + '**: قیمت ثبت نشده'; }
      tc += r.cash * r.qty; tch += (r.ch || r.cash) * r.qty;
      return '- ' + fmt(r.qty) + ' × **' + r.it.name + '**: ' + fmt(r.cash) + ' تومان → ' + fmt(r.cash * r.qty) + ' تومان';
    });
    var t = ['**برآورد قیمت از کاتالوگ:**', ''].concat(lines, ['']);
    if (tc) {
      t.push('جمع نقدی: **' + fmt(tc) + ' تومان**');
      if (tch && tch !== tc) t.push('جمع اعتباری (چکی): **' + fmt(tch) + ' تومان**');
      if (/(مالیات|ارزش افزوده)/.test(s) && !/بدون مالیات/.test(s)) t.push('مالیات بر ارزش افزوده (' + fmt(taxPct) + '٪، طبق تنظیم پیش‌فاکتور): ' + fmt(Math.round(tc * taxPct / 100)) + ' تومان؛ جمع نقدی با مالیات: **' + fmt(Math.round(tc * (1 + taxPct / 100))) + ' تومان**');
    }
    if (noPrice.length) t.push('', 'برای ' + fmt(noPrice.length) + ' کالا قیمت ثبت نشده و در جمع نیامده است.');
    if (lost.length) t.push('', 'این موارد را پیدا نکردم: ' + lost.join('، ') + '.');
    t.push('', 'این فقط برآورد است؛ تخفیف و شرایط پرداخت در پیش‌فاکتور تعیین می‌شود. کالاها را بررسی کنید: اگر نام اشتباهی انتخاب شده، دقیق‌تر بنویسید.');
    return { text: t.join('\n'), ids: rows.map(function (r) { return r.it.id; }), cart: cart, links: [] };
  }
  // ---------- kitchen starter list (from the planner's own knowledge) and space fit
  var CONCEPT_KEYS = { cafe: ['کافه', 'کافی شاپ', 'کافیشاپ'], fastfood: ['فست فود', 'فستفود', 'برگری', 'همبرگر'], restaurant: ['رستوران'], pizza: ['پیتزا'], bakery: ['نانوایی'], juice: ['آبمیوه'], pastry: ['قنادی', 'شیرینی فروشی'], icecream: ['بستنی'], kebab: ['کبابی', 'چلوکبابی'], shawarma: ['شاورما'], catering: ['کترینگ'], breakfast: ['چایخانه', 'صبحانه'], selfservice: ['سلف'] };
  function exampleFor(job) {
    var cats = job.cats || [], list = [];
    itemsAll().forEach(function (it) { if (cats.indexOf(it.cat) >= 0 && cashOf(it)) list.push(it); });
    list.sort(function (a, b) { return cashOf(a) - cashOf(b); });
    return list.length ? list[Math.floor((list.length - 1) / 2)] : null;
  }
  function itemsAll() { return Object.keys(itemsById).map(function (k) { return itemsById[k]; }); }
  // a guided conversation: «کافه می‌خواهم» -> size? -> which menu items? -> the list, with a total and an add-all button.
  // The state is read from the user's own messages since the flow began, so nothing extra is stored.
  var SIZE_CHIPS = [['کوچک (تا ۲۰ مشتری)', 'اندازه کوچک'], ['متوسط (۲۰ تا ۵۰ مشتری)', 'اندازه متوسط'], ['بزرگ (بیش از ۵۰ مشتری)', 'اندازه بزرگ']];
  function sizeOf(s) {
    var m = s.match(/(\d+)\s*(نفر|مشتری|میز)/);
    if (m) { var n = parseInt(m[1], 10); return n <= 20 ? 0 : n <= 50 ? 1 : 2; }
    if (/کوچک/.test(s)) return 0; if (/متوسط/.test(s)) return 1; if (/بزرگ/.test(s)) return 2;
    return -1;
  }
  function conceptOf(s) {
    var cid = ''; Object.keys(CONCEPT_KEYS).forEach(function (k) { CONCEPT_KEYS[k].forEach(function (w) { if (!cid && s.indexOf(norm(w)) >= 0) cid = k; }); });
    return cid;
  }
  function flowTexts() {
    var texts = [];
    for (var i = S.msgs.length - 1; i >= 0; i--) { var m = S.msgs[i]; if (m.role === 'bot' && m.flowDone) break; if (m.role === 'user') texts.unshift(norm(m.text)); }
    return texts;
  }
  function flowActive() { for (var i = S.msgs.length - 1; i >= 0; i--) { var m = S.msgs[i]; if (m.role === 'bot') return !!m.flow && !m.flowDone; } return false; }
  function starter(s) {
    var PL = window.MSPlan; if (!PL || !PL.CONCEPTS.length) return null;
    var intent = /(راه ?اندازی|چی لازم|چه چیز(ی)? لازم|چی میخوام|چی نیازه|چه تجهیزات|چه دستگاه|چه وسایل|لیست تجهیزات|تجهیزات (لازم|مورد نیاز)|شروع کار|باز کنم|بزنم|میخوام|می خوام|راه بندازم|دارم)/;
    var texts = flowTexts(), cur = conceptOf(s), cont = flowActive();
    if (!cur && !cont && intent.test(s) && /کسب ?و ?کار|مغازه|مجموعه|بیزنس/.test(s))
      return { flow: true, ids: [], text: 'عالی. چه نوع کسب‌وکاری؟ یکی را بزنید.', chips: PL.CONCEPTS.slice(0, 9).map(function (x) { return { label: x.t, q: 'می‌خواهم ' + x.t + ' راه‌اندازی کنم' }; }) };
    if (!(cur && intent.test(s)) && !cont) return null;
    // the flow starts at the latest message that names a business with an intent; menu answers («منو: ...») never start one
    var start = 0; for (var i = 0; i < texts.length; i++) if (conceptOf(texts[i]) && intent.test(texts[i]) && !/^منو:/.test(texts[i])) start = i;
    var run = texts.slice(start), cid = conceptOf(run[0]);
    if (!cid) return null;
    var c = PL.CONCEPTS.filter(function (x) { return x.id === cid; })[0]; if (!c) return null;
    var size = -1, menu = [], go = false;
    run.forEach(function (x) {
      var z = sizeOf(x); if (z >= 0) size = z;
      c.serve.forEach(function (o) { if (x.indexOf(norm(o.t)) >= 0 && menu.indexOf(o.id) < 0) menu.push(o.id); });
      if (/(^| )ادامه|همین ها کافی|همینا کافی|بدون منو|کافیه|کافی است/.test(x)) go = true;
    });
    if (size < 0) return { flow: true, ids: [], text: '**' + c.t + '**؛ ' + c.d + '.\n\nبرای اینکه فهرست درست بدهم چند سؤال کوتاه دارم. اول: ظرفیت مجموعه چقدر است؟ (تعداد مشتری هم‌زمان)', chips: SIZE_CHIPS.map(function (x) { return { label: x[0], q: x[1] }; }) };
    if (!go) {
      var left = c.serve.filter(function (o) { return menu.indexOf(o.id) < 0; }).slice(0, 8);
      if (left.length) {
        var picked = c.serve.filter(function (o) { return menu.indexOf(o.id) >= 0; }).map(function (o) { return o.t; });
        return { flow: true, ids: [], text: (picked.length ? 'ثبت شد: ' + picked.join('، ') + '.\n\n' : 'اندازهٔ ' + PL.SIZES[size].t + ' را گرفتم.\n\n') + 'منو چه چیزهایی دارد؟ هر چند تا را بزنید، هر وقت تمام شد «همین‌ها کافی است» را انتخاب کنید.',
          chips: left.map(function (o) { return { label: o.t, q: 'منو: ' + o.t }; }).concat([{ label: 'همین‌ها کافی است', q: 'ادامه' }]) };
      }
    }
    var sz = PL.SIZES[size], jobs = c.core.slice(), t = ['**فهرست پیشنهادی برای ' + c.t + '** (اندازهٔ ' + sz.t + ')', ''];
    c.serve.forEach(function (o) { if (menu.indexOf(o.id) >= 0) o.jobs.forEach(function (j) { if (jobs.indexOf(j) < 0) jobs.push(j); }); });
    ['wash', 'hood'].forEach(function (j) { if (jobs.indexOf(j) < 0 && PL.JOBS[j]) jobs.push(j); });
    var ids = [], cart = [], total = 0, noEx = [];
    jobs.forEach(function (jid) {
      var job = PL.JOBS[jid]; if (!job) return;
      var q = job.qty[size], ex = exampleFor(job);
      t.push('- **' + job.t + '** × ' + fmt(q) + ': ' + job.why + (ex ? ' (نمونه: ' + ex.name + '، ' + fmt(cashOf(ex)) + ' تومان نقدی)' : ''));
      if (ex) { ids.push(ex.id); cart.push({ id: ex.id, qty: q }); total += cashOf(ex) * q; } else noEx.push(job.t);
    });
    if (total) t.push('', 'جمع تقریبی نقدی نمونه‌ها: **' + fmt(total) + ' تومان**' + (noEx.length ? ' (بدون ' + noEx.join('، ') + '، که نمونهٔ قیمت‌دار در کاتالوگ ندارد)' : '') + '.');
    t.push('', 'این پیشنهاد از قاعده‌های طراح کافه و رستوران است و جای مشاورهٔ فروش را نمی‌گیرد؛ نمونه‌ها کالای میانهٔ قیمت هر دسته‌اند. می‌خواهید چیزی را عوض کنیم؟');
    return { flowDone: true, text: t.join('\n'), ids: ids, cart: cart, links: [{ href: './planner.html', label: 'ساخت طرح کامل در طراح' }],
      chips: [{ label: 'اندازهٔ دیگر', q: 'می‌خواهم ' + c.t + ' راه‌اندازی کنم' }, { label: 'کسب‌وکار دیگر', q: 'می‌خواهم کسب‌وکار دیگری راه‌اندازی کنم' }] };
  }
  // length and depth in cm: from dims, or from the «طول» / «عرض» spec lines of items that have no height
  function lw(it) {
    if (it.dims && it.dims.l && it.dims.w) return { l: it.dims.l, w: it.dims.w };
    var l = 0, w = 0; (it.specs || []).forEach(function (sp) { var n = parseFloat(norm(sp[1]).replace(/[^0-9.]/g, '')); if (sp[0] === 'طول') l = n; else if (sp[0] === 'عرض') w = n; });
    return l && w ? { l: l, w: w } : null;
  }
  function spaceFit(s) {
    if (!/(جا (می‌?شه|می‌?شود|می‌?گیره|می‌?گیرند|بشه|بشن|میشن)|جا میگیر|جا بگیر|جا میشه|کنار هم|فضا)/.test(s.replace(/\u200c/g, ' ')) && !/جا/.test(s)) return null;
    var t0 = s.replace(/(\d)[٫,](\d)/g, '$1.$2'), m = t0.match(/(?:در|تو|توی|فضای|فضا|به طول|طول|دیوار|ضلع)\s*(\d+(?:\.\d+)?)\s*(متر|سانتی ?متر|سانت|cm)/);
    if (!m || !/جا|فضا|کنار هم/.test(t0)) return null;
    var space = parseFloat(m[1]) * (m[2] === 'متر' ? 100 : 1);
    var rest = t0.replace(m[0], ' ').replace(/(جا (می‌?شه|می‌?شود|می‌?گیره|می‌?گیرند|بشه|بشن|میشن)|جا میشه|جا میگیره|جا بگیره|کنار هم|آیا|هست|میشه|چک کن)/g, ' ');
    var parts = rest.split(/\s+و\s+|[،,+\n]|\s+با\s+(?=\d)/).map(function (x) { return x.trim(); }).filter(Boolean), rows = [], lost = [], unknown = [], sum = 0, depth = 0;
    parts.forEach(function (p) {
      var q = p.match(/^(\d+)\s*(?:تا|عدد|دستگاه)?\s+(.+)$/), w = p.match(/^(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)\s*(?:تا|عدد|دستگاه)?\s+(.+)$/), qty = 1, topic = p;
      if (q) { qty = parseInt(q[1], 10); topic = q[2]; } else if (w) { qty = WORDNUM[w[1]]; topic = w[2]; }
      var h = retrieve(topic, 6).filter(function (x) { return !x.d.it.faq; });
      if (!h.length) { lost.push(topic); return; }
      var pick = bestOf(h, topic, function (it) { return lw(it); }), it = pick.d.it, d = lw(it);
      if (!d) { unknown.push(it.name); return; }
      rows.push({ it: it, qty: qty, d: d }); sum += d.l * qty; depth = Math.max(depth, d.w);
    });
    if (!rows.length) return { text: 'کالایی با اندازهٔ ثبت‌شده برای محاسبه پیدا نکردم. بنویسید مثلاً «میز کار ۱۵۰ و گریل ۶۰ در ۲٫۵ متر جا می‌شود؟».', links: [] };
    var gap = space - sum, t = ['**بررسی جا در ' + fmt(space) + ' سانتی‌متر (طول کنار هم):**', ''];
    rows.forEach(function (r) { t.push('- ' + fmt(r.qty) + ' × **' + r.it.name + '**: طول ' + fmt(r.d.l) + '، عمق ' + fmt(r.d.w) + ' سانتی‌متر'); });
    t.push('', 'جمع طول: **' + fmt(sum) + ' سانتی‌متر**؛ عمق بیشترین کالا: ' + fmt(depth) + ' سانتی‌متر.');
    t.push(gap >= 0 ? 'نتیجه: **جا می‌شود** و ' + fmt(gap) + ' سانتی‌متر باقی می‌ماند.' : 'نتیجه: **جا نمی‌شود**؛ ' + fmt(-gap) + ' سانتی‌متر کم است.');
    if (unknown.length) t.push('', 'ابعاد این کالاها ثبت نشده و در محاسبه نیامد: ' + unknown.join('، ') + '.');
    if (lost.length) t.push('', 'این موارد را پیدا نکردم: ' + lost.join('، ') + '.');
    t.push('', 'فقط طول کنار هم حساب شده است؛ فضای عبور، فاصله از دیوار و تهویه را جدا در نظر بگیرید و با کارشناس فروش هماهنگ کنید.');
    return { text: t.join('\n'), ids: rows.map(function (r) { return r.it.id; }), links: [] };
  }
  function reqHelp(s) {
    if (!/(درخواست خرید|ثبت سفارش|سفارش|بخرم|خرید|میخوام بخرم|پیگیری درخواست)/.test(s)) return null;
    var n = pubRead().length, links = [];
    if (/پیگیری/.test(s)) return { text: 'با کد پیگیری که هنگام ثبت درخواست گرفته‌اید می‌توانید وضعیت درخواست را ببینید.', links: [{ href: './track.html', label: 'پیگیری درخواست' }] };
    if (n) links.push({ href: './planner.html?public=1&from=aria', label: 'مشاهده و ارسال درخواست خرید (' + fmt(n) + ' کالا)' });
    return { text: '**درخواست خرید:** کالاهای مورد نظر را با دکمهٔ «+ افزودن به درخواست خرید» زیر هر کالا (یا بنویسید «اضافه کن») در لیست بگذارید، بعد «مشاهده و ارسال» را بزنید و مشخصات خود را بنویسید. کارشناس فروش با شما تماس می‌گیرد و قیمت و شرایط را همان‌جا اعلام می‌کند. قیمت و پرداخت اینجا انجام نمی‌شود.' + (n ? '\n\nاکنون ' + fmt(n) + ' کالا در درخواست شما هست.' : ''), links: links };
  }
  // «can I cook X?»: the question is turned into the equipment that does the job, then the catalog is searched. How long, how hot, or what may share a basket is NOT in our sources, so Arya says so.
  var FOOD = [[/پیتزا/, 'پیتزا', 'فر پیتزا'], [/پاستا/, 'پاستا', 'پاستاپز'], [/سیب ?زمینی|سوخاری|ناگت|پیاز داغ|بادمجان|فلافل/, 'غذای سرخ‌کردنی', 'سرخ کن'], [/کباب|استیک|گریل|همبرگر|برگر/, 'کباب و گریل', 'گریل'], [/آب ?پرتقال|آب ?میوه/, 'آب‌میوه', 'آب پرتقال گیر']];
  function foodSkill(s) {
    if (!/(می ?تون|می ?توان|میشه|می ?شود|بپز|درست کن|سرخ کن|آماده|طول می ?کش|چند دقیقه|چه دستگاه|چی لازم|چه وسیله|بذار)/.test(s)) return null;
    for (var i = 0; i < FOOD.length; i++) {
      if (!FOOD[i][0].test(s)) continue;
      var hits = retrieve(FOOD[i][2], 5); if (!hits.length) return null;
      var timing = /(طول می ?کش|چند دقیقه|چند ساعت|دما|چند درجه|زمان)/.test(s), mix = /(کنار|با هم|هم ?زمان|همراه|هم بذار|باهاش)/.test(s);
      var note = 'برای ' + FOOD[i][1] + ' دستگاه‌های زیر مناسب‌اند. ' + (timing || mix ? 'زمان، دما و اینکه چه موادی را می‌شود با هم پخت در منابع من نیست و حدس نمی‌زنم؛ مرجع، دفترچهٔ همان دستگاه یا خدمات پس از فروش است [نیاز به تأیید].' : 'مشخصات هر دستگاه را از کارت‌ها ببینید.');
      return { ids: hits.map(function (h) { return h.d.it.id; }), note: note, text: '', cards: true };
    }
    return null;
  }
  // what Arya is not for: say so plainly and point to where the answer lives, instead of a bare «no answer»
  function scopeNote(s) {
    function nav(id) { var n = NAV.filter(function (x) { return x.id === id; })[0]; return n && navAllowed(n) ? { href: n.href, label: n.label } : null; }
    var l = [];
    if (/(دستور ?پخت|طرز تهیه|رسپی|قرمه ?سبزی|خورش|خوشمزه|طعم|مزه|خوب می ?شه)/.test(s)) return { text: '**دستور پخت و سلیقهٔ طعم جزو دانسته‌های من نیست.** من دربارهٔ تجهیزات، شرکت، نمایشگاه‌ها و آموزش‌های مکث‌سیلور جواب می‌دهم. اگر بنویسید چه غذایی و در چه حجمی می‌پزید، دستگاه مناسبش را پیدا می‌کنم.', links: [], chips: [{ label: 'دستگاه برای رستوران', q: 'می‌خواهم رستوران راه‌اندازی کنم' }] };
    if (/(چرا|چه دلیل|به نظرت).*(فروش)|فروش.*(زیاد|کم|بیشتر|کمتر|افت|رشد)|پر ?فروش|کم ?فروش|بیشترین فروش|کمترین فروش/.test(s)) { l = [nav('analysis'), nav('dashboard')].filter(Boolean); return { text: '**تحلیل فروش و دلیل کم یا زیادشدنش را حدس نمی‌زنم.** این کار به داده و بررسی انسانی نیاز دارد' + (l.length ? '؛ گزارش‌ها را در صفحه‌های زیر ببینید.' : ' و نقش شما به گزارش‌های فروش دسترسی ندارد؛ از مدیر فروش بپرسید.'), links: l, chips: null }; }
    if (/(استخدام|مصاحبه|رزومه|جذب نیرو)/.test(s)) return { text: '**فرایند استخدام را منابع انسانی اجرا می‌کند.** اگر نقش شما اجازه دارد، توضیحش را در «روش اجرایی» همین دستیار می‌بینید (بنویسید «روش اجرایی منابع انسانی»)؛ وگرنه از «گفت‌وگوها» از منابع انسانی بپرسید.', links: [{ href: './panel.html#tickets', label: 'گفت‌وگوها' }], chips: [{ label: 'روش اجرایی منابع انسانی', q: 'روش اجرایی منابع انسانی' }] };
    if (/(تعمیر|خراب|روشن می ?شه|کار نمی ?کنه|عیب|تعویض|تویض)|سرویس (کنم|کردن|دستگاه)|هر چند وقت.*سرویس/.test(s)) return { text: '**عیب‌یابی، تعمیر و زمان سرویس هر دستگاه را من تأیید نمی‌کنم** (خودتعمیری ممکن است ایمنی و گارانتی را به خطر بیندازد). مدل دستگاه و شرح مشکل را از «گفت‌وگوها» برای خدمات پس از فروش بفرستید؛ من پیش‌نویس درخواستش را می‌نویسم.', links: [{ href: './panel.html#tickets', label: 'گفت‌وگوها' }], chips: [{ label: 'پیش‌نویس درخواست خدمات', q: 'پیش‌نویس درخواست خدمات پس از فروش' }] };
    if (/(بر اساس چه|چه مبنایی|چرا .*(مناسب|پیشنهاد)|مناسبه)/.test(s)) return { text: '**پیشنهادهای من فقط از داده‌های کاتالوگ می‌آید:** گروه و نام کالا، ابعاد، ظرفیت و مشخصات ثبت‌شده، و نوع کسب‌وکار و اندازه‌ای که شما بنویسید (مثلاً کافه کوچک). نیاز واقعی مشتری را کارشناس فروش بررسی می‌کند؛ من جای او تصمیم نمی‌گیرم.', links: [], chips: [{ label: 'راه‌اندازی کافه', q: 'می‌خواهم کافه راه‌اندازی کنم' }] };
    return null;
  }
  function skills(q) { var s = norm(q); if (PUBLIC) return addToLast(s) || (SIGNED && drafts(s)) || starter(s) || spaceFit(s) || foodSkill(s) || pageGuide(s) || reqHelp(s); return addToLast(s) || myTasks(s) || occasions(s) || drafts(s) || starter(s) || spaceFit(s) || quote(s) || foodSkill(s) || pageGuide(s); }
  // small follow-up buttons under an answer
  function extras(m) {
    var h = '';
    if (m.state === 'wait' || m.state === 'stream' || m.state === 'typing') return '';
    if (m.chips && m.chips.length && S.msgs[S.msgs.length - 1] === m) h += '<div class="as-quick as-chips2">' + m.chips.map(function (c) { return '<button type="button" data-q="' + esc(c.q) + '">' + esc(c.label) + '</button>'; }).join('') + '</div>';
    if (m.links && m.links.length) h += '<div class="as-links">' + m.links.map(function (l) { return '<a class="as-go" href="' + esc(l.href) + '">' + esc(l.label) + '</a>'; }).join('') + '</div>';
    if (m.cart && m.cart.length) h += '<div class="as-quick"><button type="button" data-addall="' + esc(JSON.stringify(m.cart)) + '">' + T_ALL + '</button></div>';
    var its = hitsOf(m).filter(function (it) { return !it.faq; });
    if (its.length && !m.cart && (m.state === 'cards' || m.state === 'done') && !m.links) {
      var it = its[0], c = [];
      if (its.length === 1 || m.text) {
        if (!m.text || !/ابعاد/.test(m.text)) c.push('<button type="button" data-q="' + esc('ابعاد ' + it.name) + '">ابعاد و مشخصات</button>');
        if (EQ[it.id] && EQ[it.id].length && itemsById[EQ[it.id][0]]) c.push('<button type="button" data-q="' + esc('مقایسه ' + it.name + ' و ' + itemsById[EQ[it.id][0]].name) + '">مقایسه با برند دیگر</button>');
      } else if (m.q) c.push('<button type="button" data-q="' + esc('ارزان‌ترین ' + m.q) + '">ارزان‌ترین گزینه</button>');
      c.push('<button type="button" data-addinv="' + esc(it.id) + '" class="' + (inProforma(it.id) ? 'on' : '') + '">' + (inProforma(it.id) ? T_IN : T_ADD) + '</button>');
      h += '<div class="as-quick">' + c.join('') + '</div>';
    }
    return h;
  }
  // what a bot message is made of; null when nothing in the catalog answers the question
  function noteOf(m) { return m.nonote || m.note || ('نزدیک‌ترین کالاها به پرسش شما، از میان ' + fa.format(docs.length) + ' کالای کاتالوگ:'); }
  function resolve(q, prevQ) {
    var talk = smallTalk(q); if (talk) return { ids: [], text: talk, state: 'done' };
    var kb = SIGNED && window.MSKnowledge ? window.MSKnowledge.answer(q, prevQ) : null;   // company, fairs and academy texts (role-limited); no model
    var kbOut = kb ? { ids: [], text: kb.text, links: kb.links, chips: kb.chips, state: 'done', kb: kb.title } : null;
    var sk = skills(q);
    if (!sk && kbOut && window.MSKnowledge.intent(q)) return kbOut;   // a question about the company or the training is answered before the catalog is searched
    var sn0 = !sk && SIGNED ? scopeNote(norm(q)) : null;   // repairs, recipes, sales analysis...: say what Arya is not for before a stray catalog word answers instead
    if (sn0) return { ids: [], text: sn0.text, links: sn0.links || [], chips: sn0.chips || null, state: 'done', scope: true };
    if (sk && sk.cards) return { ids: sk.ids, note: sk.note, main: true, state: 'cards' };
    if (sk) return { ids: sk.ids || [], text: sk.text, links: sk.links || [], cart: sk.cart || null, chips: sk.chips || null, flow: !!sk.flow, flowDone: !!sk.flowDone, state: 'done' };
    var s2 = smart2(q);
    if (s2) return { ids: s2.ids, text: s2.text, note: s2.note, state: s2.text ? 'done' : s2.none ? 'none' : 'cards', nonote: s2.none ? s2.note : '' };
    var sm = smart(q);
    if (sm) return { ids: (sm.hits || []).map(function (it) { return it.id; }), note: sm.note, state: sm.none ? 'none' : 'cards', nonote: sm.none ? sm.note : '' };
    // a short follow-up («و ۹۰ تا؟») is searched together with the previous question
    var short = tokens(q).filter(function (w) { return w.charAt(0) !== '~'; }).length;
    var hits = retrieve(q, 5); if (!hits.length && short <= 2) hits = retrieve(q, 5, true); if (!hits.length && prevQ) hits = retrieve(prevQ + ' ' + q, 5);
    if (!hits.length) {
      if (kbOut && kb.strong) return kbOut;   // the catalog has nothing: company knowledge may still answer, but only when every word of the question matched
      if (PUBLIC && PRICEQ.test(norm(q))) return { ids: [], text: 'قیمت و شرایط پرداخت را فقط کارشناس فروش مکث‌سیلور در تماس اعلام می‌کند. اگر کالای مورد نظرتان را بنویسید، پیدایش می‌کنم و به درخواست خرید شما اضافه می‌کنم.', state: 'done' };
      var sn = SIGNED ? scopeNote(norm(q)) : null;
      if (sn) return { ids: [], text: sn.text, links: sn.links || [], chips: sn.chips || null, state: 'done', scope: true };
      return null;
    }
    var bot = { q: q, main: true, ids: hits.map(function (h) { return h.d.it.id; }), state: 'cards' };
    if (short <= 1 && !/[0-9]/.test(q) && !hits[0].d.it.faq) {
      bot.note = 'پرسش شما کلی است و کالاهای زیادی دارد. کدام را می‌خواهید؟ یکی از گزینه‌ها را بزنید یا اندازه و نوع (گازی، برقی، ذغالی) را بنویسید. چند نمونه:';
      bot.chips = [{ label: 'مکث‌سیلور', q: q + ' مکث‌سیلور' }, { label: 'وینتورا', q: q + ' وینتورا' }, { label: 'توربومکس', q: q + ' توربومکس' }].concat(PUBLIC ? [] : [{ label: 'ارزان‌ترین', q: 'ارزان‌ترین ' + q }]);
    }
    if (PUBLIC && PRICEQ.test(norm(q))) bot.note = 'قیمت را فقط کارشناس فروش مکث‌سیلور در تماس اعلام می‌کند. این کالاها را پیدا کردم؛ هر کدام را می‌خواهید به «درخواست خرید» اضافه کنید.';
    return bot;
  }
  // a short «thinking» pause (the dots), then the answer is typed out; with reduced motion it just appears
  function deliver(bot) {
    bot.role = 'bot';
    var bi = S.msgs.length; S.msgs.push(bot);
    var final = bot.state || (bot.text ? 'done' : 'cards');
    if (REDUCE || S.busy) { bot.state = final; save(); render(); return; }
    var full = bot.text || '', typed = full ? '' : (final === 'none' ? (bot.nonote || 'در منابع من پاسخی برای این پرسش نیست.') : noteOf(bot)), src = full || typed;
    S.busy = true; bot.state = 'wait'; bot.text = ''; render();
    var think = 380 + Math.min(700, src.length * 2.2) + Math.random() * 260;
    setTimeout(function () {
      var total = Math.min(2600, Math.max(500, src.length * 13)), steps = Math.max(1, Math.round(total / 26)), per = Math.max(1, Math.ceil(src.length / steps)), at = 0;
      bot.state = full ? 'stream' : 'typing';
      (function tick() {
        at = Math.min(src.length, at + per);
        while (at < src.length && !/\s/.test(src.charAt(at - 1))) at++;
        if (full) bot.text = src.slice(0, at); else bot.typed = src.slice(0, at);
        paintBot(bi, true);
        if (at < src.length) setTimeout(tick, 26);
        else { bot.text = full; delete bot.typed; bot.state = final; S.busy = false; save(); bot.reveal = true; render(true); delete bot.reveal; scrollEnd(true); }
      })();
    }, think);
  }
  function ask(text) {
    text = String(text || '').trim(); if (!text || !S.ready || S.busy) return;
    var prevQ = null; for (var i = S.msgs.length - 1; i >= 0; i--) if (S.msgs[i].role === 'user') { prevQ = S.msgs[i].text; break; }
    var history = S.msgs.filter(function (m) { return m.role === 'user' || (m.role === 'bot' && m.text); }).slice(-8).map(function (m) { return { role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }; });
    S.msgs.push({ role: 'user', text: text });
    var r = resolve(text, prevQ);
    if (!r || r.state === 'none') {
      var cx = correct(text);
      if (cx.changed.length) { var r2 = resolve(cx.q, prevQ); if (r2 && r2.state !== 'none') { r = r2; r.fixed = cx.changed; } }
    }
    if (!r) { r = { q: text, ids: [], state: 'none' }; logAdd('none', text, []); }
    else if (r.state === 'none' && r.main) logAdd('none', text, []);
    else if (r.scope) logAdd('none', text, []);   // outside Arya's job: still worth knowing what people ask
    if (r.main && relayUrl() && r.ids.length && r.state === 'cards') {
      var bot = r, bi = S.msgs.length, items = r.ids.map(function (id) { return byId[id]; }).filter(Boolean);
      bot.role = 'bot'; S.msgs.push(bot);
      bot.state = 'wait'; S.busy = true; render();
      writing(items, text, history, function (acc) { bot.text = acc; bot.state = 'stream'; paintBot(bi, true); }).then(function (a) { bot.text = a; bot.state = 'done'; }, function (e) {
        bot.text = ''; bot.state = 'cards';
        bot.note = e && /relay-40[13]/.test(e.code || '') ? 'برای گفت‌وگو باید وارد حساب خود شده باشید و نقش شما اجازه داشته باشد. نزدیک‌ترین کالاها:' : 'پاسخ نوشته‌شده الان در دسترس نیست. نزدیک‌ترین کالاها:';
      }).then(function () { S.busy = false; save(); render(true); scrollEnd(true); var q = document.getElementById('asQ'); if (q && !('ontouchstart' in window)) q.focus(); });
      return;
    }
    deliver(r);
  }
  function submitBox() { var q = document.getElementById('asQ'); if (!q) return; var v = q.value; q.value = ''; grow(q); ask(v); }
  root.addEventListener('submit', function (e) { if (e.target.id === 'asForm') { e.preventDefault(); submitBox(); } });
  root.addEventListener('input', function (e) { if (e.target.id === 'asQ') grow(e.target); });
  // Enter sends on a computer (Shift+Enter is a new line); on a phone Enter is a new line and the arrow sends
  root.addEventListener('keydown', function (e) { if (e.target.id === 'asQ' && e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(hover:hover)').matches) { e.preventDefault(); submitBox(); } });
  root.addEventListener('click', function (e) {
    var c;
    if (e.target.closest('#asLog2')) { logExport(); return; }
    if ((c = e.target.closest('[data-fb]'))) {
      var mi = Number(c.getAttribute('data-i')), mm = S.msgs[mi], kind = c.getAttribute('data-fb');
      if (mm) { var prev = S.msgs[mi - 1], same = mm.fb === kind; mm.fb = same ? '' : kind; if (!same) logAdd(kind === 'up' ? 'up' : 'down', prev && prev.text, mm.ids); save(); render(true); }
      return;
    }
    if (e.target.closest('#asMic')) { listen(); return; }
    if ((c = e.target.closest('[data-addall]'))) {
      var cart = []; try { cart = JSON.parse(c.getAttribute('data-addall')); } catch (x) { cart = []; }
      var n = 0; cart.forEach(function (l) { if (addProforma(l.id, l.qty)) n++; });
      c.classList.add('on'); c.textContent = n ? '✓ ' + fmt(n) + ' کالا ' + (PUBLIC ? 'به درخواست خرید' : 'به پیش‌فاکتور') + ' اضافه شد' : '✓ از قبل در لیست بودند'; if (PUBLIC) render(true);
      return;
    }
    if ((c = e.target.closest('[data-addinv]'))) {
      var id = c.getAttribute('data-addinv'), was = inProforma(id);
      if (!was) addProforma(id);
      root.querySelectorAll('[data-addinv="' + id + '"]').forEach(function (b) { b.classList.add('on'); b.textContent = T_IN; });
      return;
    }
    if ((c = e.target.closest('[data-q]'))) { ask(c.getAttribute('data-q')); return; }
    if ((c = e.target.closest('[data-recent]'))) { var rr = recRead()[Number(c.getAttribute('data-recent'))]; if (rr && !S.busy) { S.msgs = rr.msgs; save(); render(); } return; }
    if (e.target.closest('[data-recent-clear]')) { try { localStorage.removeItem(RECK); } catch (x) { /* ignore */ } render(true); return; }
    if (e.target.closest('#asNew')) { if (!S.busy) { recSave(); S.msgs = []; save(); render(true); } return; }
    if ((c = e.target.closest('[data-copy]'))) { var m = S.msgs[Number(c.getAttribute('data-copy'))]; try { navigator.clipboard.writeText(m.text).then(function () { c.querySelector('span').textContent = 'کپی شد'; setTimeout(function () { c.querySelector('span').textContent = 'کپی'; }, 1400); }); } catch (x) { /* ignore */ } }
  });
  window.MSAssistant = { retrieve: function (q, k) { return retrieve(q, k || 5).map(function (h) { return { id: h.d.it.id, name: h.d.it.name, score: Math.round(h.s * 100) / 100 }; }); }, size: function () { return docs.length; }, ask: ask, fix: function (q) { return correct(q); } };
  // public: the product codes the sales team took out of use (the same list the public planner reads)
  function loadPubRet() {
    if (window.MSApi && window.MSApi.enabled()) {
      return window.MSApi.publicConfig('retired').then(function (d) { PUBRET = {}; (d.ids || []).forEach(function (id) { PUBRET[id] = true; }); }, function () { /* offline: nothing is hidden */ });
    }
    var c = window.MS_FIREBASE; if (!c || !c.projectId || !window.fetch) return Promise.resolve();
    var ctl = window.AbortController ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
    return fetch('https://firestore.googleapis.com/v1/projects/' + c.projectId + '/databases/(default)/documents/public_config/retired?key=' + encodeURIComponent(c.apiKey || ''), ctl ? { signal: ctl.signal } : {})
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { var v = (j && j.fields && j.fields.ids && j.fields.ids.arrayValue && j.fields.ids.arrayValue.values) || []; PUBRET = {}; v.forEach(function (x) { if (x.stringValue) PUBRET[x.stringValue] = true; }); })
      .then(null, function () { /* offline: nothing is hidden */ }).then(function () { clearTimeout(to); });
  }
  // the chat is exactly as tall as what is visible (the keyboard and the address bar change it), so the message box never hides behind anything
  function fit() {
    var as = document.getElementById('as'), hd = document.querySelector('header.ms-sitebar'); if (!as) return;
    var vv = window.visualViewport, top = hd ? Math.round(hd.getBoundingClientRect().bottom) + 8 : 64, h = vv ? vv.height : window.innerHeight, off = vv ? vv.offsetTop : 0;
    as.style.top = (top + off) + 'px'; as.style.height = Math.max(240, h - top) + 'px';
  }
  window.addEventListener('resize', fit); window.addEventListener('orientationchange', fit);
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', fit); window.visualViewport.addEventListener('scroll', fit); }
  restore();
  S.fresh = S.msgs.length;
  render(true);
  fit();
  var VER = (document.currentScript && document.currentScript.src.split('v=')[1]) || '';
  function load(name, fallback) { return fetch('./assets/' + name + '.json?v=' + VER).then(function (r) { if (!r.ok) throw new Error(name); return r.json(); }).catch(function () { return fallback; }); }
  Promise.all([fetch('./assets/catalog.json?v=' + VER).then(function (r) { if (!r.ok) throw new Error('catalog'); return r.json(); }), load('knowledge', []), load('equivalents', {})]).then(function (all) {
    build(all[0].items || [], all[1], all[2]); S.ready = true;
    if (PUBLIC) loadPubRet().then(function () { render(true); });
    if (window.MSPrices) { window.MSPrices.load().then(function () { render(true); }, function () { render(true); }); window.MSPrices.onChange(function () { render(true); }); }
    render(true);
    var q = new URLSearchParams(location.search).get('q'); if (q) ask(q);
  }).catch(function () { S.error = 'کاتالوگ خوانده نشد. صفحه را دوباره باز کنید.'; render(); });
})();

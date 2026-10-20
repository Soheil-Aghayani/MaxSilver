// assistant.html: ask a question about the products, get the closest catalog items with their prices and where they come from.
// This is the retrieval half of the planned RAG assistant (06_RAG/rag/*.py is the reference): the same Persian normalising, the same
// BM25 ranking and the same refusal rule («no passage matches -> say so»). It does not write sentences and never guesses; a language
// model for written answers is a later step (milestone J4). Everything runs in the browser on assets/catalog.json, nothing is sent anywhere.
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
    ['دیس پلی', 'دیسپلی'], ['شو کیک', 'شوکیک'], ['زیر گریل', 'زیرگریل'], ['پاستا پز', 'پاستاپز']];
  var STOP = {};
  ('و در به از که را این آن با برای است شد می یک بر هم یا تا اما نیز باید شده های ها ای ی چگونه چه چند کدام آیا کنیم کنید کردن کرد دارد دارم لطفا ' +
    'قیمت تومان چقدر چنده هزینه').split(' ').forEach(function (w) { if (w) STOP[w] = 1; });
  function norm(s) {
    var t = String(s == null ? '' : s).normalize('NFKC')
      .replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; })
      .replace(/ي/g, 'ی').replace(/ى/g, 'ی').replace(/ك/g, 'ک').replace(/ۀ/g, 'ه').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/أ/g, 'ا').replace(/إ/g, 'ا').replace(/ٱ/g, 'ا')
      .replace(/‌/g, ' ').replace(/[ً-ٰٟ‍‎‏؜]/g, '').toLowerCase();
    VARIANTS.forEach(function (v) { t = t.split(v[0]).join(v[1]); });
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
  function build(items) {
    items.forEach(function (it) {
      var d = it.dims, parts = [it.name, it.code ? 'کد ' + it.code : '', 'برند ' + (BR[it.src] || it.src), 'دسته ' + (it.cat || ''), 'گروه ' + (it.grp || '')];
      if (d && d.l && d.w && d.h) parts.push('ابعاد ' + d.l + '×' + d.w + '×' + d.h + ' سانتی‌متر');
      if (it.wt) parts.push('وزن ' + it.wt + ' کیلوگرم');
      (it.specs || []).forEach(function (s) { parts.push(s[0] + ': ' + s[1]); });
      if (it.desc) parts.push(it.desc);
      var tk = tokens(it.name + ' ' + parts.join(' . ')), tf = {};
      tk.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      docs.push({ it: it, len: tk.length, tf: tf });
      byId[it.id] = it;
    });
    avg = docs.reduce(function (a, d) { return a + d.len; }, 0) / Math.max(1, docs.length);
  }
  function search(q, k) {
    var n = docs.length, qt = {};
    tokens(q).forEach(function (t) { qt[t] = 1; });
    var qs = Object.keys(qt), scored = [];
    docs.forEach(function (d) {
      var s = 0;
      qs.forEach(function (t) {
        var f = d.tf[t]; if (!f) return;
        var idf = Math.log(1 + (n - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5));
        s += idf * f * (K1 + 1) / (f + K1 * (1 - B + B * d.len / avg));
      });
      if (s > 0) scored.push({ s: s, d: d });
    });
    scored.sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, k);
  }
  // [] when nothing is a real match: the page then says so instead of showing guesses
  function retrieve(q, k) {
    var hits = search(q, k);
    if (!hits.length || hits[0].s < MIN_SCORE) return [];
    var words = Object.keys((function () { var o = {}; tokens(q).forEach(function (t) { if (t.charAt(0) !== '~') o[t] = 1; }); return o; })());
    if (words.length && words.filter(function (w) { return hits[0].d.tf[w]; }).length / words.length < COVER) return [];
    return hits;
  }

  // ---------- page
  var S = { ready: false, error: '', log: [] };
  var SUGGEST = ['گریل ۶۰ ذغالی', 'سینک ۱۰۰ سانت دو لگن', 'بویلر ۲۵ لیتر BUNN', 'سرخ‌کن گازی ۱۸ لیتری', 'یخچال زیر گریل ۱۸۰'];
  function price(it) {
    var P = window.MSPrices, v = P && P.get ? P.get(it.id) : null;
    if (!v) return '<span class="as-p none">قیمت ثبت نشده</span>';
    if (v.s === 'p' && v.p > 0) {
      var ch = P.cheque ? P.cheque(v, it.grp) : 0;
      return '<span class="as-p"><small>نقدی</small><b>' + fa.format(v.p) + '</b> تومان</span>' + (ch && ch !== v.p ? '<span class="as-p"><small>اعتباری (چکی)</small><b>' + fa.format(ch) + '</b> تومان</span>' : '');
    }
    return '<span class="as-p none">' + esc(P && P.label ? P.label(v) : '') + '</span>';
  }
  function card(h) {
    var it = h.d.it;
    return '<article class="as-card"><div class="as-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '</div>' +
      '<div class="as-body"><h3>' + esc(it.name) + '</h3><p class="as-meta"><span class="as-br" data-brand="' + esc(it.src) + '"><i></i>' + esc(BR[it.src] || it.src) + '</span>' +
      (it.code ? '<span>کد <b dir="ltr">' + esc(it.code) + '</b></span>' : '') + (it.cat ? '<span>' + esc(it.cat) + '</span>' : '') + '</p>' +
      '<div class="as-prices">' + price(it) + '</div>' +
      (it.pl ? '<p class="as-note">این کالا از فهرست قیمت آمده؛ تصویر و مشخصات آن هنوز در کاتالوگ نیست.</p>' : '') +
      '<a class="as-open" href="./product-catalog.html?q=' + encodeURIComponent(it.code || it.name) + '">نمایش در کاتالوگ</a></div></article>';
  }
  function entry(e) {
    var body = e.hits.length ?
      '<p class="as-lead">نزدیک‌ترین ' + fa.format(e.hits.length) + ' کالا به پرسش شما، از میان ' + fa.format(docs.length) + ' کالای کاتالوگ:</p><div class="as-cards">' + e.hits.map(card).join('') + '</div>' :
      '<p class="as-none">در منابع من پاسخی برای این پرسش نیست.</p><p class="as-hint">دستیار فقط از خود کاتالوگ جواب می‌دهد و حدس نمی‌زند. نام کالا، اندازه یا کد را بنویسید، یا کاتالوگ را با جست‌وجوی معمولی ببینید.</p>';
    return '<section class="as-turn"><p class="as-q">' + esc(e.q) + '</p><div class="as-a">' + body + '</div></section>';
  }
  function view() {
    if (S.error) return '<p class="as-err" role="alert">' + esc(S.error) + '</p>';
    return '<h1>دستیار کاتالوگ</h1><p class="as-intro">دربارهٔ کالا بپرسید؛ دستیار از میان کاتالوگ و قیمت‌ها نزدیک‌ترین کالاها را با قیمت و کد پیدا می‌کند. فعلاً متن نمی‌نویسد و حدس نمی‌زند: اگر چیزی پیدا نکند همین را می‌گوید.</p>' +
      '<form class="as-form" id="asForm" role="search"><input id="asQ" type="search" autocomplete="off" enterkeyhint="search" placeholder="مثلاً: گریل ۹۰ ذغالی" aria-label="پرسش دربارهٔ کالا"' + (S.ready ? '' : ' disabled') + '><button type="submit"' + (S.ready ? '' : ' disabled') + '>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span>بپرس</span></button></form>' +
      '<div class="as-chips">' + SUGGEST.map(function (s) { return '<button type="button" data-q="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div>' +
      (S.ready ? '' : '<p class="as-note">در حال آماده‌کردن کاتالوگ…</p>') + '<div id="asLog">' + S.log.map(entry).join('') + '</div>';
  }
  function render() { var q = document.getElementById('asQ'), v = q ? q.value : ''; root.innerHTML = view(); q = document.getElementById('asQ'); if (q) q.value = v; }
  function ask(text) {
    text = String(text || '').trim(); if (!text || !S.ready) return;
    S.log.unshift({ q: text, hits: retrieve(text, 5) });
    if (S.log.length > 8) S.log.length = 8;
    var q = document.getElementById('asQ'); if (q) q.value = '';
    render();
  }
  root.addEventListener('submit', function (e) { if (e.target.id === 'asForm') { e.preventDefault(); ask(document.getElementById('asQ').value); } });
  root.addEventListener('click', function (e) { var c = e.target.closest('[data-q]'); if (c) ask(c.getAttribute('data-q')); });
  window.MSAssistant = { retrieve: function (q, k) { return retrieve(q, k || 5).map(function (h) { return { id: h.d.it.id, name: h.d.it.name, score: Math.round(h.s * 100) / 100 }; }); }, size: function () { return docs.length; } };
  render();
  fetch('./assets/catalog.json?v=' + ((document.currentScript && document.currentScript.src.split('v=')[1]) || '')).then(function (r) { if (!r.ok) throw new Error('catalog'); return r.json(); }).then(function (c) {
    build(c.items || []); S.ready = true;
    if (window.MSPrices) { window.MSPrices.load().then(render, render); window.MSPrices.onChange(render); }
    render();
    var q = new URLSearchParams(location.search).get('q'); if (q) ask(q);
  }).catch(function () { S.error = 'کاتالوگ خوانده نشد. صفحه را دوباره باز کنید.'; render(); });
})();

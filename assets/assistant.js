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

  // ---------- chat
  var CFG = window.MS_ASSISTANT || {};
  // the address comes from assistant-config.js; a test address in localStorage is honoured only on localhost, so a token never goes to an address someone typed in
  function relayUrl() { try { if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return localStorage.getItem('ms-assistant-relay') || CFG.relay || ''; } catch (e) { /* ignore */ } return CFG.relay || ''; }
  var S = { ready: false, error: '', msgs: [], busy: false };
  var SUGGEST = ['گریل ۶۰ ذغالی چنده؟', 'سینک ۱۰۰ سانت دو لگن دارید؟', 'بویلر ۲۵ لیتر BUNN', 'سرخ‌کن گازی ۱۸ لیتری', 'یخچال زیر گریل ۱۸۰'];
  function price(it) {
    var P = window.MSPrices, v = P && P.get ? P.get(it.id) : null;
    if (!v) return '<span class="as-p none">قیمت ثبت نشده</span>';
    if (v.s === 'p' && v.p > 0) {
      var ch = P.cheque ? P.cheque(v, it.grp) : 0;
      return '<span class="as-p"><small>نقدی</small><b>' + fa.format(v.p) + '</b> تومان</span>' + (ch && ch !== v.p ? '<span class="as-p"><small>اعتباری (چکی)</small><b>' + fa.format(ch) + '</b> تومان</span>' : '');
    }
    return '<span class="as-p none">' + esc(P && P.label ? P.label(v) : '') + '</span>';
  }
  function card(h, n) {
    var it = h.d.it;
    return '<article class="as-card"><div class="as-img">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '') + '</div>' +
      '<div class="as-body"><h3>' + (n ? '<span class="as-n">' + fa.format(n) + '</span>' : '') + esc(it.name) + '</h3><p class="as-meta"><span class="as-br" data-brand="' + esc(it.src) + '"><i></i>' + esc(BR[it.src] || it.src) + '</span>' +
      (it.code ? '<span>کد <b dir="ltr">' + esc(it.code) + '</b></span>' : '') + (it.cat ? '<span>' + esc(it.cat) + '</span>' : '') + '</p>' +
      '<div class="as-prices">' + price(it) + '</div>' +
      (it.pl ? '<p class="as-note">این کالا از فهرست قیمت آمده؛ تصویر و مشخصات آن هنوز در کاتالوگ نیست.</p>' : '') +
      '<a class="as-open" href="./product-catalog.html?q=' + encodeURIComponent(it.code || it.name) + '">نمایش در کاتالوگ</a></div></article>';
  }
  // **bold** and line breaks only; everything else is shown as plain text
  function textHtml(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>'); }
  function bubble(m) {
    if (m.role === 'user') return '<div class="as-row me"><p class="as-b me">' + esc(m.text) + '</p></div>';
    var inner;
    if (m.state === 'wait') inner = '<span class="as-dots" aria-label="در حال نوشتن"><i></i><i></i><i></i></span>';
    else if (m.state === 'none') inner = '<p class="as-none">در منابع من پاسخی برای این پرسش نیست.</p><p class="as-hint">نام کالا، اندازه یا کد را بنویسید؛ دستیار فقط از کاتالوگ جواب می‌دهد و حدس نمی‌زند.</p>';
    else {
      inner = (m.text ? '<p class="as-txt">' + textHtml(m.text) + '</p>' : '<p class="as-lead">نزدیک‌ترین کالاها به پرسش شما، از میان ' + fa.format(docs.length) + ' کالای کاتالوگ:</p>') +
        (m.note ? '<p class="as-hint">' + esc(m.note) + '</p>' : '') +
        '<details class="as-src"' + (m.text ? '' : ' open') + '><summary>' + (m.text ? 'منابع این پاسخ (' + fa.format(m.hits.length) + ')' : 'کالاهای پیدا‌شده (' + fa.format(m.hits.length) + ')') + '</summary><div class="as-cards">' + m.hits.map(function (h, i) { return card(h, m.text ? i + 1 : 0); }).join('') + '</div></details>';
    }
    return '<div class="as-row"><div class="as-b bot">' + inner + '</div></div>';
  }
  function view() {
    if (S.error) return '<p class="as-err" role="alert">' + esc(S.error) + '</p>';
    var live = !!relayUrl();
    return '<div class="as-top"><h1>دستیار</h1><p class="as-intro">دربارهٔ کالاها، کدها و قیمت‌ها گفت‌وگو کنید. دستیار فقط از کاتالوگ جواب می‌دهد و اگر نداند همین را می‌گوید.' +
      (live ? '' : ' <span class="as-flag">فعلاً نزدیک‌ترین کالاها را نشان می‌دهد؛ پاسخ نوشته‌شده با اتصال به مدل زبانی فعال می‌شود.</span>') + '</p></div>' +
      '<div class="as-log" id="asLog" aria-live="polite">' + (S.msgs.length ? S.msgs.map(bubble).join('') :
        '<div class="as-empty"><p>سلام. چه کالایی لازم دارید؟</p><div class="as-chips">' + SUGGEST.map(function (s) { return '<button type="button" data-q="' + esc(s) + '">' + esc(s) + '</button>'; }).join('') + '</div></div>') + '</div>' +
      '<form class="as-form" id="asForm" role="search"><input id="asQ" type="text" autocomplete="off" enterkeyhint="send" placeholder="' + (S.ready ? 'بنویسید…' : 'در حال آماده‌کردن کاتالوگ…') + '" aria-label="پیام" maxlength="400"' + (S.ready ? '' : ' disabled') + '>' +
      '<button type="submit" aria-label="ارسال"' + (S.ready && !S.busy ? '' : ' disabled') + '><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg></button></form>';
  }
  function scrollEnd() { var l = document.getElementById('asLog'); if (l && l.lastElementChild) { try { l.lastElementChild.scrollIntoView({ block: 'end', behavior: 'smooth' }); } catch (e) { l.lastElementChild.scrollIntoView(); } } }
  function render(keepScroll) {
    var q = document.getElementById('asQ'), v = q ? q.value : '', had = q && document.activeElement === q;
    root.innerHTML = view(); q = document.getElementById('asQ'); if (q) { q.value = v; if (had) q.focus(); }
    if (!keepScroll) scrollEnd();
  }
  function writing(hits, text, history) {
    var url = relayUrl();
    if (!url || !window.MSSync || !window.MSSync.idToken) return Promise.reject({ code: 'no-relay' });
    return window.MSSync.idToken().then(function (tok) {
      return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ question: text, history: history, sources: hits.map(function (h) { var it = h.d.it; return { title: it.name, text: sourceText(it) }; }) }) });
    }).then(function (r) { if (!r.ok) throw { code: 'relay-' + r.status }; return r.json(); }).then(function (j) { if (!j || !j.answer) throw { code: 'empty' }; return j.answer; });
  }
  // the item as plain text for the model: the same fields the index was built from, plus the prices the person sees now
  function sourceText(it) {
    var P = window.MSPrices, v = P && P.get ? P.get(it.id) : null, parts = ['برند ' + (BR[it.src] || it.src), it.code ? 'کد ' + it.code : '', it.cat ? 'دسته ' + it.cat : ''];
    if (v && v.s === 'p' && v.p > 0) { parts.push('قیمت نقدی ' + fa.format(v.p) + ' تومان'); var ch = P.cheque ? P.cheque(v, it.grp) : 0; if (ch && ch !== v.p) parts.push('قیمت اعتباری (چکی) ' + fa.format(ch) + ' تومان'); }
    else if (v) parts.push('قیمت: ' + (P.label ? P.label(v) : ''));
    else parts.push('قیمت ثبت نشده');
    var d = it.dims; if (d && d.l && d.w && d.h) parts.push('ابعاد ' + d.l + '×' + d.w + '×' + d.h + ' سانتی‌متر');
    if (it.wt) parts.push('وزن ' + it.wt + ' کیلوگرم');
    (it.specs || []).forEach(function (s) { parts.push(s[0] + ': ' + s[1]); });
    if (it.desc) parts.push(it.desc);
    return parts.filter(Boolean).join(' . ');
  }
  function ask(text) {
    text = String(text || '').trim(); if (!text || !S.ready || S.busy) return;
    var prevQ = null; for (var i = S.msgs.length - 1; i >= 0; i--) if (S.msgs[i].role === 'user') { prevQ = S.msgs[i].text; break; }
    var history = S.msgs.filter(function (m) { return m.role === 'user' || (m.role === 'bot' && m.text); }).slice(-8).map(function (m) { return { role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }; });
    S.msgs.push({ role: 'user', text: text });
    // a short follow-up («و ۹۰ تا؟») is searched together with the previous question
    var hits = retrieve(text, 5); if (!hits.length && prevQ) hits = retrieve(prevQ + ' ' + text, 5);
    var bot = { role: 'bot', hits: hits };
    S.msgs.push(bot);
    if (!hits.length) { bot.state = 'none'; render(); return; }
    if (!relayUrl()) { bot.state = 'cards'; render(); return; }
    bot.state = 'wait'; S.busy = true; render();
    writing(hits, text, history).then(function (a) { bot.text = a; bot.state = 'done'; }, function (e) {
      bot.state = 'cards'; bot.note = e && /relay-40[13]/.test(e.code || '') ? 'برای گفت‌وگو باید وارد حساب خود شده باشید و نقش شما اجازه داشته باشد؛ نزدیک‌ترین کالاها:' : 'پاسخ نوشته‌شده الان در دسترس نیست؛ نزدیک‌ترین کالاها:';
    }).then(function () { S.busy = false; var q = document.getElementById('asQ'); if (q) q.value = ''; render(); });
    var q = document.getElementById('asQ'); if (q) q.value = '';
  }
  root.addEventListener('submit', function (e) { if (e.target.id === 'asForm') { e.preventDefault(); var q = document.getElementById('asQ'); var v = q.value; q.value = ''; ask(v); } });
  root.addEventListener('click', function (e) { var c = e.target.closest('[data-q]'); if (c) ask(c.getAttribute('data-q')); });
  window.MSAssistant = { retrieve: function (q, k) { return retrieve(q, k || 5).map(function (h) { return { id: h.d.it.id, name: h.d.it.name, score: Math.round(h.s * 100) / 100 }; }); }, size: function () { return docs.length; }, ask: ask };
  render();
  fetch('./assets/catalog.json?v=' + ((document.currentScript && document.currentScript.src.split('v=')[1]) || '')).then(function (r) { if (!r.ok) throw new Error('catalog'); return r.json(); }).then(function (c) {
    build(c.items || []); S.ready = true;
    if (window.MSPrices) { window.MSPrices.load().then(function () { render(true); }, function () { render(true); }); window.MSPrices.onChange(function () { render(true); }); }
    render(true);
    var q = new URLSearchParams(location.search).get('q'); if (q) ask(q);
  }).catch(function () { S.error = 'کاتالوگ خوانده نشد. صفحه را دوباره باز کنید.'; render(); });
})();

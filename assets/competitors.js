// competitors.html: the competitor analysis as an app page. The content is sensitive, so it is NOT in this public repository: it lives in
// Firestore (intel/competitors) and only management, the CEO and the sales manager can read it (firestore.rules). The owner/IT role loads
// it once from the JSON file prepared from the analysis PDF (01_Source_Data/Competitor_Analysis/competitors.json) with the button below.
(function () {
  'use strict';
  var cfg = window.MS_FIREBASE, root = document.getElementById('cm');
  if (!root) return;
  if (!cfg || !window.firebase) { root.innerHTML = '<p class="cm-note">سرویس در دسترس نیست. صفحه را دوباره باز کنید.</p>'; return; }
  firebase.initializeApp(cfg);
  var auth = firebase.auth(), db = firebase.firestore(), DOC = db.collection('intel').doc('competitors');
  var S = { kpi: 'proof', sort: 'def', f: {}, cmp: [], user: null, profile: null, loading: true, data: null, error: '', msg: '', q: '', threat: 'all', busy: false };
  var esc = function (s) { return String(s == null ? '' : s).replace(/\s*\u2014\s*/g, '، ').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var norm = function (s) { return String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').toLowerCase(); };
  var can = function (a) { return !!(S.profile && S.profile.active !== false && window.MSRoles && window.MSRoles.can(S.profile.role, a)); };
  function errText(e) {
    var c = e && e.code || '';
    if (/permission-denied/.test(c)) return 'اجازهٔ دیدن یا نوشتن ندارید (یا قوانین پایگاه داده هنوز منتشر نشده است).';
    if (/invalid-argument|invalid data/.test(c + ' ' + (e && e.message || ''))) return 'ساختار فایل برای پایگاه داده مناسب نیست.';
    if (/network|unavailable|deadline|timeout/.test(c)) return 'اتصال برقرار نشد (اینترنت یا VPN).';
    return 'خطا: ' + (c || (e && e.message) || 'نامشخص');
  }
  function unwrap(x) { if (x && typeof x.payload === 'string') { try { return JSON.parse(x.payload); } catch (e) { return null; } } return x; }
  var THREATS = [['all', 'همه'], ['بالا', 'تهدید بالا'], ['متوسط-بالا', 'متوسط-بالا'], ['متوسط', 'متوسط']];
  function tone(t) { return /بالا/.test(t) && !/متوسط/.test(t) ? 'high' : /متوسط-بالا/.test(t) ? 'mid-high' : /متوسط/.test(t) ? 'mid' : /پایین/.test(t) ? 'low' : 'direct'; }

  // ---- cards: a short card for every competitor; "اطلاعات بیشتر" opens a popup with the contacts, the facts, the second look at the site and the AI summary
  var MARK = { ok: ['✓', 'یکی است'], diff: ['≠', 'فرق دارد'], none: ['؟', 'پیدا نشد'] };
  var MSVG = { ok: '<path d="m5 12.5 4.5 4.5L19 7.5"/>', diff: '<path d="M12 7.5v6M12 17h.01"/>', none: '<path d="M9.5 9.2a2.7 2.7 0 1 1 3.9 2.4c-.9.5-1.4 1-1.4 2M12 17h.01"/>' };
  var SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6zM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z"/></svg>';
  var CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  var ITEMS = {}, dlg = null, aiTimer = 0;
  var faN = function (s) { return window.MSEvents_fa(String(s)); };
  function indexItems(d) {
    ITEMS = {};
    ((d.strategic && d.strategic.items) || []).forEach(function (x, i) { ITEMS['s' + i] = x; });
    ((d.market && d.market.items) || []).forEach(function (x, i) { ITEMS['m' + i] = x; });
    ((d.supplementary && d.supplementary.items) || []).forEach(function (x, i) { ITEMS['u' + i] = x; });
  }
  function lead(x) { return x.facts && x.facts[0] ? x.facts[0][1] : (x.finding || x.text || ''); }
  function siteLink(u) { return u ? '<a href="https://' + esc(u) + '" target="_blank" rel="noopener" dir="ltr">' + esc(u) + '</a>' : ''; }
  function telLink(n) { var s = String(n).replace(/[^\d+]/g, ''); return '<a href="tel:' + esc(s) + '" dir="ltr">' + esc(faN(s.replace(/^(0\d{2})(\d{8})$/, '$1-$2'))) + '</a>'; }
  function waLink(n) { var s = String(n).replace(/[^\d]/g, '').replace(/^0/, '98'); return '<a href="https://wa.me/' + esc(s) + '" target="_blank" rel="noopener" dir="ltr">' + esc(faN(n)) + '</a>'; }
  var PAL = ['#3858e9', '#7f54b3', '#0891b2', '#e39c27', '#ce1f39', '#56007a', '#ff6a00', '#65a30d', '#0d9488', '#153587', '#be123c', '#64748b'];
  function colorOf(x, key) { if (/^#[0-9a-f]{6}$/i.test(x.color || '')) return x.color; var n = 0, i; for (i = 0; i < key.length; i++) n += key.charCodeAt(i); return PAL[n % PAL.length]; }
  // dark text on light colours, white text on dark ones
  function ink(c) { var r = parseInt(c.substr(1, 2), 16), g = parseInt(c.substr(3, 2), 16), b = parseInt(c.substr(5, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) > 165 ? '#071b36' : '#ffffff'; }
  function sty(x, key) { var c = colorOf(x, key); return ' style="--c:' + c + ';--ink:' + ink(c) + '" data-v="' + (key.charCodeAt(0) + parseInt(key.slice(1), 10)) % 4 + '"'; }
  function teaser(key, x, num) {
    var th = x.threat ? '<span class="cm-th ' + tone(x.threat) + '">تهدید ' + esc(x.threat) + '</span>' : '';
    var links = [x.site ? '<a class="cm-q" href="https://' + esc(x.site) + '" target="_blank" rel="noopener" dir="ltr">' + esc(x.site) + '</a>' : '', x.phones && x.phones[0] ? '<a class="cm-q" href="tel:' + esc(x.phones[0]) + '" dir="ltr">' + esc(faN(x.phones[0])) + '</a>' : ''].filter(Boolean).join('');
    return '<article class="cm-card cm-tz" data-key="' + key + '"' + sty(x, key) + '><div class="cm-top"><span class="cm-mono" aria-hidden="true">' + esc(String(x.name).trim().charAt(0)) + '</span><h3>' + (num ? '<span class="cm-n">' + faN(num) + '</span>' : '') + esc(x.name) + '</h3>' + th + '</div>' +
      '<p class="cm-lead2">' + esc(lead(x)) + '</p>' + (links ? '<div class="cm-ql">' + links + '</div>' : '') +
      '<div class="cm-foot"><button type="button" class="cm-more-btn" data-open="' + key + '">اطلاعات بیشتر</button><label class="cm-cmp"><input type="checkbox" data-cmp="' + key + '"' + (S.cmp.indexOf(key) >= 0 ? ' checked' : '') + '>مقایسه</label></div></article>';
  }
  function ver(x) {
    if (!x.check || !x.check.length) return '';
    var list = '<ul class="cm-chk">' + x.check.map(function (c) {
      var k = MSVG[c[1]] ? c[1] : 'none';
      return '<li class="' + k + '"><b title="' + MARK[k][1] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MSVG[k] + '</svg></b><span><em>' + esc(c[0]) + ':</em> ' + esc(c[2]) + ' <i>(' + MARK[k][1] + ')</i></span></li>';
    }).join('') + '</ul>';
    return '<h4 class="cm-h4">بررسی دوباره از سایت</h4>' + list;
  }
  function crow(k, v) { return v ? '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; }
  function kpiExtra(x) {
    var k = x.kpi || {}, out = '';
    if (k.counts && k.counts.length) out += '<div class="kb-counts">' + k.counts.map(function (c) { return '<span><b>' + faN(c[1] >= 1000 ? '+' + c[1] : c[1]) + '</b>' + esc(c[0]) + '</span>'; }).join('') + '</div>';
    if (k.proof && k.proof.length) out += '<ul class="kb-proof">' + k.proof.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>';
    if (k.capNote) out += '<p class="cm-src2">سرمایه: ' + esc(k.capNote) + '</p>';
    return out;
  }
  function ensureDlg() {
    if (dlg) return;
    dlg = document.createElement('dialog'); dlg.className = 'cm-dialog';
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-cm-close]')) { dlg.close(); return; }
      var b = e.target.closest('[data-ai]'); if (b) ai(b);
    });
    dlg.addEventListener('close', function () { clearInterval(aiTimer); });
    document.body.appendChild(dlg);
  }
  function popup(key) {
    var x = ITEMS[key]; if (!x) return;
    ensureDlg(); dlg.classList.remove('wide');
    var ig = x.instagram ? '<a href="https://instagram.com/' + esc(x.instagram) + '" target="_blank" rel="noopener" dir="ltr">@' + esc(x.instagram) + '</a>' : '';
    var tg = x.telegram ? '<a href="https://t.me/' + esc(x.telegram) + '" target="_blank" rel="noopener" dir="ltr">@' + esc(x.telegram) + '</a>' : '';
    var facts = x.facts ? x.facts : [x.focus ? ['تمرکز', x.focus] : null, x.finding ? ['یافته', x.finding] : null, x.text ? ['توضیح', x.text] : null].filter(Boolean);
    var rasmio = '<a href="https://rasmio.com/search/companies/" target="_blank" rel="noopener" dir="ltr">rasmio.com</a> (نام را آنجا جست‌وجو کنید: <b>' + esc(x.name.replace(/\s*\(.*$/, '')) + '</b>)';
    dlg.setAttribute('aria-label', x.name); dlg.style.setProperty('--c', colorOf(x, key)); dlg.style.setProperty('--ink', ink(colorOf(x, key)));
    dlg.innerHTML = '<div class="cm-dbar"><h2>' + esc(x.name) + '</h2><button type="button" class="cm-x" data-cm-close aria-label="بستن">' + CLOSE + '</button></div>' +
      '<div class="cm-dbody">' + (x.threat ? '<p><span class="cm-th ' + tone(x.threat) + '">تهدید ' + esc(x.threat) + '</span></p>' : '') +
      (x.sum ? '<div class="cm-aibox"><button type="button" class="cm-ai" data-ai="' + key + '" aria-expanded="false">' + SPARK + '<span>خلاصهٔ هوش مصنوعی</span></button><div class="cm-aiout" hidden></div></div>' : '') +
      '<h4 class="cm-h4">راه‌های ارتباط</h4><dl class="cm-ct">' + crow('وب‌سایت', siteLink(x.site)) + crow('اینستاگرام', ig) + crow('تلگرام', tg) +
      crow('تلفن', (x.phones || []).map(telLink).join(' ، ')) + crow('واتس‌اپ', (x.wa || []).map(waLink).join(' ، ')) + crow('ایمیل', (x.emails || []).map(function (m) { return '<a href="mailto:' + esc(m) + '" dir="ltr">' + esc(m) + '</a>'; }).join(' ، ')) +
      crow('نشانی', esc(x.address || '')) + crow('نام ثبتی', esc(x.legal || '')) + crow('ثبت شرکت', rasmio) + '</dl>' +
      (!x.site && !(x.phones && x.phones.length) && !x.instagram && !(x.emails && x.emails.length) ? '<p class="cm-nosite">برای این مورد ارتباطی پیدا نشد.</p>' : '') +
      '<h4 class="cm-h4">شاخص‌های عمومی</h4>' + barsHtml(x, key) + kpiExtra(x) +
      '<h4 class="cm-h4">یافته‌های تحلیل</h4><dl class="cm-ct">' + facts.map(function (f) { return crow(esc(f[0]), esc(f[1])); }).join('') + '</dl>' +
      (x.registry ? '<h4 class="cm-h4">ثبت رسمی شرکت</h4><dl class="cm-ct">' + x.registry.rows.map(function (f) { return crow(esc(f[0]), esc(f[1])); }).join('') + '</dl><p class="cm-src2">منبع: <a href="' + esc(x.registry.url) + '" target="_blank" rel="noopener" dir="ltr">' + esc(x.registry.source) + '</a>، ' + esc(x.registry.date) + '</p>' : '') +
      ver(x) + (x.more && x.more.length ? '<h4 class="cm-h4">اطلاعات بیشتر از سایت</h4><dl class="cm-ct">' + x.more.map(function (f) { return crow(esc(f[0]), esc(f[1])); }).join('') + '</dl>' : '') + '</div>';
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }
  // The summary was written in advance by an AI (Claude) from the facts in this file; the button shows it word by word.
  // It says so under the text, because it is not produced live.
  function ai(btn) {
    var out = btn.parentNode.querySelector('.cm-aiout'), x = ITEMS[btn.getAttribute('data-ai')];
    if (!out || !x) return;
    clearInterval(aiTimer);
    if (!out.hidden) { out.hidden = true; btn.setAttribute('aria-expanded', 'false'); return; }
    out.hidden = false; btn.setAttribute('aria-expanded', 'true');
    var words = String(x.sum).split(' '), i = 0, calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function paint() { out.innerHTML = '<p>' + esc(words.slice(0, i).join(' ')) + (i < words.length ? '<span class="cm-caret"></span>' : '') + '</p>'; }
    if (calm) { i = words.length; paint(); return; }
    paint();
    aiTimer = setInterval(function () { i += 2; if (i >= words.length) { i = words.length; clearInterval(aiTimer); } paint(); }, 55);
  }
  // the old sentence under this heading is not shown any more
  // ---- toolbar: search, sort, threat, and four on/off filters; they work across all the cards on the page
  var SORTS = [['def', 'ترتیب پرونده'], ['threat', 'تهدید'], ['age', 'سابقه'], ['digital', 'حضور دیجیتال']];
  var FLT = [['ig', 'اینستاگرام'], ['shop', 'فروشگاه آنلاین'], ['mfr', 'تولیدکننده'], ['blog', 'بلاگ']];
  function rank(th) { th = String(th || ''); return /پایین/.test(th) ? 1 : /متوسط-بالا/.test(th) ? 3 : /متوسط/.test(th) ? 2 : /بالا/.test(th) ? 4 : 0; }
  function digital(x) { return (x.instagram ? 1 : 0) + (x.telegram ? 1 : 0) + (x.shop ? 1 : 0) + (x.blog ? 1 : 0) + (x.wa && x.wa.length ? 1 : 0); }
  function hasF(x, k) { return k === 'ig' ? !!x.instagram : !!x[k]; }
  function pass(x) {
    var q = norm(S.q);
    if (S.threat !== 'all' && x.threat !== S.threat) return false;
    for (var k in S.f) if (S.f[k] && !hasF(x, k)) return false;
    if (!q) return true;
    return norm([x.name, x.sum, x.focus, x.finding, x.text, x.legal, x.address, (x.facts || []).map(function (f) { return f[0] + ' ' + f[1]; }).join(' ')].join(' ')).indexOf(q) >= 0;
  }
  function order(list) {   // list of [key, x, num]
    var l = list.slice();
    if (S.sort === 'threat') l.sort(function (p, q) { return rank(q[1].threat) - rank(p[1].threat); });
    else if (S.sort === 'age') l.sort(function (p, q) { return (q[1].age == null ? -1 : q[1].age) - (p[1].age == null ? -1 : p[1].age); });
    else if (S.sort === 'digital') l.sort(function (p, q) { return digital(q[1]) - digital(p[1]); });
    return l;
  }
  function toolbar() {
    return '<div class="cm-tb"><div class="cm-tb-top"><label class="cm-bar2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="cmQ" type="search" placeholder="جست‌وجوی نام، شهر، محصول…" value="' + esc(S.q) + '" autocomplete="off"></label>' +
      '<div class="cm-chips cm-seg" role="group" aria-label="مرتب‌سازی" data-morph="sort">' + SORTS.map(function (s) { return '<button type="button" class="cm-chip" data-sort="' + s[0] + '" aria-pressed="' + (S.sort === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div></div>' +
      '<div class="cm-chips cm-seg wide" role="group" aria-label="سطح تهدید" data-morph="threat">' + THREATS.map(function (th) { return '<button type="button" class="cm-chip" data-th="' + esc(th[0]) + '" aria-pressed="' + (S.threat === th[0]) + '">' + th[1] + '</button>'; }).join('') + '</div>' +
      '<div class="cm-tog-row" role="group" aria-label="فیلتر">' + FLT.map(function (f) { return '<button type="button" class="cm-tog" data-flt="' + f[0] + '" aria-pressed="' + (!!S.f[f[0]]) + '">' + f[1] + '</button>'; }).join('') + '<span class="cm-count" id="cmCount" aria-live="polite"></span></div></div>';
  }
  var shown = 0;
  function section(head, sub, list, cls) {
    var l = order(list.filter(function (e) { return pass(e[1]); }));
    shown += l.length;
    return '<section class="cm-sec"><h2>' + esc(head) + '</h2>' + (sub ? '<p class="cm-sub">' + esc(sub) + '</p>' : '') + '<div class="cm-grid' + (cls ? ' ' + cls : '') + '">' + l.map(function (e) { return teaser(e[0], e[1], e[2]); }).join('') + '</div>' + (l.length ? '' : '<p class="cm-note">موردی پیدا نشد.</p>') + '</section>';
  }
  function entries(items, pre, nums) { return (items || []).map(function (x, i) { return [pre + i, x, nums ? x.n : 0]; }); }
  function strategicSub(d) { return String(d.strategic.sub || '').replace(/۱۰ شرکتی[^،]*?می‌کنند/, '').trim(); }
  function strategic(d) { return section(d.strategic.heading, strategicSub(d), entries(d.strategic.items, 's', true)); }
  function market(d) { var m = d.market; return m ? section(m.heading, m.sub, entries(m.items, 'm')) : ''; }
  function plain(sec, pre) {
    if (!sec) return '';
    if (pre) return section(sec.heading, sec.sub, entries(sec.items, pre), 'two');
    return '<section class="cm-sec"><h2>' + esc(sec.heading) + '</h2><p class="cm-sub">' + esc(sec.sub || '') + '</p><div class="cm-grid two">' +
      sec.items.map(function (x) { return '<article class="cm-card soft"><h3>' + esc(x.name) + '</h3><p>' + esc(x.text) + '</p></article>'; }).join('') + '</div></section>';
  }
  // ---- public indicators (KPI): only what the companies and the company registry publish; internal figures such as sales are not visible from outside
  var KPIS = [['age', 'سابقه'], ['cap', 'سرمایهٔ ثبتی'], ['scope', 'گستردگی محصول'], ['digital', 'حضور دیجیتال'], ['proof', 'نشانه‌های اعتبار']];
  function capText(n) { return n >= 1e9 ? faN(Math.round(n / 1e8) / 10).replace('.', '٫') + ' میلیارد ریال' : faN(Math.round(n / 1e5) / 10).replace('.', '٫') + ' میلیون ریال'; }
  function bars(x) {
    var k = x.kpi || {}, ar = x.areas ? Object.keys(x.areas).filter(function (c) { return x.areas[c] >= 1; }).length : null, pr = (k.proof || []).length, dg = digital(x);
    return [
      ['age', 'سابقه', x.age == null ? null : Math.min(x.age, 40) / 40, x.age == null ? 'نامشخص' : faN(x.age) + ' سال'],
      ['cap', 'سرمایهٔ ثبتی', k.capital ? Math.max(0.05, Math.min(1, (Math.log(k.capital) / Math.LN10 - 7) / (Math.log(6e11) / Math.LN10 - 7))) : null, k.capital ? capText(k.capital) : 'نامشخص'],
      ['scope', 'گستردگی محصول', ar == null ? null : ar / 8, ar == null ? 'نامشخص' : faN(ar) + ' از ۸ حوزه'],
      ['digital', 'حضور دیجیتال', dg / 5, faN(dg) + ' از ۵ کانال'],
      ['proof', 'نشانه‌های اعتبار', Math.min(pr, 4) / 4, faN(pr) + ' مورد']];
  }
  function barsHtml(x, key, hl) {
    var c = colorOf(x, key);
    return '<div class="kb" style="--c:' + c + '">' + bars(x).map(function (b) {
      return '<div class="kb-r' + (hl === b[0] ? ' hl' : '') + '"><span class="kb-l">' + b[1] + '</span><span class="kb-t"><i style="width:' + (b[2] == null ? 0 : Math.round(b[2] * 100)) + '%"></i></span><span class="kb-v' + (b[2] == null ? ' na' : '') + '">' + b[3] + '</span></div>';
    }).join('') + '</div>';
  }
  function kpiBoard() {
    var rows = Object.keys(ITEMS).map(function (k) { return [k, ITEMS[k]]; });
    var idx = { age: 0, cap: 1, scope: 2, digital: 3, proof: 4 }[S.kpi] || 0;
    rows.sort(function (p, q) { var a = bars(p[1])[idx][2], b = bars(q[1])[idx][2]; return (b == null ? -1 : b) - (a == null ? -1 : a); });
    return '<section class="cm-sec"><h2>شاخص‌های عمومی رقبا</h2><p class="cm-sub">' + esc((S.data && S.data.kpiNote) || '') + '</p>' +
      '<div class="cm-chips cm-seg" role="group" aria-label="مرتب‌سازی شاخص‌ها" data-morph="kpi">' + KPIS.map(function (s) { return '<button type="button" class="cm-chip" data-kpi="' + s[0] + '" aria-pressed="' + (S.kpi === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div class="kb-list">' + rows.map(function (r) {
        var x = r[1], c = colorOf(x, r[0]);
        return '<article class="kb-row" data-open="' + r[0] + '" style="--c:' + c + ';--ink:' + ink(c) + '"><div class="kb-n"><span class="cm-mono">' + esc(String(x.name).trim().charAt(0)) + '</span><b>' + esc(x.name.replace(/\s*\(.*$/, '')) + '</b></div>' + barsHtml(x, r[0], S.kpi) + '</article>';
      }).join('') + '</div></section>';
  }
  // ---- overview: how many competitors, what they are, and how the threat is spread
  var IC = { n: '<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6"/>', m: '<path d="M3 21h18M5 21V10l5 3v-3l5 3V6h4v15"/>', s: '<path d="M3 4h2l2.4 11h9.2L19 8H6.5"/><circle cx="10" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>', i: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".8"/>', a: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>' };
  function overview() {
    var xs = Object.keys(ITEMS).map(function (k) { return ITEMS[k]; }), n = xs.length, cnt = function (f) { return xs.filter(f).length; };
    var ages = xs.map(function (x) { return x.age; }).filter(function (a) { return a != null; }).sort(function (a, b) { return a - b; });
    var med = ages.length ? ages[Math.floor(ages.length / 2)] : 0;
    var tiles = [['n', n, 'رقیب بررسی‌شده'], ['m', cnt(function (x) { return x.mfr; }), 'تولیدکننده'], ['s', cnt(function (x) { return x.shop; }), 'فروشگاه آنلاین'], ['i', cnt(function (x) { return x.instagram; }), 'با اینستاگرام'], ['a', med, 'سال، میانهٔ سابقه']];
    var lv = [[4, 'بالا', '#b42318'], [3, 'متوسط-بالا', '#e08a00'], [2, 'متوسط', '#d4b200'], [1, 'پایین‌تر', '#4f81c7'], [0, 'بدون ارزیابی', '#c3cad6']];
    var tot = lv.map(function (l) { return cnt(function (x) { return rank(x.threat) === l[0]; }); });
    return '<div class="cm-ov">' + tiles.map(function (s) { return '<div class="cm-st"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[s[0]] + '</svg><b>' + faN(s[1]) + '</b><span>' + s[2] + '</span></div>'; }).join('') + '</div>' +
      '<div class="cm-thb" role="img" aria-label="پراکندگی سطح تهدید"><div class="cm-thb-bar">' + lv.map(function (l, i) { return tot[i] ? '<i style="flex:' + tot[i] + ';background:' + l[2] + '" title="' + l[1] + ': ' + faN(tot[i]) + '"></i>' : ''; }).join('') + '</div><div class="cm-thb-lg">' + lv.map(function (l, i) { return tot[i] ? '<span><i style="background:' + l[2] + '"></i>' + l[1] + ' ' + faN(tot[i]) + '</span>' : ''; }).join('') + '</div></div>';
  }
  // ---- the areas matrix: who offers what, read from the sites; the empty columns are the openings
  function matrix(d) {
    var cols = d.areaCols; if (!cols || !cols.length) return '';
    var rows = [], key;
    Object.keys(ITEMS).forEach(function (k) { rows.push([k, ITEMS[k]]); });
    var score = function (x) { var s = 0; if (x.areas) cols.forEach(function (c) { s += x.areas[c[0]] || 0; }); return s; };
    rows.sort(function (p, q) { return score(q[1]) - score(p[1]); });
    var cnt = cols.map(function (c) { var n = 0; rows.forEach(function (r) { if (r[1].areas && r[1].areas[c[0]] >= 1) n++; }); return n; });
    var min = Math.min.apply(null, cnt);
    var Q = '<svg class="mxq" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="دادهٔ کافی نیست">' + MSVG.none + '</svg>';
    var body = rows.map(function (r) {
      var x = r[1], c = colorOf(x, r[0]);
      var cells = !x.areas ? '<td colspan="' + cols.length + '" class="mx-na">دادهٔ کافی برای این مورد پیدا نشد</td>' : cols.map(function (col) {
        var v = x.areas[col[0]];
        return '<td>' + (v >= 2 ? '<i class="mx2" title="تمرکز روشن" style="background:' + c + '"></i>' : v === 1 ? '<i class="mx1" title="عرضه می‌کند" style="border-color:' + c + '"></i>' : (x.areasPartial ? Q : '<i class="mx0" title="در صفحه‌های خوانده‌شده دیده نشد"></i>')) + '</td>';
      }).join('');
      return '<tr data-open="' + r[0] + '"><th scope="row"><span class="mx-dot" style="background:' + c + '"></span>' + esc(x.name.replace(/\s*\(.*$/, '')) + '</th>' + cells + '</tr>';
    }).join('');
    var foot = '<tr class="mx-foot"><th scope="row">تعداد رقیب در این حوزه</th>' + cnt.map(function (n) { return '<td class="' + (n === min ? 'low' : '') + '">' + faN(n) + '</td>'; }).join('') + '</tr>';
    return '<section class="cm-sec"><h2>ماتریس حوزه‌ها: هر رقیب کجا فعال است</h2><p class="cm-sub">' + esc(d.areaNote || '') + '</p>' +
      '<div class="cm-legend"><span><i class="mx2" style="background:#1746b5"></i>تمرکز روشن</span><span><i class="mx1" style="border-color:#1746b5"></i>عرضه می‌کند</span><span><i class="mx0"></i>دیده نشد</span><span class="mx-lowkey"><i class="mxlow"></i>کم‌رقیب‌ترین حوزه</span></div>' +
      '<div class="cm-tw"><table class="cm-mx"><thead><tr><th></th>' + cols.map(function (c, i) { return '<th class="' + (cnt[i] === min ? 'low' : '') + '"><span>' + esc(c[1]) + '</span></th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table></div></section>';
  }
  // ---- compare 2 or 3 competitors side by side
  var YES = '<svg class="cmp-yes" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-label="بله">' + MSVG.ok + '</svg>';
  var NO = '<span class="cmp-no" aria-label="خیر یا دیده نشد"></span>';
  function capOf(x) { var r = x.registry && x.registry.rows; if (!r) return ''; for (var i = 0; i < r.length; i++) if (/^سرمایه/.test(r[i][0])) return r[i][1]; return ''; }
  function compareHtml() {
    var xs = S.cmp.map(function (k) { return [k, ITEMS[k]]; }).filter(function (p) { return p[1]; });
    var head = '<tr><th></th>' + xs.map(function (p) { var c = colorOf(p[1], p[0]); return '<th style="--c:' + c + ';--ink:' + ink(c) + '"><span class="cm-mono">' + esc(String(p[1].name).trim().charAt(0)) + '</span>' + esc(p[1].name) + '</th>'; }).join('') + '</tr>';
    function row(label, fn) { return '<tr><th scope="row">' + label + '</th>' + xs.map(function (p) { return '<td>' + (fn(p[1]) || NO) + '</td>'; }).join('') + '</tr>'; }
    var areaNames = function (x, v) { return x.areas ? d_cols().filter(function (c) { return x.areas[c[0]] === v; }).map(function (c) { return esc(c[1]); }).join('، ') : ''; };
    return head + row('سطح تهدید', function (x) { return x.threat ? '<span class="cm-th ' + tone(x.threat) + '">' + esc(x.threat) + '</span>' : ''; }) +
      row('سابقه', function (x) { return x.age != null ? faN(x.age) + ' سال<small>' + esc(x.ageNote || '') + '</small>' : ''; }) +
      row('تولیدکننده', function (x) { return x.mfr ? YES : ''; }) + row('فروشگاه آنلاین', function (x) { return x.shop ? YES : ''; }) + row('بلاگ', function (x) { return x.blog ? YES : ''; }) +
      row('اینستاگرام', function (x) { return x.instagram ? '<a href="https://instagram.com/' + esc(x.instagram) + '" target="_blank" rel="noopener" dir="ltr">@' + esc(x.instagram) + '</a>' : ''; }) +
      row('تلگرام', function (x) { return x.telegram ? '<a href="https://t.me/' + esc(x.telegram) + '" target="_blank" rel="noopener" dir="ltr">@' + esc(x.telegram) + '</a>' : ''; }) +
      row('وب‌سایت', function (x) { return siteLink(x.site); }) + row('تلفن', function (x) { return (x.phones || []).slice(0, 2).map(telLink).join('<br>'); }) +
      row('سرمایهٔ ثبتی', function (x) { return esc(capOf(x)); }) + row('تمرکز روشن در', function (x) { return areaNames(x, 2); }) + row('عرضه می‌کند', function (x) { return areaNames(x, 1); }) +
      row('نشانی', function (x) { return esc(x.address || ''); }) + row('خلاصه', function (x) { return esc(x.sum || ''); });
  }
  function d_cols() { return (S.data && S.data.areaCols) || []; }
  function openCompare() {
    ensureDlg();
    dlg.setAttribute('aria-label', 'مقایسه رقبا');
    dlg.innerHTML = '<div class="cm-dbar"><h2>مقایسهٔ رقبا</h2><button type="button" class="cm-x" data-cm-close aria-label="بستن">' + CLOSE + '</button></div><div class="cm-dbody"><div class="cm-tw"><table class="cm-cmp-t">' + compareHtml() + '</table></div></div>';
    dlg.style.setProperty('--c', '#1746b5');
    dlg.classList.add('wide');
    if (!dlg.open) dlg.showModal();
  }
  function cmpBar() {
    var bar = document.getElementById('cmCmpBar');
    if (!S.cmp.length) { if (bar) bar.hidden = true; return; }
    if (!bar) { bar = document.createElement('div'); bar.id = 'cmCmpBar'; bar.className = 'cm-cmpbar'; document.body.appendChild(bar); bar.addEventListener('click', function (e) { if (e.target.closest('[data-cmp-go]') && S.cmp.length >= 2) openCompare(); if (e.target.closest('[data-cmp-clear]')) { S.cmp = []; syncCmp(); } }); }
    bar.hidden = false;
    bar.innerHTML = '<span>' + faN(S.cmp.length) + ' مورد برای مقایسه</span><button type="button" class="cm-cmp-go" data-cmp-go ' + (S.cmp.length < 2 ? 'disabled' : '') + '>مقایسه</button><button type="button" class="cm-cmp-x" data-cmp-clear aria-label="پاک کردن انتخاب">' + CLOSE + '</button>';
  }
  function syncCmp() {
    Array.prototype.forEach.call(root.querySelectorAll('[data-cmp]'), function (i) { i.checked = S.cmp.indexOf(i.getAttribute('data-cmp')) >= 0; });
    cmpBar();
  }

  function view() {
    if (S.loading) return '<p class="cm-note">در حال بارگذاری…</p>';
    if (!S.user) return '<p class="cm-note">برای دیدن این بخش ابتدا <a href="./panel.html">وارد حساب خود شوید</a>.</p>';
    if (!S.profile || S.profile.active === false) return '<p class="cm-note">حساب شما هنوز فعال نشده است.</p>';
    if (!can('competitors')) return '<p class="cm-note">این بخش فقط برای مدیریت و مدیر فروش است.</p>';
    var d = S.data, UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>';
    var out = '<div class="cm-head"><h1>تحلیل رقبا</h1>' + (d && can('roleAdmin') ? '<label class="cm-up" title="جایگزینی با فایل تازه" aria-label="جایگزینی با فایل تازه">' + UP + '<input id="cmFile" type="file" accept="application/json,.json" hidden></label>' : '') + '</div>';
    if (S.error) out += '<p class="cm-err" role="alert">' + esc(S.error) + '</p>';
    if (S.msg) out += '<p class="cm-ok" role="status">' + esc(S.msg) + '</p>';
    if (!d) {
      out += '<p class="cm-lead">هنوز دادهٔ این بخش بارگذاری نشده است. این اطلاعات محرمانه است و در مخزن عمومی نیست؛ از فایل «competitors.json» (پوشهٔ 01_Source_Data/Competitor_Analysis) بارگذاری می‌شود.</p>';
      out += can('roleAdmin') ? '<label class="cm-btn">بارگذاری فایل داده<input id="cmFile" type="file" accept="application/json,.json" hidden></label>' : '<p class="cm-note">بارگذاری با تکنولوژی ارتباطات سازمانی یا مدیریت است.</p>';
      return out;
    }
    out += '<p class="cm-lead">' + esc(d.subtitle) + '</p><p class="cm-src">منبع: ' + esc(d.source) + '</p>';
    indexItems(d);
    shown = 0;
    out += overview() + toolbar() + strategic(d) + market(d) + plain(d.supplementary, 'u') + kpiBoard() + matrix(d) + plain(d.frameworks);
    out += '<span id="cmShown" hidden>' + shown + '</span>';
    return out;
  }
  window.MSEvents_fa = function (n) { return String(n).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); };
  function render() {
    var a = document.activeElement, keep = a && a.id === 'cmQ' ? a.selectionStart : null;
    var M = window.MSMorph, prev = M ? M.snapAll(root, '.cm-chips', '.cm-chip', '[aria-pressed=true]') : null;
    root.innerHTML = view();
    if (M) M.playAll(root, '.cm-chips', '.cm-chip', '[aria-pressed=true]', prev, { cls: 'chip' });
    var sh = document.getElementById('cmShown'), ct = document.getElementById('cmCount'); if (sh && ct) ct.textContent = faN(sh.textContent) + ' مورد نمایش داده می‌شود';
    cmpBar();
    if (window.MSGate) window.MSGate.apply();
    if (keep !== null) { var q = document.getElementById('cmQ'); if (q) { q.focus(); try { q.setSelectionRange(keep, keep); } catch (e) { /* ignore */ } } }
  }
  root.addEventListener('click', function (e) {
    if (e.target.closest('.cm-cmp')) return;
    var kp = e.target.closest('[data-kpi]'); if (kp) { S.kpi = kp.getAttribute('data-kpi'); render(); return; }
    var so = e.target.closest('[data-sort]'); if (so) { S.sort = so.getAttribute('data-sort'); render(); return; }
    var fl = e.target.closest('[data-flt]'); if (fl) { var k = fl.getAttribute('data-flt'); S.f[k] = !S.f[k]; render(); return; }
    var t = e.target.closest('[data-th]'); if (t) { S.threat = t.getAttribute('data-th'); render(); return; }
    var o = e.target.closest('[data-open]'); if (o) { popup(o.getAttribute('data-open')); return; }
    var c = e.target.closest('.cm-tz'); if (c && !e.target.closest('a')) popup(c.getAttribute('data-key'));
    var tr = e.target.closest('tr[data-open]'); if (tr) popup(tr.getAttribute('data-open'));
  });
  root.addEventListener('change', function (e) {
    var c = e.target.closest && e.target.closest('[data-cmp]'); if (!c) return;
    var k = c.getAttribute('data-cmp'), i = S.cmp.indexOf(k);
    if (c.checked && i < 0) { if (S.cmp.length >= 3) { c.checked = false; return; } S.cmp.push(k); } else if (!c.checked && i >= 0) S.cmp.splice(i, 1);
    cmpBar();
  });
  root.addEventListener('input', function (e) { if (e.target.id === 'cmQ') { S.q = e.target.value; render(); } });
  root.addEventListener('change', function (e) {
    if (e.target.id !== 'cmFile') return;
    var f = e.target.files && e.target.files[0];
    e.target.value = '';                                  // so the same file can be chosen again after a failure
    if (!f || S.busy) return;
    S.msg = 'فایل خوانده می‌شود…'; S.error = ''; render();
    var rd = new FileReader();
    rd.onerror = function () { S.msg = ''; S.error = 'فایل خوانده نشد.'; render(); };
    rd.onload = function () {
      var d; try { d = JSON.parse(String(rd.result).replace(/^\uFEFF/, '')); } catch (x) { S.msg = ''; S.error = 'فایل JSON درست نیست.'; render(); return; }
      if (!d || !d.strategic || !d.strategic.items || !d.title) { S.msg = ''; S.error = 'ساختار فایل با تحلیل رقبا نمی‌خواند.'; render(); return; }
      d.updatedAt = Date.now(); d.updatedBy = S.user.uid;
      S.busy = true; var secs = 0; S.msg = 'در حال ارسال به پایگاه داده… ۰ ثانیه (منتظر بمانید؛ تا ۲۰ ثانیه طول می‌کشد)';
      render();
      // a write made while the connection is down waits for ever without an error, so after 20 seconds the person is told, with a check of the server
      var done = false, tick = setInterval(function () { if (done) return; secs++; S.msg = 'در حال ارسال به پایگاه داده… ' + window.MSEvents_fa(secs) + ' ثانیه (منتظر بمانید؛ تا ۲۰ ثانیه طول می‌کشد)'; render(); }, 1000);
      var timer = setTimeout(function () {
        if (done) return; done = true; clearInterval(tick);
        S.msg = 'ارسال جواب نداد؛ اتصال به سرور بررسی می‌شود…'; render();
        var probe = new Promise(function (ok) { var to = setTimeout(function () { ok('نشد'); }, 8000); DOC.get({ source: 'server' }).then(function () { clearTimeout(to); ok('شد'); }, function (er) { clearTimeout(to); ok('نشد (' + ((er && er.code) || 'خطا') + ')'); }); });
        probe.then(function (r) {
          S.busy = false; S.msg = '';
          S.error = 'پایگاه داده جواب نداد. خواندن از سرور: ' + r + '. ' + (r === 'شد' ? 'خواندن کار می‌کند ولی نوشتن به سرور نمی‌رسد؛ احتمالاً مسیر نوشتن در اینترنت یا VPN شما بسته است.' : 'اتصال به سرور برقرار نیست؛ VPN یا اینترنت را بررسی کنید.') + ' دوباره فایل را انتخاب کنید.';
          render();
        });
      }, 20000);
      // Firestore refuses arrays inside arrays (the file has pairs like [name, value]), so the whole analysis is stored as one text field
      var stored = { title: String(d.title), updatedAt: d.updatedAt, updatedBy: d.updatedBy, payload: JSON.stringify(d) }, wr;
      try { wr = DOC.set(stored); } catch (ex) { wr = Promise.reject(ex); }
      wr.then(function () { if (done) return; done = true; clearTimeout(timer); clearInterval(tick); S.data = d; S.error = ''; S.msg = 'تحلیل رقبا بارگذاری شد.'; }, function (er) { if (done) return; done = true; clearTimeout(timer); clearInterval(tick); S.msg = ''; S.error = errText(er); })
        .then(function () { if (!done || S.msg === 'ارسال جواب نداد؛ اتصال به سرور بررسی می‌شود…') return; S.busy = false; render(); });
    };
    rd.readAsText(f, 'utf-8');
  });
  auth.onAuthStateChanged(function (u) {
    S.user = u; S.profile = null; S.data = null;
    if (!u) { S.loading = false; render(); return; }
    S.loading = true; render();
    db.collection('users').doc(u.uid).get().then(function (snap) {
      S.profile = snap.exists ? snap.data() : null;
      if (!S.profile || S.profile.active === false || !can('competitors')) { S.loading = false; render(); return; }
      return DOC.get().then(function (s) { S.data = s.exists ? unwrap(s.data()) : null; S.loading = false; render(); });
    }).then(null, function (e) { S.loading = false; S.error = errText(e); render(); });
  });
  render();
})();

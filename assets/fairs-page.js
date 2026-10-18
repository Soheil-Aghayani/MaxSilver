// fairs.html: every fair and event the company follows as one timeline of cards, grouped by month, newest-to-come first. A card shows the
// summary; "جزئیات" opens what was read from the event's own pages (assets/fairs-research.js) next to the owner's data, with a mark for each
// field that agrees (✓), differs (≠) or is not on the page (؟). Filters: where (Iran / abroad, then city or country), when, and a search box.
// The cards are drawn once; a filter hides and shows them and the rest glide to their new place (FLIP), so nothing is redrawn and an open
// card stays open. The chips use the same sliding pill as the rest of the app.
(function () {
  'use strict';
  var E = window.MSEvents, F = window.MSFairs, X = window.MS_EXPOS, R = (window.MS_FAIRS_RESEARCH || {}).items || {}, root = document.getElementById('fr');
  if (!E || !F || !root) return;
  var fa = E.fa, esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var JM = E.MONTHS, SEP = '<i class="ms-sep" aria-hidden="true"></i>';
  var MON_G = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
  var S = { where: 'all', place: 'all', when: 'all', q: '' };
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var norm = function (s) { return String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').toLowerCase(); };
  var latin = function (s) { return String(s).replace(/[۰-۹]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(c); }); };

  function jText(d1, d2) {
    var p = E.toJ(d1), q = E.toJ(d2);
    return fa(p.jd) + (p.jm === q.jm ? '' : ' ' + JM[p.jm - 1]) + ' تا ' + fa(q.jd) + ' ' + JM[q.jm - 1] + ' ' + fa(q.jy);
  }
  function gText(d1, d2) {
    var m1 = d1.getMonth(), m2 = d2.getMonth();
    return fa(d1.getDate()) + (m1 === m2 ? '' : ' ' + MON_G[m1]) + ' تا ' + fa(d2.getDate()) + ' ' + MON_G[m2] + ' ' + fa(d2.getFullYear());
  }
  // links: a site opens in a new tab, a phone number dials, an address writes a message
  function siteLink(u) {
    if (!u) return '';
    var href = /^https?:/i.test(u) ? u : 'https://' + u.toLowerCase();
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener" dir="ltr">' + esc(href.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')) + '</a>';
  }
  function telLink(p) {
    var d = latin(p).replace(/[^\d+]/g, '');
    return '<a href="tel:' + esc(d) + '" dir="ltr">' + esc(fa(String(p).replace(/^(\d{3})(\d{8})$/, '$1-$2').replace(/^(0\d{2})(\d{8})$/, '$1-$2'))) + '</a>';
  }
  function mailLink(m) { return '<a href="mailto:' + esc(m) + '" dir="ltr">' + esc(m) + '</a>'; }
  function waLink(n) { return '<a href="https://wa.me/' + esc(n) + '" target="_blank" rel="noopener" dir="ltr">WhatsApp</a>'; }
  function row(k, v) { return v ? '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; }

  // one shape for a main fair and a regional event
  function shape(it) {
    var f = it.f, r = R[it.id] || {}, main = it.kind === 'main', country = main ? 'ایران' : (f.country || (f.region === 'turkey' ? 'ترکیه' : 'ایران'));
    var city = (f.city || '').trim(), abroad = main ? false : f.region !== 'iran', phones = r.phones, emails = r.emails;
    if (main) {
      var own = f.contact || [];
      phones = phones && phones.length ? phones : own.filter(function (c) { return !/@/.test(c); }).map(latin);
      emails = emails && emails.length ? emails : own.filter(function (c) { return /@/.test(c); });
    }
    return { it: it, id: it.id, main: main, title: f.title, en: f.en || '', country: country, city: city, abroad: abroad, st: it.st, d: it.d, tone: it.tone,
      venue: r.address || f.venue || '', organizer: r.organizer || f.organizer || '', phones: phones || [], emails: emails || [], wa: r.wa || '', site: r.site || f.site || '',
      hours: r.hours || '', area: r.area || '', exhibitors: r.exhibitors || '', audience: r.audience || '', sectors: r.sectors || [], checks: r.checks || [],
      visitorReg: r.visitorReg || '', exhibitorReg: r.exhibitorReg || f.register || '', prices: r.prices || '', fit: main ? '' : (f.fit || ''), note: f.note || '',
      actions: f.actions || [], edition: f.edition || '', source: main ? f.source : '', sourceName: main ? f.sourceName : '' };
  }
  function thumb(v) {
    var it = v.it;
    if (v.main) {
      var base = './assets/art/fairs/' + esc(it.art);
      return '<span class="fe-pic main"><img src="' + base + '-tablet.webp" alt="" loading="lazy" decoding="async" onerror="this.remove()"></span>';
    }
    return it.art ? '<span class="fe-pic"><img src="./assets/art/fairs/' + esc(it.art + it.ext) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()"></span>' : '';
  }
  function checksHtml(v) {
    if (!v.checks.length) return '';
    var mark = { ok: ['✓', 'ok'], diff: ['≠', 'diff'], none: ['؟', 'none'] };
    return '<ul class="fe-checks">' + v.checks.map(function (c) { var m = mark[c[1]] || mark.none; return '<li class="' + m[1] + '"><b aria-hidden="true">' + m[0] + '</b><span><em>' + esc(c[0]) + ':</em> ' + esc(c[2]) + '</span></li>'; }).join('') + '</ul>';
  }
  function details(v) {
    var contact = v.phones.map(telLink).concat(v.emails.map(mailLink), v.wa ? [waLink(v.wa)] : []).join(' · ');
    var acts = v.actions.length ? '<div class="fr-acts">' + v.actions.map(function (a) { return '<a class="fr-act' + (a.primary ? ' pri' : '') + '" href="' + esc(a.href) + '" target="_blank" rel="noopener">' + esc(a.label) + '</a>'; }).join('') + '</div>' : '';
    var scale = [v.area, v.exhibitors].filter(Boolean).map(esc).join(SEP);
    return '<dl class="fe-facts">' + row('ساعت بازدید', esc(v.hours)) + row('محل', esc(v.venue)) + row('برگزارکننده', esc(v.organizer)) + row('مقیاس', scale) + row('مخاطبان', esc(v.audience)) +
      row('ثبت‌نام بازدیدکننده', esc(v.visitorReg)) + row('ثبت‌نام غرفه‌دار', esc(v.exhibitorReg)) + row('هزینه', esc(v.prices)) + row('تماس', contact) + row('وب‌سایت', siteLink(v.site)) +
      row('ارتباط با مکث‌سیلور', esc(v.fit)) + row('یادداشت', esc(v.note)) + '</dl>' +
      (v.sectors.length ? '<p class="fe-sec"><b>گروه‌های کالایی در صفحه:</b> ' + esc(v.sectors.join('، ')) + '</p>' : '') +
      (v.checks.length ? '<p class="fe-h">مقایسه با فهرست ما <small>خوانده‌شده ' + esc((window.MS_FAIRS_RESEARCH || {}).checked || F.COLLECTED) + '</small></p>' + checksHtml(v) : '<p class="fe-sec fe-na">این صفحه هنوز با منبع مقایسه نشده است.</p>') + acts +
      (v.source ? '<p class="fr-src">منبع: <a href="' + esc(v.source) + '" target="_blank" rel="noopener" dir="ltr">' + esc(v.sourceName) + '</a></p>' : '');
  }
  function card(v) {
    var past = v.st.k === 'past', place = [v.country, v.city].filter(Boolean).join(' · '), hasDiff = v.checks.some(function (c) { return c[1] === 'diff'; });
    var q = norm([v.title, v.en, v.country, v.city, v.venue, v.organizer, v.sectors.join(' ')].join(' '));
    var key = (v.abroad ? 'x:' : 'i:') + (v.city || v.country);
    return '<li class="fe-item' + (past ? ' past' : '') + '" data-id="' + esc(v.id) + '" data-where="' + (v.abroad ? 'abroad' : 'iran') + '" data-place="' + esc(key) + '" data-past="' + (past ? 1 : 0) + '" data-q="' + esc(q) + '">' +
      '<i class="fe-dot ' + v.st.k + '" aria-hidden="true"></i><article class="fe-card" data-tone="' + v.tone + '">' + thumb(v) +
      '<div class="fe-main"><div class="fe-top"><span class="fe-place' + (v.abroad ? ' ab' : '') + '">' + esc(place) + '</span><span class="fr-st ' + v.st.k + '">' + v.st.text + '</span></div>' +
      '<h4>' + esc(v.title) + (v.edition ? ' <small>' + esc(v.edition) + '</small>' : '') + '</h4>' +
      '<p class="fe-when">' + jText(v.d.a, v.d.b) + SEP + '<span>' + gText(v.d.a, v.d.b) + '</span></p>' +
      '<p class="fe-sum">' + esc(v.venue.replace(/ \(.*$/, '')) + (hasDiff ? ' <em class="fe-warn">تاریخ یا اطلاعات منبع با فهرست ما فرق دارد</em>' : '') + '</p>' +
      '<button type="button" class="fe-toggle" aria-expanded="false">جزئیات</button><div class="fe-det"><div>' + details(v) + '</div></div></div></article></li>';
  }
  function monthKey(v) { var p = E.toJ(v.d.a); return p.jy * 100 + p.jm; }
  function groupsHtml(list) {
    var up = list.filter(function (v) { return v.st.k !== 'past'; }), past = list.filter(function (v) { return v.st.k === 'past'; }), out = '', cur = null, buf = [];
    function flush() { if (buf.length) out += '<section class="fe-grp" data-grp><h3 class="fe-mon">' + cur + '</h3><ol class="fe-list">' + buf.join('') + '</ol></section>'; buf = []; }
    up.forEach(function (v) { var p = E.toJ(v.d.a), name = JM[p.jm - 1] + ' ' + fa(p.jy); if (name !== cur) { flush(); cur = name; } buf.push(card(v)); });
    flush();
    if (past.length) { cur = 'برگزارشده'; past.slice().reverse().forEach(function (v) { buf.push(card(v)); }); flush(); }
    return out;
  }
  function chips(label, group, list, cur) {
    return '<div class="fr-chips" role="group" aria-label="' + label + '" data-morph="' + group + '">' + list.map(function (c) { return '<button type="button" class="fr-chip" data-' + group + '="' + esc(c[0]) + '" aria-pressed="' + (cur === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
  }
  function placeChips(all) {
    var seen = {}, list = [];
    all.forEach(function (v) {
      if ((S.where === 'iran' && !v.abroad) || (S.where === 'abroad' && v.abroad)) { var k = (v.abroad ? 'x:' : 'i:') + (v.city || v.country); if (!seen[k]) { seen[k] = 1; list.push([k, v.city || v.country]); } }
    });
    return list.length > 1 ? chips('شهر', 'place', [['all', 'همهٔ شهرها']].concat(list), S.place) : '';
  }

  var all = [], els = [], bar;
  function build() {
    all = F.items().map(function (x) { x.st = F.status(x.d); return shape(x); });
    var nIran = all.filter(function (v) { return !v.abroad; }).length, nAb = all.length - nIran;
    var h = '<h1>نمایشگاه‌ها</h1><p class="fr-lead">نمایشگاه‌ها و رویدادهایی که برای مکث‌سیلور مهم‌اند. هر کارت خلاصه است؛ با «جزئیات» همهٔ آنچه از صفحهٔ خود رویداد خوانده شده و مقایسه‌اش با فهرست ما را ببینید.</p>' +
      '<div class="fr-bar"><input id="frQ" type="search" placeholder="جست‌وجوی نام، شهر، کشور، حوزه…" autocomplete="off"></div>' +
      '<div id="frF">' + chips('مکان', 'where', [['all', 'همه (' + fa(all.length) + ')'], ['iran', 'در ایران (' + fa(nIran) + ')'], ['abroad', 'خارج از کشور (' + fa(nAb) + ')']], S.where) + '<div id="frP"></div>' +
      chips('زمان', 'when', [['all', 'همه'], ['next', 'در پیش رو'], ['past', 'برگزارشده']], S.when) + '</div>' +
      '<p class="fr-note" id="frCount" aria-live="polite"></p><div id="frL" class="fe-tl">' + groupsHtml(all) + '</div><p class="fr-note" id="frNone" hidden>رویدادی با این فیلتر پیدا نشد.</p>';
    if (X && X.trips && X.trips.length) h += '<section class="fr-sec"><h2>مسیرهای سفر پیشنهادی</h2><div class="fr-trips">' + X.trips.map(function (t) { return '<article class="fr-trip"><b>' + esc(t.title) + '</b><p>' + esc(t.text) + '</p></article>'; }).join('') + '</div></section>';
    if (X && X.methods && X.methods.length) h += '<section class="fr-sec"><h2>راهنمای خواندن وضعیت‌ها</h2><div class="fr-trips">' + X.methods.map(function (t) { return '<article class="fr-trip soft"><b>' + esc(t.title) + '</b><p>' + esc(t.text) + '</p></article>'; }).join('') + '</div></section>';
    root.innerHTML = h;
    els = Array.prototype.slice.call(root.querySelectorAll('.fe-item'));
    place();
    apply(true);
  }
  function place() {
    var M = window.MSMorph, box = document.getElementById('frP');
    box.innerHTML = placeChips(all);
    if (M) M.playAll(root, '.fr-chips', '.fr-chip', '[aria-pressed=true]', null, { cls: 'chip' });
  }
  function show(el) {
    var q = norm(S.q);
    if (S.where !== 'all' && el.getAttribute('data-where') !== S.where) return false;
    if (S.place !== 'all' && el.getAttribute('data-place') !== S.place) return false;
    if (S.when === 'next' && el.getAttribute('data-past') === '1') return false;
    if (S.when === 'past' && el.getAttribute('data-past') !== '1') return false;
    return !q || el.getAttribute('data-q').indexOf(q) >= 0;
  }
  // hide what no longer fits (a short fade), then let the others glide to their new place and the new ones fade in
  function apply(first) {
    var want = els.map(show), n = want.filter(Boolean).length, nowShown = els.map(function (e) { return !e.hidden; });
    document.getElementById('frCount').textContent = fa(n) + ' رویداد از ' + fa(els.length);
    document.getElementById('frNone').hidden = n > 0;
    function settle() {
      var before = els.map(function (e, i) { return nowShown[i] && want[i] ? e.getBoundingClientRect() : null; });
      els.forEach(function (e, i) { e.hidden = !want[i]; });
      Array.prototype.forEach.call(root.querySelectorAll('[data-grp]'), function (g) { g.hidden = !g.querySelector('.fe-item:not([hidden])'); });
      if (first || calm || !els[0].animate) return;
      els.forEach(function (e, i) {
        if (!want[i]) return;
        if (before[i]) {
          var a = e.getBoundingClientRect(), dy = before[i].top - a.top, dx = before[i].left - a.left;
          if (Math.abs(dy) > 1 || Math.abs(dx) > 1) e.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
        } else e.animate([{ opacity: 0, transform: 'translateY(14px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 60, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      });
    }
    var out = els.filter(function (e, i) { return nowShown[i] && !want[i]; });
    if (first || calm || !out.length || !out[0].animate) return settle();
    var done = 0;
    out.forEach(function (e) { e.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.96)' }], { duration: 150, easing: 'ease-in', fill: 'forwards' }).onfinish = function () { if (++done === out.length) settle(); }; });
    setTimeout(function () { if (done < out.length) { done = out.length; settle(); } }, 320);
  }
  function setChip(group, val) {
    var M = window.MSMorph, scope = document.getElementById('frF'), prev = M ? M.snapAll(scope, '.fr-chips', '.fr-chip', '[aria-pressed=true]') : null;
    if (group === 'where') { S.where = val; S.place = 'all'; place(); } else S[group] = val;
    Array.prototype.forEach.call(scope.querySelectorAll('[data-' + group + ']'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-' + group) === val); });
    // the city/country row was drawn again, so its pill is placed fresh; the row that stayed slides
    if (M) M.playAll(scope, '.fr-chips', '.fr-chip', '[aria-pressed=true]', prev, { cls: 'chip' });
    apply();
  }
  root.addEventListener('click', function (e) {
    var t = e.target.closest('.fe-toggle');
    if (t) {
      var det = t.nextElementSibling, open = !det.classList.contains('open');
      det.classList.toggle('open', open); t.setAttribute('aria-expanded', open); t.textContent = open ? 'بستن' : 'جزئیات';
      return;
    }
    var c = e.target.closest('.fr-chip');
    if (!c) return;
    ['where', 'place', 'when'].forEach(function (g) { if (c.hasAttribute('data-' + g)) setChip(g, c.getAttribute('data-' + g)); });
  });
  root.addEventListener('input', function (e) { if (e.target.id === 'frQ') { S.q = e.target.value; apply(); } });
  build();
})();

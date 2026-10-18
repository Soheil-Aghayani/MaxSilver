// fairs.html: the fairs and events the company follows. Two parts: the four main fairs (facts read from each organizer's own page) and the
// owner's regional list of Iran and Türkiye events with filters. The data is in assets/fairs-data.js and assets/expos-data.js.
// A card with no picture shows a colour block; pictures are assets/art/fairs/<id>-pc.webp (1280x720) and -tablet.webp (1024x768) for
// the main fairs and one file for each regional event (set when tools/import_regional_expos.py runs).
(function () {
  'use strict';
  var E = window.MSEvents, F = window.MSFairs, X = window.MS_EXPOS, root = document.getElementById('fr');
  if (!E || !F || !root) return;
  var fa = E.fa, esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var JM = E.MONTHS, SEP = '<i class="ms-sep" aria-hidden="true"></i>';
  var MON_G = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
  var SECTOR = { horeca: 'آشپزخانه و HORECA', construction: 'ساختمان', food: 'غذا و قهوه', tourism: 'گردشگری', furniture: 'مبلمان', health: 'بهداشت و پزشکی', hygiene: 'بهداشت', media: 'رسانه و تبلیغات' };
  var S = { region: 'all', sector: 'all', q: '' };
  var norm = function (s) { return String(s == null ? '' : s).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s]+/g, ' ').toLowerCase(); };

  function jText(d1, d2) {
    var p = E.toJ(d1), q = E.toJ(d2);
    return fa(p.jd) + (p.jm === q.jm ? '' : ' ' + JM[p.jm - 1]) + ' تا ' + fa(q.jd) + ' ' + JM[q.jm - 1] + ' ' + fa(q.jy);
  }
  function gText(d1, d2) {
    var m1 = d1.getMonth(), m2 = d2.getMonth();
    return fa(d1.getDate()) + (m1 === m2 ? '' : ' ' + MON_G[m1]) + ' تا ' + fa(d2.getDate()) + ' ' + MON_G[m2] + ' ' + fa(d2.getFullYear());
  }
  function row(k, v) { return v ? '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>' : ''; }
  function banner(it) {
    var base = './assets/art/fairs/' + esc(it.art);
    if (!it.art) return '<div class="fr-banner noimg"><span class="fr-ph" aria-hidden="true">' + esc((it.f.en || it.f.country || '') + (it.f.city ? ' · ' + it.f.city : '')) + '</span></div>';
    var src = it.kind === 'main' ? base + '-pc.webp' : base + it.ext, tab = it.kind === 'main' ? '<source media="(max-width:1024px)" srcset="' + base + '-tablet.webp">' : '';
    return '<div class="fr-banner"><span class="fr-ph" aria-hidden="true">' + esc(it.f.en || it.f.country || '') + '</span><picture>' + tab + '<img src="' + src + '" alt="" loading="lazy" decoding="async" onerror="this.closest(\x27.fr-banner\x27).classList.add(\x27noimg\x27);this.remove()"></picture></div>';
  }
  function mainCard(it, big) {
    var f = it.f, d = it.d, st = it.st, when = f.from ? jText(d.a, d.b) + SEP + gText(d.a, d.b) : gText(d.a, d.b) + SEP + jText(d.a, d.b) + ' <em class="fr-calc">(محاسبه‌شده)</em>';
    var contact = f.contact.map(function (c) { return /@/.test(c) ? '<a href="mailto:' + esc(c) + '" dir="ltr">' + esc(c) + '</a>' : '<span dir="ltr">' + esc(c) + '</span>'; }).join(' · ');
    return '<article class="fr-card' + (big ? ' big' : '') + (st.k === 'past' ? ' past' : '') + '" data-tone="' + it.tone + '" data-id="' + esc(it.id) + '">' + banner(it) +
      '<div class="fr-body"><div class="fr-top"><span class="fr-ed">' + esc(f.edition) + '</span><span class="fr-st ' + st.k + '">' + st.text + '</span></div>' +
      '<h3>' + esc(f.title) + '</h3><p class="fr-when">' + when + '</p><dl class="fr-facts">' +
      row('محل برگزاری', esc(f.venue)) + row('شهر', f.city ? esc(f.city) : '<span class="fr-na">در منبع ذکر نشده</span>') + row('برگزارکننده', esc(f.organizer)) +
      row('ثبت‌نام', esc(f.register)) + row('تماس', contact) + row('وب‌سایت', f.site ? '<span dir="ltr">' + esc(f.site) + '</span>' : '') + (f.note ? row('یادداشت', esc(f.note)) : '') + '</dl>' +
      '<p class="fr-src">منبع: <a href="' + esc(f.source) + '" target="_blank" rel="noopener" dir="ltr">' + esc(f.sourceName) + '</a>' + SEP + 'خوانده‌شده در ' + F.COLLECTED + '</p></div></article>';
  }
  function expoCard(it) {
    var e = it.f, st = it.st, place = [e.country, e.city].filter(Boolean).join(' · ');
    return '<article class="fr-card expo' + (st.k === 'past' ? ' past' : '') + '" data-tone="' + it.tone + '" data-id="' + esc(it.id) + '">' + (it.art ? banner(it) : '') +
      '<div class="fr-body"><div class="fr-top"><span class="fr-ed' + (e.region === 'turkey' ? ' tr' : '') + '">' + esc(place || (e.region === 'turkey' ? 'ترکیه' : 'ایران')) + '</span><span class="fr-st ' + st.k + '">' + st.text + '</span></div>' +
      '<h3>' + esc(e.title) + '</h3><p class="fr-when">' + esc(e.dateMain) + (e.dateAlt ? SEP + '<span class="fr-alt">' + esc(e.dateAlt) + '</span>' : '') + '</p><dl class="fr-facts">' +
      row('محل برگزاری', esc(e.venue)) + row('وضعیت منبع', e.confidence ? '<span class="fr-conf">' + esc(e.confidence) + '</span>' : '') + row('ارتباط با Max Silver', esc(e.fit)) +
      row('حوزه', e.tagList && e.tagList.length ? e.tagList.map(function (t) { return '<span class="fr-tag">' + esc(t) + '</span>'; }).join('') : '') +
      row('تطبیق', e.match ? '<span class="fr-match ' + esc(e.matchLevel) + '">' + esc(e.match.replace(/^تطبیق:\s*/, '')) + '</span>' : '') + (e.note ? row('یادداشت', esc(e.note)) : '') + '</dl>' +
      (e.actions && e.actions.length ? '<div class="fr-acts">' + e.actions.map(function (a) { return '<a class="fr-act' + (a.primary ? ' pri' : '') + '" href="' + esc(a.href) + '" target="_blank" rel="noopener">' + esc(a.label) + '</a>'; }).join('') + '</div>' : '') + '</div></article>';
  }
  function chips(label, group, list, cur, attr) {
    return '<div class="fr-chips" role="group" aria-label="' + label + '" data-morph="' + group + '">' + list.map(function (c) { return '<button type="button" class="fr-chip" ' + attr + '="' + esc(c[0]) + '" aria-pressed="' + (cur === c[0]) + '">' + esc(c[1]) + '</button>'; }).join('') + '</div>';
  }
  function expoList(all) {
    var q = norm(S.q);
    return all.filter(function (it) {
      if (it.kind !== 'expo') return false;
      var e = it.f;
      if (S.region !== 'all' && e.region !== S.region) return false;
      if (S.sector !== 'all' && (e.tags || []).indexOf(S.sector) < 0) return false;
      return !q || norm([e.title, e.venue, e.country, e.city, e.fit, (e.tagList || []).join(' ')].join(' ')).indexOf(q) >= 0;
    });
  }
  function render() {
    var all = F.items().map(function (x) { x.st = F.status(x.d); return x; });
    var main = all.filter(function (x) { return x.kind === 'main'; }), up = main.filter(function (x) { return x.st.k !== 'past'; }), past = main.filter(function (x) { return x.st.k === 'past'; });
    var h = '<h1>نمایشگاه‌ها</h1><p class="fr-lead">نمایشگاه‌هایی که برای مکث‌سیلور مهم‌اند؛ اطلاعات از صفحهٔ رسمی برگزارکننده خوانده شده و منبع هر مورد زیر آن است. «مشارکت مکث‌سیلور» هنوز ثبت نشده است.</p>';
    if (up.length) h += '<section class="fr-sec"><h2>نمایشگاه‌های اصلی در پیش رو</h2><div class="fr-grid">' + up.map(function (x, i) { return mainCard(x, i === 0); }).join('') + '</div></section>';
    if (past.length) h += '<section class="fr-sec"><h2>برگزارشده</h2><div class="fr-grid">' + past.map(function (x) { return mainCard(x, false); }).join('') + '</div></section>';
    if (X && X.events && X.events.length) {
      var ex = expoList(all), sectors = [], seen = {};
      X.events.forEach(function (e) { (e.tags || []).forEach(function (t) { if (!seen[t]) { seen[t] = 1; sectors.push([t, SECTOR[t] || t]); } }); });
      h += '<section class="fr-sec"><h2>رویدادهای تخصصی ایران و ترکیه</h2><p class="fr-lead">' + esc(X.lead || '') + '</p><p class="fr-note">' + esc(X.note || '') + '</p>' +
        '<div class="fr-bar"><input id="frQ" type="search" placeholder="جست‌وجوی نام، شهر، حوزه…" value="' + esc(S.q) + '" autocomplete="off"></div>' +
        chips('کشور', 'region', [['all', 'همهٔ کشورها'], ['iran', 'ایران'], ['turkey', 'ترکیه']], S.region, 'data-region') +
        chips('حوزه', 'sector', [['all', 'همهٔ حوزه‌ها']].concat(sectors), S.sector, 'data-sector') +
        '<div class="fr-grid">' + ex.map(expoCard).join('') + '</div>' + (ex.length ? '' : '<p class="fr-note">رویدادی پیدا نشد.</p>') + '</section>';
      if (X.trips && X.trips.length) h += '<section class="fr-sec"><h2>مسیرهای سفر پیشنهادی</h2><div class="fr-trips">' + X.trips.map(function (t) { return '<article class="fr-trip"><b>' + esc(t.title) + '</b><p>' + esc(t.text) + '</p></article>'; }).join('') + '</div></section>';
      if (X.methods && X.methods.length) h += '<section class="fr-sec"><h2>راهنمای خواندن وضعیت‌ها</h2><div class="fr-trips">' + X.methods.map(function (t) { return '<article class="fr-trip soft"><b>' + esc(t.title) + '</b><p>' + esc(t.text) + '</p></article>'; }).join('') + '</div></section>';
    }
    var a = document.activeElement, keep = a && a.id === 'frQ' ? a.selectionStart : null, M = window.MSMorph;
    var prev = M ? M.snapAll(root, '.fr-chips', '.fr-chip', '[aria-pressed=true]') : null;
    root.innerHTML = h;
    if (M) M.playAll(root, '.fr-chips', '.fr-chip', '[aria-pressed=true]', prev, { cls: 'chip' });
    if (keep !== null) { var q = document.getElementById('frQ'); if (q) { q.focus(); try { q.setSelectionRange(keep, keep); } catch (e) { /* ignore */ } } }
  }
  root.addEventListener('click', function (e) {
    var r = e.target.closest('[data-region]'), s = e.target.closest('[data-sector]');
    if (r) { S.region = r.getAttribute('data-region'); render(); } else if (s) { S.sector = s.getAttribute('data-sector'); render(); }
  });
  root.addEventListener('input', function (e) { if (e.target.id === 'frQ') { S.q = e.target.value; render(); } });
  render();
})();

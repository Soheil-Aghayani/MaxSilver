// academy.html: the training page. Content comes from academy-data.js; every role sees only the tracks of its own work (management sees all).
// Progress is kept in this browser and, when the person is signed in on the Max Silver server, saved to their own account (profile key "academy").
(function () {
  'use strict';
  var root = document.getElementById('ac'), D = window.MS_ACADEMY, R = window.MSRoles, api = window.MSApi;
  if (!root || !D) return;

  var KEY = 'ms-academy-v1';
  var P = { done: [], quiz: {}, practice: [], check: [], xp: 0, at: 0 };
  var S = { view: 'home', track: null, day: null, quizAt: 0, picked: -1, score: 0, answers: [], uid: null, saveTimer: 0, syncMsg: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fa(n) { return String(n).replace(/\d/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'.charAt(c); }); }
  function role() { var r = ''; try { r = localStorage.getItem('ms-role') || ''; } catch (e) { /* ignore */ } return R ? R.norm(r) : r; }
  function seesAll() { var r = role(); return r === 'manager' || r === 'ceo'; }
  function myTracks() { return D.tracks.filter(function (t) { return seesAll() || t.roles.indexOf(role()) >= 0; }); }
  function track(id) { return D.tracks.filter(function (t) { return t.id === id; })[0]; }
  function dayOf(t, id) { return (t.days || []).filter(function (d) { return d.id === id; })[0]; }
  function has(list, k) { return list.indexOf(k) >= 0; }
  function add(list, k) { if (!has(list, k)) { list.push(k); return true; } return false; }

  // ---- progress
  function load() { try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && j.done) P = j; } catch (e) { /* ignore */ } }
  function merge(o) {
    if (!o || !o.done) return;
    o.done.forEach(function (k) { add(P.done, k); });
    (o.practice || []).forEach(function (k) { add(P.practice, k); });
    (o.check || []).forEach(function (k) { add(P.check, k); });
    Object.keys(o.quiz || {}).forEach(function (k) { if (!P.quiz[k] || o.quiz[k][0] > P.quiz[k][0]) P.quiz[k] = o.quiz[k]; });
    recount();
  }
  function recount() {
    var xp = P.done.length * 10 + P.practice.length * 20 + P.check.length * 3;
    Object.keys(P.quiz).forEach(function (k) { xp += P.quiz[k][0] * 5; });
    D.tracks.forEach(function (t) { (t.days || []).forEach(function (d) { if (dayDone(t, d)) xp += 50; }); });
    P.xp = xp;
  }
  function save() {
    recount(); P.at = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignore */ }
    if (S.uid && api && api.enabled() && api.token()) {
      clearTimeout(S.saveTimer);
      S.saveTimer = setTimeout(function () {
        api.raw('PATCH', 'udocs/' + S.uid, { data: { academy: P } }).then(function () { S.syncMsg = ''; }, function () { S.syncMsg = 'پیشرفت فقط روی همین دستگاه ذخیره شد.'; });
      }, 1200);
    }
  }
  function syncFromServer() {
    if (!api || !api.enabled() || !api.token()) return;
    api.me().then(function (u) {
      S.uid = u.id;
      return api.raw('GET', 'udocs/' + u.id).then(function (r) { merge((r && r.data && r.data.academy) || null); save(); render(); });
    }).then(null, function () { /* signed out or offline: local progress still works */ });
  }

  // ---- state of days
  function lessonKey(t, d, l) { return t.id + '.' + d.id + '.' + l.id; }
  function lessonsDone(t, d) { return d.lessons.filter(function (l) { return has(P.done, lessonKey(t, d, l)); }).length; }
  function quizOf(t, d) { return P.quiz[t.id + '.' + d.id]; }
  function quizPassed(t, d) { var q = quizOf(t, d); return !!q && q[0] * 100 >= d.quiz.length * D.passPercent; }
  function dayDone(t, d) { return lessonsDone(t, d) === d.lessons.length && quizPassed(t, d) && has(P.practice, t.id + '.' + d.id); }
  function dayPct(t, d) {
    var total = d.lessons.length + 2, n = lessonsDone(t, d) + (quizPassed(t, d) ? 1 : 0) + (has(P.practice, t.id + '.' + d.id) ? 1 : 0);
    return Math.round(n * 100 / total);
  }
  function trackPct(t) {
    if (!t.days) return 0;
    var s = 0; t.days.forEach(function (d) { s += dayPct(t, d); });
    return Math.round(s / t.days.length);
  }
  function level() { var xp = P.xp; var lv = Math.floor(xp / 150) + 1; return { n: lv, into: xp % 150, next: 150 }; }
  var LV = ['تازه‌وارد', 'کنجکاو', 'آماده', 'تیزبین', 'حرفه‌ای', 'استاد'];

  // ---- pieces
  var ICON = {
    sales: '<path d="M3 17l5-5 4 4 8-9"/><path d="M15 7h5v5"/>',
    service: '<path d="M14.700 6.300a4 4 0 0 0-5.400 5.400L3 18l3 3 6.300-6.300a4 4 0 0 0 5.400-5.400l-2.500 2.500-2.500-.5-.5-2.500z"/>',
    ops: '<path d="M3 8l9-5 9 5v9l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v9"/>',
    finance: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.500"/>',
    marketing: '<path d="M3 11v2a1 1 0 0 0 1 1h3l8 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    hr: '<circle cx="9" cy="8" r="3.500"/><path d="M2 20c0-3.300 3-6 7-6s7 2.700 7 6M17 5a3.500 3.500 0 0 1 0 7"/>'
  };
  function svg(name, cls) { return '<svg class="' + (cls || 'ac-ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || ICON.sales) + '</svg>'; }
  // the clay pictures made for the academy; the line icon stays as the fallback when a picture is missing
  function art(name) { return '<span class="ac-ic-wrap">' + svg(name) + '<img class="ac-ic-img" src="./assets/art/academy/track-' + name + '.webp" alt="" width="56" height="56" loading="lazy" onerror="this.remove()"></span>'; }
  function trophy() { return '<img class="ac-trophy" src="./assets/art/academy/trophy.webp" alt="" width="84" height="84" onerror="this.remove()">'; }
  function ring(pct, size) {
    var r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return '<span class="ac-ring" style="--s:' + size + 'px"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="' + r + '" class="bg"/><circle cx="32" cy="32" r="' + r + '" class="fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b>' + fa(pct) + '٪</b></span>';
  }
  function bar(pct) { return '<span class="ac-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></span>'; }
  function back(to, label) { return '<button type="button" class="ac-back" data-go="' + esc(to) + '">‹ ' + esc(label) + '</button>'; }

  // ---- views
  function viewHome() {
    var lv = level(), tracks = myTracks();
    var h = '<section class="ac-hero"><div><h1>آکادمی مکث‌سیلور</h1><p>هر نقش مسیر یادگیری خودش را دارد. کوتاه، کاربردی و با تمرین.</p></div>' +
      '<div class="ac-xp"><span class="ac-lv">سطح ' + fa(lv.n) + ' · ' + esc(LV[Math.min(LV.length - 1, lv.n - 1)]) + '</span><b>' + fa(P.xp) + ' امتیاز</b>' + bar(Math.round(lv.into * 100 / lv.next)) + '</div></section>';
    if (!tracks.length) return h + '<p class="ac-note">برای نقش شما هنوز مسیری تعریف نشده است. از مدیر بخواهید دسترسی را بررسی کند.</p>';
    h += '<div class="ac-tracks">' + tracks.map(function (t) {
      var pct = trackPct(t);
      var mine = !seesAll() || t.roles.indexOf(role()) >= 0;
      return '<article class="ac-track' + (t.soon ? ' soon' : '') + (mine ? '' : ' other') + '"><div class="ac-th">' + art(t.icon) + '<div><h2>' + esc(t.title) + '</h2><p>' + esc(t.intro) + '</p></div></div>' +
        (t.soon
          ? '<ul class="ac-outline">' + t.outline.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul><span class="ac-badge">به‌زودی</span>'
          : '<div class="ac-tp">' + ring(pct, 64) + '<div><b>' + fa(t.days.length) + ' روز · حدود ' + fa(Math.round(t.days.reduce(function (a, d) { return a + d.minutes; }, 0) / 60)) + ' ساعت</b>' + bar(pct) + '</div></div><button type="button" class="ac-go" data-go="' + t.id + '">' + (pct ? 'ادامهٔ مسیر' : 'شروع مسیر') + '</button>') +
        '</article>';
    }).join('') + '</div>';
    return h;
  }

  function viewTrack(t) {
    var h = back('home', 'همهٔ مسیرها') + '<section class="ac-hero small"><div><h1>' + esc(t.title) + '</h1><p>' + esc(t.intro) + '</p></div>' + ring(trackPct(t), 76) + '</section>';
    var firstOpen = null;
    h += '<ol class="ac-week">' + t.days.map(function (d) {
      var done = dayDone(t, d), pct = dayPct(t, d);
      if (!done && firstOpen === null) firstOpen = d.id;
      var state = done ? 'done' : (firstOpen === d.id ? 'now' : 'open');
      return '<li class="ac-day ' + state + '"><button type="button" data-go="' + t.id + '/' + d.id + '"><span class="ac-node">' + (done ? '✓' : fa(d.n)) + '</span>' +
        '<span class="ac-dt"><b>روز ' + fa(d.n) + ' · ' + esc(d.title) + '</b><small>' + esc(d.goal) + '</small><small class="meta">' + fa(d.minutes) + ' دقیقه · ' + fa(d.lessons.length) + ' درس · ' + fa(d.quiz.length) + ' پرسش' + (d.n === t.days.length ? ' · آزمون نهایی' : '') + '</small></span>' +
        '<span class="ac-dp">' + (state === 'now' ? '<em>ادامه بده</em>' : fa(pct) + '٪') + '</span></button></li>';
    }).join('') + '</ol>';
    if (t.days.every(function (d) { return dayDone(t, d); })) h += '<section class="ac-cert">' + trophy() + '<b>تبریک!</b><p>هفتهٔ آموزش را کامل کردی. حالا آمادهٔ آموزش میدانی هستی. به مدیر فروش خبر بده.</p></section>';
    return h;
  }

  function viewDay(t, d) {
    var qk = t.id + '.' + d.id, pr = has(P.practice, qk);
    var h = back(t.id, t.title) + '<section class="ac-hero small"><div><span class="ac-dayno">روز ' + fa(d.n) + '</span><h1>' + esc(d.title) + '</h1><p>' + esc(d.goal) + '</p></div>' + ring(dayPct(t, d), 76) + '</section>';
    h += '<h2 class="ac-sec">۱. درس‌ها</h2>' + d.lessons.map(function (l) {
      var k = lessonKey(t, d, l), done = has(P.done, k);
      return '<details class="ac-lesson' + (done ? ' done' : '') + '"' + (!done ? ' open' : '') + '><summary><span class="ac-ck">' + (done ? '✓' : '') + '</span>' + esc(l.t) + '</summary>' +
        '<div class="ac-body">' + (l.body || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        (l.bullets ? '<ul>' + l.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' : '') +
        (l.tip ? '<p class="ac-tip"><b>نکتهٔ طلایی</b>' + esc(l.tip) + '</p>' : '') +
        '<button type="button" class="ac-mark' + (done ? ' on' : '') + '" data-lesson="' + esc(k) + '">' + (done ? 'خوانده شد ✓' : 'فهمیدم') + '</button></div></details>';
    }).join('');
    h += '<h2 class="ac-sec">۲. ' + (d.n === t.days.length ? 'آزمون نهایی' : 'پرسش‌های سریع') + '</h2>' + quizView(t, d);
    h += '<h2 class="ac-sec">۳. تمرین</h2><section class="ac-practice' + (pr ? ' done' : '') + '"><h3>' + esc(d.practice.t) + '</h3><p>' + esc(d.practice.brief) + '</p><ol>' + d.practice.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<button type="button" class="ac-mark' + (pr ? ' on' : '') + '" data-practice="' + esc(qk) + '">' + (pr ? 'انجام شد ✓' : 'تمرین را انجام دادم') + '</button></section>';
    h += '<h2 class="ac-sec">۴. چک‌لیست پایان روز</h2><ul class="ac-check">' + d.checklist.map(function (c, i) {
      var k = qk + '.' + i, on = has(P.check, k);
      return '<li><label><input type="checkbox" data-check="' + esc(k) + '"' + (on ? ' checked' : '') + '><span>' + esc(c) + '</span></label></li>';
    }).join('') + '</ul>';
    if (dayDone(t, d)) {
      var nx = t.days[t.days.indexOf(d) + 1];
      h += '<section class="ac-cert">' + trophy() + '<b>روز ' + fa(d.n) + ' کامل شد!</b><p>پنجاه امتیاز پاداش گرفتی.</p>' + (nx ? '<button type="button" class="ac-go" data-go="' + t.id + '/' + nx.id + '">روز بعد: ' + esc(nx.title) + '</button>' : '<button type="button" class="ac-go" data-go="' + t.id + '">بازگشت به نقشهٔ هفته</button>') + '</section>';
    }
    return h;
  }

  function quizView(t, d) {
    var qk = t.id + '.' + d.id, best = P.quiz[qk], n = d.quiz.length;
    if (S.quizAt >= n) {
      var pass = S.score * 100 >= n * D.passPercent;
      return '<section class="ac-quiz result ' + (pass ? 'pass' : 'fail') + '"><b class="ac-big">' + fa(S.score) + ' از ' + fa(n) + '</b><p>' + (pass ? 'عالی! قبول شدی.' : 'برای قبولی دست‌کم ' + fa(D.passPercent) + '٪ لازم است. درس‌ها را دوباره بخوان و تلاش کن.') + '</p>' +
        '<button type="button" class="ac-go" data-quiz-restart>' + (pass ? 'یک بار دیگر برای تمرین' : 'دوباره امتحان کن') + '</button></section>';
    }
    if (S.quizAt === 0 && S.picked < 0 && !S.answers.length) {
      return '<section class="ac-quiz start"><p>' + fa(n) + ' پرسش · نمرهٔ قبولی ' + fa(D.passPercent) + '٪' + (best ? ' · بهترین نمرهٔ تو: ' + fa(best[0]) + ' از ' + fa(n) : '') + '</p><button type="button" class="ac-go" data-quiz-start>شروع</button></section>';
    }
    var q = d.quiz[S.quizAt], ans = S.picked >= 0;
    return '<section class="ac-quiz"><small>پرسش ' + fa(S.quizAt + 1) + ' از ' + fa(n) + '</small><h3>' + esc(q.q) + '</h3><div class="ac-opts">' + q.o.map(function (o, i) {
      var cls = ans ? (i === q.a ? ' right' : (i === S.picked ? ' wrong' : '')) : '';
      return '<button type="button" class="ac-opt' + cls + '" data-pick="' + i + '"' + (ans ? ' disabled' : '') + '>' + esc(o) + '</button>';
    }).join('') + '</div>' + (ans ? '<p class="ac-why ' + (S.picked === q.a ? 'ok' : 'no') + '">' + (S.picked === q.a ? 'درست ✓ ' : 'نادرست. ') + esc(q.why) + '</p><button type="button" class="ac-go" data-quiz-next>' + (S.quizAt + 1 >= n ? 'دیدن نتیجه' : 'پرسش بعدی') + '</button>' : '') + '</section>';
  }

  function render() {
    var h, t, d;
    if (S.view === 'home') h = viewHome();
    else if ((t = track(S.track)) && S.view === 'track') h = viewTrack(t);
    else if (t && (d = dayOf(t, S.day)) && S.view === 'day') h = viewDay(t, d);
    else h = viewHome();
    root.innerHTML = h + (S.syncMsg ? '<p class="ac-note">' + esc(S.syncMsg) + '</p>' : '');
  }

  function go(to) {
    var p = String(to || 'home').split('/');
    S.quizAt = 0; S.picked = -1; S.score = 0; S.answers = [];
    if (p[0] === 'home' || !track(p[0])) { S.view = 'home'; S.track = null; S.day = null; }
    else if (p[1]) { S.view = 'day'; S.track = p[0]; S.day = p[1]; }
    else { S.view = 'track'; S.track = p[0]; S.day = null; }
    try { history.replaceState(null, '', '#' + (S.view === 'home' ? '' : to)); } catch (e) { /* ignore */ }
    render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  root.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var t = track(S.track), d = t && dayOf(t, S.day);
    if (b.hasAttribute('data-go')) return go(b.getAttribute('data-go'));
    if (b.hasAttribute('data-lesson')) { var k = b.getAttribute('data-lesson'); if (has(P.done, k)) P.done.splice(P.done.indexOf(k), 1); else add(P.done, k); save(); return render(); }
    if (b.hasAttribute('data-practice')) { var pk = b.getAttribute('data-practice'); if (has(P.practice, pk)) P.practice.splice(P.practice.indexOf(pk), 1); else add(P.practice, pk); save(); return render(); }
    if (!d) return;
    if (b.hasAttribute('data-quiz-start') || b.hasAttribute('data-quiz-restart')) { S.quizAt = 0; S.picked = -1; S.score = 0; S.answers = [0]; return render(); }
    if (b.hasAttribute('data-pick')) { if (S.picked >= 0) return; S.picked = Number(b.getAttribute('data-pick')); if (S.picked === d.quiz[S.quizAt].a) S.score++; return render(); }
    if (b.hasAttribute('data-quiz-next')) {
      S.quizAt++; S.picked = -1;
      if (S.quizAt >= d.quiz.length) {
        var qk = t.id + '.' + d.id, prev = P.quiz[qk];
        if (!prev || S.score > prev[0]) { P.quiz[qk] = [S.score, d.quiz.length]; save(); }
      }
      return render();
    }
  });
  root.addEventListener('change', function (ev) {
    var c = ev.target; if (!c.hasAttribute || !c.hasAttribute('data-check')) return;
    var k = c.getAttribute('data-check'); if (c.checked) add(P.check, k); else if (has(P.check, k)) P.check.splice(P.check.indexOf(k), 1);
    save(); render();
  });

  load(); recount();
  var h = (location.hash || '').replace(/^#/, '');
  if (h) go(h); else render();
  syncFromServer();
  window.addEventListener('ms-role-change', render);
})();

// Home banner slideshow: the portal title first, then picture slides, and a greeting slide near an important occasion
// (assets/events.js). It pauses on hover, focus and touch, has a pause button, dots, swipe and arrow keys, and does not
// autoplay for people who asked for less motion.
(function () {
  'use strict';
  var hero = document.querySelector('.hero.hs');
  if (!hero) return;
  var track = hero.querySelector('.hs-track'), dotsBox = hero.querySelector('.hs-dots'), pauseBtn = hero.querySelector('.hs-pause');
  var i = 0, timer = 0, paused = false, held = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DELAY = 6500;

  function anon() { return document.documentElement.hasAttribute('data-anon'); }
  function slides() { return Array.prototype.slice.call(hero.querySelectorAll('.hs-slide')); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // the greeting slide of the nearest important occasion, for signed-in people only; it sits right after the title slide
  function syncEvent() {
    var old = hero.querySelector('.hs-slide.event'), ev = null;
    try { ev = !anon() && window.MSEvents ? window.MSEvents.active() : null; } catch (e) { ev = null; }
    if (!ev) { if (old) old.remove(); return; }
    if (old && old.getAttribute('data-ev') === ev.id) return;
    if (old) old.remove();
    var s = document.createElement('div');
    s.className = 'hs-slide pic event'; s.setAttribute('data-feature', 'events');
    s.setAttribute('data-ev', ev.id);
    s.setAttribute('data-tone', ev.tone);
    var base = './assets/art/events/' + ev.id;
    s.innerHTML = '<div class="hs-copy"><h2>' + esc(ev.title + (ev.days === 0 ? ' مبارک' : '')) + '</h2><p>' + esc(ev.hello) + '</p>' +
      '<a class="hs-cta" href="./events.html">مناسبت‌ها<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg></a></div>' +
      '<picture class="hs-art" aria-hidden="true"><source media="(max-width:760px)" srcset="' + base + '-mobile.webp" width="720" height="900"><source media="(max-width:1100px)" srcset="' + base + '-tablet.webp" width="1024" height="360">' +
      '<img src="' + base + '-pc.webp" alt="" width="1280" height="360" loading="lazy" decoding="async"></picture>';
    var first = track.querySelector('.hs-slide');
    track.insertBefore(s, first.nextSibling);
  }

  // a fair or event that starts within 30 days (or is running) gets a slide, the main fairs first, then the best-matching events, four slides at most; visible to everyone, signed in or not
  function syncFairs() {
    var F = window.MSFairs, list = [];
    try { list = F ? F.soon(30).filter(function (x) { return !(x.kind === 'expo' && x.f.matchLevel === 'low'); }).sort(function (a, b) { return (a.kind === 'main' ? 0 : 1) - (b.kind === 'main' ? 0 : 1) || a.d.a - b.d.a; }).slice(0, 4) : []; } catch (e) { list = []; }
    var sig = list.map(function (x) { return x.id; }).join(',');
    if ((hero.getAttribute('data-fairs') || '') === sig) return;
    hero.setAttribute('data-fairs', sig);
    Array.prototype.forEach.call(hero.querySelectorAll('.hs-slide.fair'), function (s) { s.remove(); });
    var anchor = track.querySelector('.hs-slide.event') || track.querySelector('.hs-slide');
    list.forEach(function (x) {
      var f = x.f, E = window.MSEvents, s = document.createElement('div');
      s.className = 'hs-slide pic fair'; s.setAttribute('data-feature', 'fairs'); s.setAttribute('data-tone', x.tone); s.setAttribute('data-fair', x.id);
      var base = './assets/art/fairs/' + x.art, art = '';
      if (x.art && x.kind === 'main') art = '<picture class="hs-art" aria-hidden="true"><source media="(max-width:760px)" srcset="' + base + '-mobile.webp" width="720" height="1279"><source media="(max-width:1100px)" srcset="' + base + '-tablet.webp" width="1024" height="768"><img src="' + base + '-pc.webp" alt="" width="1280" height="720" loading="lazy" decoding="async"></picture>';
      else if (x.art) art = '<picture class="hs-art" aria-hidden="true"><img src="' + base + x.ext + '" alt="" loading="lazy" decoding="async"></picture>';
      var when = x.st.k === 'now' ? 'در حال برگزاری' : x.st.text;
      s.innerHTML = '<div class="hs-copy"><h2>' + esc(x.title) + '</h2><p>' + esc(when + ' · ' + (f.dateMain || (E.fa(x.d.a.getDate()) + ' تا ' + E.fa(x.d.b.getDate())))) + (f.venue ? ' · ' + esc(f.venue) : '') + '</p>' +
        '<a class="hs-cta" href="./fairs.html">نمایشگاه‌ها<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg></a></div>' + art;
      track.insertBefore(s, anchor.nextSibling); anchor = s;
    });
    if (window.MSFeatures) window.MSFeatures.apply();
  }

  // people without an account only see the first slide; the others lead into sections they cannot open.
  // role-gate.js marks the page data-anon and hides slides the role may not open (data-manager-only)
  function active() {
    var all = slides();
    if (anon()) return all.filter(function (s, k) { return k === 0 || s.classList.contains('fair'); });
    var l = all.filter(function (s) { return !s.hidden && s.style.display !== 'none'; });
    return l.length ? l : all.slice(0, 1);
  }
  function renderDots(n) {
    if (!dotsBox) return;
    Array.prototype.forEach.call(dotsBox.querySelectorAll('.hs-dot'), function (d) { d.remove(); });
    for (var k = 0; k < n; k++) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'hs-dot'; b.setAttribute('role', 'tab'); b.setAttribute('data-i', String(k)); b.setAttribute('aria-label', 'اسلاید ' + (k + 1));
      dotsBox.insertBefore(b, pauseBtn);
    }
  }
  function show(n) {
    syncEvent();
    syncFairs();
    var list = active();
    i = (n + list.length) % list.length;
    slides().forEach(function (s) {
      var on = s === list[i];
      s.classList.toggle('on', on);
      s.setAttribute('aria-hidden', String(!on));
      Array.prototype.forEach.call(s.querySelectorAll('a,button'), function (el) { el.tabIndex = on ? 0 : -1; });
    });
    var cur = list[i];
    hero.setAttribute('data-slide', cur.classList.contains('pic') ? 'pic' : 'title');
    if (cur.getAttribute('data-tone')) hero.setAttribute('data-tone', cur.getAttribute('data-tone')); else hero.removeAttribute('data-tone');
    if (!dotsBox) return;
    if (dotsBox.querySelectorAll('.hs-dot').length !== list.length) renderDots(list.length);
    Array.prototype.forEach.call(dotsBox.querySelectorAll('.hs-dot'), function (d, k) { d.setAttribute('aria-selected', String(k === i)); });
    dotsBox.hidden = list.length < 2;
  }
  function schedule() {
    clearTimeout(timer);
    if (paused || held || reduce || active().length < 2) return;
    timer = setTimeout(function () { show(i + 1); schedule(); }, DELAY);
  }
  function go(n) { show(n); schedule(); }

  hero.addEventListener('click', function (e) {
    var d = e.target.closest('.hs-dot');
    if (d) { go(Number(d.getAttribute('data-i'))); return; }
    var p = e.target.closest('.hs-pause');
    if (p) {
      paused = !paused;
      p.setAttribute('aria-pressed', String(paused));
      p.setAttribute('aria-label', paused ? 'ادامهٔ نمایش خودکار' : 'توقف نمایش خودکار');
      p.classList.toggle('on', paused);
      schedule();
    }
  });
  hero.addEventListener('mouseenter', function () { held = true; clearTimeout(timer); });
  hero.addEventListener('mouseleave', function () { held = false; schedule(); });
  hero.addEventListener('focusin', function () { held = true; clearTimeout(timer); });
  hero.addEventListener('focusout', function () { held = false; schedule(); });
  hero.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { go(i + 1); e.preventDefault(); }       // in a right-to-left page "next" is to the left
    else if (e.key === 'ArrowRight') { go(i - 1); e.preventDefault(); }
  });
  var x0 = null;
  hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; held = true; clearTimeout(timer); }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - x0;
    held = false;
    if (x0 !== null && Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1); else schedule();
    x0 = null;
  }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearTimeout(timer); else schedule(); });

  var G = window.MSGate;
  if (G && !G.__hs) { var orig = G.apply; G.apply = function () { orig.apply(G, arguments); show(0); schedule(); }; G.__hs = true; }
  window.addEventListener('storage', function (e) { if (e.key === 'ms-role') { show(0); schedule(); } });
  // role-gate.js marks the page data-anon after this script has first run (it waits for DOMContentLoaded): start over when it does,
  // so a visitor with no account gets the one title slide with no dots instead of the four slides of a signed-in person
  if (window.MutationObserver) new MutationObserver(function () { show(0); schedule(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-anon'] });
  document.addEventListener('DOMContentLoaded', function () { show(0); schedule(); });
  show(0); schedule();
})();

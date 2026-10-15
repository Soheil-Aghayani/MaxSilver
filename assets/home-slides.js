// Home banner slideshow: the portal title first, then picture slides. It pauses on hover, focus and touch, has a
// pause button, dots, swipe and arrow keys, and does not autoplay for people who asked for less motion.
(function () {
  'use strict';
  var hero = document.querySelector('.hero.hs');
  if (!hero) return;
  var slides = Array.prototype.slice.call(hero.querySelectorAll('.hs-slide')), dotsBox = hero.querySelector('.hs-dots');
  var i = 0, timer = 0, paused = false, held = false;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DELAY = 6500;

  // people without an account only see the first slide; the others lead into sections they cannot open.
  // role-gate.js marks the page data-anon and hides slides the role may not open (data-manager-only)
  function active() {
    if (document.documentElement.hasAttribute('data-anon')) return slides.slice(0, 1);
    var l = slides.filter(function (s) { return !s.hidden && s.style.display !== 'none'; });
    return l.length ? l : slides.slice(0, 1);
  }
  function show(n) {
    var list = active();
    i = (n + list.length) % list.length;
    slides.forEach(function (s) {
      var on = s === list[i];
      s.classList.toggle('on', on);
      s.setAttribute('aria-hidden', String(!on));
      Array.prototype.forEach.call(s.querySelectorAll('a,button'), function (el) { el.tabIndex = on ? 0 : -1; });
    });
    hero.setAttribute('data-slide', list[i].classList.contains('pic') ? 'pic' : 'title');
    Array.prototype.forEach.call(hero.querySelectorAll('.hs-dot'), function (d, k) { d.setAttribute('aria-selected', String(k === i)); d.hidden = k >= list.length; });
    if (dotsBox) dotsBox.hidden = list.length < 2;
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
  show(0); schedule();
})();

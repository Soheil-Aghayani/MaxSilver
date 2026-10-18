// Appearance animation: a card fades and rises the first time it comes into view, the cards of one screen one after another, and the
// rows inside a card follow it. Works for cards the pages draw later too (a MutationObserver). A card that was already shown once
// (the same list drawn again after a filter or a live update) appears at once, so nothing replays while someone works.
// Off for people who asked for less motion, and a card never stays hidden: it is shown by a timer if the observer does not fire.
(function (w) {
  'use strict';
  if (w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in w) || !('MutationObserver' in w)) return;
  var CARDS = '.portal-card,.upd-card,.tl-item,.pn-card,.pn-user,.cu-card,.arc-card,article.pc,.pr-row,.pl-card,.pl-job,.pl-req,.ev-row,.ev-next,.fr-card,.fe-card,.fr-trip,.cr-card,.cm-card,.cm-box,.bk-card,.wh-row,.wh-cl,.wh-fl,.tk-card,.pn-rv';
  var INNER = '.fr-facts>div,.cm-card dl>div,.bk-card dl>div,.cr-meta>span,.wh-fi>li,.cr-step,.tk-steps>li,.tl-card>*,.pl-rl>li';
  var seen = {}, STEP = 55;
  function key(el) {
    var k = el.getAttribute('data-id') || el.getAttribute('data-code') || el.getAttribute('data-q') || el.getAttribute('data-fair') || '';
    if (!k) k = el.className + '|' + (el.textContent || '').replace(/\s+/g, ' ').slice(0, 70);
    return k;
  }
  var io = new IntersectionObserver(function (entries) {
    var n = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      show(en.target, Math.min(n++, 9) * STEP);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
  function show(el, delay) {
    el.style.setProperty('--rd', delay + 'ms');
    var kids = el.querySelectorAll(INNER), i;
    for (i = 0; i < kids.length && i < 10; i++) { kids[i].classList.add('rv-c'); kids[i].style.setProperty('--ci', i); }
    el.classList.add('rv-in');
    setTimeout(function () {
      el.classList.remove('rv', 'rv-in'); el.style.removeProperty('--rd');
      for (var j = 0; j < kids.length && j < 10; j++) { kids[j].classList.remove('rv-c'); kids[j].style.removeProperty('--ci'); }
    }, delay + 1100);
  }
  function add(el) {
    if (el.__rv || el.closest('[data-no-reveal]')) return;
    el.__rv = true;
    var k = key(el);
    if (seen[k]) return;
    seen[k] = 1;
    el.classList.add('rv');
    io.observe(el);
    // safety: a card that is on screen but whose observer never fired is shown; one further down waits for the scroll
    setTimeout(function () {
      if (!el.classList.contains('rv') || el.classList.contains('rv-in')) return;
      var r = el.getBoundingClientRect();
      if (r.width && r.top < w.innerHeight + 120 && r.bottom > -120) { io.unobserve(el); show(el, 0); }
    }, 3000);
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.matches && node.matches(CARDS)) add(node);
    var list = node.querySelectorAll ? node.querySelectorAll(CARDS) : [];
    for (var i = 0; i < list.length; i++) add(list[i]);
  }
  // handled right away (not on the next frame) so a new card is hidden before it is ever painted
  new MutationObserver(function (muts) {
    muts.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, scan); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) scan(document.body); else document.addEventListener('DOMContentLoaded', function () { scan(document.body); });
})(window);

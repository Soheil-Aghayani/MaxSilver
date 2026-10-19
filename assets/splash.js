// The opening animation of the installed app. The phone draws its own plain splash (yellow with the logo) from the manifest and that cannot be animated,
// so this overlay starts on the same yellow, with the same mark in the same place, and takes over: the mark bounces, rings travel outward, clay pictures of
// the products burst out and settle around it, the name rises letter by letter, and an iris opens onto the page.
// It plays once per session, only in the installed app (or on any page with ?splash=1), and a tap skips it.
(function (w, d) {
  'use strict';
  var force = /[?&]splash=1/.test(location.search);
  var standalone = (w.matchMedia && w.matchMedia('(display-mode: standalone)').matches) || w.navigator.standalone === true;
  var seen = false;
  try { seen = sessionStorage.getItem('ms-splash') === '1'; } catch (e) { /* ignore */ }
  if (!force && (!standalone || seen)) return;
  try { sessionStorage.setItem('ms-splash', '1'); } catch (e) { /* ignore */ }

  var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var iris = !!(w.CSS && CSS.supports && CSS.supports('mask-image', 'radial-gradient(#000,#000)') && CSS.registerProperty);
  if (iris) { try { CSS.registerProperty({ name: '--ms-r', syntax: '<length>', inherits: false, initialValue: '0px' }); } catch (e) { /* already registered */ } }

  var vw = Math.max(280, Math.min(w.innerWidth || 390, 900)), vh = Math.max(400, w.innerHeight || 800);
  var Rx = Math.min(150, vw * 0.36), Ry = Math.min(150, vh * 0.2), size = Math.round(Math.min(84, Rx * 0.56));
  var ART = ['cafe_category', 'pizza_category', 'icecream_category', 'espresso_machine', 'kebab_category', 'pizza_oven', 'bread_category', 'restaurant_category'];
  var items = ART.map(function (n, k) {
    var a = (-90 + k * 45) * Math.PI / 180, x = Math.round(Math.cos(a) * Rx), y = Math.round(Math.sin(a) * Ry);
    return '<span class="it" style="--x:' + x + 'px;--y:' + y + 'px;--k:' + k + ';--r:' + (k % 2 ? 7 : -7) + 'deg"><img src="./assets/art/' + n + '.webp" alt="" width="' + size + '" height="' + size + '" decoding="async"></span>';
  }).join('');
  var name = 'MAX SILVER'.split('').map(function (c, k) { return c === ' ' ? '<i class="sp"></i>' : '<b style="--k:' + k + '">' + c + '</b>'; }).join('');

  var css = '#msSplash{position:fixed;inset:0;z-index:2147483647;overflow:hidden;background:#ffcc2a;display:grid;place-items:center;font-family:Estedad,"Arial Black",Arial,sans-serif;-webkit-tap-highlight-color:transparent;touch-action:none}' +
    '#msSplash .stage{position:absolute;left:50%;top:47%;width:0;height:0}' +
    '#msSplash .mark{position:absolute;left:-48px;top:-48px;width:96px;height:96px;z-index:3;filter:drop-shadow(0 10px 18px rgba(7,27,54,.35));animation:sp-mark 1.3s cubic-bezier(.3,1.5,.5,1) both}' +
    '#msSplash .ring{position:absolute;left:-48px;top:-48px;width:96px;height:96px;border-radius:50%;border:3px solid rgba(7,27,54,.55);opacity:0;animation:sp-ring 1.25s ease-out both;animation-delay:calc(.1s + var(--n)*.28s)}' +
    '#msSplash .it{position:absolute;left:0;top:0;z-index:2;opacity:0;animation:sp-pop .95s cubic-bezier(.2,1.55,.4,1) both;animation-delay:calc(.3s + var(--k)*.07s)}' +
    '#msSplash .it img{display:block;width:' + size + 'px;height:' + size + 'px;margin:-' + Math.round(size / 2) + 'px 0 0 -' + Math.round(size / 2) + 'px;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(7,27,54,.3));animation:sp-bob 2.4s ease-in-out infinite alternate;animation-delay:calc(var(--k)*-.3s)}' +
    '#msSplash .word{position:absolute;left:0;top:' + (Ry + Math.round(size / 2) + 46) + 'px;transform:translateX(-50%);display:flex;white-space:nowrap;direction:ltr;font-weight:900;font-size:' + Math.round(Math.min(40, vw * 0.1)) + 'px;letter-spacing:.06em;color:#071b36}' +
    '#msSplash .word b{display:block;font-weight:inherit;opacity:0;animation:sp-rise .6s cubic-bezier(.2,1.3,.4,1) both;animation-delay:calc(1s + var(--k)*.055s)}' +
    '#msSplash .word .sp{width:.5em}' +
    '#msSplash .sub{position:absolute;left:0;top:' + (Ry + Math.round(size / 2) + 46 + Math.round(Math.min(40, vw * 0.1)) + 14) + 'px;transform:translateX(-50%);white-space:nowrap;color:#071b36;font-weight:700;font-size:14px;opacity:0;animation:sp-fade .6s ease both 1.65s}' +
    '#msSplash.go .stage{animation:sp-out .4s ease-in both}' +
    '#msSplash.iris{-webkit-mask-image:radial-gradient(circle at 50% 47%,transparent var(--ms-r),#000 calc(var(--ms-r) + 2px));mask-image:radial-gradient(circle at 50% 47%,transparent var(--ms-r),#000 calc(var(--ms-r) + 2px))}' +
    '#msSplash.iris.go{animation:sp-iris .75s cubic-bezier(.6,0,.9,.5) both}' +
    '#msSplash.fade.go{animation:sp-gone .5s ease both}' +
    '#msSplash.skip{transition:opacity .25s;opacity:0}' +
    '@keyframes sp-mark{0%{transform:scale(1)}22%{transform:scale(1.28) rotate(-6deg)}45%{transform:scale(.92) rotate(4deg)}70%{transform:scale(1.08) rotate(0)}100%{transform:scale(1)}}' +
    '@keyframes sp-ring{0%{opacity:.7;transform:scale(1)}100%{opacity:0;transform:scale(3.6)}}' +
    '@keyframes sp-pop{0%{opacity:0;transform:translate(0,0) scale(.1) rotate(0)}12%{opacity:1}100%{opacity:1;transform:translate(var(--x),var(--y)) scale(1) rotate(var(--r))}}' +
    '@keyframes sp-bob{from{transform:translateY(-5px)}to{transform:translateY(5px)}}' +
    '@keyframes sp-rise{from{opacity:0;transform:translateY(28px) scale(.7)}to{opacity:1;transform:none}}' +
    '@keyframes sp-fade{from{opacity:0}to{opacity:.85}}' +
    '@keyframes sp-out{to{opacity:0;transform:scale(1.18)}}' +
    '@keyframes sp-iris{from{--ms-r:0px}to{--ms-r:150vmax}}' +
    '@keyframes sp-gone{to{opacity:0}}' +
    '@media(prefers-reduced-motion:reduce){#msSplash .it,#msSplash .ring,#msSplash .mark,#msSplash .word b,#msSplash .sub,#msSplash .it img{animation:none;opacity:1}#msSplash .ring{display:none}}';

  var mark = '<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#4b5058"/><circle cx="50" cy="50" r="43" fill="none" stroke="#fff" stroke-width="1.6"/>' +
    '<path d="M31 70 L42.5 31 L50 54 L57.5 31 L69 70" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var el = d.createElement('div');
  el.id = 'msSplash'; el.className = iris ? 'iris' : 'fade'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<style>' + css + '</style><div class="stage"><i class="ring" style="--n:0"></i><i class="ring" style="--n:1"></i><i class="ring" style="--n:2"></i>' + items + mark +
    '<div class="word">' + name + '</div><div class="sub">درگاه مدیریتی مکث‌سیلور</div></div>';
  d.documentElement.appendChild(el);

  var done = false;
  function end() { if (done) return; done = true; el.remove(); }
  function leave() { if (done || el.classList.contains('go')) return; el.classList.add('go'); setTimeout(end, 850); }
  setTimeout(leave, reduce ? 900 : 2700);
  el.addEventListener('click', function () { if (done) return; el.classList.add('skip'); setTimeout(end, 260); });
  w.MSSplash = { leave: leave, el: el };
})(window, document);

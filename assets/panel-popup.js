// Sections of the user panel (chats, proformas, commission, team) open in a pop-up sheet over the page you are on; only the person icon opens the panel itself.
// Any link to panel.html#<section> is caught here. Inside the sheet the panel runs with ?embed=1 (no header, bottom bar or footer).
// Speed: for a signed-in person the sheet is built a few seconds after the page is ready, with the panel already loaded inside it (hidden), so a tap
// only slides it up and switches the section. Until the panel has drawn itself a skeleton shows instead of an empty sheet.
(function (w, d) {
  'use strict';
  var VER = ((d.currentScript && d.currentScript.src.match(/v=(\d+)/)) || [])[1] || '';
  var TITLES = { tickets: 'گفت‌وگوها', public: 'گفت‌وگوها', invoices: 'پیش‌فاکتورها', commission: 'پورسانت', team: 'تیم', notify: 'اعلان‌ها' };
  var onPanel = /\/panel\.html$/i.test(location.pathname);
  var embedded = /[?&]embed=1/.test(location.search);

  if (onPanel && embedded) {
    d.documentElement.classList.add('ms-embed');
    var st = d.createElement('style');
    st.textContent = '.ms-embed .ms-sitebar,.ms-embed .ms-site-footer,.ms-embed .pn-head,.ms-embed .pn-backbar,.ms-embed .pn-tabs,.ms-embed .ms-upd-bar,.ms-embed .ms-toast,.ms-embed .ms-toast-box,.ms-embed .ms-pill,.ms-embed .ms-install,.ms-embed [data-install-slot],#msSplash{display:none!important}' +
      '.ms-embed body{padding-bottom:16px!important;background:#f4f6f9}.ms-embed main{padding-top:12px!important}';
    d.head.appendChild(st);
    // tell the page behind when the panel has drawn something
    var told = false, tell = function () { if (told || !d.querySelector('.pn-card, .pn-apps, .pn-tickets, form')) return; told = true; try { parent.postMessage('ms-panel-ready', location.origin); } catch (e) { /* ignore */ } };
    var mo = new MutationObserver(tell); mo.observe(d.documentElement, { childList: true, subtree: true });
    d.addEventListener('DOMContentLoaded', tell);
    // a link that leaves the panel (a customer, a request) opens in the page behind the sheet
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented) return;
      var h = a.getAttribute('href') || '';
      if (h.charAt(0) === '#' || /^(tel|mailto|sms|javascript):/i.test(h) || a.hasAttribute('download')) return;
      a.target = '_top';
    }, true);
    return;
  }
  if (onPanel) return;

  var css = '.ms-pop{position:fixed;inset:0;z-index:2147483100;display:grid;align-items:end;justify-items:center;background:rgba(5,25,52,.46);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .3s ease,visibility 0s .4s}' +
    '.ms-pop.show{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .3s ease}' +
    '.ms-pop-sheet{position:relative;display:flex;flex-direction:column;width:min(980px,100%);height:calc(100% - 14px);border-radius:26px 26px 0 0;background:#f4f6f9;box-shadow:0 -20px 60px rgba(5,25,52,.35);overflow:hidden;transform:translateY(105%);transition:transform .34s cubic-bezier(.5,0,.9,.5)}' +
    '.ms-pop.show .ms-pop-sheet{transform:none;transition:transform .5s cubic-bezier(.2,1.1,.3,1)}' +
    '.ms-pop-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px 10px 10px;background:#fff;border-bottom:1px solid #d7dfeb;font:800 16px/1.4 Estedad,Tahoma,sans-serif;color:#071b36}' +
    '.ms-pop-head:before{content:"";position:absolute;top:6px;left:50%;width:44px;height:4px;margin-left:-22px;border-radius:4px;background:#d0d8e4}' +
    '.ms-pop-head h2{margin:6px 0 0;font:inherit}' +
    '.ms-pop-x{display:grid;place-items:center;width:40px;height:40px;margin-top:6px;border:0;border-radius:50%;background:#eef2f8;color:#071b36;font-size:20px;cursor:pointer;transition:transform .15s,background .15s}.ms-pop-x:active{transform:scale(.9)}' +
    '.ms-pop-body{position:relative;flex:1 1 auto;min-height:0}.ms-pop-body iframe{position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity .25s}.ms-pop-body iframe.on{opacity:1}' +
    '.ms-pop-load{position:absolute;inset:0;display:grid;align-content:start;gap:10px;padding:16px;transition:opacity .2s}.ms-pop-load.gone{opacity:0;pointer-events:none}' +
    '.ms-pop-load i{display:block;height:64px;border-radius:16px;background:linear-gradient(100deg,#e8edf5 30%,#f7f9fc 50%,#e8edf5 70%);background-size:300% 100%;animation:ms-pop-sk 1.2s ease-in-out infinite}.ms-pop-load i:first-child{height:44px;width:60%}' +
    '@media(min-width:900px){.ms-pop{align-items:center}.ms-pop-sheet{height:min(88vh,860px);border-radius:26px}}' +
    '@keyframes ms-pop-sk{to{background-position:-150% 0}}' +
    '@media(prefers-reduced-motion:reduce){.ms-pop,.ms-pop-sheet,.ms-pop.show .ms-pop-sheet{transition:none}.ms-pop-load i{animation:none}}' +
    'html.ms-pop-lock,html.ms-pop-lock body{overflow:hidden}';
  var pop = null, frame = null, titleEl = null, loadEl = null, ready = false, shown = false, pushed = false, cur = '';

  function build() {
    if (pop) return;
    if (!d.getElementById('msPopCss')) { var s = d.createElement('style'); s.id = 'msPopCss'; s.textContent = css; d.head.appendChild(s); }
    pop = d.createElement('div');
    pop.className = 'ms-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-hidden', 'true');
    pop.innerHTML = '<div class="ms-pop-sheet"><div class="ms-pop-head"><h2></h2><button type="button" class="ms-pop-x" aria-label="بستن">✕</button></div>' +
      '<div class="ms-pop-body"><div class="ms-pop-load"><i></i><i></i><i></i><i></i></div><iframe title="پنل" tabindex="-1"></iframe></div></div>';
    titleEl = pop.querySelector('h2'); loadEl = pop.querySelector('.ms-pop-load'); frame = pop.querySelector('iframe');
    pop.addEventListener('click', function (e) { if (e.target === pop || e.target.closest('.ms-pop-x')) close(); });
    d.body.appendChild(pop);
    frame.src = './panel.html?embed=1' + (VER ? '&v=' + VER : '') + (cur ? '#' + cur : '');
  }
  w.addEventListener('message', function (e) {
    if (e.origin !== location.origin || e.data !== 'ms-panel-ready' || !frame || e.source !== frame.contentWindow) return;
    ready = true; frame.classList.add('on'); if (loadEl) loadEl.classList.add('gone');
  });
  function goTo(hash) {
    // the panel inside is already loaded: switch its section by changing the hash
    try {
      var loc = frame.contentWindow.location;
      if (loc.hash === '#' + hash) loc.hash = '#_';
      loc.hash = '#' + hash;
    } catch (e) { frame.src = './panel.html?embed=1' + (VER ? '&v=' + VER : '') + '#' + hash; ready = false; frame.classList.remove('on'); if (loadEl) loadEl.classList.remove('gone'); }
  }
  function open(hash) {
    if (shown) return;
    var first = !pop; cur = hash; build();
    titleEl.textContent = TITLES[hash] || 'پنل'; pop.setAttribute('aria-label', titleEl.textContent); frame.title = titleEl.textContent;
    if (!first && ready) goTo(hash);
    else if (!first) { try { var l = frame.contentWindow.location; if (l.hash !== '#' + hash) l.hash = '#' + hash; } catch (e) { /* ignore */ } }
    shown = true; pop.setAttribute('aria-hidden', 'false'); frame.tabIndex = 0;
    void pop.offsetWidth;   // lay the hidden sheet out first, so it slides in instead of appearing
    pop.classList.add('show');
    d.documentElement.classList.add('ms-pop-lock');
    try { history.pushState({ msPop: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
  }
  function close(fromPop) {
    if (!pop || !shown) return;
    shown = false; pop.classList.remove('show'); pop.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
    d.documentElement.classList.remove('ms-pop-lock');
    if (pushed && !fromPop) { pushed = false; try { history.back(); } catch (e) { /* ignore */ } }
    pushed = false;
  }
  w.addEventListener('popstate', function () { if (shown) { pushed = false; close(true); } });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && shown) close(); });
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href*="panel.html#"]');
    if (!a) return;
    var m = (a.getAttribute('href') || '').match(/panel\.html#(\w+)/);
    if (!m || !TITLES[m[1]]) return;
    e.preventDefault(); e.stopPropagation();
    open(m[1]);
  }, true);

  // a signed-in person gets the sheet ready in the background
  var signed = false; try { signed = !!localStorage.getItem('ms-role'); } catch (e) { /* ignore */ }
  var saver = w.navigator.connection && w.navigator.connection.saveData;
  var noWarm = false; try { noWarm = !!localStorage.getItem('ms-nowarm'); } catch (e) { /* ignore */ }   // a test switch: no background build
  if (signed && !saver && !noWarm) {
    var warm = function () { if (!pop && d.visibilityState === 'visible') build(); };
    var arm = function () { setTimeout(function () { if (w.requestIdleCallback) w.requestIdleCallback(warm, { timeout: 4000 }); else warm(); }, 3500); };
    if (d.readyState === 'complete') arm(); else w.addEventListener('load', arm);
  }
  w.MSPanelPopup = { open: open, close: close };
})(window, document);

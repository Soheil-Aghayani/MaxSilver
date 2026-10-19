// Sections of the user panel (chats, proformas, commission, team) open in a pop-up sheet over the page you are on; only the person icon opens the panel itself.
// Any link to panel.html#<section> is caught here. Inside the sheet the panel runs with ?embed=1 (no header, bottom bar or footer).
(function (w, d) {
  'use strict';
  var VER = ((d.currentScript && d.currentScript.src.match(/v=(\d+)/)) || [])[1] || '';
  var TITLES = { tickets: 'گفت‌وگوها', public: 'گفت‌وگوها', invoices: 'پیش‌فاکتورها', commission: 'پورسانت', team: 'تیم', notify: 'اعلان‌ها' };
  var onPanel = /\/panel\.html$/i.test(location.pathname);
  var embedded = /[?&]embed=1/.test(location.search);

  if (onPanel && embedded) {
    d.documentElement.classList.add('ms-embed');
    var st = d.createElement('style');
    st.textContent = '.ms-embed .ms-sitebar,.ms-embed .ms-site-footer,.ms-embed .pn-head,.ms-embed .pn-backbar,.ms-embed .pn-tabs,.ms-embed .ms-upd-bar,.ms-embed .ms-toast,.ms-embed .ms-toast-box,.ms-embed .ms-pill,.ms-embed .ms-install,.ms-embed [data-install-slot]{display:none!important}' +
      '.ms-embed body{padding-bottom:16px!important;background:#f4f6f9}.ms-embed main{padding-top:12px!important}';
    d.head.appendChild(st);
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

  var css = '.ms-pop{position:fixed;inset:0;z-index:2147483100;display:grid;align-items:end;justify-items:center;background:rgba(5,25,52,.46);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);animation:ms-pop-bg .3s ease both}' +
    '.ms-pop.out{animation:ms-pop-bg-out .32s ease forwards}' +
    '.ms-pop-sheet{position:relative;display:flex;flex-direction:column;width:min(980px,100%);height:calc(100% - 14px);border-radius:26px 26px 0 0;background:#f4f6f9;box-shadow:0 -20px 60px rgba(5,25,52,.35);overflow:hidden;animation:ms-pop-up .5s cubic-bezier(.2,1.1,.3,1) both}' +
    '.ms-pop.out .ms-pop-sheet{animation:ms-pop-down .32s cubic-bezier(.5,0,.9,.5) forwards}' +
    '.ms-pop-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px 10px 10px;background:#fff;border-bottom:1px solid #d7dfeb;font:800 16px/1.4 Estedad,Tahoma,sans-serif;color:#071b36}' +
    '.ms-pop-head:before{content:"";position:absolute;top:6px;left:50%;width:44px;height:4px;margin-left:-22px;border-radius:4px;background:#d0d8e4}' +
    '.ms-pop-head h2{margin:6px 0 0;font:inherit}' +
    '.ms-pop-x{display:grid;place-items:center;width:40px;height:40px;margin-top:6px;border:0;border-radius:50%;background:#eef2f8;color:#071b36;font-size:20px;cursor:pointer;transition:transform .15s,background .15s}.ms-pop-x:active{transform:scale(.9)}' +
    '.ms-pop-body{position:relative;flex:1 1 auto;min-height:0}.ms-pop-body iframe{position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;transition:opacity .3s}.ms-pop-body iframe.on{opacity:1}' +
    '.ms-pop-load{position:absolute;inset:0;display:grid;place-items:center}.ms-pop-load i{width:34px;height:34px;border:3px solid #d7dfeb;border-top-color:#ffcc2a;border-radius:50%;animation:ms-pop-spin .8s linear infinite}' +
    '@media(min-width:900px){.ms-pop{align-items:center}.ms-pop-sheet{height:min(88vh,860px);border-radius:26px}}' +
    '@keyframes ms-pop-bg{from{opacity:0}to{opacity:1}}@keyframes ms-pop-bg-out{to{opacity:0}}' +
    '@keyframes ms-pop-up{from{transform:translateY(100%)}to{transform:none}}@keyframes ms-pop-down{to{transform:translateY(100%)}}@keyframes ms-pop-spin{to{transform:rotate(360deg)}}' +
    '@media(prefers-reduced-motion:reduce){.ms-pop,.ms-pop-sheet,.ms-pop.out,.ms-pop.out .ms-pop-sheet{animation:none}}' +
    'html.ms-pop-lock,html.ms-pop-lock body{overflow:hidden}';
  var pop = null, pushed = false;

  function close(fromPop) {
    if (!pop) return;
    var p = pop; pop = null;
    p.classList.add('out');
    d.documentElement.classList.remove('ms-pop-lock');
    setTimeout(function () { p.remove(); }, 340);
    if (pushed && !fromPop) { pushed = false; try { history.back(); } catch (e) { /* ignore */ } }
    pushed = false;
  }
  function open(hash) {
    if (pop) return;
    if (!d.getElementById('msPopCss')) { var s = d.createElement('style'); s.id = 'msPopCss'; s.textContent = css; d.head.appendChild(s); }
    pop = d.createElement('div');
    pop.className = 'ms-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-label', TITLES[hash] || 'پنل');
    pop.innerHTML = '<div class="ms-pop-sheet"><div class="ms-pop-head"><h2>' + (TITLES[hash] || 'پنل') + '</h2><button type="button" class="ms-pop-x" aria-label="بستن">✕</button></div>' +
      '<div class="ms-pop-body"><div class="ms-pop-load"><i></i></div><iframe title="' + (TITLES[hash] || 'پنل') + '" src="./panel.html?embed=1' + (VER ? '&v=' + VER : '') + '#' + hash + '"></iframe></div></div>';
    var f = pop.querySelector('iframe'), ld = pop.querySelector('.ms-pop-load');
    f.addEventListener('load', function () { f.classList.add('on'); if (ld) ld.remove(); });
    pop.addEventListener('click', function (e) { if (e.target === pop || e.target.closest('.ms-pop-x')) close(); });
    d.body.appendChild(pop);
    d.documentElement.classList.add('ms-pop-lock');
    try { history.pushState({ msPop: 1 }, ''); pushed = true; } catch (e) { pushed = false; }
  }
  w.addEventListener('popstate', function () { if (pop) { pushed = false; close(true); } });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop) close(); });
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href*="panel.html#"]');
    if (!a) return;
    var m = (a.getAttribute('href') || '').match(/panel\.html#(\w+)/);
    if (!m || !TITLES[m[1]]) return;
    e.preventDefault(); e.stopPropagation();
    open(m[1]);
  }, true);
  w.MSPanelPopup = { open: open, close: close };
})(window, document);

(function () {
  'use strict';
  var button = document.getElementById('msShare');
  if (!button) return;
  var dialog = null, qrBox, status, preview, copyBtn, downloadBtn, qrReady = null, currentUrl = null, currentCode = null;
  var ICON = {
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4m0 0-4 4m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>'
  };

  // Only a public HTTPS address is worth encoding; a local copy cannot be opened from another phone.
  function shareUrl() {
    try {
      var url = new URL(window.location.href);
      if (url.protocol !== 'https:' || /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])$/i.test(url.hostname) || url.hostname.slice(-6) === '.local') return null;
      url.username = ''; url.password = ''; url.search = ''; url.hash = '';
      return url.href;
    } catch (error) { return null; }
  }
  function pageName() {
    var h1 = document.querySelector('h1');
    return (h1 && h1.textContent.trim()) || document.title.split('|')[0].trim();
  }
  function loadQrLibrary() {
    if (typeof window.qrcode === 'function') return Promise.resolve();
    if (qrReady) return qrReady;
    qrReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = './assets/vendor/qrcode-generator-1.4.4.js';
      s.onload = resolve;
      s.onerror = function () { qrReady = null; reject(new Error('qr')); };
      document.head.appendChild(s);
    });
    return qrReady;
  }

  // Quality 'Q' keeps the code readable when printed or shown on a dim screen; quiet zone = 4 modules.
  var QUIET = 4;
  function makeCode(url) {
    var code = window.qrcode(0, 'Q');
    code.addData(url, 'Byte');
    code.make();
    return code;
  }
  // Vector output: every dark run is a rectangle on the integer grid, so it stays crisp at any size.
  function svgMarkup(code) {
    var n = code.getModuleCount(), size = n + QUIET * 2, d = '';
    for (var r = 0; r < n; r++) {
      var c = 0;
      while (c < n) {
        if (!code.isDark(r, c)) { c++; continue; }
        var start = c;
        while (c < n && code.isDark(r, c)) c++;
        d += 'M' + (start + QUIET) + ' ' + (r + QUIET) + 'h' + (c - start) + 'v1h-' + (c - start) + 'z';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges" class="ms-share-qr" role="img" aria-label="کد QR این صفحه">' +
      '<rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#051934"/></svg>';
  }
  function drawCanvas(target, code, px) {
    var n = code.getModuleCount(), size = (n + QUIET * 2) * px, ctx = target.getContext('2d');
    target.width = size; target.height = size;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#051934';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (code.isDark(r, c)) ctx.fillRect((c + QUIET) * px, (r + QUIET) * px, px, px);
  }
  function setStatus(text, state) { status.textContent = text; status.dataset.state = state || 'ready'; }

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'ms-share-dialog';
    dialog.setAttribute('aria-labelledby', 'msShareTitle');
    dialog.innerHTML =
      '<div class="ms-share-inner">' +
        '<div class="ms-share-head"><h2 id="msShareTitle"></h2><button type="button" class="ms-share-close" data-close aria-label="بستن">' + ICON.close + '</button></div>' +
        '<div class="ms-share-frame"><div class="ms-share-holder"></div></div>' +
        '<p class="ms-share-status" role="status" aria-live="polite"></p>' +
        '<a class="ms-share-link" dir="ltr" target="_blank" rel="noopener" aria-label="نشانی این صفحه" hidden></a>' +
        '<div class="ms-share-actions"><button type="button" class="ms-share-action" data-copy disabled></button>' +
        '<button type="button" class="ms-share-action secondary" data-download disabled>' + ICON.down + '<span>PNG</span></button></div>' +
      '</div>';
    document.body.appendChild(dialog);
    qrBox = dialog.querySelector('.ms-share-holder');
    status = dialog.querySelector('.ms-share-status');
    preview = dialog.querySelector('.ms-share-link');
    copyBtn = dialog.querySelector('[data-copy]');
    downloadBtn = dialog.querySelector('[data-download]');
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
    });
    copyBtn.addEventListener('click', async function () {
      if (!currentUrl) return;
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url: currentUrl }); return; }
        catch (error) { if (error && error.name === 'AbortError') return; }
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(currentUrl);
        else {
          var field = document.createElement('textarea');
          field.value = currentUrl; field.setAttribute('readonly', ''); field.style.cssText = 'position:fixed;opacity:0';
          document.body.appendChild(field); field.select();
          var ok = document.execCommand('copy'); field.remove();
          if (!ok) throw new Error('copy');
        }
        setStatus('پیوند کپی شد.', 'ready');
      } catch (error) { setStatus('کپی خودکار ممکن نشد؛ نشانی را دستی بردارید.', 'error'); }
    });
    downloadBtn.addEventListener('click', function () {
      if (!currentCode) return;
      var canvas = document.createElement('canvas');
      drawCanvas(canvas, currentCode, 16);
      canvas.toBlob(function (blob) {
        if (!blob) return setStatus('ساخت PNG ناموفق بود.', 'error');
        var a = document.createElement('a'), href = URL.createObjectURL(blob);
        a.href = href; a.download = 'MaxSilver-' + ((location.pathname.split('/').pop() || 'index').replace(/\.html$/, '')) + '-QR.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(href); }, 1000);
      }, 'image/png');
    });
  }

  async function open() {
    if (!dialog) build();
    dialog.querySelector('#msShareTitle').textContent = pageName();
    currentUrl = shareUrl(); currentCode = null;
    qrBox.innerHTML = ''; preview.hidden = true; downloadBtn.disabled = true; copyBtn.disabled = !currentUrl;
    copyBtn.innerHTML = (navigator.share ? ICON.send : ICON.copy) + '<span>' + (navigator.share ? 'ارسال' : 'کپی') + '</span>';
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    if (!currentUrl) return setStatus('QR فقط روی نشانی HTTPS عمومی ساخته می‌شود.', 'error');
    setStatus('', 'ready');
    try {
      await loadQrLibrary();
      currentCode = makeCode(currentUrl);
      qrBox.innerHTML = svgMarkup(currentCode);
      preview.href = currentUrl; preview.textContent = currentUrl; preview.hidden = false;
      downloadBtn.disabled = false;
    } catch (error) {
      setStatus('ساخت QR ناموفق بود.', 'error');
      copyBtn.disabled = true;
    }
  }
  button.addEventListener('click', open);
  window.MaxSilverShare = { shareUrl: shareUrl, make: function (url) { var c = makeCode(url); return { svg: svgMarkup(c), draw: function (canvas, px) { drawCanvas(canvas, c, px || 12); }, modules: c.getModuleCount() }; } };
})();
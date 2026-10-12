(function () {
  'use strict';
  var button = document.getElementById('msShare');
  if (!button) return;
  var dialog = null, canvas, status, preview, action, download, qrReady = null, currentUrl = null;

  // Only a public HTTPS address is worth encoding; localhost / file copies cannot be opened by another phone.
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
  function drawQr(target, url) {
    var code = window.qrcode(0, 'M');
    code.addData(url, 'Byte');
    code.make();
    var modules = code.getModuleCount(), quiet = 4, size12 = 12, size = (modules + quiet * 2) * size12;
    var ctx = target.getContext('2d');
    target.width = size; target.height = size;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#051934';
    for (var r = 0; r < modules; r++) for (var c = 0; c < modules; c++) {
      if (code.isDark(r, c)) ctx.fillRect((c + quiet) * size12, (r + quiet) * size12, size12, size12);
    }
  }
  function setStatus(text, state) { status.textContent = text; status.dataset.state = state || 'ready'; }

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'ms-share-dialog';
    dialog.setAttribute('aria-labelledby', 'msShareTitle');
    dialog.innerHTML =
      '<div class="ms-share-inner">' +
        '<div class="ms-share-head"><div><h2 id="msShareTitle">اشتراک‌گذاری این صفحه</h2><p id="msShareName"></p></div>' +
        '<button type="button" class="ms-share-close" data-close>بستن</button></div>' +
        '<div class="ms-share-frame"><div class="ms-share-brand" dir="ltr"><span class="ms-share-mark" aria-hidden="true"></span><strong>MAX SILVER</strong></div>' +
        '<canvas class="ms-share-canvas" width="600" height="600" hidden role="img" aria-label="کد QR پیوند این صفحه"></canvas></div>' +
        '<p class="ms-share-status" role="status" aria-live="polite">در حال آماده‌سازی پیوند…</p>' +
        '<a class="ms-share-link" dir="ltr" target="_blank" rel="noopener" aria-label="نشانی این صفحه" hidden></a>' +
        '<div class="ms-share-actions"><button type="button" class="ms-share-action" data-copy disabled>کپی پیوند</button>' +
        '<button type="button" class="ms-share-action secondary" data-download disabled>دانلود QR</button></div>' +
        '<p class="ms-share-note">QR فقط نشانی صفحه را منتقل می‌کند؛ دسترسی را تنظیمات میزبانی تعیین می‌کند.</p>' +
      '</div>';
    document.body.appendChild(dialog);
    canvas = dialog.querySelector('canvas');
    status = dialog.querySelector('.ms-share-status');
    preview = dialog.querySelector('.ms-share-link');
    action = dialog.querySelector('[data-copy]');
    download = dialog.querySelector('[data-download]');
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog || event.target.hasAttribute('data-close')) dialog.close();
    });
    action.addEventListener('click', async function () {
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
        setStatus('پیوند کپی شد؛ آن را برای مخاطب بفرستید.', 'ready');
      } catch (error) { setStatus('کپی خودکار ممکن نشد؛ نشانی نمایش‌داده‌شده را دستی بردارید.', 'error'); }
    });
    download.addEventListener('click', function () {
      if (canvas.hidden) return;
      canvas.toBlob(function (blob) {
        if (!blob) return setStatus('ساخت فایل PNG ناموفق بود.', 'error');
        var a = document.createElement('a'), href = URL.createObjectURL(blob);
        a.href = href; a.download = 'MaxSilver-' + ((location.pathname.split('/').pop() || 'index').replace(/\.html$/, '')) + '-QR.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(href); }, 1000);
      }, 'image/png');
    });
  }

  async function open() {
    if (!dialog) build();
    dialog.querySelector('#msShareName').textContent = pageName();
    currentUrl = shareUrl();
    canvas.hidden = true; preview.hidden = true; download.disabled = true;
    action.disabled = !currentUrl;
    action.textContent = navigator.share ? 'ارسال پیوند' : 'کپی پیوند';
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
    if (!currentUrl) return setStatus('QR فقط روی نشانی HTTPS عمومی ساخته می‌شود؛ این نسخهٔ محلی قابل اشتراک نیست.', 'error');
    setStatus('در حال ساخت کد QR…', 'ready');
    try {
      await loadQrLibrary();
      drawQr(canvas, currentUrl);
      canvas.hidden = false;
      preview.href = currentUrl; preview.textContent = currentUrl; preview.hidden = false;
      download.disabled = false;
      setStatus('کد QR آمادهٔ اسکن است.', 'ready');
    } catch (error) {
      setStatus('ساخت کد QR ناموفق بود.', 'error');
      action.disabled = true;
    }
  }
  button.addEventListener('click', open);
  window.MaxSilverShare = { shareUrl: shareUrl, drawQr: drawQr };
})();
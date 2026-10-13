(function () {
  'use strict';
  // Reachability probe: a no-cors request resolves when the host answers at all and rejects/times out when it is blocked.
  var TARGETS = [
    ['این سایت (GitHub Pages)', './assets/maxsilver-dashboard-icon.svg'],
    ['Firebase Auth (ورود)', 'https://identitytoolkit.googleapis.com/'],
    ['Firebase Firestore (داده)', 'https://firestore.googleapis.com/'],
    ['Google Static (کتابخانه‌ها)', 'https://www.gstatic.com/generate_204'],
    ['Supabase', 'https://supabase.com/'],
    ['Cloudflare Workers', 'https://workers.dev/'],
    ['Cloudflare Pages', 'https://pages.dev/'],
    ['Appwrite Cloud', 'https://cloud.appwrite.io/'],
    ['Netlify', 'https://www.netlify.com/'],
    ['Vercel', 'https://vercel.com/'],
    ['Render', 'https://render.com/'],
    ['Deno Deploy', 'https://deno.com/'],
    ['GitHub API', 'https://api.github.com/'],
    ['Telegram', 'https://api.telegram.org/'],
    ['Bale', 'https://tapi.bale.ai/']
  ];
  var list = document.getElementById('ntList'), run = document.getElementById('ntRun'), copy = document.getElementById('ntCopy');
  var results = [];

  function probe(url) {
    var started = performance.now(), ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 8000);
    return fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal }).then(function () {
      clearTimeout(timer); return { ok: true, ms: Math.round(performance.now() - started) };
    }, function () {
      clearTimeout(timer); return { ok: false, ms: Math.round(performance.now() - started) };
    });
  }
  function row(name, state) {
    var cls = state === 'ok' ? 'color:var(--ms-green)' : state === 'bad' ? 'color:var(--ms-red)' : 'color:var(--ms-muted)';
    return '<li><div><b>' + name + '</b></div><div style="' + cls + ';font-weight:800">' + (state === 'ok' ? 'باز است' : state === 'bad' ? 'بسته یا کند' : 'در حال آزمایش…') + '</div></li>';
  }
  run.addEventListener('click', function () {
    run.disabled = true; results = [];
    list.innerHTML = TARGETS.map(function (t) { return row(t[0], 'wait'); }).join('');
    var done = 0;
    TARGETS.forEach(function (t, i) {
      probe(t[1]).then(function (r) {
        results[i] = t[0] + ': ' + (r.ok ? 'OK ' + r.ms + 'ms' : 'BLOCKED/TIMEOUT');
        list.children[i].outerHTML = row(t[0], r.ok ? 'ok' : 'bad').replace('</li>', '<span style="color:var(--ms-muted);font-size:12px">' + r.ms + ' ms</span></li>');
        if (++done === TARGETS.length) { run.disabled = false; run.textContent = 'اجرای دوباره'; copy.hidden = false; }
      });
    });
  });
  copy.addEventListener('click', function () {
    var text = 'نتیجهٔ آزمایش اتصال (' + new Date().toISOString() + ')\n' + results.join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { copy.textContent = 'کپی شد'; });
  });
})();

// The Bale mini-app: the person's notices (by category), the work they can do from the phone (orders, outside messages, conversations),
// the switches for each notice category, and the extension list.
// It signs in with the data Bale hands to the page (Bale.WebApp.initData); the server checks the signature and gives back a limited token
// (12 hours). The token lives in this page's memory, never on disk. Every action goes through the same role checks as the portal.
(function () {
  'use strict';
  var root = document.getElementById('ma');
  var W = window.Bale && window.Bale.WebApp;
  var BASE = (window.MS_API_BASE || 'https://api.agseyl.ir') + '/api/v1';
  var PORTAL = 'https://portal.agseyl.ir';
  var S = { token: '', name: '', role: '', tab: 'notices', cat: '', items: [], unread: 0, cats: [], dir: [], dirLoaded: false, msg: '', err: '',
    work: 'orders', orders: null, msgs: null, chats: null, thread: null, armed: '', busy: false };
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  var fa = function (s) { return String(s).replace(/\d/g, function (d) { return FA.charAt(d); }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var STAGE = { request: 'درخواست', confirmed: 'تأیید کارشناس', preinvoice: 'پیش‌فاکتور صادر شد', rejected: 'رد اکانت منیجر', accepted: 'تأیید اکانت منیجر', warehouse: 'انبار', production: 'تولید', ready: 'آمادهٔ ارسال', shipped: 'ارسال شد', delivered: 'تحویل شد', returned: 'مرجوع شد', cancelled: 'لغو' };
  var TO = { sales: 'فروش', service: 'خدمات پس از فروش', management: 'مدیریت' };
  // which notice category opens which work section
  var CAT_WORK = { order_new: 'orders', order_stage: 'orders', route_needed: 'orders', to_warehouse: 'orders', to_production: 'orders', proforma: 'chats', public_message: 'msgs', chat: 'chats' };

  function theme() {
    if (!W || !W.themeParams) return;
    var t = W.themeParams, st = document.documentElement.style;
    // only the page and text follow Bale's theme; the accent stays the Max Silver yellow so the look is the same everywhere
    if (t.bg_color) { st.setProperty('--bg', t.bg_color); }
    if (t.text_color) { st.setProperty('--text', t.text_color); }
    if (t.secondary_bg_color) { st.setProperty('--card', t.secondary_bg_color); }
    if (t.hint_color) { st.setProperty('--sub', t.hint_color); }
  }

  function api(method, path, body) {
    var h = { 'Accept': 'application/json' };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (S.token) h['Authorization'] = 'Bearer ' + S.token;
    return fetch(BASE + path, { method: method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.message || 'خطا'); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  function when(ms) { try { return new Intl.DateTimeFormat('fa-IR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms)); } catch (e) { return ''; } }

  function view() {
    if (S.err && !S.token) { root.innerHTML = '<p class="ma-err">' + esc(S.err) + '</p>'; return; }
    if (!S.token) { root.innerHTML = '<p class="ma-note">در حال ورود…</p>'; return; }
    // a typed reply must survive a repaint
    var ta = root.querySelector('#maReply'), keep = ta ? { v: ta.value, f: document.activeElement === ta } : null;
    var oldBox = root.querySelector('.ma-thread'), pos = oldBox ? { top: oldBox.scrollTop, atEnd: oldBox.scrollHeight - oldBox.scrollTop - oldBox.clientHeight < 80 } : null;
    var body = S.tab === 'notices' ? noticesView() : S.tab === 'work' ? workView() : S.tab === 'settings' ? settingsView() : dirView();
    root.innerHTML = '<header class="ma-head"><div><h1>' + esc(S.name) + '</h1><small>مکث‌سیلور</small></div>' + (S.tab === 'notices' && S.unread ? '<button type="button" class="ma-btn" data-readall>همه را خوانده کن</button>' : '') + '</header>' +
      body + (S.msg ? '<p class="ma-ok" role="status">' + esc(S.msg) + '</p>' : '') +
      '<nav class="ma-tabs" role="tablist" aria-label="بخش‌ها">' +
      tab('notices', 'اعلان‌ها', S.unread ? '<span class="ma-badge">' + fa(S.unread) + '</span>' : '') + tab('work', 'کارها') + tab('settings', 'تنظیم') + tab('dir', 'داخلی‌ها') + '</nav>';
    var nt = root.querySelector('#maReply');
    if (nt && keep) { nt.value = keep.v; if (keep.f) { nt.focus(); } }
    // a conversation opens at its newest message; while it refreshes, whoever scrolled up to read keeps their place
    var box = root.querySelector('.ma-thread'); if (box) { if (!pos || pos.atEnd) box.scrollTop = box.scrollHeight; else box.scrollTop = pos.top; }
  }
  function tab(k, label, extra) { return '<button type="button" role="tab" class="ma-tab" data-tab="' + k + '" aria-selected="' + (S.tab === k) + '">' + label + (extra || '') + '</button>'; }

  function noticesView() {
    var chips = '<div class="ma-chips" role="group" aria-label="دسته‌ها"><button type="button" class="ma-chip" data-cat="" aria-pressed="' + (S.cat === '') + '">همه</button>' +
      S.cats.map(function (c) { return '<button type="button" class="ma-chip" data-cat="' + esc(c.key) + '" aria-pressed="' + (S.cat === c.key) + '">' + esc(c.label) + '</button>'; }).join('') + '</div>';
    var list = S.items.filter(function (i) { return !S.cat || i.cat === S.cat; });
    return chips + (list.length ? '<ul class="ma-list">' + list.map(function (i) {
      return '<li class="ma-item' + (i.read ? '' : ' unread') + '" data-id="' + esc(i.id) + '" data-cat-of="' + esc(i.cat) + '" data-path="' + esc(i.path) + '"><span class="cat">' + esc(i.label) + '</span><b>' + esc(i.title) + '</b>' + (i.text ? '<span class="tx">' + esc(i.text) + '</span>' : '') + '<time>' + esc(when(i.at)) + '</time></li>';
    }).join('') + '</ul>' : '<p class="ma-note">اعلانی نیست.</p>');
  }
  function settingsView() {
    return '<div class="ma-card"><p class="ma-note" style="margin:0 0 6px">کدام اعلان‌ها برای شما بیاید؟ فقط دسته‌هایی نشان داده می‌شود که نقش شما اجازهٔ دیدنشان را دارد.</p>' +
      S.cats.map(function (c) { return '<div class="ma-switch"><span>' + esc(c.label) + '</span><button type="button" role="switch" aria-checked="' + c.on + '" aria-label="' + esc(c.label) + '" data-switch="' + esc(c.key) + '"></button></div>'; }).join('') + '</div>';
  }
  function dirView() {
    if (!S.dirLoaded) return '<p class="ma-note">در حال بارگذاری…</p>';
    return S.dir.length ? '<ul class="ma-dir" style="padding:0;margin:0">' + S.dir.map(function (d) {
      return '<li><div><h2>' + esc(d.label) + '</h2>' + (d.person ? '<p>' + esc(d.person) + '</p>' : '') + '</div><div>' + d.exts.map(function (x) { return '<button type="button" class="ma-ext" data-copy="' + esc(x) + '">' + esc(fa(x)) + '</button>'; }).join('') + '</div></li>';
    }).join('') + '</ul>' : '<p class="ma-note">فهرست داخلی‌ها خالی است.</p>';
  }

  // ---------- the work: orders, outside messages, conversations (a section is shown only when the role has it)
  function sections() {
    var out = [];
    if (S.orders) out.push(['orders', 'سفارش‌ها']);
    if (S.msgs) out.push(['msgs', 'پیام‌های بیرونی']);
    if (S.chats) out.push(['chats', 'گفت‌وگوها']);
    return out;
  }
  function workView() {
    if (S.orders === null && S.msgs === null && S.chats === null) return '<p class="ma-note">در حال بارگذاری…</p>';
    var secs = sections();
    if (!secs.length) return '<p class="ma-note">برای نقش شما کاری در این بخش نیست.</p>';
    if (S.work === 'chats' && S.thread) return threadView();
    if (!secs.some(function (s) { return s[0] === S.work; })) S.work = secs[0][0];
    var chips = '<div class="ma-chips" role="group" aria-label="بخش‌های کار">' + secs.map(function (s) { return '<button type="button" class="ma-chip" data-work="' + s[0] + '" aria-pressed="' + (S.work === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>';
    return chips + (S.work === 'orders' ? ordersView() : S.work === 'msgs' ? msgsView() : chatsView());
  }
  function ordersView() {
    var l = S.orders || [];
    if (!l.length) return '<p class="ma-note">سفارش بازی نیست.</p>';
    return '<ul class="ma-list">' + l.map(function (o) {
      var lines = o.lines.map(function (x) { return '<li>' + esc(x.name) + (x.brand ? ' <small>(' + esc(x.brand) + ')</small>' : '') + ' × ' + esc(fa(x.qty)) + '</li>'; }).join('');
      var acts = o.actions.map(function (k) {
        var key = o.code + '|' + k, armed = S.armed === key;
        return '<button type="button" class="ma-act' + (armed ? ' armed' : '') + (k === 'cancelled' ? ' bad' : '') + '" data-stage="' + esc(k) + '" data-code="' + esc(o.code) + '"' + (S.busy ? ' disabled' : '') + '>' + (armed ? 'مطمئن‌اید؟ دوباره بزنید: ' : '') + esc(STAGE[k] || k) + '</button>';
      }).join('');
      return '<li class="ma-order"><div class="ma-row"><b dir="ltr">' + esc(o.code) + '</b><span class="ma-pill">' + esc(o.stageLabel) + '</span></div>' + (o.assignee ? '<span class="tx">کارشناس: ' + esc(o.assignee) + '</span>' : '') +
        '<ul class="ma-lines">' + lines + '</ul>' + (acts ? '<div class="ma-acts" role="group" aria-label="تغییر مرحله">' + acts + '</div>' : '<p class="ma-note" style="margin:4px 0">اقدامی از طرف شما لازم نیست.</p>') + '</li>';
    }).join('') + '</ul>';
  }
  function msgsView() {
    var l = S.msgs || [];
    if (!l.length) return '<p class="ma-note">پیامی نیست.</p>';
    return '<ul class="ma-list">' + l.map(function (m) {
      var done = m.status === 'closed';
      return '<li class="ma-order' + (done ? ' done' : '') + '"><div class="ma-row"><b>' + esc(m.name) + '</b><span class="ma-pill">' + esc(TO[m.to] || m.to) + '</span></div><span class="tx">' + esc(m.text) + '</span>' +
        '<div class="ma-row"><button type="button" class="ma-ext sm" data-copy="' + esc(m.contact) + '">' + esc(fa(m.contact)) + '</button><time>' + esc(when(m.at)) + '</time></div>' +
        '<div class="ma-acts"><button type="button" class="ma-act" data-close="' + esc(m.id) + '" data-to="' + (done ? 'open' : 'closed') + '"' + (S.busy ? ' disabled' : '') + '>' + (done ? 'بازگشایی' : 'انجام شد') + '</button></div></li>';
    }).join('') + '</ul>';
  }
  function chatsView() {
    var l = S.chats || [];
    if (!l.length) return '<p class="ma-note">گفت‌وگوی بازی نیست.</p>';
    return '<ul class="ma-list">' + l.map(function (c) {
      return '<li class="ma-item" data-chat="' + esc(c.id) + '"><b>' + esc(c.title) + '</b>' + (c.last ? '<span class="tx">' + (c.by ? esc(c.by) + ': ' : '') + esc(c.last) + '</span>' : '') + '<time>' + esc(when(c.at)) + '</time></li>';
    }).join('') + '</ul>';
  }
  function threadView() {
    var t = S.thread;
    var rows = t.items.map(function (m) {
      return '<div class="ma-msg' + (m.mine ? ' mine' : '') + '">' + (m.mine ? '' : '<small>' + esc(m.name) + '</small>') + (m.deleted ? '<i>این پیام حذف شد</i>' : esc(m.text).replace(/\n/g, '<br>')) + (m.files ? '<i>' + esc(fa(m.files)) + ' فایل (در برنامه باز کنید)</i>' : '') + '<time>' + esc(when(m.at)) + '</time></div>';
    }).join('');
    return '<div class="ma-row"><button type="button" class="ma-btn" data-back>بازگشت</button><b>' + esc(t.title) + '</b></div><div class="ma-thread">' + (rows || '<p class="ma-note">هنوز پیامی نیست.</p>') + '</div>' +
      (t.open ? '<form class="ma-send" data-send><textarea id="maReply" rows="2" maxlength="2000" placeholder="پیام…" aria-label="پیام"></textarea><button type="submit" class="ma-act"' + (S.busy ? ' disabled' : '') + '>ارسال</button></form>' : '<p class="ma-note">این گفت‌وگو بسته است.</p>');
  }

  function load() {
    return api('GET', '/notices').then(function (j) { S.items = j.items || []; S.unread = j.unread || 0; S.cats = j.cats || []; });
  }
  // each section is asked once; a role that may not have it answers 403 and the section simply does not appear
  function loadWork() {
    function one(p, set, pick) { return api('GET', p).then(function (j) { set(pick(j)); }, function (e) { if (e.status === 403) set(undefined); }); }
    return Promise.all([
      one('/mini/requests', function (v) { S.orders = v === undefined ? false : v; }, function (j) { return j.items || []; }),
      one('/mini/messages', function (v) { S.msgs = v === undefined ? false : v; }, function (j) { return j.items || []; }),
      one('/mini/tickets', function (v) { S.chats = v === undefined ? false : v; }, function (j) { return j.items || []; })
    ]);
  }
  function openThread(id, quiet) {
    return api('GET', '/mini/tickets/' + encodeURIComponent(id)).then(function (j) {
      S.thread = { id: id, title: j.title, open: j.open, items: j.items, now: j.now || 0 };
      view();
    }, function () { if (!quiet) toast('گفت‌وگو باز نشد.'); });
  }
  // an open conversation is asked every few seconds for ONLY what is new since the last answer; most answers are empty and tiny
  var polling = false;
  function pollThread() {
    var t = S.thread;
    if (polling || !t || !t.id || !S.token || document.hidden || S.busy || S.tab !== 'work' || S.work !== 'chats') return;
    polling = true;
    api('GET', '/mini/tickets/' + encodeURIComponent(t.id) + '?since=' + encodeURIComponent(t.now || 0)).then(function (j) {
      polling = false;
      if (!S.thread || S.thread.id !== t.id) return;
      S.thread.now = j.now || S.thread.now; S.thread.open = j.open;
      if (!j.items || !j.items.length) return;
      j.items.forEach(function (m) {
        var at = -1; S.thread.items.forEach(function (x, i) { if (x.id === m.id) at = i; });
        if (at >= 0) S.thread.items[at] = m; else S.thread.items.push(m);
      });
      S.thread.items.sort(function (a, b) { return a.at - b.at; });
      view();
    }, function () { polling = false; });
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) pollThread(); });
  function toast(m) { S.msg = m; view(); setTimeout(function () { if (S.msg === m) { S.msg = ''; view(); } }, 2200); }
  function fail(e) { toast(e && e.status === 403 ? 'نقش شما اجازهٔ این کار را ندارد.' : (e && e.status === 409 ? 'این مورد بسته شده است.' : 'انجام نشد؛ دوباره امتحان کنید.')); }
  function go(work) { S.tab = 'work'; S.work = work; S.thread = null; view(); loadWork().then(view); }

  root.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-send]'); if (!f) return;
    e.preventDefault();
    var ta = f.querySelector('textarea'), text = ta.value.trim();
    if (!text || S.busy || !S.thread) return;
    S.busy = true; view();
    api('POST', '/mini/tickets/' + encodeURIComponent(S.thread.id) + '/reply', { text: text }).then(function () {
      S.busy = false; var n = root.querySelector('#maReply'); if (n) n.value = '';
      return openThread(S.thread.id, false).then(function () { var el = root.querySelector('#maReply'); if (el) el.value = ''; });
    }, function (er) { S.busy = false; view(); fail(er); });
  });

  root.addEventListener('click', function (e) {
    var t = e.target.closest('button, .ma-item'); if (!t) return;
    if (t.hasAttribute('data-tab')) {
      S.tab = t.getAttribute('data-tab'); S.armed = ''; view();
      if (S.tab === 'dir' && !S.dirLoaded) api('GET', '/mini/directory').then(function (j) { S.dir = j.items || []; S.dirLoaded = true; view(); }, function () { S.dirLoaded = true; view(); });
      if (S.tab === 'work') loadWork().then(view);
      return;
    }
    if (t.hasAttribute('data-cat')) { S.cat = t.getAttribute('data-cat'); view(); return; }
    if (t.hasAttribute('data-work')) { S.work = t.getAttribute('data-work'); S.thread = null; S.armed = ''; view(); return; }
    if (t.hasAttribute('data-back')) { S.thread = null; view(); loadWork().then(view); return; }
    if (t.hasAttribute('data-readall')) { api('POST', '/notices/read', { all: true }).then(load).then(view); return; }
    if (t.hasAttribute('data-switch')) {
      var key = t.getAttribute('data-switch');
      S.cats.forEach(function (c) { if (c.key === key) c.on = !c.on; });
      api('PUT', '/notices/prefs', { off: S.cats.filter(function (c) { return !c.on; }).map(function (c) { return c.key; }) }).then(function () { toast('ذخیره شد.'); }, function () { toast('ذخیره نشد؛ دوباره امتحان کنید.'); });
      view(); return;
    }
    if (t.hasAttribute('data-copy')) {
      var n = t.getAttribute('data-copy'), done = function () { toast('کپی شد.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(n).then(done, done); else done();
      return;
    }
    if (t.hasAttribute('data-stage')) {
      var code = t.getAttribute('data-code'), st = t.getAttribute('data-stage'), k = code + '|' + st;
      if (S.armed !== k) { S.armed = k; view(); setTimeout(function () { if (S.armed === k) { S.armed = ''; view(); } }, 4000); return; }
      S.armed = ''; S.busy = true; view();
      api('POST', '/mini/requests/' + encodeURIComponent(code) + '/stage', { stage: st }).then(function () { S.busy = false; toast('مرحله تغییر کرد.'); return loadWork().then(view); }, function (er) { S.busy = false; fail(er); });
      return;
    }
    if (t.hasAttribute('data-close')) {
      S.busy = true; view();
      api('PATCH', '/mini/messages/' + encodeURIComponent(t.getAttribute('data-close')), { status: t.getAttribute('data-to') }).then(function () { S.busy = false; toast('ذخیره شد.'); return loadWork().then(view); }, function (er) { S.busy = false; fail(er); });
      return;
    }
    if (t.hasAttribute('data-chat')) { S.thread = { id: t.getAttribute('data-chat'), title: '', open: false, items: [] }; openThread(S.thread.id, false); return; }
    if (t.classList.contains('ma-item')) {
      var id = t.getAttribute('data-id'), cat = t.getAttribute('data-cat-of'), path = t.getAttribute('data-path');
      api('POST', '/notices/read', { ids: [id] }).then(load).then(view);
      // a notice opens the part of this app that deals with it; anything else opens the portal page
      if (CAT_WORK[cat]) { go(CAT_WORK[cat]); return; }
      if (path && W && W.openLink) { try { W.openLink(PORTAL + path); } catch (x) { /* ignore */ } }
    }
  });

  function start() {
    if (W) { try { W.ready(); W.expand(); } catch (e) { /* ignore */ } theme(); }
    if (!W || !W.initData) { S.err = 'این صفحه باید از داخل بله، از ربات مکث‌سیلور، باز شود.'; view(); return; }
    view();
    api('POST', '/bale/mini/login', { initData: W.initData }).then(function (j) {
      S.token = j.token; S.name = j.name; S.role = j.role;
      return load();
    }).then(view, function (e) {
      S.err = e.status === 403 ? 'حساب بله شما به حساب مکث‌سیلور وصل نیست. در برنامه، «تنظیمات من» ← «اتصال به بله» را بزنید.' : 'ورود انجام نشد؛ دوباره باز کنید.';
      view();
    });
    setInterval(pollThread, 4000);
    setInterval(function () {
      if (!S.token || document.hidden) return;
      load().then(function () { if (S.tab === 'notices') view(); }, function () { /* ignore */ });
      if (S.tab === 'work' && !S.busy && !(document.activeElement && document.activeElement.id === 'maReply' && document.activeElement.value)) loadWork().then(view, function () { /* ignore */ });
    }, 30000);
  }
  start();
})();

// Arya's back office, shown on the assistant page to the people who run it:
//  - organizational technology (manager): loads the company texts (a JSON file made by the owner's side, kept outside the public site) into the server,
//    and clears the question list;
//  - management, the CEO and the sales manager: read the questions Arya could not answer (no names, only the role) so they know what to teach it next.
// The rules (knowledge/{id}, arya_questions/{id}) decide who may do what; hiding this panel is only a courtesy.
(function (w) {
  'use strict';
  var root = document.getElementById('as');
  if (!root) return;
  var role = '';
  try { role = localStorage.getItem('ms-role') || ''; } catch (e) { /* ignore */ }
  var isManager = role === 'manager', reads = ['manager', 'ceo', 'sales_manager'].indexOf(role) >= 0;
  if (!reads) return;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fa = new Intl.NumberFormat('fa-IR');

  var box = document.createElement('dialog');
  box.className = 'as-adm-dlg';
  box.innerHTML = '<div class="as-adm-head"><h2>مدیریت مکثی</h2><button type="button" class="as-adm-x" data-adm-close aria-label="بستن">×</button></div><div class="as-adm-in">' +
    '<section><h3>سؤال‌هایی که مکثی جواب نداد</h3><p class="as-adm-note">بدون نام؛ فقط نقش پرسنده. بر اساس تعداد تکرار مرتب شده‌اند.</p>' +
    '<div class="as-adm-row"><button type="button" data-qs>نمایش</button>' + (isManager ? '<button type="button" data-qclear class="warn">پاک‌کردن فهرست</button>' : '') + '</div><ol class="as-adm-list" data-qlist></ol></section>' +
    '<section><h3>گفت‌وگوهای ثبت‌شده با مکثی</h3><p class="as-adm-note">هر پرسش و پاسخ، بدون نام (فقط «مهمان» یا نقش) و با شمارهٔ تلفن و ایمیل پاک‌شده. برای دیدن اینکه مردم چه می‌پرسند و کجا مکثی کم می‌آورد.</p>' +
    '<div class="as-adm-row"><select data-dkind><option value="">همه</option><option value="none">بی‌پاسخ</option><option value="scope">خارج از کار مکثی</option><option value="down">نمرهٔ منفی</option><option value="ok">پاسخ‌داده‌شده</option></select><button type="button" data-dshow>نمایش</button><button type="button" data-dcsv>دریافت Excel/CSV</button>' + (isManager ? '<button type="button" data-dclear class="warn">پاک‌کردن همه</button>' : '') + '</div><p class="as-adm-note" data-dinfo></p><ol class="as-adm-list" data-dlist></ol></section>' +
    (isManager ? '<section><h3>وارد کردن متن‌های شرکت</h3><p class="as-adm-note">فایل <b>arya_knowledge.json</b> را انتخاب کنید. هر متن فقط برای نقش‌هایی که در آن نوشته شده دیده می‌شود. وارد کردن دوباره، متن‌های هم‌نام را جایگزین می‌کند.</p>' +
      '<div class="as-adm-row"><input type="file" accept="application/json,.json" data-kfile><button type="button" data-kgo>وارد کردن</button></div><p class="as-adm-msg" data-kmsg role="status"></p></section>' : '') +
    '</div>';
  document.body.appendChild(box);
  document.addEventListener('click', function (e) { if (e.target.closest('#asAdm')) { if (box.showModal) box.showModal(); else box.setAttribute('open', ''); } });
  var msg = box.querySelector('[data-kmsg]');
  function say(t, bad) { if (msg) { msg.textContent = t; msg.className = 'as-adm-msg' + (bad ? ' bad' : ''); } }
  function db() { return w.firebase && w.firebase.firestore ? w.firebase.firestore() : null; }

  function showQuestions() {
    var d = db(), ol = box.querySelector('[data-qlist]');
    if (!d) { ol.innerHTML = '<li>ارتباط با پایگاه داده برقرار نیست.</li>'; return; }
    ol.innerHTML = '<li>در حال خواندن…</li>';
    d.collection('arya_questions').get().then(function (snap) {
      var by = {};
      snap.forEach(function (s) { var x = s.data() || {}, k = String(x.q || '').trim(); if (!k) return; var e = by[k] || (by[k] = { q: k, n: 0, roles: {}, down: 0, last: 0 }); e.n++; e.roles[x.role] = 1; if (x.kind === 'down') e.down++; e.last = Math.max(e.last, x.at || 0); });
      var list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.n - a.n || b.last - a.last; });
      ol.innerHTML = list.length ? list.slice(0, 80).map(function (e) { return '<li><b>' + esc(e.q) + '</b> <small>' + fa.format(e.n) + ' بار' + (e.down ? '، ' + fa.format(e.down) + ' نمرهٔ منفی' : '') + ' · ' + esc(Object.keys(e.roles).join('، ')) + '</small></li>'; }).join('') : '<li>هنوز سؤالی ثبت نشده است.</li>';
    }, function () { ol.innerHTML = '<li>خواندن ممکن نشد.</li>'; });
  }
  var dRows = [];
  var KIND = { ok: 'پاسخ', none: 'بی‌پاسخ', scope: 'خارج از کار', down: 'نمرهٔ منفی', up: 'نمرهٔ مثبت' };
  function showDialogs() {
    var ol = box.querySelector('[data-dlist]'), info = box.querySelector('[data-dinfo]'), api = w.MSApi;
    if (!api || !api.enabled || !api.enabled()) { ol.innerHTML = '<li>ثبت گفت‌وگو فقط روی سرور اصلی کار می‌کند.</li>'; return; }
    ol.innerHTML = '<li>در حال خواندن…</li>';
    api.assistantDialogs(box.querySelector('[data-dkind]').value).then(function (r) {
      dRows = r.rows || [];
      var bySid = {}, order = [];
      dRows.forEach(function (x) { if (!bySid[x.sid]) { bySid[x.sid] = []; order.push(x.sid); } bySid[x.sid].push(x); });
      info.textContent = fa.format(r.total) + ' پرسش ثبت شده؛ ' + fa.format(order.length) + ' گفت‌وگو در فهرست زیر.';
      ol.innerHTML = order.length ? order.slice(0, 120).map(function (sid) {
        var l = bySid[sid].slice().reverse();
        return '<li><small>' + esc(l[0].who === 'public' ? 'مهمان' : l[0].who) + ' · ' + esc(String(l[0].created_at || '').slice(0, 16)) + '</small>' + l.map(function (x) {
          return '<div><b>' + esc(x.q) + '</b> <small>(' + esc(KIND[x.kind] || x.kind) + ')</small>' + (x.a ? '<br><span>' + esc(x.a) + '</span>' : '') + '</div>'; }).join('') + '</li>';
      }).join('') : '<li>چیزی ثبت نشده است.</li>';
    }, function () { ol.innerHTML = '<li>خواندن ممکن نشد.</li>'; });
  }
  function csvDialogs() {
    if (!dRows.length) { showDialogs(); return; }
    function c(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var out = ['\ufeff' + ['گفت‌وگو', 'زمان', 'کاربر', 'نوع', 'پرسش', 'پاسخ', 'کالاها'].map(c).join(',')];
    dRows.slice().reverse().forEach(function (x) { out.push([x.sid, x.created_at, x.who === 'public' ? 'مهمان' : x.who, KIND[x.kind] || x.kind, x.q, x.a, x.items].map(c).join(',')); });
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out.join('\r\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'maxi-dialogs.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function clearDialogs() {
    var api = w.MSApi; if (!api || !w.confirm('همهٔ گفت‌وگوهای ثبت‌شده برای همیشه پاک شود؟')) return;
    api.assistantDialogsClear().then(showDialogs, function () { say('پاک‌کردن ممکن نشد.', true); });
  }
  function clearQuestions() {
    var d = db(); if (!d || !w.confirm('همهٔ سؤال‌های ثبت‌شده پاک شود؟')) return;
    d.collection('arya_questions').get().then(function (snap) {
      var ops = []; snap.forEach(function (s) { ops.push(s.ref.delete()); });
      return Promise.all(ops);
    }).then(showQuestions, function () { say('پاک‌کردن ممکن نشد.', true); });
  }
  function importFile() {
    var f = box.querySelector('[data-kfile]').files[0], d = db();
    if (!f) { say('ابتدا فایل را انتخاب کنید.', true); return; }
    if (!d) { say('ارتباط با پایگاه داده برقرار نیست.', true); return; }
    var rd = new FileReader();
    rd.onload = function () {
      var list; try { list = JSON.parse(rd.result); } catch (e) { say('فایل خوانده نشد؛ JSON درست نیست.', true); return; }
      if (!Array.isArray(list) || !list.length) { say('فایل خالی است.', true); return; }
      var roles = {}; list.forEach(function (x) { (x.roles || []).forEach(function (r) { roles[r] = 1; }); });
      if (!w.confirm(fa.format(list.length) + ' متن برای ' + fa.format(Object.keys(roles).length) + ' نقش وارد شود؟')) return;
      var at = Date.now(), done = 0, bad = 0;
      list.reduce(function (chain, x) {
        return chain.then(function () {
          var id = String(x.id || '').replace(/[^\w-]/g, '').slice(0, 40); if (!id) { bad++; return null; }
          var data = { title: x.title, body: x.body, tip: x.tip || '', src: x.src || '', href: x.href || '', roles: x.roles, draft: !!x.draft, words: x.words || '', updatedAt: at };
          return d.collection('knowledge').doc(id).set(data).then(function () { done++; say('وارد شد: ' + fa.format(done) + ' از ' + fa.format(list.length)); }, function () { bad++; });
        });
      }, Promise.resolve()).then(function () {
        say(fa.format(done) + ' متن وارد شد' + (bad ? '؛ ' + fa.format(bad) + ' مورد پذیرفته نشد.' : '.'), !!bad && !done);
        if (w.MSKnowledge && w.MSKnowledge.reload) w.MSKnowledge.reload();
      });
    };
    rd.readAsText(f, 'utf-8');
  }
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.closest('[data-adm-close]')) { if (box.close) box.close(); else box.removeAttribute('open'); }
    else if (e.target.closest('[data-qs]')) showQuestions();
    else if (e.target.closest('[data-qclear]')) clearQuestions();
    else if (e.target.closest('[data-dshow]')) showDialogs();
    else if (e.target.closest('[data-dcsv]')) csvDialogs();
    else if (e.target.closest('[data-dclear]')) clearDialogs();
    else if (e.target.closest('[data-kgo]')) importFile();
  });
})(window);

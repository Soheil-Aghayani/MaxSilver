// hiring-form.html: draws the form, prints it, and downloads the Word file with fillable boxes.
(function (w, d) {
  'use strict';
  var H = w.MSHiring, sheet = d.getElementById('hfSheet'), brand = d.getElementById('hfBrand'), msg = d.getElementById('hfMsg');
  if (!H || !sheet) return;
  function say(t) { msg.textContent = t || ''; }
  function draw() { sheet.setAttribute('style', H.theme(brand.value)); sheet.innerHTML = H.pageHtml(brand.value); say(''); }
  draw();
  brand.addEventListener('change', draw);
  d.getElementById('hfPrint').addEventListener('click', function () { w.print(); });
  d.getElementById('hfClear').addEventListener('click', function () { if (w.confirm('همهٔ خانه‌ها پاک شود؟')) draw(); });
  d.getElementById('hfDocx').addEventListener('click', function () {
    var pw = d.getElementById('hfPw').value;
    say(pw ? 'در حال ساخت فایل و قفل‌کردن با رمز…' : 'در حال ساخت فایل…');
    H.docx(brand.value, pw).then(function (blob) {
      var a = d.createElement('a'), url = URL.createObjectURL(blob);
      a.href = url; a.download = 'employment-form-' + brand.value + '.docx'; d.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      say('فایل Word آماده شد.' + (pw ? ' رمز را نزد خودتان نگه دارید؛ ما آن را ذخیره نمی‌کنیم.' : ''));
    }, function (e) { say(e && e.message === 'font' ? 'فونت Estedad بارگذاری نشد (اینترنت یا حالت آفلاین). صفحه را تازه کنید و دوباره بزنید.' : 'ساخت فایل انجام نشد.'); });
  });
})(window, document);

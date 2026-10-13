// Hides management-only sections from signed-in visitors. This is navigation hygiene, not access control:
// the pages themselves are static files. Management data that must be private belongs in Firestore behind the rules.
(function () {
  'use strict';
  var role = '';
  try { role = localStorage.getItem('ms-role') || ''; } catch (e) { /* ignore */ }
  if (role !== 'visitor') return;
  Array.prototype.forEach.call(document.querySelectorAll('[data-manager-only]'), function (el) {
    if (el !== document.body) { el.hidden = true; el.style.display = 'none'; }
  });
  if (!document.body.hasAttribute('data-manager-only')) return;
  Array.prototype.forEach.call(document.body.children, function (el) {
    if (!el.matches('header.ms-sitebar, footer, script, link, dialog')) el.style.display = 'none';
  });
  var box = document.createElement('main');
  box.style.cssText = 'width:min(560px,calc(100% - 32px));margin:48px auto;padding:28px 22px;border:1px solid #d7dfeb;border-radius:20px;background:#fff;text-align:center;line-height:2';
  box.innerHTML = '<h1 style="margin:0 0 8px;font-size:20px;color:#071b36">این بخش مخصوص مدیریت است</h1>' +
    '<p style="margin:0 0 18px;color:#5b6a80">حساب شما در نقش ویزیتور است و به کاتالوگ، پیش‌فاکتور و پنل کاربری دسترسی دارد.</p>' +
    '<a href="./product-catalog.html" style="display:inline-block;padding:12px 22px;border-radius:14px;background:#071b36;color:#fff;text-decoration:none;font-weight:800">رفتن به کاتالوگ</a>';
  document.body.insertBefore(box, document.querySelector('footer'));
})();

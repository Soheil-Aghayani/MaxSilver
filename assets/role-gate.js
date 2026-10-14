// Hides sections the signed-in role does not use. This is navigation hygiene, not access control:
// the pages themselves are static files. Management data that must be private belongs in Firestore behind the rules.
// An element or the body marked data-manager-only="<area>" is shown only to the roles listed for that area in roles.js.
(function () {
  'use strict';
  var role = '';
  try { role = localStorage.getItem('ms-role') || ''; } catch (e) { /* ignore */ }
  if (!role) return;
  var R = window.MSRoles;
  function allowed(area) { return R ? R.can(role, area || 'dashboard') : role !== 'visitor'; }
  Array.prototype.forEach.call(document.querySelectorAll('[data-manager-only]'), function (el) {
    if (el === document.body) return;
    if (!allowed(el.getAttribute('data-manager-only'))) { el.hidden = true; el.style.display = 'none'; }
  });
  if (!document.body.hasAttribute('data-manager-only')) return;
  if (allowed(document.body.getAttribute('data-manager-only'))) return;
  Array.prototype.forEach.call(document.body.children, function (el) {
    if (!el.matches('header.ms-sitebar, footer, script, link, dialog')) el.style.display = 'none';
  });
  var name = R ? R.label(role) : '';
  var box = document.createElement('main');
  box.style.cssText = 'width:min(560px,calc(100% - 32px));margin:48px auto;padding:28px 22px;border:1px solid #d7dfeb;border-radius:20px;background:#fff;text-align:center;line-height:2';
  box.innerHTML = '<h1 style="margin:0 0 8px;font-size:20px;color:#071b36">این بخش برای نقش شما فعال نیست</h1>' +
    '<p style="margin:0 0 18px;color:#5b6a80">نقش حساب شما' + (name ? ': ' + name : '') + ' است و به این بخش دسترسی ندارد. اگر لازم است، از مدیر بخواهید نقش را بازبینی کند.</p>' +
    '<a href="./product-catalog.html" style="display:inline-block;padding:12px 22px;border-radius:14px;background:#071b36;color:#fff;text-decoration:none;font-weight:800">رفتن به کاتالوگ</a>';
  document.body.insertBefore(box, document.querySelector('footer'));
})();

// Hides sections the signed-in role does not use. This is navigation hygiene, not access control:
// the pages themselves are static files. Management data that must be private belongs in Firestore behind the rules.
// An element or the body marked data-manager-only="<area>" is shown only to the roles listed for that area in roles.js.
// Someone with no account at all gets the least: the home page (login, contact) and the panel (login, contact).
// MSGate.apply() runs again the moment the person signs in or out, so the navigation never waits for the next page.
(function (w) {
  'use strict';
  var touched = [];                                   // [element, hidden, display] to put back before every pass

  function hide(el) { touched.push([el, el.hidden, el.style.display]); el.hidden = true; el.style.display = 'none'; }
  function reset() {
    touched.forEach(function (t) { t[0].hidden = t[1]; t[0].style.display = t[2]; });
    touched = [];
    var d = document.getElementById('msDenied'); if (d) d.remove();
    document.documentElement.removeAttribute('data-anon');
    var box = document.getElementById('anonBox'); if (box) box.hidden = true;
  }
  function role() { try { return localStorage.getItem('ms-role') || ''; } catch (e) { return ''; } }
  function hasSession() {
    // an anonymous Firebase session (the public request form signs in for a moment to send) is not an account
    try { for (var i = 0; i < localStorage.length; i++) if (/^firebase:authUser:/.test(localStorage.key(i))) { var u = null; try { u = JSON.parse(localStorage.getItem(localStorage.key(i))); } catch (e2) { /* ignore */ } if (!(u && u.isAnonymous)) return true; } } catch (e) { /* ignore */ }
    return false;
  }

  function apply() {
    reset();
    var r = role(), signed = !!r || hasSession();
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!signed) {
      if (page !== 'index.html' && page !== 'panel.html' && page !== 'contact.html' && page !== 'planner.html' && page !== 'legal.html' && page !== 'fairs.html' && page !== 'track.html') { location.replace('./index.html'); return; }
      document.documentElement.setAttribute('data-anon', '');
      Array.prototype.forEach.call(document.querySelectorAll('.ms-nav-links li'), function (li) {
        var a = li.querySelector('a'), href = a ? a.getAttribute('href') : '';
        if (href !== './index.html' && href !== './panel.html' && href !== './contact.html' && href !== './planner.html' && href !== './fairs.html' && href !== './track.html') hide(li);
      });
      var box = document.getElementById('anonBox');
      if (box) {
        box.hidden = false;
        Array.prototype.forEach.call(document.querySelectorAll('.portal-grid:not(.anon), .data-note'), hide);
      }
      return;
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-anon-only]'), hide);   // someone with an account has tickets in the panel
    if (!r) return;
    var R = w.MSRoles;
    function allowed(area) { return R ? R.can(r, area || 'dashboard') : r !== 'visitor'; }
    Array.prototype.forEach.call(document.querySelectorAll('[data-manager-only]'), function (el) {
      if (el === document.body) return;
      if (!allowed(el.getAttribute('data-manager-only'))) hide(el);
    });
    if (!document.body.hasAttribute('data-manager-only')) return;
    if (allowed(document.body.getAttribute('data-manager-only'))) return;
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (!el.matches('header.ms-sitebar, footer, script, link, dialog')) hide(el);
    });
    var name = R ? R.label(r) : '';
    var m = document.createElement('main');
    m.id = 'msDenied';
    m.style.cssText = 'width:min(560px,calc(100% - 32px));margin:48px auto;padding:28px 22px;border:1px solid #d7dfeb;border-radius:20px;background:#fff;text-align:center;line-height:2';
    m.innerHTML = '<h1 style="margin:0 0 8px;font-size:20px;color:#071b36">این بخش برای نقش شما فعال نیست</h1>' +
      '<p style="margin:0 0 18px;color:#5b6a80">نقش حساب شما' + (name ? ': ' + name : '') + ' است و به این بخش دسترسی ندارد. اگر لازم است، از مدیر بخواهید نقش را بازبینی کند.</p>' +
      '<a href="./product-catalog.html" style="display:inline-block;padding:12px 22px;border-radius:14px;background:#071b36;color:#fff;text-decoration:none;font-weight:800">رفتن به کاتالوگ</a>';
    document.body.insertBefore(m, document.querySelector('footer'));
  }

  w.MSGate = { apply: apply };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  // another tab signing in or out, or the profile arriving late
  w.addEventListener('storage', function (e) { if (e.key === 'ms-role') apply(); });
})(window);

(function () {
  'use strict';
  var b = document.getElementById('hwCopy'), t = document.getElementById('hwCap');
  if (!b || !t) return;
  b.addEventListener('click', function () {
    var done = function (ok) { b.textContent = ok ? 'کپی شد' : 'متن را انتخاب و کپی کنید'; setTimeout(function () { b.textContent = 'کپی متن'; }, 2200); };
    try { navigator.clipboard.writeText(t.textContent.trim()).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  });
})();

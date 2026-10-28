// catalogues.html: the catalogues of the company as downloadable files (PDF for the customer, a layered file for the designer).
// Who may open the page is decided by the «catalogues» area of assets/roles.js. To add a catalogue or a file, edit CATALOGUES below:
// a file with path: null shows «به‌زودی» until the real file is put in assets/catalogues/ and its path is written here.
(function () {
  'use strict';
  var root = document.getElementById('ctList');
  if (!root) return;
  var CATALOGUES = [
    {
      id: 'pw7', title: 'کاتالوگ فرهای طرح پیتزا مستر؛ سری ۷۰۰', art: 'catalogues',
      about: 'پانزده مدل PW721 تا PW745 با ابعاد، سطح پخت، توان و ظرفیت. قطع ۱۶۵×۲۳۵ میلی‌متر، ۸ صفحه.',
      note: 'ارقام فنی مرجع PizzaMaster است و تطابق با PW هنوز تأیید نشده؛ پیش از ارسال به مشتری بررسی شود.',
      files: [
        { kind: 'pdf', label: 'PDF برای مشتری', path: null },
        { kind: 'layered', label: 'فایل لایه‌باز (برای طراح)', path: null }
      ]
    }
  ];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function fileBtn(f) {
    var ext = f.path ? String(f.path).split('.').pop().toUpperCase() : (f.kind === 'pdf' ? 'PDF' : 'فایل');
    if (!f.path) return '<span class="ct-file soon" aria-disabled="true"><b>' + esc(ext) + '</b><span>' + esc(f.label) + '</span><em>به‌زودی</em></span>';
    return '<a class="ct-file" href="' + esc(f.path) + '" download><b>' + esc(ext) + '</b><span>' + esc(f.label) + '</span><em>دانلود</em></a>';
  }
  root.innerHTML = CATALOGUES.map(function (c) {
    return '<article class="ct-card"><img class="ct-art" src="./assets/art/tiles/' + esc(c.art) + '.webp" alt="" width="96" height="96" decoding="async" onerror="this.remove()">' +
      '<div class="ct-body"><h2>' + esc(c.title) + '</h2><p>' + esc(c.about) + '</p>' + (c.note ? '<p class="ct-note">' + esc(c.note) + '</p>' : '') +
      '<div class="ct-files">' + c.files.map(fileBtn).join('') + '</div></div></article>';
  }).join('');
})();

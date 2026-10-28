// Small picture picker: reads an image file, crops it to a square and shrinks it to a small JPEG data URL (about 10-30 KB) so a profile
// picture or a cover can live inside its record. window.MSImg.fromFile(file, size) -> Promise<string>; MSImg.camera is the camera icon (SVG).
(function () {
  'use strict';
  function fromFile(file, size, quality) {
    size = size || 320; quality = quality || 0.82;
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//.test(file.type || '')) { reject(new Error('فقط فایل عکس را انتخاب کنید.')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var s = Math.min(img.naturalWidth, img.naturalHeight), sx = (img.naturalWidth - s) / 2, sy = (img.naturalHeight - s) / 2;
          var c = document.createElement('canvas'); c.width = c.height = size;
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.drawImage(img, sx, sy, s, s, 0, 0, size, size);
          resolve(c.toDataURL('image/jpeg', quality));
        } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('این عکس خوانده نشد.')); };
      img.src = url;
    });
  }
  window.MSImg = {
    fromFile: fromFile,
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
  };
})();

// Operating-system line icons (moved out of install.js so the install page can show them too). 24px viewBox, drawn with currentColor.
(function (w) {
  'use strict';
  var TONE = { windows: '#0078D4', macos: '#111827', ios: '#111827', android: '#3DDC84', linux: '#111827', steamos: '#1b2838', chromeos: '#4285f4', other: '#51627a' };
  var ICON = {
    windows: '<path d="M3 5.4 10.6 4.3v7.1H3zM11.7 4.1 21 2.8v8.6h-9.3zM3 12.5h7.6v7.1L3 18.5zM11.7 12.5H21v8.7l-9.3-1.3z"/>',
    macos: '<path d="M12 7.4c-1-.9-2.6-1.2-3.9-.4C6 8.2 5.4 11.2 6.4 14.2c.8 2.4 2.3 4.8 3.8 4.8.9 0 1.2-.5 1.8-.5s.9.5 1.8.5c1.5 0 3-2.4 3.8-4.7.2-.5-1.7-1-1.7-3.2 0-1.9 1.5-2.6 1.6-2.7-.9-1.3-2.3-1.7-3.2-1.7-1.2 0-2 .8-2.6.9z"/><path d="M13.2 5.8c.7-.7 1-1.7.9-2.6-.9 0-1.9.6-2.4 1.3-.5.6-.8 1.6-.7 2.4.9 0 1.6-.4 2.2-1.1z"/>',
    android: '<path d="M6.5 10.5a5.5 5.5 0 0 1 11 0z"/><path d="m8.7 4.2 1.3 1.8m5.3-1.8L14 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><rect x="6.5" y="11.5" width="11" height="7" rx="1.2"/><rect x="8.6" y="17.8" width="2.2" height="3.4" rx="1.1"/><rect x="13.2" y="17.8" width="2.2" height="3.4" rx="1.1"/><rect x="3.2" y="11.5" width="2.2" height="5.5" rx="1.1"/><rect x="18.6" y="11.5" width="2.2" height="5.5" rx="1.1"/><circle cx="9.7" cy="8.2" r=".7" fill="#fff"/><circle cx="14.3" cy="8.2" r=".7" fill="#fff"/>',
    linux: '<path d="M12 3c-2.2 0-3.5 1.8-3.5 4.2 0 1.3-.8 2.4-1.6 3.7-.9 1.4-1.6 3.3-1.3 5.3.2 1.3 1.2 2 2.4 2.1.8 1.3 2.4 2.1 4 2.1s3.2-.8 4-2.1c1.2-.1 2.2-.8 2.4-2.1.3-2-.4-3.9-1.3-5.3-.8-1.3-1.6-2.4-1.6-3.7C15.5 4.8 14.2 3 12 3z"/><ellipse cx="12" cy="14.3" rx="3.2" ry="4.3" fill="#fff"/><path d="M10.5 8.5h3L12 10z" fill="#f5a623"/><circle cx="10.8" cy="6.8" r=".6" fill="#fff"/><circle cx="13.2" cy="6.8" r=".6" fill="#fff"/><ellipse cx="9" cy="20.6" rx="2.2" ry=".9" fill="#f5a623"/><ellipse cx="15" cy="20.6" rx="2.2" ry=".9" fill="#f5a623"/>',
    steamos: '<circle cx="12" cy="12" r="9.5"/><circle cx="15.8" cy="9.2" r="2.6" fill="#fff"/><circle cx="15.8" cy="9.2" r="1.2"/><circle cx="8.3" cy="15.2" r="1.8" fill="#fff"/><path d="m9 14.2 5-3.2" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    chromeos: '<path d="M12 12 3.77 7.25A9.5 9.5 0 0 1 20.23 7.25Z" fill="#ea4335"/><path d="M12 12V21.5A9.5 9.5 0 0 1 3.77 7.25Z" fill="#34a853"/><path d="M12 12 20.23 7.25A9.5 9.5 0 0 1 12 21.5Z" fill="#fbbc04"/><circle cx="12" cy="12" r="4.5" fill="#fff"/><circle cx="12" cy="12" r="3.2" fill="#4285f4"/>',
    other: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="1.6"/>'
  };
  ICON.ios = ICON.macos;
  w.MS_OS = { ICON: ICON, TONE: TONE };
})(window);

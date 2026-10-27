// Iranian banks: the dropdown of «حساب‌های بانکی», the bank icon on a card, and the bank guessed from the first six digits of a card.
// The icon of each bank is the file assets/banks/<id>.webp (square, transparent); until a file exists a coloured badge with the first letters is shown.
// bin = the first six digits of the cards the bank issues (several banks have more than one). The list is for convenience: the person can always choose another bank.
(function (w) {
  'use strict';
  var BANKS = [
    { id: 'melli', name: 'بانک ملی ایران', bin: ['603799'] },
    { id: 'sepah', name: 'بانک سپه', bin: ['589210'] },
    { id: 'sanat-madan', name: 'بانک صنعت و معدن', bin: ['627961'] },
    { id: 'keshavarzi', name: 'بانک کشاورزی', bin: ['603770', '639217'] },
    { id: 'maskan', name: 'بانک مسکن', bin: ['628023'] },
    { id: 'tosee-saderat', name: 'بانک توسعه صادرات ایران', bin: ['627648', '207177'] },
    { id: 'tosee-taavon', name: 'بانک توسعه تعاون', bin: ['502908'] },
    { id: 'post-bank', name: 'پست بانک ایران', bin: ['627760'] },
    { id: 'saderat', name: 'بانک صادرات ایران', bin: ['603769'] },
    { id: 'mellat', name: 'بانک ملت', bin: ['610433', '991975'] },
    { id: 'tejarat', name: 'بانک تجارت', bin: ['627353', '585983'] },
    { id: 'refah', name: 'بانک رفاه کارگران', bin: ['589463'] },
    { id: 'eghtesad-novin', name: 'بانک اقتصاد نوین', bin: ['627412'] },
    { id: 'parsian', name: 'بانک پارسیان', bin: ['622106', '627884', '639194'] },
    { id: 'pasargad', name: 'بانک پاسارگاد', bin: ['502229', '639347'] },
    { id: 'karafarin', name: 'بانک کارآفرین', bin: ['627488', '502910'] },
    { id: 'saman', name: 'بانک سامان', bin: ['621986'] },
    { id: 'sina', name: 'بانک سینا', bin: ['639346'] },
    { id: 'sarmayeh', name: 'بانک سرمایه', bin: ['639607'] },
    { id: 'shahr', name: 'بانک شهر', bin: ['502806', '504706'] },
    { id: 'dey', name: 'بانک دی', bin: ['502938'] },
    { id: 'gardeshgari', name: 'بانک گردشگری', bin: ['505416'] },
    { id: 'iran-zamin', name: 'بانک ایران زمین', bin: ['505785'] },
    { id: 'khavarmianeh', name: 'بانک خاورمیانه', bin: ['585947'] },
    { id: 'iran-venezuela', name: 'بانک مشترک ایران و ونزوئلا', bin: ['581874'] },
    { id: 'ayandeh', name: 'بانک آینده', bin: ['636214'] },
    { id: 'resalat', name: 'بانک قرض‌الحسنه رسالت', bin: ['504172'] },
    { id: 'mehr-iran', name: 'بانک قرض‌الحسنه مهر ایران', bin: ['606373'] },
    { id: 'other', name: 'سایر', bin: [] }
  ];
  var byName = {}; BANKS.forEach(function (b) { byName[fix(b.name)] = b; });
  function fix(s) { return String(s || '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function find(name) {
    var n = fix(name); if (!n) return null;
    if (byName[n]) return byName[n];
    var plain = n.replace(/^بانک\s+/, '').replace(/^پست بانک ایران$/, 'پست بانک ایران');
    for (var i = 0; i < BANKS.length; i++) { var p = fix(BANKS[i].name).replace(/^بانک\s+/, ''); if (p === plain) return BANKS[i]; }
    return null;
  }
  function byCard(card) {
    var d = String(card || '').replace(/\D/g, '').slice(0, 6); if (d.length < 6) return null;
    for (var i = 0; i < BANKS.length; i++) if (BANKS[i].bin.indexOf(d) >= 0) return BANKS[i];
    return null;
  }
  function hue(id) { var h = 0, i; for (i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h; }
  // the bank icon: the picture if it exists, otherwise a coloured badge with the first letters (never a broken image)
  function icon(name, size) {
    var b = find(name), px = size || 40, id = b ? b.id : 'other', label = (b ? b.name : String(name || '')).replace(/^بانک\s+/, '').trim();
    var letters = (label.split(' ')[0] || '؟').slice(0, 2), h = hue(id);
    return '<span class="bk-ico" style="--s:' + px + 'px;--h:' + h + '" title="' + String(b ? b.name : name || '').replace(/"/g, '&quot;') + '"><b>' + letters + '</b><img src="./assets/banks/' + id + '.webp" alt="" width="' + px + '" height="' + px + '" loading="lazy" decoding="async" onerror="this.remove()"></span>';
  }
  w.MSBanks = { list: BANKS, find: find, byCard: byCard, icon: icon, hue: hue };
})(window);

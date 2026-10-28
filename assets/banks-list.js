// Iranian banks: the dropdown of «حساب‌های بانکی», the bank icon on a card, and the bank guessed from the first six digits of a card.
// The icon of each bank is the file assets/banks/<id>.webp (square, transparent); until a file exists a coloured badge with the first letters is shown.
// sh = the 3-digit bank code inside an IBAN (IR + 2 check digits + bank code + ...); c = [main colour, darker colour] taken from the border of the bank's card picture (assets/banks/<id>.webp); replace with the verified brand colour when the research arrives.
// bin = the first six digits of the cards the bank issues (several banks have more than one). The list is for convenience: the person can always choose another bank.
(function (w) {
  'use strict';
  var BANKS = [
    { id: 'melli', c: ['#EA2838', '#890D18'], sh: '017', name: 'بانک ملی ایران', bin: ['603799'] },
    { id: 'sepah', c: ['#2864CC', '#163770'], sh: '015', name: 'بانک سپه', bin: ['589210'] },
    { id: 'sanat-madan', c: ['#9F9055', '#574F2F'], sh: '011', name: 'بانک صنعت و معدن', bin: ['627961'] },
    { id: 'keshavarzi', c: ['#E6C971', '#A0801C'], sh: '016', name: 'بانک کشاورزی', bin: ['603770', '639217'] },
    { id: 'maskan', c: ['#EA641A', '#83360C'], sh: '014', name: 'بانک مسکن', bin: ['628023'] },
    { id: 'tosee-saderat', c: ['#1A731A', '#0E3F0E'], sh: '020', name: 'بانک توسعه صادرات ایران', bin: ['627648', '207177'] },
    { id: 'tosee-taavon', c: ['#62BBD9', '#22718B'], sh: '022', name: 'بانک توسعه تعاون', bin: ['502908'] },
    { id: 'post-bank', c: ['#288246', '#164827'], sh: '021', name: 'پست بانک ایران', bin: ['627760'] },
    { id: 'saderat', c: ['#383873', '#1F1F3F'], sh: '019', name: 'بانک صادرات ایران', bin: ['603769'] },
    { id: 'mellat', c: ['#BD1A38', '#680E1F'], sh: '012', name: 'بانک ملت', bin: ['610433', '991975'] },
    { id: 'tejarat', c: ['#38559F', '#1F2F57'], sh: '018', name: 'بانک تجارت', bin: ['627353', '585983'] },
    { id: 'refah', c: ['#284682', '#162748'], sh: '013', name: 'بانک رفاه کارگران', bin: ['589463'] },
    { id: 'eghtesad-novin', c: ['#73389F', '#3F1F57'], sh: '055', name: 'بانک اقتصاد نوین', bin: ['627412'] },
    { id: 'parsian', c: ['#BD8264', '#6F452F'], sh: '054', name: 'بانک پارسیان', bin: ['622106', '627884', '639194'] },
    { id: 'pasargad', c: ['#F4C919', '#8D7307'], sh: '057', name: 'بانک پاسارگاد', bin: ['502229', '639347'] },
    { id: 'karafarin', c: ['#1A821A', '#0E480E'], sh: '053', name: 'بانک کارآفرین', bin: ['627488', '502910'] },
    { id: 'saman', c: ['#7FC9F4', '#107DBC'], sh: '056', name: 'بانک سامان', bin: ['621986'] },
    { id: 'sina', c: ['#3882BD', '#1F4768'], sh: '059', name: 'بانک سینا', bin: ['639346'] },
    { id: 'sarmayeh', c: ['#282855', '#16162F'], sh: '058', name: 'بانک سرمایه', bin: ['639607'] },
    { id: 'shahr', c: ['#DB3838', '#801717'], sh: '061', name: 'بانک شهر', bin: ['502806', '504706'] },
    { id: 'dey', c: ['#1A909F', '#0E4F57'], sh: '066', name: 'بانک دی', bin: ['502938'] },
    { id: 'gardeshgari', c: ['#BD2828', '#681616'], sh: '064', name: 'بانک گردشگری', bin: ['505416'] },
    { id: 'iran-zamin', c: ['#55389F', '#2F1F57'], sh: '069', name: 'بانک ایران زمین', bin: ['505785'] },
    { id: 'khavarmianeh', c: ['#F89F28', '#995A05'], sh: '078', name: 'بانک خاورمیانه', bin: ['585947'] },
    { id: 'iran-venezuela', c: ['#38469F', '#1F2657'], name: 'بانک مشترک ایران و ونزوئلا', bin: ['581874'] },
    { id: 'ayandeh', c: ['#904628', '#4F2716'], sh: '062', name: 'بانک آینده', bin: ['636214'] },
    { id: 'resalat', c: ['#19BBE7', '#0D677F'], sh: '070', name: 'بانک قرض‌الحسنه رسالت', bin: ['504172'] },
    { id: 'mehr-iran', c: ['#389F28', '#1F5716'], sh: '060', name: 'بانک قرض‌الحسنه مهر ایران', bin: ['606373'] },
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
  function bySheba(sh) {
    var d = String(sh || '').replace(/\s+/g, '').toUpperCase(); if (!/^IR\d{5}/.test(d)) return null;
    var c = d.slice(4, 7); for (var i = 0; i < BANKS.length; i++) if (BANKS[i].sh === c) return BANKS[i];
    return null;
  }
  function hue(id) { var h = 0, i; for (i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h; }
  // the bank icon: the picture if it exists, otherwise a coloured badge with the first letters (never a broken image)
  function icon(name, size) {
    var b = find(name), px = size || 40, id = b ? b.id : 'other', label = (b ? b.name : String(name || '')).replace(/^بانک\s+/, '').trim();
    var letters = (label.split(' ')[0] || '؟').slice(0, 2), h = hue(id);
    return '<span class="bk-ico" style="--s:' + px + 'px;--h:' + h + '" title="' + String(b ? b.name : name || '').replace(/"/g, '&quot;') + '"><b>' + letters + '</b><img src="./assets/banks/' + id + '.webp" alt="" width="' + px + '" height="' + px + '" loading="lazy" decoding="async" onerror="this.remove()"></span>';
  }
  w.MSBanks = { list: BANKS, find: find, byCard: byCard, bySheba: bySheba, icon: icon, hue: hue };
})(window);

// Proforma templates as data. One template describes a company's printed proforma: logo, colours, labels, columns,
// which blocks appear and the footer. html(doc, ctx, templateId) draws the document from it; catalog.js supplies the helpers.
// «max-silver» is the template in use. «chefmarket» (red, no prices, no payment block) is prepared for the customer-facing request sheet.
(function () {
  'use strict';
  var COLS = {
    row: ['ردیف', function (l, i, c) { return c.faInt.format(i + 1); }],
    code: ['کد', function (l, i, c) { return '<td dir="ltr">' + c.esc(l.code) + '</td>'; }, true],
    name: ['شرح کالا', function (l, i, c) { return '<td class="ip-name">' + c.esc(l.name) + '</td>'; }, true],
    brand: ['برند', function (l, i, c) { return c.esc(l.brand); }],
    qty: ['تعداد', function (l, i, c) { return c.faInt.format(l.qty || 0); }],
    price: ['قیمت واحد ({u})', function (l, i, c) { return c.faInt.format(l.price || 0); }],
    total: ['قیمت کل ({u})', function (l, i, c) { return c.faInt.format(Math.round((l.qty || 0) * (l.price || 0))); }]
  };
  var TEMPLATES = {
    'max-silver': {
      id: 'max-silver', company: 'مکث سیلور', title: 'پیش‌فاکتور', accent: '#ffcc2a', ink: '#051934',
      logo: { src: './assets/branding/maxsilver-logo.svg', alt: 'مکث سیلور · MAX SILVER', w: 175, h: 30 },
      ref: { no: 'شماره سند:', date: 'تاریخ:' },
      party: { customer: 'مشتری:', city: 'شهر:', phone: 'تلفن:', address: 'نشانی:', issuer: 'صادرکننده (ویزیتور):' },
      columns: ['row', 'code', 'name', 'brand', 'qty', 'price', 'total'],
      totals: true, words: true, payment: true, sign: ['امضا و تاریخ صادرکننده', 'امضا و تاریخ مشتری'],
      footer: 'پیش‌فاکتور | مکث سیلور', share: 'پیش‌فاکتور مکث سیلور · '
    },
    chefmarket: {
      id: 'chefmarket', company: 'شف‌مارکت', title: 'پیش‌فاکتور درخواست خرید', accent: '#EB1D36', ink: '#212529', onAccent: '#ffffff',
      logo: { src: './assets/branding/chefmarket-logo.png', alt: 'شف‌مارکت · CHEF MARKET', w: 175, h: 51 },
      ref: { no: 'شمارهٔ درخواست:', date: 'تاریخ:' },
      party: { customer: 'نام:', city: 'شهر:', phone: 'تلفن:', address: 'نشانی:', issuer: '' },
      columns: ['row', 'code', 'name', 'brand', 'qty'],
      totals: false, words: false, payment: false, sign: null,
      note: 'این برگه قیمت ندارد. کارشناس فروش پس از بررسی درخواست با شما تماس می‌گیرد و قیمت و شرایط را اعلام می‌کند.',
      footer: 'شف‌مارکت | chefmarket.ir', share: 'درخواست خرید شف‌مارکت · '
    }
  };
  function get(id) { return TEMPLATES[id] || TEMPLATES['max-silver']; }

  // c: helpers from catalog.js { esc, faInt, fa, fa0, money, numWords, totals(doc), payPrint(doc) }
  function html(doc, c, id) {
    var T = get(id || doc.template), u = doc.unit, style = '--ip-a:' + T.accent + ';--ip-i:' + T.ink + (T.onAccent ? ';--ip-t:' + T.onAccent : '');
    var head = T.columns.map(function (k) { return '<th>' + COLS[k][0].replace('{u}', c.esc(u)) + '</th>'; }).join('');
    var rows = doc.lines.map(function (l, i) {
      return '<tr>' + T.columns.map(function (k) { var v = COLS[k][1](l, i, c); return COLS[k][2] ? v : '<td>' + v + '</td>'; }).join('') + '</tr>';
    }).join('');
    var t = T.totals ? c.totals(doc) : null, P = T.party;
    return '<table class="ip-frame" style="' + style + '"><thead><tr><td>' +
        '<div class="ip-top"><div class="ip-brand"><img src="' + T.logo.src + '" alt="' + T.logo.alt + '" width="' + T.logo.w + '" height="' + T.logo.h + '"></div>' +
        '<dl class="ip-ref"><div><dt>' + T.ref.no + '</dt><dd dir="ltr">' + c.esc(doc.docNo) + '</dd></div><div><dt>' + T.ref.date + '</dt><dd>' + c.esc(doc.date) + '</dd></div></dl></div>' +
      '</td></tr></thead><tbody><tr><td>' +
        '<h1>' + T.title + '</h1>' +
        '<p class="ip-line"><strong>' + P.customer + '</strong> ' + c.esc(doc.customer || '—') + '</p>' +
        '<div class="ip-recv"><p class="ip-line"><strong>' + P.city + '</strong> ' + c.esc(doc.customerCity || '—') + '</p>' +
        '<p class="ip-line"><strong>' + P.phone + '</strong> <span dir="ltr">' + c.esc(doc.customerPhone ? c.fa0(doc.customerPhone) : '—') + '</span></p></div>' +
        '<p class="ip-line"><strong>' + P.address + '</strong> ' + c.esc(doc.customerAddress || '—') + '</p>' +
        (P.issuer ? '<p class="ip-line"><strong>' + P.issuer + '</strong> ' + c.esc(doc.issuer || '—') + '</p>' : '') +
        '<table class="ip-items"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table>' +
        (T.totals ? '<table class="ip-totals"><tbody><tr><td>جمع کل</td><td>' + c.money(t.sub, u) + '</td></tr><tr><td>تخفیف</td><td>' + c.money(t.disc, u) + '</td></tr><tr><td>مبلغ پس از تخفیف</td><td>' + c.money(t.net, u) + '</td></tr>' +
        '<tr><td>مالیات بر ارزش افزوده (' + c.esc(c.fa.format(doc.tax || 0)) + '٪)</td><td>' + c.money(t.tax, u) + '</td></tr><tr class="grand"><td>مبلغ قابل پرداخت</td><td>' + c.money(t.total, u) + '</td></tr></tbody></table>' : '') +
        (T.words ? '<p class="ip-words"><strong>مبلغ به حروف:</strong> ' + c.esc(c.numWords(t.total)) + ' ' + c.esc(u) + '</p>' : '') + (T.payment ? c.payPrint(doc) : '') +
        (T.note ? '<p class="ip-words">' + c.esc(T.note) + '</p>' : '') +
        (T.sign ? '<div class="ip-sign"><div><b>' + T.sign[0] + '</b></div><div><b>' + T.sign[1] + '</b></div></div>' : '') +
      '</td></tr></tbody><tfoot><tr><td><div class="ip-foot">' + T.footer + (doc.docNo ? ' | ' + c.esc(doc.docNo) : '') + '</div></td></tr></tfoot></table>';
  }
  window.MSInvoice = { templates: TEMPLATES, get: get, html: html };
})();

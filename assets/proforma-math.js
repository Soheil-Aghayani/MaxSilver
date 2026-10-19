// Shared proforma arithmetic: the catalog sheet, the PDF and the user panel must always agree on the totals.
// Cheque prices: a line may carry cr (cheque price / cash price, at least 1). The part of the payment made by cheque is billed at the
// weighted cheque ratio of the lines, so «چکی» and the cheque part of «نقد و چک» cost a little more than cash. Old documents have no cr: nothing changes.
(function () {
  function base(d) {
    var sub = 0;
    (d.lines || []).forEach(function (l) { sub += (l.qty || 0) * (l.price || 0); });
    var disc = d.discMode === 'pct' ? sub * Math.min(d.discount || 0, 100) / 100 : Math.min(d.discount || 0, sub);
    var net = sub - disc, tax = net * (d.tax || 0) / 100;
    return { sub: sub, disc: disc, net: net, tax: tax, total: net + tax };
  }
  function ratio(d) {
    var a = 0, b = 0;
    (d.lines || []).forEach(function (l) { var x = (l.qty || 0) * (l.price || 0); a += x; b += x * Math.max(1, l.cr || 1); });
    return a > 0 ? b / a : 1;
  }
  // the cash part of the base total for the chosen payment terms
  function cashOf(total, p) {
    if (p.mode === 'cheque') return 0;
    if (p.mode === 'mixed') return Math.round(p.cashUnit === 'amt' ? Math.min(p.cashVal || 0, total) : total * Math.min(p.cashVal || 0, 100) / 100);
    return total;
  }
  window.MSMath = {
    totals: function (d) {
      var t = base(d), p = d.pay || { mode: 'cash' };
      var chq = p.mode === 'cash' ? 0 : (Math.round(t.total) - cashOf(Math.round(t.total), p)) * (ratio(d) - 1);
      t.chq = Math.round(chq); t.total = t.total + t.chq;
      return t;
    },
    // Payment terms: pay = { mode: 'cash' | 'cheque' | 'mixed', cashVal, cashUnit: 'pct' | 'amt' }. Whole units only.
    payment: function (d) {
      var t = base(d), T = Math.round(t.total), p = d.pay || { mode: 'cash' }, cash = cashOf(T, p);
      var chq = p.mode === 'cash' ? 0 : Math.round((T - cash) * (ratio(d) - 1));
      return { total: T + chq, cash: cash, cheque: T - cash + chq, chq: chq };
    }
  };
})();

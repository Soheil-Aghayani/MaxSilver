// Shared proforma arithmetic: the catalog sheet, the PDF and the user panel must always agree on the totals.
window.MSMath = {
  totals: function (d) {
    var sub = 0;
    (d.lines || []).forEach(function (l) { sub += (l.qty || 0) * (l.price || 0); });
    var disc = d.discMode === 'pct' ? sub * Math.min(d.discount || 0, 100) / 100 : Math.min(d.discount || 0, sub);
    var net = sub - disc, tax = net * (d.tax || 0) / 100;
    return { sub: sub, disc: disc, net: net, tax: tax, total: net + tax };
  },
  // Payment terms: pay = { mode: 'cash' | 'cheque' | 'mixed', cashVal, cashUnit: 'pct' | 'amt' }. Whole units only.
  payment: function (d) {
    var total = Math.round(window.MSMath.totals(d).total), p = d.pay || { mode: 'cash' }, cash;
    if (p.mode === 'cheque') cash = 0;
    else if (p.mode === 'mixed') cash = Math.round(p.cashUnit === 'amt' ? Math.min(p.cashVal || 0, total) : total * Math.min(p.cashVal || 0, 100) / 100);
    else cash = total;
    return { total: total, cash: cash, cheque: total - cash };
  }
};

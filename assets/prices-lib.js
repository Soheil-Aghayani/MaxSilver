// List prices of the catalog (toman). A seed file (assets/price-list.json, from the Mehr 1405 lists of Max Silver, Wintora and TurboMax) is the base;
// prices edited by sales management, management and organizational technology live in Firestore (list_prices) and win over the seed.
// The last edits that were read are kept on the device so prices show with no connection.
(function () {
  'use strict';
  var KEY = 'ms-list-prices-v1', fa = new Intl.NumberFormat('fa-IR');
  var seed = null, edits = {}, loading = null, VER = (document.currentScript && /[?&]v=(\d+)/.exec(document.currentScript.src) || [])[1] || '';
  try { edits = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { edits = {}; }
  // cheque price = cash price + a percentage (default and per product group, set by the price editors); a product may also carry its own cheque price
  var MKEY = 'ms-cheque-markup-v1', markup = { def: 0, byGrp: {} };
  try { markup = Object.assign({ def: 0, byGrp: {} }, JSON.parse(localStorage.getItem(MKEY) || '{}') || {}); } catch (e) { /* ignore */ }
  var listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }

  function load() {
    if (loading) return loading;
    loading = fetch('./assets/price-list.json' + (VER ? '?v=' + VER : '')).then(function (r) { return r.json(); }).then(function (j) { seed = j; return j; }, function () { seed = { items: {} }; return seed; });
    return loading;
  }
  // { p: price in toman or 0, s: 'p' price | 'i' ask for a quote | 'r' being restocked, edited: bool, at, by } or null
  function get(id) {
    var e = edits[id];
    if (e) return { p: e.p || 0, s: e.s || 'p', c: e.c || 0, edited: true, at: e.at || 0, by: e.by || '' };
    var v = seed && seed.items && seed.items[id];
    return v ? { p: v[0] || 0, s: v[1], c: 0, edited: false, at: 0, by: '' } : null;
  }
  function setEdits(map) {
    edits = map || {};
    try { localStorage.setItem(KEY, JSON.stringify(edits)); } catch (e) { /* ignore */ }
    emit();
  }
  function setOne(id, e) { if (e) edits[id] = e; else delete edits[id]; try { localStorage.setItem(KEY, JSON.stringify(edits)); } catch (x) { /* ignore */ } emit(); }
  // label shown on a card: «۴۱٬۸۰۰٬۰۰۰ تومان» or the status text
  function label(v) {
    if (!v) return '';
    if (v.s === 'i') return 'استعلام بگیرید';
    if (v.s === 'r') return 'درحال شارژ';
    if (v.s === 'n') return 'توافقی';
    return v.p > 0 ? fa.format(v.p) + ' تومان' : '';
  }
  // the cheque price in toman: the product's own, else cash + the group's percentage (rounded to 1,000 toman); 0 when the product has no cash price
  function chequeOf(v, grp) {
    if (!v || v.s !== 'p' || !(v.p > 0)) return 0;
    if (v.c > 0) return v.c;
    var g = markup.byGrp && markup.byGrp[grp], pct = typeof g === 'number' ? g : (markup.def || 0);
    return pct > 0 ? Math.round(v.p * (1 + pct / 100) / 1000) * 1000 : v.p;
  }
  function pctOf(grp) { var g = markup.byGrp && markup.byGrp[grp]; return typeof g === 'number' ? g : (markup.def || 0); }
  function setMarkup(m) {
    markup = { def: Number(m && m.def) || 0, byGrp: (m && m.byGrp) || {} };
    try { localStorage.setItem(MKEY, JSON.stringify(markup)); } catch (e) { /* ignore */ }
    emit();
  }
  // digits of any script -> a number
  function parse(s) {
    var t = String(s == null ? '' : s).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[^\d]/g, '');
    return t ? Number(t) : 0;
  }
  window.MSPrices = {
    load: load, get: get, setEdits: setEdits, setOne: setOne, label: label, cheque: chequeOf, pct: pctOf, setMarkup: setMarkup, markup: function () { return markup; }, parse: parse, fmt: function (n) { return fa.format(n || 0); },
    onChange: function (f) { listeners.push(f); }, seed: function () { return seed; }, edits: function () { return edits; }, date: function () { return seed && seed.date || ''; }
  };
})();

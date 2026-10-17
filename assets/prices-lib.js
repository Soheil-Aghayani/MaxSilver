// List prices of the catalog (toman). A seed file (assets/price-list.json, from the TurboMax price list) is the base;
// prices edited by sales management, management and organizational technology live in Firestore (list_prices) and win over the seed.
// The last edits that were read are kept on the device so prices show with no connection.
(function () {
  'use strict';
  var KEY = 'ms-list-prices-v1', fa = new Intl.NumberFormat('fa-IR');
  var seed = null, edits = {}, loading = null, VER = (document.currentScript && /[?&]v=(\d+)/.exec(document.currentScript.src) || [])[1] || '';
  try { edits = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { edits = {}; }
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
    if (e) return { p: e.p || 0, s: e.s || 'p', edited: true, at: e.at || 0, by: e.by || '' };
    var v = seed && seed.items && seed.items[id];
    return v ? { p: v[0] || 0, s: v[1], edited: false, at: 0, by: '' } : null;
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
    return v.p > 0 ? fa.format(v.p) + ' تومان' : '';
  }
  // digits of any script -> a number
  function parse(s) {
    var t = String(s == null ? '' : s).replace(/[۰-۹]/g, function (d) { return d.charCodeAt(0) - 1776; }).replace(/[٠-٩]/g, function (d) { return d.charCodeAt(0) - 1632; }).replace(/[^\d]/g, '');
    return t ? Number(t) : 0;
  }
  window.MSPrices = {
    load: load, get: get, setEdits: setEdits, setOne: setOne, label: label, parse: parse, fmt: function (n) { return fa.format(n || 0); },
    onChange: function (f) { listeners.push(f); }, seed: function () { return seed; }, edits: function () { return edits; }, date: function () { return seed && seed.date || ''; }
  };
})();

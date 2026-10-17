// Product code status. A product whose code is no longer used, or has a replacement code, is «retired»: it leaves the catalog
// for sales, the planner and new proformas. The status lives in Firestore (item_status/<product id>), set by sales management,
// management and organizational technology; the last copy read is kept on the device so it also works with no connection.
(function () {
  'use strict';
  var KEY = 'ms-item-status-v1', map = {}, listeners = [];
  try { map = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { map = {}; }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } }); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* ignore */ } }
  // { rep: id of the replacement product or '', note, at, by } or null when the product is in use
  function get(id) { return map[id] || null; }
  function retired(id) { return !!map[id]; }
  function setAll(m) { map = m || {}; save(); emit(); }
  function setOne(id, v) { if (v) map[id] = v; else delete map[id]; save(); emit(); }
  window.MSStatus = {
    get: get, retired: retired, setAll: setAll, setOne: setOne, all: function () { return map; },
    onChange: function (f) { listeners.push(f); }
  };
})();

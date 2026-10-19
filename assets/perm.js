// Who may load or replace data. The owner (role manager) always may. He can also name people for each task on the page «دسترسی‌ها»
// (Firestore settings/permissions: { roadmapEdit: [uid], competitorsEdit: [uid], warehouseEdit: [uid], customerImport: [uid] }).
// A task he has not configured keeps the role list of assets/roles.js. firestore.rules enforces the same thing; this file only decides what the pages show.
(function (w) {
  'use strict';
  var KEY = 'ms-perm-v1', doc = {}, listeners = [];
  try { doc = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { doc = {}; }
  var TASKS = {
    roadmapEdit: 'بارگذاری و جایگزینی نقشهٔ راه',
    competitorsEdit: 'بارگذاری و جایگزینی فایل تحلیل رقبا',
    warehouseEdit: 'ثبت و بارگذاری موجودی انبار',
    customerImport: 'بارگذاری گزارش فروش و ویرایش کامل پایگاه مشتریان'
  };
  function configured(cap) { return !!(doc && Array.isArray(doc[cap])); }
  // role: the person's role, uid: their account id, area: a task above or any role area
  function can(role, uid, area) {
    var R = w.MSRoles; if (!R) return false;
    if (R.norm(role) === 'manager') return true;
    if (TASKS[area] && configured(area)) return !!(uid && doc[area].indexOf(uid) >= 0);
    return R.can(role, area);
  }
  function set(d) {
    doc = d && typeof d === 'object' ? d : {};
    try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch (e) { /* ignore */ }
    listeners.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
  }
  function load(db) {
    return db.collection('settings').doc('permissions').get().then(function (s) { set(s.exists ? s.data() : {}); }, function () { /* offline or rules not published: keep the last copy */ });
  }
  w.MSPerm = { TASKS: TASKS, can: can, set: set, load: load, doc: function () { return doc; }, configured: configured, onChange: function (f) { listeners.push(f); } };
})(window);

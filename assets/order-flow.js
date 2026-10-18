// The stages of an order, shared by the purchase-request page (crm.js), the pre-invoice sync (sync.js) and the panel (panel.js).
// A purchase request (requests/<code>) carries `stage`. Who may move it where is enforced by firestore.rules; this file only names the
// stages and writes the changes (best effort: a failure here never blocks the pre-invoice work that triggered it).
//   request -> confirmed (specialist called) -> preinvoice (pre-invoice issued) -> accepted (account manager) | rejected (waits for the
//   sales manager) -> warehouse | production (account manager routes) -> ready -> shipped -> delivered; returned; cancelled
(function (w) {
  'use strict';
  var STAGES = [['request', 'درخواست'], ['confirmed', 'تأیید کارشناس'], ['preinvoice', 'پیش‌فاکتور صادر شد'], ['rejected', 'رد اکانت منیجر'], ['accepted', 'تأیید اکانت منیجر'],
    ['warehouse', 'در انبار'], ['production', 'در تولید'], ['ready', 'آمادهٔ ارسال'], ['shipped', 'ارسال شد'], ['delivered', 'تحویل شد'], ['returned', 'مرجوع شد'], ['cancelled', 'لغو شد']];
  var LABEL = {}, ORDER = {};
  STAGES.forEach(function (s, i) { LABEL[s[0]] = s[1]; ORDER[s[0]] = i; });
  var CLOSED = ['delivered', 'returned', 'cancelled'];
  // old requests have no stage: it follows the older status field
  function stageOf(x) {
    if (x && x.stage && LABEL[x.stage]) return x.stage;
    var s = x && x.status;
    return s === 'won' ? 'delivered' : s === 'lost' ? 'cancelled' : s === 'quoted' ? 'preinvoice' : s === 'contacted' ? 'confirmed' : 'request';
  }
  // the older status field kept in step for the roles whose rules allow writing it
  var STATUS_FOR = { confirmed: 'contacted', preinvoice: 'quoted', delivered: 'won', cancelled: 'lost' };
  // fields: the changes on requests/<code>; text: one line for its history; who: { uid, name }. Resolves either way.
  function link(db, code, fields, text, who) {
    if (!db || !code) return Promise.resolve(false);
    var now = Date.now(), ref = db.collection('requests').doc(code), b = db.batch(), upd = Object.assign({ updatedAt: now }, fields);
    if (text) upd.lastNote = String(text).slice(0, 400);
    b.update(ref, upd);
    b.set(ref.collection('log').doc(), { at: now, by: who.uid, byName: who.name || '', kind: 'status', text: String(text || '').slice(0, 400) });
    return b.commit().then(function () { return true; }, function () { return false; });
  }
  w.MSOrder = { STAGES: STAGES, LABEL: LABEL, ORDER: ORDER, CLOSED: CLOSED, STATUS_FOR: STATUS_FOR, stageOf: stageOf, link: link };
})(window);

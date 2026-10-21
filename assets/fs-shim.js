(function (w) {
  'use strict';
  // A drop-in for the part of the Firebase SDK the portal screens use (auth + Firestore), backed by the Max Silver server (/api/v1).
  // It is installed ONLY when the server address is set (api-client.js); otherwise nothing changes and the real Firebase SDK is used as before. Load order on a page: Firebase SDK, api-config, api-client, this file, firebase-config.
  var A = w.MSApi;
  if (!A || !A.enabled || !A.enabled() || !A.raw) return;
  var POLL = 6000, ME = null, authCbs = [];
  if (!w.MS_FIREBASE) w.MS_FIREBASE = { projectId: 'max-silver-server' };   // pages without firebase-config.js: tells features.js and notify.js a database exists (firebase-config.js replaces it where loaded)

  function fsErr(e) {
    var s = e && e.status, code = s === 0 ? 'unavailable' : (s === 401 || s === 403) ? 'permission-denied' : s === 404 ? 'not-found' : s === 409 ? 'aborted' : s === 422 || s === 413 ? 'invalid-argument' : s === 429 ? 'resource-exhausted' : 'unknown';
    return { code: code, message: (e && e.message) || '', status: s };
  }
  function call(m, p, b) { return A.raw(m, p, b).then(null, function (e) { throw fsErr(e); }); }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function enc(p) { return p.split('/').map(encodeURIComponent).join('/'); }

  // ---------------------------------------------------------------- adapters: where a collection lives
  var cache = { at: 0, p: null };
  function pricesState() {
    if (cache.p && Date.now() - cache.at < 3000) return cache.p;
    cache.at = Date.now(); cache.p = A.pricesState().then(null, function (e) { cache.p = null; throw fsErr(e); });
    return cache.p;
  }
  function fromPrices(map) { return Object.keys(map || {}).map(function (id) { return { id: id, data: clone(map[id]) }; }); }

  var ADAPT = {
    users: {
      list: function () { return call('GET', 'udocs'); },
      get: function (id) { return call('GET', 'udocs/' + encodeURIComponent(id)).then(null, function (e) { if (e.code === 'not-found' || e.code === 'permission-denied') return { exists: false }; throw e; }); },
      set: function (id, d) { return call('PATCH', 'udocs/' + encodeURIComponent(id), { data: d }); },
      update: function (id, d) { return call('PATCH', 'udocs/' + encodeURIComponent(id), { data: d }); },
      del: function (id) { return call('DELETE', 'udocs/' + encodeURIComponent(id)); }
    },
    requests: {
      list: function () { return call('GET', 'requests').then(function (l) { return l.map(function (x) { return { id: x.code, data: x }; }); }); },
      get: function (id) { return call('GET', 'requests/' + encodeURIComponent(id)).then(function (x) { return { exists: true, data: x }; }, function (e) { if (e.code === 'not-found') return { exists: false }; throw e; }); },
      update: function (id, d) { return call('PATCH', 'requests/' + encodeURIComponent(id), d); },
      del: function (id) { return call('DELETE', 'requests/' + encodeURIComponent(id)); }
    },
    'requests/*/log': {
      list: function (col) { return call('GET', col.replace(/\/log$/, '') .replace(/^requests\//, 'requests/') + '/log').then(function (l) { return l.map(function (x) { return { id: String(x.id), data: x }; }); }); },
      add: function (col, d) { return call('POST', col.replace(/\/log$/, '') + '/log', { kind: d.kind, text: d.text }).then(function (r) { return { id: String(r.id) }; }); },
      set: function (id, d, col) { return call('POST', col, { kind: d.kind, text: d.text }); }   // the log is append only: an id from the screen is ignored
    },
    request_status: {
      get: function (id) { return call('GET', 'public/track/' + encodeURIComponent(id)).then(function (x) { return { exists: true, data: x }; }, function () { return { exists: false }; }); },
      set: function () { return Promise.resolve(); }, update: function () { return Promise.resolve(); }, del: function () { return Promise.resolve(); }   // the server keeps the stage of a request itself
    },
    public_requests: {
      list: function () { return call('GET', 'messages').then(function (l) { return l.map(function (x) { return { id: String(x.id), data: { name: x.name, contact: x.contact, to: x.to, text: x.text, status: x.status, createdAt: Date.parse(String(x.created_at).replace(' ', 'T') + 'Z') || 0 } }; }); }); },
      update: function (id, d) { return call('PATCH', 'messages/' + encodeURIComponent(id), { status: d.status }); }
    },
    public_config: {
      list: function () { return Promise.all(['retired', 'features'].map(function (k) { return call('GET', 'public/config/' + k).then(function (x) { return { id: k, data: x }; }); })); },
      get: function (id) { return call('GET', 'public/config/' + encodeURIComponent(id)).then(function (x) { return { exists: true, data: x }; }, function () { return { exists: false }; }); },
      set: function (id, d) { return call('PUT', 'config/' + encodeURIComponent(id), id === 'retired' ? { ids: d.ids || [] } : { hidden: d.hidden || {} }); }
    },
    list_prices: {
      list: function () { return pricesState().then(function (s) { return fromPrices(s.list_prices); }); },
      set: function (id, d) { cache.p = null; return call('PUT', 'prices/' + encodeURIComponent(id), { p: d.p || 0, s: d.s || 'p', c: d.c || null }); },
      del: function (id) { cache.p = null; return call('DELETE', 'prices/' + encodeURIComponent(id)); }
    },
    item_status: {
      list: function () { return pricesState().then(function (s) { return fromPrices(s.item_status); }); },
      set: function (id, d) { cache.p = null; return call('PUT', 'item-status/' + encodeURIComponent(id), { rep: d.rep || '', note: d.note || '' }); },
      del: function (id) { cache.p = null; return call('DELETE', 'item-status/' + encodeURIComponent(id)); }
    },
    request_counters: { list: function () { return Promise.resolve([]); } },   // the server numbers requests itself
    price_log: {
      list: function () { return call('GET', 'prices/log').then(function (l) { return l.map(function (x, i) { return { id: String(i), data: x }; }); }); },
      set: function () { return Promise.resolve(); }      // the server writes the history line with the price
    },
    settings: {
      list: function () { return pricesState().then(function (s) { return ['price_editors', 'cheque_markup', 'permissions'].filter(function (k) { return s[k]; }).map(function (k) { return { id: k, data: clone(s[k]) }; }); }); },
      get: function (id) {
        return pricesState().then(function (s) { var v = s[id]; return v ? { exists: true, data: clone(v) } : { exists: false }; });
      },
      set: function (id, d) {
        cache.p = null;
        if (id === 'price_editors') { var uids = (d.uids || []).map(Number); return call('PUT', 'settings/price_editors', { uids: uids, names: (d.uids || []).map(function (u) { return String((d.names || {})[u] || u).slice(0, 80); }) }); }
        if (id === 'permissions') return call('PUT', 'settings/permissions', d);
        if (id === 'cheque_markup') return call('PUT', 'settings/cheque_markup', { def: d.def, byGrp: d.byGrp || {} });
        return Promise.reject({ code: 'permission-denied' });
      }
    }
  };
  ADAPT.settings.get = ADAPT.settings.get;
  function adapterFor(col) {
    if (ADAPT[col]) return ADAPT[col];
    if (/^requests\/[^/]+\/log$/.test(col)) return ADAPT['requests/*/log'];
    return null;     // the generic document store
  }
  var DOCS = {
    get: function (path) { return call('GET', 'db/' + enc(path)); },
    list: function (col, q) {
      var qs = [];
      if (q.wheres.length) qs.push('where=' + encodeURIComponent(JSON.stringify(q.wheres)));
      if (q.order) qs.push('orderBy=' + encodeURIComponent(JSON.stringify(q.order)));
      if (q.lim) qs.push('limit=' + q.lim);
      return call('GET', 'db/' + enc(col) + (qs.length ? '?' + qs.join('&') : '')).then(function (r) { return r.docs.map(function (d) { return { id: d.id, data: d.data, v: d.updatedAt }; }); });
    }
  };

  // ---------------------------------------------------------------- snapshots and references
  function DocSnap(id, ref, exists, data, v) { this.id = id; this.ref = ref; this.exists = !!exists; this._d = data; this.v = v || 0; this.metadata = { fromCache: false, hasPendingWrites: false }; }
  DocSnap.prototype.data = function () { return this.exists ? clone(this._d) : undefined; };
  DocSnap.prototype.get = function (f) { return this.exists && this._d ? this._d[f] : undefined; };
  function QSnap(docs) { this.docs = docs; this.size = docs.length; this.empty = !docs.length; }
  QSnap.prototype.forEach = function (fn) { this.docs.forEach(fn); };
  QSnap.prototype.docChanges = function () { return this.docs.map(function (d) { return { type: 'added', doc: d }; }); };

  function match(d, w) {
    var v = d[w[0]];
    if (w[1] === '==') return v === w[2] || (typeof v === 'number' && String(v) === String(w[2]));
    if (w[1] === 'array-contains') return Array.isArray(v) && v.indexOf(w[2]) >= 0;
    return true;
  }
  function applyQuery(rows, q) {
    var r = rows.filter(function (x) { return q.wheres.every(function (wh) { return match(x.data || {}, wh); }); });
    if (q.order) { var f = q.order[0], dir = q.order[1] === 'desc' ? -1 : 1; r.sort(function (a, b) { var x = (a.data || {})[f], y = (b.data || {})[f]; return dir * (x > y ? 1 : x < y ? -1 : 0); }); }
    return q.lim ? r.slice(0, q.lim) : r;
  }

  function sameDocs(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function poll(read, deliver, fail) {
    var stopped = false, last = null, timer = null, first = true;
    function tick() {
      if (stopped) return;
      // the first read always runs; later ones wait while the tab is in the background
      if (!first && document.visibilityState === 'hidden') { timer = setTimeout(tick, POLL); return; }
      first = false;
      read().then(function (v) {
        if (stopped) return;
        var sig = JSON.stringify(v);
        if (sig !== last) { last = sig; deliver(v); }
      }, function (e) { if (!stopped && fail) fail(e); }).then(function () { if (!stopped) timer = setTimeout(tick, POLL); });
    }
    tick();
    return function () { stopped = true; clearTimeout(timer); };
  }

  function Query(col, q) { this.path = col; this._q = q || { wheres: [], order: null, lim: 0 }; }
  Query.prototype._with = function (f) { var q = { wheres: this._q.wheres.slice(), order: this._q.order, lim: this._q.lim }; f(q); return new Query(this.path, q); };
  Query.prototype.where = function (f, op, v) { return this._with(function (q) { q.wheres.push([f, op, v]); }); };
  Query.prototype.orderBy = function (f, dir) { return this._with(function (q) { q.order = [f, dir || 'asc']; }); };
  Query.prototype.limit = function (n) { return this._with(function (q) { q.lim = n; }); };
  Query.prototype._read = function () {
    var self = this, ad = adapterFor(this.path.replace(/\/$/, ''));
    var p = ad && ad.list ? ad.list(this.path) : ad ? Promise.reject({ code: 'permission-denied' }) : DOCS.list(this.path, this._q);
    return p.then(function (rows) {
      return applyQuery(rows, self._q).map(function (x) { return { id: x.id, data: x.data, v: x.v }; });
    });
  };
  Query.prototype._snap = function (rows) {
    var col = this.path;
    return new QSnap(rows.map(function (x) { return new DocSnap(x.id, new DocRef(col + '/' + x.id), true, x.data, x.v); }));
  };
  Query.prototype.get = function () { var s = this; return this._read().then(function (r) { return s._snap(r); }); };
  Query.prototype.onSnapshot = function (ok, bad) { var s = this; return poll(function () { return s._read(); }, function (r) { ok(s._snap(r)); }, function (e) { if (bad) bad(e); }); };

  function CollectionReference(path) { Query.call(this, path); this.id = path.split('/').pop(); }
  CollectionReference.prototype = Object.create(Query.prototype);
  CollectionReference.prototype.doc = function (id) { return new DocRef(this.path + '/' + (id || randomId())); };
  CollectionReference.prototype.add = function (data) {
    var col = this.path, ad = adapterFor(col);
    if (ad && ad.add) return ad.add(col, clone(data)).then(function (r) { return new DocRef(col + '/' + r.id); });
    if (ad) return Promise.reject({ code: 'permission-denied' });
    return call('POST', 'db/' + enc(col), { data: data }).then(function (r) { return new DocRef(col + '/' + r.id); });
  };
  function randomId() { var a = new Uint8Array(15), s = ''; (w.crypto || w.msCrypto).getRandomValues(a); for (var i = 0; i < a.length; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[a[i] % 36]; return s; }

  function DocRef(path) { this.path = path; var p = path.split('/'); this.id = p.pop(); this.parentPath = p.join('/'); }
  DocRef.prototype.collection = function (name) { return new CollectionReference(this.path + '/' + name); };
  DocRef.prototype._get = function () {
    var self = this, ad = adapterFor(this.parentPath);
    if (ad && ad.get) return ad.get(this.id).then(function (r) { return new DocSnap(self.id, self, r.exists !== false, r.data, r.updatedAt); });
    if (ad && ad.list) return ad.list(this.parentPath).then(function (rows) { var x = rows.filter(function (y) { return y.id === self.id; })[0]; return new DocSnap(self.id, self, !!x, x && x.data, x && x.v); });
    if (ad) return Promise.reject({ code: 'permission-denied' });
    return DOCS.get(this.path).then(function (r) { return new DocSnap(self.id, self, r.exists !== false, r.data, r.updatedAt); });
  };
  DocRef.prototype.get = function () { return this._get(); };
  DocRef.prototype.onSnapshot = function (ok, bad) { var s = this; return poll(function () { return s._get().then(function (x) { return { e: x.exists, d: x._d, v: x.v }; }); }, function (v) { ok(new DocSnap(s.id, s, v.e, v.d, v.v)); }, function (e) { if (bad) bad(e); }); };
  DocRef.prototype._write = function (kind, data, opts) {
    var self = this, ad = adapterFor(this.parentPath), d = data === undefined ? data : clone(data);
    if (ad) {
      var fn = kind === 'delete' ? ad.del : kind === 'update' ? (ad.update || ad.set) : (opts && opts.merge && ad.update ? ad.update : ad.set);
      return fn ? Promise.resolve(fn(self.id, d, self.parentPath)).then(function () { return undefined; }) : Promise.reject({ code: 'permission-denied' });
    }
    if (kind === 'delete') return call('DELETE', 'db/' + enc(this.path)).then(function () { });
    if (kind === 'update') return call('PATCH', 'db/' + enc(this.path), { data: d }).then(function () { });
    return call('PUT', 'db/' + enc(this.path), { data: d, merge: !!(opts && opts.merge) }).then(function () { });
  };
  DocRef.prototype.set = function (d, o) { return this._write('set', d, o); };
  DocRef.prototype.update = function (d) { return this._write('update', d); };
  DocRef.prototype.delete = function () { return this._write('delete'); };

  // ---------------------------------------------------------------- batches and transactions
  function Batch() { this.ops = []; }
  Batch.prototype.set = function (ref, d, o) { this.ops.push({ op: 'set', ref: ref, data: clone(d), merge: !!(o && o.merge) }); return this; };
  Batch.prototype.update = function (ref, d) { this.ops.push({ op: 'update', ref: ref, data: clone(d) }); return this; };
  Batch.prototype.delete = function (ref) { this.ops.push({ op: 'delete', ref: ref }); return this; };
  Batch.prototype.commit = function (pre) {
    var generic = [], typed = [];
    this.ops.forEach(function (o) { (adapterFor(o.ref.parentPath) ? typed : generic).push(o); });
    var p = generic.length ? call('POST', 'db/batch', { ops: generic.map(function (o) { return { op: o.op, path: o.ref.path, data: o.data, merge: o.merge }; }), pre: pre || {} }) : Promise.resolve();
    return p.then(function () {
      return typed.reduce(function (c, o) {
        return c.then(function () { return o.op === 'delete' ? o.ref.delete() : o.op === 'update' ? o.ref.update(o.data) : o.ref.set(o.data, { merge: o.merge }); });
      }, Promise.resolve());
    }).then(function () { });
  };

  function Transaction() { this.versions = {}; this.b = new Batch(); }
  Transaction.prototype.get = function (ref) { var t = this; return ref._get().then(function (s) { t.versions[ref.path] = s.exists ? s.v || 0 : 0; return s; }); };
  Transaction.prototype.set = function (r, d, o) { this.b.set(r, d, o); return this; };
  Transaction.prototype.update = function (r, d) { this.b.update(r, d); return this; };
  Transaction.prototype.delete = function (r) { this.b.delete(r); return this; };

  function Firestore() { }
  Firestore.prototype.collection = function (p) { return new CollectionReference(p); };
  Firestore.prototype.doc = function (p) { return new DocRef(p); };
  Firestore.prototype.batch = function () { return new Batch(); };
  Firestore.prototype.transaction = Firestore.prototype.runTransaction = function (fn) {
    // optimistic: documents read inside carry their version; if one changed before the commit the server answers 409 and we run again
    function attempt(n) {
      var tx = new Transaction();
      return Promise.resolve(fn(tx)).then(function (result) {
        return tx.b.commit(tx.versions).then(function () { return result; }, function (e) { if (e && e.code === 'aborted' && n < 5) return attempt(n + 1); throw e; });
      });
    }
    return attempt(0);
  };
  Firestore.prototype.enableNetwork = Firestore.prototype.disableNetwork = Firestore.prototype.settings = function () { return Promise.resolve(); };
  var db = new Firestore();

  function firestore() { return db; }
  firestore.DocumentReference = DocRef; firestore.CollectionReference = CollectionReference; firestore.Query = Query;

  // ---------------------------------------------------------------- auth
  function userObj(u) {
    return { uid: String(u.id), email: u.email, displayName: u.name, isAnonymous: false, role: u.role,
      getIdToken: function () { return Promise.resolve(A.token()); },
      // the server wants the old password with the new one: it is kept from the re-authentication step
      reauthenticateWithCredential: function (c) { this._cred = c; return Promise.resolve(); },
      updatePassword: function (nw) {
        return call('POST', 'auth/password', { current: this._cred && this._cred.password, password: nw }).then(function () { }, function (e) {
          throw { code: e.status === 422 ? (/current/i.test(e.message || '') ? 'auth/wrong-password' : 'auth/weak-password') : e.code, message: e.message };
        });
      } };
  }
  function emit() { authCbs.slice().forEach(function (cb) { try { cb(ME); } catch (e) { /* ignore */ } }); }
  var started = null;
  function whoAmI() {
    if (!started) {
      var tries = 0;
      var ask = function () {
        return A.me().then(function (u) { ME = userObj(u); }, function (e) {
          // a dropped connection is tried again; a refused token means signed out
          if (e && (e.status === 0 || e.status >= 500) && ++tries < 4) return new Promise(function (ok) { setTimeout(ok, 700 * tries); }).then(ask);
          if (e && e.status === 401) A.forget();
          ME = null;
          if (w.console) console.warn('sign-in check failed', e && e.status, e && e.message);
        });
      };
      started = A.token() ? ask() : Promise.resolve(null);
    }
    return started;
  }
  var auth = {
    get currentUser() { return ME; },
    onAuthStateChanged: function (cb) {
      authCbs.push(cb);
      whoAmI().then(function () { if (authCbs.indexOf(cb) >= 0) cb(ME); });
      return function () { var i = authCbs.indexOf(cb); if (i >= 0) authCbs.splice(i, 1); };
    },
    signInWithEmailAndPassword: function (email, password, code) {
      return A.login(email, password, code).then(function (r) {
        if (r.must_enroll_2fa) throw { code: 'auth/enroll-2fa' };
        started = null; return whoAmI().then(function () { emit(); return { user: ME }; });
      }, function (e) {
        if (e && e.code === 'auth/enroll-2fa') throw e;
        if (e && e.data && e.data.need_code) throw { code: 'auth/code-required' };
        throw { code: e && e.status === 0 ? 'auth/network-request-failed' : e && e.status === 429 ? 'auth/too-many-requests' : 'auth/invalid-credential', message: e && e.message };
      });
    },
    signInAnonymously: function () { return Promise.reject({ code: 'auth/operation-not-allowed' }); },
    signOut: function () { return A.logout().then(function () { ME = null; started = null; emit(); }); },
    sendPasswordResetEmail: function () { return Promise.reject({ code: 'auth/operation-not-allowed' }); }
  };
  function authFn() { return auth; }
  authFn.EmailAuthProvider = { credential: function (email, pw) { return { email: email, password: pw }; } };

  var app = { name: '[DEFAULT]', options: {}, firestore: firestore, auth: authFn };
  w.firebase = {
    __msShim: true, apps: [app], app: function () { return app; },
    initializeApp: function () { return app; }, firestore: firestore, auth: authFn
  };
})(window);

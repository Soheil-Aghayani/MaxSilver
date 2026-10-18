// Public web-app identifiers for the Firebase project. They are not secrets: access is enforced by Firebase Authentication
// and the rules in firestore.rules, never by hiding these values.
window.MS_FIREBASE = {
  apiKey: 'AIzaSyD6Askz1Z4G6Nb1r7cdScFh9IaeLMdepS8',
  authDomain: 'maxsilver-portal.firebaseapp.com',
  projectId: 'maxsilver-portal',
  storageBucket: 'maxsilver-portal.firebasestorage.app',
  messagingSenderId: '496466651938',
  appId: '1:496466651938:web:7604cb3f8029411324537b'
};

// Some networks and VPNs let Firestore reads through but hold back its streaming writes, so a save waits for ever. Firestore is asked to
// detect that and fall back to plain long-polling requests. Every page starts Firebase with initializeApp, so the setting is applied there.
(function () {
  if (!window.firebase || !firebase.initializeApp || firebase.__msPatched) return;
  var init = firebase.initializeApp;
  firebase.__msPatched = true;
  firebase.initializeApp = function () {
    var app = init.apply(firebase, arguments);
    try { app.firestore().settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) { /* already started: keep going */ }
    return app;
  };
})();

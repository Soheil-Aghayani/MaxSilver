// Address of the Max Silver server (Laravel backend). Empty means: keep using Firebase.
// It is a public address, never a secret. Set it when the server is online, e.g. 'https://api.example.ir'.
// The GitHub Pages copy is the fallback site: it keeps working on Firebase (empty address) while the Iranian host is down.
// The server accepts the site only on https. Someone who opens the plain http address is sent to the secure one (otherwise the login looks like a dead server).
if (location.protocol === 'http:' && /(^|\.)agseyl\.ir$/i.test(location.hostname)) { location.replace('https://' + location.host + location.pathname + location.search + location.hash); }
window.MS_API_BASE =/\.github\.io$/i.test(location.hostname) ? '' : 'https://api.agseyl.ir';

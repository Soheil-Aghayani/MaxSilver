import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'ceo-dashboard.html'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'assets', 'ceo-dashboard.css'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'assets', 'ceo-dashboard.js'), 'utf8');
const register = fs.readFileSync(path.join(root, 'assets', 'sw-register.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const installScript = fs.readFileSync(path.join(root, 'assets', 'pwa.js'), 'utf8');
const gestures = require(path.join(root, 'assets', 'map-gestures.js'));

assert.equal(manifest.display, 'standalone');
assert.equal(manifest.prefer_related_applications, false);
assert.equal(manifest.start_url, './ceo-dashboard.html');
assert.equal(manifest.scope, './');
assert.ok(html.includes('rel="manifest" href="./manifest.webmanifest"'));
assert.ok(html.includes('id="installAppButton"') && html.includes('id="installInstructionsDialog"'));
assert.ok(installScript.includes("addEventListener('beforeinstallprompt'"));
assert.ok(register.includes("register(new URL('service-worker.js', base)"));
assert.ok(worker.includes("request.mode === 'navigate'"));
for (const page of ['index.html', 'ceo-dashboard.html', 'sales-analysis.html', 'sales-process.html']) assert.ok(worker.includes("'" + page + "'"), 'Service worker does not pre-cache ' + page);
assert.ok(/VERSION = 'v\d+-/.test(worker), 'Service worker cache must be versioned');
assert.ok(worker.includes("pathname.includes('/data/')"), 'User data must bypass the cache');
assert.doesNotMatch(worker, /source-reports|\.xls/i, 'Raw source workbooks must never enter the offline cache');
assert.ok(html.includes('touch-action: none;') && html.includes('activeTouchPointers') && html.includes('pinchState'));
assert.ok(html.includes('zoomAtPoint(zoom * distance / pinchState.distance'));

for (const icon of manifest.icons) {
  const iconPath = path.join(root, icon.src.replace(/^\.\//, '').replaceAll('/', path.sep));
  assert.ok(fs.existsSync(iconPath), `Missing app icon ${icon.src}`);
  const png = fs.readFileSync(iconPath);
  assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a', `${icon.src} is not PNG`);
  assert.equal(png.readUInt32BE(16), Number(icon.sizes.split('x')[0]), `${icon.src} width mismatch`);
  assert.equal(png.readUInt32BE(20), Number(icon.sizes.split('x')[1]), `${icon.src} height mismatch`);
}

assert.equal(gestures.distance({ x: 1, y: 1 }, { x: 4, y: 5 }), 5);
assert.deepEqual(gestures.midpoint({ x: 0, y: 2 }, { x: 10, y: 8 }), { x: 5, y: 5 });
const base = { x: 100, y: 200, w: 1000, h: 800 };
const viewport = { left: 20, top: 40, width: 400, height: 320 };
const point = { x: 170, y: 200 };
const anchor = { x: base.x + (point.x - viewport.left) / viewport.width * base.w, y: base.y + (point.y - viewport.top) / viewport.height * base.h };
const pan = gestures.panForAnchor({ base, anchor, point, content: viewport, viewport, zoom: 2 });
const visibleWidth = base.w / 2;
const visibleHeight = base.h / 2;
const viewX = base.x + (base.w - visibleWidth) / 2 - pan.x * visibleWidth / viewport.width;
const viewY = base.y + (base.h - visibleHeight) / 2 - pan.y * visibleHeight / viewport.height;
assert.ok(Math.abs(viewX + (point.x - viewport.left) / viewport.width * visibleWidth - anchor.x) < 1e-9, 'Pinch focal point moved horizontally');
assert.ok(Math.abs(viewY + (point.y - viewport.top) / viewport.height * visibleHeight - anchor.y) < 1e-9, 'Pinch focal point moved vertically');

console.log(JSON.stringify({ pwaManifest: 'ok', installUI: 'ok', offlineShell: 'ok', rawWorkbookCaching: 'excluded', iconSizes: manifest.icons.map((icon) => icon.sizes), pinchMath: 'ok' }, null, 2));

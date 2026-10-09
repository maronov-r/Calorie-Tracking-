// Copies the app into www/ for the iPhone build (Capacitor).
// The phone app talks to the Plate server for the coach, like /beta/, and keeps data on the phone.
import fs from 'node:fs';

const out = 'www';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const dir of ['css', 'js', 'data', 'icons']) fs.cpSync(dir, `${out}/${dir}`, { recursive: true });
fs.copyFileSync('manifest.webmanifest', `${out}/manifest.webmanifest`);

const SERVER = 'https://plate-api.mreuvenaronov.workers.dev';
let page = fs.readFileSync('index.html', 'utf8');
const tag = '<script type="module" src="js/app.js"></script>';
if (!page.includes(tag)) throw new Error('index.html: app script tag not found');
page = page.replace(tag, `<script>window.PLATE_SERVER = '${SERVER}';</script>\n  ${tag}`);

// ---- iPhone-app-only changes (www/ is only used by the Capacitor app, never by the website) ----

// No pinch-zoom, and no zoom-in when tapping a text field, like a native app.
const viewport = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
if (!page.includes(viewport)) throw new Error('index.html: viewport tag not found');
page = page.replace(viewport, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">');

// Status bar + keyboard helpers, and no rubber-band bounce on the page itself.
fs.copyFileSync('scripts/native/native.js', `${out}/js/native.js`);
// A solid strip behind the status bar, so page content doesn't scroll underneath the clock.
const nativeCss = [
  'html.native, html.native body { overscroll-behavior: none; }',
  "html.native body::before { content: ''; position: fixed; top: 0; left: 0; right: 0; height: env(safe-area-inset-top); background: var(--bg); z-index: 45; pointer-events: none; }",
].join(' ');
page = page.replace(tag, `<script src="js/native.js"></script>\n  <style>${nativeCss}</style>\n  ${tag}`);

fs.writeFileSync(`${out}/index.html`, page);

// The service worker (offline cache) is a website feature; skip registering it inside the app.
const appJs = `${out}/js/app.js`;
const swCheck = "if ('serviceWorker' in navigator && !local) {";
let app = fs.readFileSync(appJs, 'utf8');
if (!app.includes(swCheck)) throw new Error('js/app.js: service worker check not found');
fs.writeFileSync(appJs, app.replace(swCheck, "if ('serviceWorker' in navigator && !local && !window.Capacitor) {"));

// In the app, the icon picker really changes the home screen icon, so drop the website's "browser tab" note.
const spJs = `${out}/js/views/supporter.js`;
const iconNote = 'Applies on the App Store version. Here it changes the browser tab icon.';
let sp = fs.readFileSync(spJs, 'utf8');
if (!sp.includes(iconNote)) throw new Error('js/views/supporter.js: app icon note not found');
fs.writeFileSync(spJs, sp.replace(iconNote, 'Changes your home screen icon.'));
console.log('www/ ready');

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
fs.writeFileSync(`${out}/index.html`, page);
console.log('www/ ready');

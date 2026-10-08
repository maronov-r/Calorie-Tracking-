import { html, useState, useEffect, useRef } from '../vendor/preact.js';
import { state } from '../store.js';
import { Icon } from '../ui.js';
import { customFood } from '../foods.js';
import { lookupBarcode } from '../off.js';

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
let detectorPromise = null;

// Native BarcodeDetector where it exists (Android Chrome); a WebAssembly fallback elsewhere (iPhone Safari).
function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      if ('BarcodeDetector' in window) {
        try {
          const supported = await window.BarcodeDetector.getSupportedFormats();
          if (supported.includes('ean_13')) return new window.BarcodeDetector({ formats: FORMATS.filter((f) => supported.includes(f)) });
        } catch (e) { /* fall through to the polyfill */ }
      }
      const { BarcodeDetector, prepareZXingModule } = await import('../vendor/barcode.js');
      await prepareZXingModule({
        overrides: {
          locateFile: (path, prefix) => (path.endsWith('.wasm') ? new URL(`../vendor/${path}`, import.meta.url).href : prefix + path),
        },
        fireImmediately: true,
      });
      return new BarcodeDetector({ formats: FORMATS });
    })();
    detectorPromise.catch(() => { detectorPromise = null; });
  }
  return detectorPromise;
}

const MESSAGES = {
  starting: 'Starting camera…',
  scanning: 'Point at the barcode on the package',
  looking: 'Looking it up…',
  denied: 'Camera access is blocked. Allow it when asked, or type the number below.',
  nocam: 'No camera available. Type the barcode number below.',
  offline: "Couldn't reach Open Food Facts. Check your connection and try again.",
};

export function ScanPane({ onFound, onCreate, onDescribe }) {
  const videoRef = useRef();
  const stopRef = useRef(() => {});
  const [st, setSt] = useState('starting');
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stream;
    let timer;
    let dead = false;
    const stop = () => { dead = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
    stopRef.current = stop;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('No camera'), { name: 'NoCamera' });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (dead) return stop();
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        const detector = await getDetector();
        if (dead) return;
        setSt('scanning');
        const tick = async () => {
          if (dead) return;
          if (video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              const hit = codes.find((c) => /^\d{8,14}$/.test(c.rawValue));
              if (hit && !dead) { stop(); lookup(hit.rawValue); return; }
            } catch (e) { /* frame not ready */ }
          }
          timer = setTimeout(tick, 150);
        };
        tick();
      } catch (e) {
        if (!dead) setSt(e.name === 'NotAllowedError' ? 'denied' : 'nocam');
      }
    })();
    return stop;
  }, [attempt]);

  async function lookup(c) {
    stopRef.current();
    setCode(c);
    setSt('looking');
    const mine = state.customFoods.find((f) => f.barcode === c);
    if (mine) return onFound(customFood(mine));
    try {
      const food = await lookupBarcode(c);
      if (food) onFound(food);
      else setSt('notfound');
    } catch (e) {
      setSt('offline');
    }
  }

  const retry = () => { setCode(''); setTyped(''); setSt('starting'); setAttempt((a) => a + 1); };
  const cameraLive = st === 'starting' || st === 'scanning';

  return html`
    <div class="sheet-body">
      ${st !== 'notfound' && html`
        <div class="scan-view ${cameraLive ? '' : 'idle'}">
          <video ref=${videoRef} playsinline muted autoplay />
          <div class="scan-frame">${st === 'scanning' && html`<span class="scan-line" />`}</div>
          ${st === 'looking' && html`<div class="scan-overlay"><span class="spinner light" /></div>`}
        </div>
        <p class="scan-help">${MESSAGES[st]}</p>`}

      ${st === 'notfound' && html`
        <div class="scan-miss">
          <div class="empty-icon"><${Icon} name="barcode" size=${26} /></div>
          <p class="empty-title">Not in the database yet</p>
          <p class="empty-body">Barcode ${code} isn't in Open Food Facts. Enter it from the label once and Plate will remember it.</p>
          <button type="button" class="btn btn-primary btn-block" onClick=${() => onCreate(code)}>Enter from the label</button>
          <button type="button" class="btn btn-quiet btn-block" onClick=${onDescribe}><${Icon} name="sparkle" size=${18} /> Describe it instead</button>
          <button type="button" class="link" onClick=${retry}>Scan something else</button>
        </div>`}

      ${(st === 'offline' || st === 'denied' || st === 'nocam') && html`<button type="button" class="btn btn-quiet btn-block" onClick=${retry}>Try again</button>`}

      ${st !== 'notfound' && html`
        <form class="type-code" onSubmit=${(e) => { e.preventDefault(); const c = typed.replace(/\D/g, ''); if (c.length >= 6) lookup(c); }}>
          <input type="text" inputmode="numeric" placeholder="Or type the barcode number" value=${typed}
            onInput=${(e) => setTyped(e.currentTarget.value)} enterkeyhint="search" />
          <button type="submit" class="btn btn-quiet" disabled=${typed.replace(/\D/g, '').length < 6}>Look up</button>
        </form>`}
    </div>`;
}

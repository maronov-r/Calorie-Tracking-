// Minimal IndexedDB key-value store. All app data lives on this device only.
const DB_NAME = 'plate';
const STORE = 'kv';
let dbPromise;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const idbGet = (key) => run('readonly', (s) => s.get(key));
export const idbSet = (key, value) => run('readwrite', (s) => { s.put(value, key); });
export const idbDel = (key) => run('readwrite', (s) => { s.delete(key); });
export const idbClear = () => run('readwrite', (s) => { s.clear(); });

export function idbEntries() {
  return open().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const keys = store.getAllKeys();
    const values = store.getAll();
    tx.oncomplete = () => resolve(keys.result.map((k, i) => [k, values.result[i]]));
    tx.onerror = () => reject(tx.error);
  }));
}

export function idbSetMany(pairs) {
  return run('readwrite', (s) => { for (const [k, v] of pairs) s.put(v, k); });
}

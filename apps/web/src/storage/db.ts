import type { WordPack } from '@party/impostor-engine';

/** IndexedDB holds custom word packs so they survive reloads and work offline. */
const DB_NAME = 'gameroom';
/** The database was called "parlor" before the rename. Its packs are copied across once, then it is deleted. */
const LEGACY_DB_NAME = 'parlor';
const STORE = 'wordPacks';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('Saving is not available in this browser mode.'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'id' }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Could not open storage.'));
  });
}

async function migrateLegacyDb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const old = await new Promise<IDBDatabase | null>((resolve, reject) => {
      const req = indexedDB.open(LEGACY_DB_NAME); // no version: never upgrades an existing database
      let fresh = false;
      req.onupgradeneeded = () => { fresh = true; }; // it did not exist; opening just created an empty one
      req.onsuccess = () => {
        if (fresh || !req.result.objectStoreNames.contains(STORE)) { req.result.close(); indexedDB.deleteDatabase(LEGACY_DB_NAME); resolve(null); } else resolve(req.result);
      };
      req.onerror = () => reject(req.error ?? new Error('Could not open old storage.'));
    });
    if (!old) return;
    const packs = await new Promise<WordPack[]>((resolve, reject) => {
      const t = old.transaction(STORE, 'readonly');
      const rq = t.objectStore(STORE).getAll();
      t.oncomplete = () => resolve(rq.result as WordPack[]);
      t.onerror = t.onabort = () => reject(t.error ?? new Error('Could not read old packs.'));
    });
    old.close();
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const s = t.objectStore(STORE);
      for (const p of packs) {
        const g = s.get(p.id);
        g.onsuccess = () => { if (!g.result) s.put(p); }; // a pack already saved under the new name wins
      }
      t.oncomplete = () => { db.close(); resolve(); };
      t.onerror = t.onabort = () => { db.close(); reject(t.error ?? new Error('Could not copy packs.')); };
    });
    indexedDB.deleteDatabase(LEGACY_DB_NAME); // only reached when every pack was copied
  } catch { /* leave the old database untouched; the next load tries again */ }
}

let migration: Promise<void> | null = null;
async function open(): Promise<IDBDatabase> {
  migration ??= migrateLegacyDb();
  await migration;
  return openDb();
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const rq = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(rq.result); };
    t.onerror = () => { db.close(); reject(t.error ?? new Error('Storage failed.')); };
    t.onabort = () => { db.close(); reject(t.error ?? new Error('Storage failed.')); };
  });
}

export const listPacks = () => run<WordPack[]>('readonly', (s) => s.getAll());
export const savePack = (p: WordPack) => run('readwrite', (s) => s.put(p));
export const deletePack = (id: string) => run('readwrite', (s) => s.delete(id));

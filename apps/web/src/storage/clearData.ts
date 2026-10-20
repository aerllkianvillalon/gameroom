import { CURRENT_PREFIX, LEGACY_PREFIX } from './migrate';

type KeyStore = Pick<Storage, 'key' | 'removeItem' | 'length'>;

/** Remove every GameRoom key (and any leftover Parlor key) from a Storage. Returns how many were removed. */
export function clearStoredKeys(store: KeyStore): number {
  const keys: string[] = [];
  try {
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k && (k.startsWith(CURRENT_PREFIX) || k.startsWith(LEGACY_PREFIX))) keys.push(k);
    }
    for (const k of keys) store.removeItem(k);
  } catch { /* storage blocked: nothing to clear */ }
  return keys.length;
}

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve();
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = req.onerror = req.onblocked = () => resolve();
    } catch { resolve(); }
  });
}

/** Wipes name, avatar, settings, saved seat, recent rooms and word packs from this browser. Reload afterwards. */
export async function clearLocalData(): Promise<void> {
  try { clearStoredKeys(window.localStorage); } catch { /* blocked */ }
  await Promise.all([deleteDb('gameroom'), deleteDb('parlor')]);
}

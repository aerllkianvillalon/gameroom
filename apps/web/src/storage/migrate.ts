/** The app used to be called Parlor. Its storage keys were prefixed "parlor." and are now "gameroom.". */
export const LEGACY_PREFIX = 'parlor.';
export const CURRENT_PREFIX = 'gameroom.';

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

/**
 * One-time move of every "parlor.*" value to its "gameroom.*" key, then delete the old key.
 * Safe to run on every load: once the old keys are gone it does nothing.
 * If a new key already exists it wins (it is newer); the old key is still removed.
 * Returns how many old keys were handled. Never throws: storage can be blocked or full.
 */
export function migrateLegacyKeys(store: KeyValueStore): number {
  let handled = 0;
  try {
    const legacy: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k && k.startsWith(LEGACY_PREFIX)) legacy.push(k);
    }
    for (const oldKey of legacy) {
      const value = store.getItem(oldKey);
      const newKey = CURRENT_PREFIX + oldKey.slice(LEGACY_PREFIX.length);
      try {
        if (value !== null && store.getItem(newKey) === null) store.setItem(newKey, value);
        // Only delete the old value once the new one is really there.
        if (value === null || store.getItem(newKey) !== null) { store.removeItem(oldKey); handled += 1; }
      } catch { /* quota or blocked: leave the old key so a later load can retry */ }
    }
  } catch { /* storage unavailable: nothing to migrate */ }
  return handled;
}

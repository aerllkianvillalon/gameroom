/** Injected randomness so engines are deterministic under test. */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** Returns a shuffled copy (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
}

/** mulberry32: small, fast, seedable. Not for security; ids and codes only need unpredictability to casual players. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (max: number) => {
    if (!Number.isInteger(max) || max <= 0) throw new RangeError('maxExclusive must be a positive integer');
    return Math.floor(next() * max);
  };
  return {
    next,
    int,
    pick: (items) => {
      if (items.length === 0) throw new RangeError('Cannot pick from an empty list');
      return items[int(items.length)] as (typeof items)[number];
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [out[i], out[j]] = [out[j] as (typeof out)[number], out[i] as (typeof out)[number]];
      }
      return out;
    },
  };
}

/** Uses Web Crypto (available even on plain-http LAN pages, unlike randomUUID). */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] as number;
}

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
export function createId(rng: Rng, length = 10): string {
  let s = '';
  for (let i = 0; i < length; i++) s += ID_CHARS[rng.int(ID_CHARS.length)];
  return s;
}

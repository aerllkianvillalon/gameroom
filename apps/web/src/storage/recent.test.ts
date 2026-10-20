import { beforeEach, describe, expect, it } from 'vitest';
import { addRecentRoom, getRecentRooms } from './recent';

function installStorage() {
  const m = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  };
}

describe('recent rooms', () => {
  beforeEach(installStorage);
  it('keeps newest first, dedupes by code and caps at five', () => {
    for (const c of ['AAAAA', 'BBBBB', 'CCCCC', 'DDDDD', 'EEEEE', 'FFFFF']) addRecentRoom({ code: c, gameId: 'uno' }, 1000);
    addRecentRoom({ code: 'DDDDD', gameId: 'impostor' }, 2000);
    const r = getRecentRooms(3000);
    expect(r.map((x) => x.code)).toEqual(['DDDDD', 'FFFFF', 'EEEEE', 'CCCCC', 'BBBBB']);
    expect(r[0]?.gameId).toBe('impostor');
  });
  it('drops rooms older than a day and survives corrupt data', () => {
    addRecentRoom({ code: 'AAAAA', gameId: 'uno' }, 0);
    expect(getRecentRooms(25 * 60 * 60 * 1000)).toEqual([]);
    localStorage.setItem('gameroom.recentRooms.v1', '{nope');
    expect(getRecentRooms()).toEqual([]);
  });
});

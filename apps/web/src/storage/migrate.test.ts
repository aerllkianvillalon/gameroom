import { beforeEach, describe, expect, it } from 'vitest';
import { migrateLegacyKeys } from './migrate';

function fakeStore(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); },
    removeItem: (k: string) => { m.delete(k); },
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}

describe('parlor to gameroom storage migration', () => {
  let s: ReturnType<typeof fakeStore>;
  beforeEach(() => {
    s = fakeStore({
      'parlor.prefs.v1': '{"state":{"playerName":"Mia"}}',
      'parlor.session.v1': '{"code":"ABCDE","playerId":"p1","token":"t"}',
      'parlor.recentWords.v1': '["apple"]',
      'parlor.recentRooms.v1': '[]',
      'unrelated': 'keep me',
    });
  });

  it('copies every old key to the new prefix and deletes the old ones', () => {
    expect(migrateLegacyKeys(s)).toBe(4);
    expect(s.getItem('gameroom.prefs.v1')).toBe('{"state":{"playerName":"Mia"}}');
    expect(s.getItem('gameroom.session.v1')).toBe('{"code":"ABCDE","playerId":"p1","token":"t"}');
    expect(s.getItem('gameroom.recentWords.v1')).toBe('["apple"]');
    expect(s.getItem('gameroom.recentRooms.v1')).toBe('[]');
    expect(Array.from(s.m.keys()).some((k) => k.startsWith('parlor.'))).toBe(false);
    expect(s.getItem('unrelated')).toBe('keep me');
  });

  it('is a no-op the second time', () => {
    migrateLegacyKeys(s);
    const before = JSON.stringify(Array.from(s.m.entries()));
    expect(migrateLegacyKeys(s)).toBe(0);
    expect(JSON.stringify(Array.from(s.m.entries()))).toBe(before);
  });

  it('never overwrites a newer value, but still removes the old key', () => {
    s.setItem('gameroom.prefs.v1', '{"state":{"playerName":"New"}}');
    migrateLegacyKeys(s);
    expect(s.getItem('gameroom.prefs.v1')).toBe('{"state":{"playerName":"New"}}');
    expect(s.getItem('parlor.prefs.v1')).toBeNull();
  });

  it('keeps the old key if the new one cannot be written', () => {
    const broken = { ...s, setItem: () => { throw new Error('quota'); }, key: s.key, get length() { return s.length; } };
    expect(() => migrateLegacyKeys(broken)).not.toThrow();
    expect(s.getItem('parlor.session.v1')).not.toBeNull();
  });

  it('does nothing when storage is empty or throws', () => {
    expect(migrateLegacyKeys(fakeStore())).toBe(0);
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); }, key: () => { throw new Error('blocked'); }, length: 1 };
    expect(() => migrateLegacyKeys(throwing)).not.toThrow();
  });
});

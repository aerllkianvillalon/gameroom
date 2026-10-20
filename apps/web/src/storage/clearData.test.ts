import { describe, expect, it } from 'vitest';
import { clearStoredKeys } from './clearData';

function fakeStore(initial: Record<string, string>) {
  const m = new Map(Object.entries(initial));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => { m.delete(k); },
    keys: () => [...m.keys()],
  };
}

describe('clearStoredKeys', () => {
  it('removes gameroom and legacy parlor keys and leaves others alone', () => {
    const s = fakeStore({ 'gameroom.prefs.v1': '1', 'gameroom.session.v1': '2', 'parlor.old': '3', 'other.app': '4' });
    expect(clearStoredKeys(s)).toBe(3);
    expect(s.keys()).toEqual(['other.app']);
  });
  it('does nothing on an empty store', () => {
    expect(clearStoredKeys(fakeStore({}))).toBe(0);
  });
  it('never throws when storage is blocked', () => {
    const blocked = { get length(): number { throw new Error('denied'); }, key: () => null, removeItem: () => {} };
    expect(clearStoredKeys(blocked)).toBe(0);
  });
});

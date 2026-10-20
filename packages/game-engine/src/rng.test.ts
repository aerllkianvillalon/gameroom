import { describe, expect, it } from 'vitest';
import { createId, createRng } from './rng';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.int(100)]).toEqual([b.next(), b.next(), b.int(100)]);
  });
  it('shuffle returns a permutation and leaves the input untouched', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = createRng(7).shuffle(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('int stays in range and rejects bad bounds', () => {
    const r = createRng(1);
    for (let i = 0; i < 500; i++) expect(r.int(3)).toBeLessThan(3);
    expect(() => r.int(0)).toThrow();
  });
  it('pick throws on empty lists', () => {
    expect(() => createRng(1).pick([])).toThrow();
  });
  it('createId has the requested length', () => {
    expect(createId(createRng(3), 12)).toHaveLength(12);
  });
});

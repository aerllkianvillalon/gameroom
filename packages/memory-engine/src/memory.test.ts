import { describe, expect, it } from 'vitest';
import { createRng, type PlayerRef } from '@party/game-engine';
import { MISMATCH_MS, makeConfig, memoryEngine, step, tick, validate, withClock, type MemoryState } from './index';

const P = (id: string): PlayerRef => ({ id, name: id, avatar: 'cat', isBot: false });
const start = (cfg = {}) => withClock(memoryEngine.init(makeConfig({ pairs: 4, ...cfg }), ['a', 'b'].map(P), createRng(9)), 0);
const flip = (s: MemoryState, id: string, index: number) => { const r = step(s, id, { type: 'flip', index }); if (!r.ok) throw new Error(r.message); return r.value; };
/** Indices of a matching pair, and of two cards that do not match. */
const pairOf = (s: MemoryState) => { const i = 0; const j = s.symbols.findIndex((x, k) => k !== i && x === s.symbols[i]); return [i, j] as const; };
const missOf = (s: MemoryState) => { const j = s.symbols.findIndex((x) => x !== s.symbols[0]); return [0, j] as const; };

describe('memory match', () => {
  it('deals each symbol exactly twice', () => {
    const s = start({ pairs: 8 });
    expect(s.symbols.length).toBe(16);
    for (const sym of new Set(s.symbols)) expect(s.symbols.filter((x) => x === sym).length).toBe(2);
  });
  it('never sends face-down symbols to clients', () => {
    const s0 = start();
    const s = flip(s0, s0.turn, 3);
    const pub = memoryEngine.publicView(s);
    expect(pub.cards.filter((c) => c.symbol !== null).length).toBe(1);
    expect(pub.cards[3]!.symbol).toBe(s.symbols[3]);
    for (const [i, c] of pub.cards.entries()) if (i !== 3) expect(c.symbol).toBeNull();
  });
  it('only the player whose turn it is can flip, and not the same card twice', () => {
    const s = start();
    const other = s.order.find((x) => x !== s.turn)!;
    expect(validate(s, other, { type: 'flip', index: 0 }).ok).toBe(false);
    const t = flip(s, s.turn, 0);
    expect(validate(t, t.turn, { type: 'flip', index: 0 }).ok).toBe(false);
    expect(validate(t, t.turn, { type: 'flip', index: 99 }).ok).toBe(false);
  });
  it('a match scores and keeps the turn', () => {
    let s = start();
    const me = s.turn, [i, j] = pairOf(s);
    s = flip(s, me, i); s = flip(s, me, j);
    expect(s.scores[me]).toBe(1);
    expect(s.turn).toBe(me);
    expect(s.faceUp).toEqual([]);
    expect(memoryEngine.publicView(s).cards[i]!.matchedBy).toBe(me);
    expect(validate(s, me, { type: 'flip', index: i }).ok).toBe(false);
  });
  it('a miss shows both cards, blocks flips, then flips back and passes the turn', () => {
    let s = start();
    const me = s.turn, [i, j] = missOf(s);
    s = flip(s, me, i); s = flip(s, me, j);
    expect(s.pendingMismatch).toBe(true);
    expect(memoryEngine.publicView(s).cards.filter((c) => c.faceUp).length).toBe(2);
    expect(validate(s, me, { type: 'flip', index: 5 }).ok).toBe(false);
    s = withClock(s, 1000);
    expect(tick(s, 1000 + MISMATCH_MS - 1)).toBe(s);
    s = tick(s, 1000 + MISMATCH_MS);
    expect(s.pendingMismatch).toBe(false);
    expect(s.faceUp).toEqual([]);
    expect(s.turn).not.toBe(me);
    expect(s.lastMiss).toBe(me);
  });
  it('a stalled player loses the turn, and any card they had flipped goes back', () => {
    let s = start();
    const me = s.turn;
    s = withClock(flip(s, me, 0), 0);
    s = tick(s, 15_000);
    expect(s.turn).not.toBe(me);
    expect(s.faceUp).toEqual([]);
  });
  it('finishes when every pair is found, with ties allowed', () => {
    let s = start({ pairs: 4 });
    while (s.phase === 'playing') {
      const open = s.symbols.map((_, k) => k).filter((k) => s.matchedBy[k] === null);
      const i = open[0]!, j = open.find((k) => k !== i && s.symbols[k] === s.symbols[i])!;
      s = flip(flip(s, s.turn, i), s.turn, j);
    }
    expect(s.phase).toBe('results');
    expect(memoryEngine.publicView(s).winners.length).toBeGreaterThanOrEqual(1);
    expect(memoryEngine.status(s)).toBe('finished');
    expect(memoryEngine.publicView(s).pairsLeft).toBe(0);
  });
});

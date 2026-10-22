import { describe, expect, it } from 'vitest';
import { createRng, type PlayerRef } from '@party/game-engine';
import { PROMPTS, makeConfig, step, tick, validate, withClock, wyrEngine, type WyrState } from './index';

const P = (id: string): PlayerRef => ({ id, name: id, avatar: 'cat', isBot: false });
const players = ['a', 'b', 'c', 'd'].map(P);
const start = (cfg = {}) => withClock(wyrEngine.init(makeConfig({ rounds: 3, ...cfg }), players, createRng(5)), 0);
const vote = (s: WyrState, id: string, choice: 0 | 1) => { const r = step(s, id, { type: 'vote', choice }); if (!r.ok) throw new Error(r.message); return r.value; };

describe('would you rather', () => {
  it('has unique prompts with two different sides', () => {
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
    for (const p of PROMPTS) expect(p.a === p.b).toBe(false);
  });
  it('hides votes until the reveal', () => {
    let s = start();
    s = vote(s, 'a', 0);
    const pub = wyrEngine.publicView(s);
    expect(pub.voted).toEqual(['a']);
    expect(pub.tally).toBeNull();
    expect(pub.picks).toEqual({});
  });
  it('rejects double votes, bad choices and strangers', () => {
    const s = vote(start(), 'a', 1);
    expect(validate(s, 'a', { type: 'vote', choice: 0 }).ok).toBe(false);
    expect(validate(s, 'b', { type: 'vote', choice: 2 as 0 }).ok).toBe(false);
    expect(validate(s, 'zed', { type: 'vote', choice: 0 }).ok).toBe(false);
  });
  it('scores the bigger side', () => {
    let s = start();
    s = vote(s, 'a', 0); s = vote(s, 'b', 0); s = vote(s, 'c', 0); s = vote(s, 'd', 1);
    expect(s.phase).toBe('reveal');
    expect(s.tally).toEqual([3, 1]);
    expect(s.scores).toEqual({ a: 100, b: 100, c: 100, d: 0 });
    expect(wyrEngine.publicView(s).majority).toEqual(['a', 'b', 'c']);
  });
  it('a tie scores nobody', () => {
    let s = start();
    s = vote(s, 'a', 0); s = vote(s, 'b', 0); s = vote(s, 'c', 1); s = vote(s, 'd', 1);
    expect(s.scores).toEqual({ a: 0, b: 0, c: 0, d: 0 });
    expect(wyrEngine.publicView(s).majority).toEqual([]);
  });
  it('scoring can be switched off', () => {
    let s = start({ scoring: false });
    for (const id of ['a', 'b', 'c', 'd']) s = vote(s, id, 0);
    expect(Object.values(s.scores)).toEqual([0, 0, 0, 0]);
    expect(s.majorityCounts.a).toBe(1);
  });
  it('timers reveal, advance and finish', () => {
    let s = start();
    expect(tick(s, 100)).toBe(s);
    s = tick(s, 20_000);
    expect(s.phase).toBe('reveal');
    s = withClock(s, 20_000);
    s = tick(s, 28_000);
    expect(s.phase).toBe('vote');
    expect(s.index).toBe(1);
    for (let i = 0; i < 6 && s.phase !== 'results'; i++) s = withClock(tick(withClock(s, 0), 1e9), 0);
    expect(s.phase).toBe('results');
    expect(wyrEngine.status(s)).toBe('finished');
  });
  it('clamps rounds to the topic pool', () => {
    const s = wyrEngine.init(makeConfig({ rounds: 20, topic: 'silly' }), players, createRng(1));
    expect(s.prompts.length).toBe(15);
    expect(s.prompts.every((p) => p.topic === 'silly')).toBe(true);
  });
});

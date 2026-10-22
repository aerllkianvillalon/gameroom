import { describe, expect, it } from 'vitest';
import { createRng, type PlayerRef } from '@party/game-engine';
import { checkWord, makeConfig, normalizeWord, step, tick, wordBombEngine, withClock, type WordBombState } from './index';

const P = (id: string): PlayerRef => ({ id, name: id, avatar: 'cat', isBot: false });
const mk = (n = 3, cfg = {}) => {
  const rng = createRng(3);
  const s = withClock(wordBombEngine.init(makeConfig(cfg), ['a', 'b', 'c', 'd'].slice(0, n).map(P), rng), 0);
  return { s, rng };
};
/** A word containing the fragment, made unique with a counter so tests never hit "already used". */
let n = 0;
const wordFor = (s: WordBombState) => `x${'qz'[n++ % 2]}${s.fragment}${'abcdefghij'[n % 10]}${n}`.replace(/\d/g, 'k');

describe('word bomb words', () => {
  it('normalises accents, case and punctuation', () => expect(normalizeWord("Café-Au!")).toBe('cafeau'));
  it('checks length, fragment and reuse', () => {
    const { s } = mk();
    const f = s.fragment;
    expect(checkWord(s, 'ab').ok).toBe(false);
    expect(checkWord(s, f).ok).toBe(false);
    expect(checkWord(s, 'zzzzz').ok).toBe(false);
    expect(checkWord({ ...s, fragment: 'ing' }, 'running')).toMatchObject({ ok: true, value: 'running' });
    expect(checkWord({ ...s, fragment: 'ing', used: ['running'] }, 'Running').ok).toBe(false);
  });
});

describe('word bomb turns', () => {
  it('only the player holding the bomb can play and the turn passes on', () => {
    const { s, rng } = mk();
    const other = s.order.find((id) => id !== s.turn)!;
    expect(step(s, other, { type: 'word', text: wordFor(s) }, rng).ok).toBe(false);
    const r = step(s, s.turn, { type: 'word', text: wordFor(s) }, rng);
    expect(r.ok && r.value.turn).toBe(s.order[1]);
    expect(r.ok && r.value.used.length).toBe(1);
  });
  it('an exploding bomb costs a life and passes it on', () => {
    const { s, rng } = mk();
    const holder = s.turn;
    expect(tick(s, 5000, rng)).toBe(s);
    const t = tick(s, 10_000, rng);
    expect(t.lives[holder]).toBe(2);
    expect(t.turn).not.toBe(holder);
    expect(t.events.at(-1)?.kind).toBe('exploded');
  });
  it('last player standing wins', () => {
    let { s, rng } = mk(2, { lives: 1 });
    const holder = s.turn;
    s = tick(s, 1e9, rng);
    expect(s.phase).toBe('results');
    expect(s.winner).toBe(s.order.find((id) => id !== holder));
    expect(wordBombEngine.status(s)).toBe('finished');
  });
  it('fuse shrinks as players are eliminated but never below 5s', () => {
    let { s, rng } = mk(4, { lives: 1, fuseSeconds: 6 });
    s = tick(s, 1e9, rng);
    expect(s.fuseMs).toBe(5000);
  });
});

describe('word bomb challenges', () => {
  const afterWord = () => {
    const { s, rng } = mk(4);
    const first = step(s, s.turn, { type: 'word', text: wordFor(s) }, rng);
    if (!first.ok) throw new Error('setup');
    return { s: first.value, rng, author: s.turn };
  };
  it('upheld challenge costs the author a life and frees the word', () => {
    let { s, rng, author } = afterWord();
    const challenger = s.turn;
    s = (step(s, challenger, { type: 'challenge' }, rng) as { ok: true; value: WordBombState }).value;
    expect(s.phase).toBe('challenge');
    const judges = s.order.filter((id) => id !== author && id !== challenger);
    expect(judges.length).toBe(2);
    expect(step(s, author, { type: 'judge', valid: true }, rng).ok).toBe(false);
    for (const j of judges) s = (step(s, j, { type: 'judge', valid: false }, rng) as { ok: true; value: WordBombState }).value;
    expect(s.phase).toBe('playing');
    expect(s.lives[author]).toBe(2);
    expect(s.used).toEqual([]);
    expect(s.turn).toBe(challenger);
    expect(s.last).toBeNull();
  });
  it('a failed challenge (tie keeps the word) costs the challenger', () => {
    let { s, rng, author } = afterWord();
    const challenger = s.turn;
    s = (step(s, challenger, { type: 'challenge' }, rng) as { ok: true; value: WordBombState }).value;
    const [j1, j2] = s.order.filter((id) => id !== author && id !== challenger) as [string, string];
    s = (step(s, j1, { type: 'judge', valid: true }, rng) as { ok: true; value: WordBombState }).value;
    s = (step(s, j2, { type: 'judge', valid: false }, rng) as { ok: true; value: WordBombState }).value;
    expect(s.lives[challenger]).toBe(2);
    expect(s.lives[author]).toBe(3);
    expect(s.used.length).toBe(1);
  });
  it('needs a judge and a word, and is off when disabled', () => {
    const two = mk(2);
    const w = step(two.s, two.s.turn, { type: 'word', text: wordFor(two.s) }, two.rng);
    if (!w.ok) throw new Error('setup');
    expect(step(w.value, w.value.turn, { type: 'challenge' }, two.rng).ok).toBe(false);
    expect(step(two.s, two.s.turn, { type: 'challenge' }, two.rng).ok).toBe(false);
    const off = mk(4, { challenges: false });
    expect(wordBombEngine.publicView(off.s).canChallenge).toBe(false);
  });
});

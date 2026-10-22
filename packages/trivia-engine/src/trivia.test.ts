import { describe, expect, it } from 'vitest';
import { createRng, type PlayerRef } from '@party/game-engine';
import { BANK, makeConfig, step, tick, triviaEngine, validate, withClock, type TriviaState } from './index';

const P = (id: string): PlayerRef => ({ id, name: id, avatar: 'cat', isBot: false });
const players = ['a', 'b', 'c'].map(P);
const start = (cfg = {}) => withClock(triviaEngine.init(makeConfig({ questions: 3, ...cfg }), players, createRng(7)), 1000);
const key = (s: TriviaState) => s.questions[s.index]!.answer;
const must = (s: TriviaState, id: string, choice: number) => { const r = step(s, id, { type: 'answer', choice }); if (!r.ok) throw new Error(r.message); return r.value; };

describe('trivia bank', () => {
  it('has four distinct options and a valid answer for every question', () => {
    for (const b of BANK) expect(new Set([b.right, ...b.wrong]).size).toBe(4);
    expect(new Set(BANK.map((b) => b.id)).size).toBe(BANK.length);
  });
  it('shuffles options but keeps the key pointing at the right one', () => {
    const s = start();
    for (const q of s.questions) {
      const raw = BANK.find((b) => b.id === q.id)!;
      expect(q.options[q.answer]).toBe(raw.right);
    }
  });
});

describe('trivia rules', () => {
  it('hides the answer until the reveal', () => {
    const s = start();
    const pub = triviaEngine.publicView(s);
    expect(pub.correct).toBeNull();
    expect(JSON.stringify(pub)).not.toContain('"answer"');
  });
  it('rejects double answers, bad choices and strangers', () => {
    const s = must(start(), 'a', 0);
    expect(validate(s, 'a', { type: 'answer', choice: 1 }).ok).toBe(false);
    expect(validate(s, 'b', { type: 'answer', choice: 9 }).ok).toBe(false);
    expect(validate(s, 'zed', { type: 'answer', choice: 0 }).ok).toBe(false);
  });
  it('reveals once everyone answered and scores speed bonuses by order', () => {
    let s = start();
    const k = key(s), wrong = (k + 1) % 4;
    s = must(s, 'b', k); s = must(s, 'a', wrong); s = must(s, 'c', k);
    expect(s.phase).toBe('reveal');
    expect(s.scores).toEqual({ a: 0, b: 150, c: 140 });
    expect(triviaEngine.publicView(s).correct).toBe(k);
  });
  it('no speed bonus when switched off', () => {
    let s = start({ speedBonus: false });
    const k = key(s);
    for (const id of ['a', 'b', 'c']) s = must(s, id, k);
    expect(s.scores).toEqual({ a: 100, b: 100, c: 100 });
  });
  it('timeouts reveal, then advance, then finish', () => {
    let s = start();
    expect(tick(s, 1500)).toBe(s);
    s = tick(s, 1000 + 20_000);
    expect(s.phase).toBe('reveal');
    s = withClock(s, 30_000);
    s = tick(s, 30_000 + 6000);
    expect(s.phase).toBe('question');
    expect(s.index).toBe(1);
    expect(s.answers).toEqual({});
    for (let i = 0; i < 4 && s.phase !== 'results'; i++) { s = withClock(tick(withClock(s, 0), 1e9), 0); }
    expect(s.phase).toBe('results');
    expect(triviaEngine.status(s)).toBe('finished');
  });
  it('clamps question count to the category pool', () => {
    const s = triviaEngine.init(makeConfig({ questions: 20, category: 'science' }), players, createRng(1));
    expect(s.questions.length).toBe(15);
    expect(s.questions.every((q) => q.category === 'science')).toBe(true);
  });
  it('privateView reports your pick', () => {
    const s = must(start(), 'a', 2);
    expect(triviaEngine.privateView(s, 'a')).toEqual({ myChoice: 2, waitingOnYou: false });
    expect(triviaEngine.privateView(s, 'b').waitingOnYou).toBe(true);
  });
});

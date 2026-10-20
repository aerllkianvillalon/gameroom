import { describe, expect, it } from 'vitest';
import { createRng, type PlayerRef } from '@party/game-engine';
import {
  buildDeck, chooseBotAction, currentPlayer, legalActions, makeConfig, step, unoEngine, withClock,
  type BotLevel, type Card, type Color, type UnoAction, type UnoConfig, type UnoState,
} from './index';

const c = (id: number, color: Card['color'], value: Card['value']): Card => ({ id, color, value });
const rng = createRng(5);
const filler = (): Card[] => Array.from({ length: 20 }, (_, i) => c(500 + i, 'blue', ((i % 9) + 1) as Card['value']));

function mk(hands: Record<string, Card[]>, rest: Partial<Omit<UnoState, 'config' | 'hands'>> & { config?: Partial<UnoConfig> } = {}): UnoState {
  const { config, ...over } = rest;
  return {
    config: makeConfig(config), order: Object.keys(hands), hands, drawPile: filler(), discard: [c(900, 'red', 5)],
    direction: 1, current: 0, activeColor: 'red', pendingDraw: 0, pendingKind: null, drewCardId: null,
    unoPending: null, winner: null, events: [], turnDeadline: null, ...over,
  };
}
const go = (s: UnoState, who: string, a: UnoAction) => {
  const r = step(s, who, a, rng);
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
  return r.value;
};
const code = (s: UnoState, who: string, a: UnoAction) => { const r = step(s, who, a, rng); return r.ok ? 'ok' : r.code; };
const play = (cardId: number, extra: Partial<Extract<UnoAction, { type: 'play' }>> = {}): UnoAction => ({ type: 'play', cardId, ...extra });
const x = (): Card[] => [c(800, 'green', 9), c(801, 'green', 8)]; // filler hand that never matches red 5

describe('deck and setup', () => {
  it('builds the standard 108 cards with unique ids', () => {
    const d = buildDeck();
    expect(d).toHaveLength(108);
    expect(new Set(d.map((k) => k.id)).size).toBe(108);
    expect(d.filter((k) => k.value === 'wild')).toHaveLength(4);
    expect(d.filter((k) => k.value === 'wild4')).toHaveLength(4);
    expect(d.filter((k) => k.color === 'red' && k.value === 0)).toHaveLength(1);
    expect(d.filter((k) => k.color === 'red' && k.value === 'draw2')).toHaveLength(2);
  });
  it('deals 7 cards each, starts on a number card, and conserves every card', () => {
    const players: PlayerRef[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, name: id, avatar: 'cat', isBot: false }));
    for (let seed = 1; seed <= 20; seed++) {
      const s = unoEngine.init(makeConfig(), players, createRng(seed));
      for (const id of s.order) expect(s.hands[id]).toHaveLength(7);
      expect(typeof s.discard[0]!.value).toBe('number');
      expect(s.activeColor).toBe(s.discard[0]!.color);
      const total = Object.values(s.hands).flat().length + s.drawPile.length + s.discard.length;
      expect(total).toBe(108);
    }
  });
  it('rejects bad player counts', () => {
    const one: PlayerRef[] = [{ id: 'a', name: 'a', avatar: 'cat', isBot: false }];
    expect(() => unoEngine.init(makeConfig(), one, rng)).toThrow();
  });
});

describe('legal plays', () => {
  it('rejects out-of-turn, unowned, and non-matching cards, and wilds without a colour', () => {
    const s = mk({ a: [c(1, 'red', 2), c(2, 'blue', 7), c(3, 'wild', 'wild')], b: [c(4, 'red', 3)] });
    expect(code(s, 'b', play(4))).toBe('not_your_turn');
    expect(code(s, 'a', play(99))).toBe('no_such_card');
    expect(code(s, 'a', play(2))).toBe('illegal_card');
    expect(code(s, 'a', play(3))).toBe('color_required');
    expect(code(s, 'zed', play(1))).toBe('not_player');
    expect(code(s, 'a', play(1))).toBe('ok');
  });
  it('matches by number across colours', () => {
    const s = mk({ a: [c(1, 'blue', 5), c(2, 'green', 1)], b: x() });
    expect(code(s, 'a', play(1))).toBe('ok');
    expect(go(s, 'a', play(1)).activeColor).toBe('blue');
  });
  it('Wild sets the colour', () => {
    const s = mk({ a: [c(1, 'wild', 'wild'), c(2, 'red', 1)], b: x() });
    expect(go(s, 'a', play(1, { color: 'green' })).activeColor).toBe('green');
  });
  it('Wild Draw Four is illegal while holding the active colour, legal otherwise', () => {
    const holding = mk({ a: [c(1, 'wild', 'wild4'), c(2, 'red', 1)], b: x(), c: x() });
    expect(code(holding, 'a', play(1, { color: 'blue' }))).toBe('illegal_card');
    const clean = mk({ a: [c(1, 'wild', 'wild4'), c(2, 'blue', 1)], b: x(), c: x() });
    const after = go(clean, 'a', play(1, { color: 'blue' }));
    expect(after.hands.b).toHaveLength(6);
    expect(currentPlayer(after)).toBe('c');
  });
});

describe('action cards', () => {
  it('Skip passes over the next player', () => {
    const s = go(mk({ a: [c(1, 'red', 'skip'), c(2, 'red', 1)], b: x(), c: x() }), 'a', play(1));
    expect(currentPlayer(s)).toBe('c');
  });
  it('Reverse flips direction, and acts like Skip with two players', () => {
    const three = go(mk({ a: [c(1, 'red', 'reverse'), c(2, 'red', 1)], b: x(), c: x() }), 'a', play(1));
    expect(three.direction).toBe(-1);
    expect(currentPlayer(three)).toBe('c');
    const two = go(mk({ a: [c(1, 'red', 'reverse'), c(2, 'red', 1)], b: x() }), 'a', play(1));
    expect(currentPlayer(two)).toBe('a');
  });
  it('Draw Two makes the next player draw 2 and lose their turn', () => {
    const s = go(mk({ a: [c(1, 'red', 'draw2'), c(2, 'red', 1)], b: x(), c: x() }), 'a', play(1));
    expect(s.hands.b).toHaveLength(4);
    expect(currentPlayer(s)).toBe('c');
  });
  it('stacking: draws accumulate, only a matching draw card may answer, otherwise take it all', () => {
    const cfg = { stackDraws: true };
    let s = mk({ a: [c(1, 'red', 'draw2'), c(2, 'red', 1)], b: [c(3, 'blue', 'draw2'), c(4, 'red', 3)], c: x() }, { config: cfg });
    s = go(s, 'a', play(1));
    expect(s.pendingDraw).toBe(2);
    expect(code(s, 'b', play(4))).toBe('illegal_card');
    s = go(s, 'b', play(3));
    expect(s.pendingDraw).toBe(4);
    expect(code(s, 'c', { type: 'draw' })).toBe('ok');
    s = go(s, 'c', { type: 'draw' });
    expect(s.hands.c).toHaveLength(6);
    expect(s.pendingDraw).toBe(0);
    expect(currentPlayer(s)).toBe('a');
  });
});

describe('drawing', () => {
  it('cannot draw while holding a playable card', () => {
    expect(code(mk({ a: [c(1, 'red', 1)], b: x() }), 'a', { type: 'draw' })).toBe('has_play');
  });
  it('a drawn playable card may be played or passed; an unplayable one ends the turn', () => {
    const playable = mk({ a: [c(1, 'blue', 3)], b: x() }, { drawPile: [c(600, 'blue', 1), c(601, 'red', 9)] });
    const drew = go(playable, 'a', { type: 'draw' });
    expect(drew.drewCardId).toBe(601);
    expect(currentPlayer(drew)).toBe('a');
    expect(code(drew, 'a', play(1))).toBe('must_play_drawn');
    expect(code(drew, 'a', { type: 'draw' })).toBe('already_drew');
    expect(currentPlayer(go(drew, 'a', { type: 'pass' }))).toBe('b');
    expect(code(drew, 'a', play(601))).toBe('ok');
    const dud = go(mk({ a: [c(1, 'blue', 3)], b: x() }, { drawPile: [c(601, 'red', 9), c(600, 'blue', 1)] }), 'a', { type: 'draw' });
    expect(currentPlayer(dud)).toBe('b');
    expect(code(dud, 'b', { type: 'pass' })).toBe('cannot_pass');
  });
  it('reshuffles the discard pile when the draw pile runs out', () => {
    const s = mk({ a: [c(1, 'blue', 3)], b: x() }, { drawPile: [], discard: [c(700, 'blue', 2), c(701, 'green', 4), c(900, 'red', 5)] });
    const after = go(s, 'a', { type: 'draw' });
    expect(after.hands.a).toHaveLength(2);
    expect(after.discard).toHaveLength(1);
    expect(after.discard[0]!.id).toBe(900);
    expect(after.drawPile).toHaveLength(1);
  });
});

describe('UNO call', () => {
  const base = () => mk({ a: [c(1, 'red', 1), c(2, 'red', 2)], b: [c(3, 'blue', 3)], c: x() });
  it('a missed call can be caught and costs the configured penalty', () => {
    const s = go(base(), 'a', play(1));
    expect(s.unoPending).toBe('a');
    const caught = go(s, 'b', { type: 'catch-uno', target: 'a' });
    expect(caught.hands.a).toHaveLength(3);
    expect(caught.unoPending).toBe(null);
    expect(code(caught, 'b', { type: 'catch-uno', target: 'a' })).toBe('too_late');
  });
  it('penalty size is configurable', () => {
    const s = go(mk({ a: [c(1, 'red', 1), c(2, 'red', 2)], b: x() }, { config: { unoPenalty: 4 } }), 'a', play(1));
    expect(go(s, 'b', { type: 'catch-uno', target: 'a' }).hands.a).toHaveLength(5);
  });
  it('calling UNO in time (with the play, or right after) protects the player', () => {
    expect(go(base(), 'a', play(1, { callUno: true })).unoPending).toBe(null);
    const late = go(go(base(), 'a', play(1)), 'a', { type: 'call-uno' });
    expect(late.unoPending).toBe(null);
    expect(code(base(), 'a', { type: 'call-uno' })).toBe('nothing_to_call');
  });
  it('the window closes once the next player acts, and you cannot catch yourself', () => {
    const s = go(base(), 'a', play(1));
    expect(code(s, 'a', { type: 'catch-uno', target: 'a' })).toBe('self_catch');
    const next = go(s, 'b', { type: 'draw' });
    expect(next.unoPending).toBe(null);
    expect(code(next, 'c', { type: 'catch-uno', target: 'a' })).toBe('too_late');
  });
});

describe('winning', () => {
  it('emptying your hand wins and locks the game', () => {
    const s = go(mk({ a: [c(1, 'red', 1)], b: x() }), 'a', play(1));
    expect(s.winner).toBe('a');
    expect(unoEngine.status(s)).toBe('finished');
    expect(code(s, 'b', { type: 'draw' })).toBe('game_over');
  });
});

describe('house rules', () => {
  it('seven swaps hands with the chosen player and requires a target', () => {
    const s = mk({ a: [c(1, 'red', 7), c(2, 'red', 1)], b: [c(3, 'blue', 2)], c: [c(4, 'green', 3)] }, { config: { sevenZero: true } });
    expect(code(s, 'a', play(1))).toBe('swap_required');
    expect(code(s, 'a', play(1, { swapWith: 'a' }))).toBe('swap_required');
    const after = go(s, 'a', play(1, { swapWith: 'b' }));
    expect(after.hands.a!.map((k) => k.id)).toEqual([3]);
    expect(after.hands.b!.map((k) => k.id)).toEqual([2]);
  });
  it('zero rotates every hand in the direction of play', () => {
    const s = mk({ a: [c(1, 'red', 0), c(2, 'red', 1)], b: [c(3, 'blue', 2)], c: [c(4, 'green', 3)] }, { config: { sevenZero: true } });
    const after = go(s, 'a', play(1));
    expect(after.hands.b!.map((k) => k.id)).toEqual([2]);
    expect(after.hands.c!.map((k) => k.id)).toEqual([3]);
    expect(after.hands.a!.map((k) => k.id)).toEqual([4]);
  });
  it('sevens and zeros are plain cards when seven-zero is off', () => {
    const after = go(mk({ a: [c(1, 'red', 7), c(2, 'red', 1)], b: [c(3, 'blue', 2)] }), 'a', play(1));
    expect(after.hands.b!.map((k) => k.id)).toEqual([3]);
  });
  it('jump-in: an identical card may be played out of turn, and the turn moves on from the jumper', () => {
    const hands = { a: x(), b: [c(1, 'red', 5), c(2, 'blue', 1)], c: x(), d: x() };
    const on = mk(hands, { config: { jumpIn: true } });
    expect(code(on, 'b', play(2))).toBe('illegal_jump');
    expect(currentPlayer(go(on, 'b', play(1)))).toBe('c');
    expect(code(mk(hands), 'b', play(1))).toBe('not_your_turn');
  });
});

describe('hidden information', () => {
  it('public view never carries hands; private view carries only your own', () => {
    const s = mk({ a: [c(1, 'red', 1), c(2, 'blue', 9)], b: [c(3, 'green', 4)] });
    const pub = unoEngine.publicView(s);
    expect(JSON.stringify(pub)).not.toContain('hands');
    expect(JSON.stringify(pub.players)).not.toContain('green');
    expect(pub.players).toEqual([{ id: 'a', cards: 2 }, { id: 'b', cards: 1 }]);
    const mine = unoEngine.privateView(s, 'b');
    expect(mine.hand.map((k) => k.id)).toEqual([3]);
    expect(mine.yourTurn).toBe(false);
    expect(unoEngine.privateView(s, 'a').playableCardIds).toEqual([1]);
  });
});

describe('turn timer', () => {
  it('does nothing before the deadline and acts for the player after it', () => {
    const s = withClock(mk({ a: [c(1, 'red', 1), c(2, 'red', 2)], b: x() }, { config: { turnTimer: 30 } }), 1000);
    expect(s.turnDeadline).toBe(31000);
    expect(unoEngine.onTimeout!(s, 2000, rng)).toBe(s);
    const after = unoEngine.onTimeout!(s, 31000, rng);
    expect(after.hands.a).toHaveLength(1);
    expect(after.turnDeadline).toBe(null);
  });
  it('is disabled when turnTimer is 0', () => {
    expect(withClock(mk({ a: x(), b: x() }), 1000).turnDeadline).toBe(null);
  });
});

describe('full games with bots (fuzz)', () => {
  it('150 seeded games finish with a winner, only legal moves, and no lost or duplicated cards', () => {
    const levels: BotLevel[] = ['easy', 'medium', 'hard'];
    for (let seed = 1; seed <= 150; seed++) {
      const r = createRng(seed);
      const n = 2 + (seed % 7);
      const players: PlayerRef[] = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}`, avatar: 'cat', isBot: true }));
      const config = makeConfig({ stackDraws: seed % 2 === 0, jumpIn: false, sevenZero: seed % 3 === 0 });
      let s = unoEngine.init(config, players, r);
      let steps = 0;
      while (!s.winner && steps < 6000) {
        const who = currentPlayer(s);
        const a = chooseBotAction(s, who, levels[seed % 3] as BotLevel, r);
        const res = step(s, who, a, r);
        if (!res.ok) throw new Error(`seed ${seed} step ${steps}: ${res.code} ${JSON.stringify(a)}`);
        s = res.value;
        const total = Object.values(s.hands).flat().length + s.drawPile.length + s.discard.length;
        if (total !== 108) throw new Error(`seed ${seed}: card count ${total}`);
        steps++;
      }
      if (!s.winner) throw new Error(`seed ${seed} did not finish in ${steps} steps`);
      expect(s.hands[s.winner]).toHaveLength(0);
    }
  });
});

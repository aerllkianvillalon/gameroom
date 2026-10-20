import type { PlayerId, Rng } from '@party/game-engine';
import { legalActions } from './rules';
import type { Card, UnoAction, UnoState } from './types';

export type BotLevel = 'easy' | 'medium' | 'hard';
type Play = Extract<UnoAction, { type: 'play' }>;

const handCount = (s: UnoState, id: PlayerId) => (s.hands[id] as Card[]).length;

/** Picks a legal action for a bot. Always returns something the rules accept. */
export function chooseBotAction(s: UnoState, pid: PlayerId, level: BotLevel, rng: Rng): UnoAction {
  const legal = legalActions(s, pid);
  const plays = legal.filter((a): a is Play => a.type === 'play');
  const callUno = level === 'easy' ? rng.next() < 0.7 : true;

  if (plays.length === 0) {
    return legal.find((a) => a.type === 'draw') ?? legal.find((a) => a.type === 'pass') ?? { type: 'draw' };
  }
  if (level === 'easy') return { ...rng.pick(plays), callUno };

  const hand = s.hands[pid] as Card[];
  const nextId = s.order[(s.current + s.direction + s.order.length) % s.order.length] as PlayerId;
  const nextLow = handCount(s, nextId) <= 2;

  const score = (a: Play): number => {
    const card = hand.find((c) => c.id === a.cardId) as Card;
    const rest = hand.filter((c) => c.id !== card.id);
    let v = rng.next(); // tie-break
    if (card.color === 'wild') v -= card.value === 'wild4' ? 6 : 4; // keep wilds for later
    else {
      v += 10;
      if (typeof card.value === 'number') v += card.value / 10;
      if (nextLow && (card.value === 'skip' || card.value === 'draw2' || card.value === 'reverse')) v += level === 'hard' ? 20 : 8;
    }
    if (a.color) v += rest.filter((c) => c.color === a.color).length; // pick the colour we hold most of
    if (a.swapWith) {
      const diff = rest.length - handCount(s, a.swapWith);
      v += level === 'hard' ? diff * 2 : 0; // hard bots only swap when it helps
    }
    return v;
  };
  const best = plays.reduce((b, p) => (score(p) > score(b) ? p : b));
  return { ...best, callUno };
}

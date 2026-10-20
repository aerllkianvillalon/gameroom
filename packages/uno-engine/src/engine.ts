import type { GameEngine, PlayerId, PlayerRef, Result, Rng } from '@party/game-engine';
import { chooseBotAction } from './bot';
import { buildDeck } from './deck';
import { currentPlayer, legalActions, step, topCard, validate } from './rules';
import type { Card, Color, UnoAction, UnoConfig, UnoPrivateView, UnoPublicView, UnoState } from './types';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export const unoEngine: GameEngine<UnoConfig, UnoState, UnoAction, UnoPublicView, UnoPrivateView> = {
  init(config, players: readonly PlayerRef[], rng: Rng): UnoState {
    if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
      throw new RangeError(`UNO needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
    }
    const deck = rng.shuffle(buildDeck());
    const order = rng.shuffle(players.map((p) => p.id));
    const hands: Record<PlayerId, Card[]> = {};
    for (const id of order) hands[id] = deck.splice(deck.length - config.startingHand, config.startingHand);

    // The starting card must be a plain number card, so no effect applies before anyone plays.
    const skipped: Card[] = [];
    let top = deck.pop() as Card;
    while (typeof top.value !== 'number') { skipped.push(top); top = deck.pop() as Card; }
    const drawPile = skipped.length ? rng.shuffle([...deck, ...skipped]) : deck;

    return {
      config, order, hands, drawPile, discard: [top], direction: 1, current: 0,
      activeColor: top.color as Color, pendingDraw: 0, pendingKind: null, drewCardId: null,
      unoPending: null, winner: null, events: [], turnDeadline: null,
    };
  },

  validate: (s, pid, a): Result<true> => validate(s, pid, a),

  /** Throws on an illegal action. Servers should call validate() first and report the error to the player. */
  apply(s, pid, a, rng) {
    const r = step(s, pid, a, rng);
    if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
    return r.value;
  },

  publicView(s): UnoPublicView {
    return {
      players: s.order.map((id) => ({ id, cards: (s.hands[id] as Card[]).length })),
      current: currentPlayer(s), direction: s.direction, activeColor: s.activeColor, topCard: topCard(s),
      drawCount: s.drawPile.length, pendingDraw: s.pendingDraw, drewCardPending: s.drewCardId !== null,
      unoVulnerable: s.unoPending, winner: s.winner, events: s.events, turnDeadline: s.turnDeadline, config: s.config,
    };
  },

  privateView(s, pid): UnoPrivateView {
    const hand = [...(s.hands[pid] ?? [])];
    const legal = legalActions(s, pid);
    return {
      hand,
      playableCardIds: [...new Set(legal.flatMap((a) => (a.type === 'play' ? [a.cardId] : [])))],
      yourTurn: currentPlayer(s) === pid && !s.winner,
      canDraw: legal.some((a) => a.type === 'draw'),
      canPass: legal.some((a) => a.type === 'pass'),
    };
  },

  status: (s) => (s.winner ? 'finished' : 'active'),

  /** When the turn clock expires the current player acts like an easy bot would (never stalls the table). */
  onTimeout(s, now, rng) {
    if (s.winner || s.turnDeadline === null || now < s.turnDeadline) return s;
    const pid = currentPlayer(s);
    let next = step(s, pid, chooseBotAction(s, pid, 'easy', rng), rng);
    if (next.ok && next.value.drewCardId !== null && !next.value.winner) {
      const passed = step(next.value, pid, { type: 'pass' }, rng); // a timed-out player does not get to play the drawn card
      if (passed.ok) next = passed;
    }
    return next.ok ? { ...next.value, turnDeadline: null } : s;
  },
};

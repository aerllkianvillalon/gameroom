import type { GameEngine, PlayerId, PlayerRef, Rng } from '@party/game-engine';
import { dealSymbols, step, tick, validate, withClock } from './rules';
import {
  MAX_PLAYERS, MIN_PLAYERS,
  type MemoryAction, type MemoryConfig, type MemoryPrivateView, type MemoryPublicView, type MemoryState,
} from './types';

export const winnersOf = (s: MemoryState): PlayerId[] => {
  const best = Math.max(...s.order.map((id) => s.scores[id] ?? 0));
  return s.order.filter((id) => (s.scores[id] ?? 0) === best);
};

export const memoryEngine: GameEngine<MemoryConfig, MemoryState, MemoryAction, MemoryPublicView, MemoryPrivateView> = {
  init(config, players: readonly PlayerRef[], rng: Rng): MemoryState {
    const n = players.length;
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RangeError(`Memory Match needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
    const order = rng.shuffle(players.map((p) => p.id));
    const symbols = dealSymbols(config, rng);
    return {
      config, order, symbols, matchedBy: symbols.map(() => null), faceUp: [], turn: order[0] as PlayerId, pendingMismatch: false,
      scores: Object.fromEntries(order.map((id) => [id, 0])), phase: 'playing', deadline: null, moves: 0, lastMiss: null,
    };
  },

  validate: (s, pid, a) => validate(s, pid, a),

  /** Throws on an illegal action. Servers call validate() first. */
  apply(s, pid, a) {
    const r = step(s, pid, a);
    if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
    return r.value;
  },

  publicView(s): MemoryPublicView {
    return {
      phase: s.phase, order: s.order,
      // Face-down cards carry no symbol at all, so the layout cannot be read from the network.
      cards: s.symbols.map((sym, i) => {
        const by = s.matchedBy[i] ?? null;
        const up = s.faceUp.includes(i);
        return { symbol: by !== null || up ? sym : null, matchedBy: by, faceUp: up };
      }),
      turn: s.phase === 'results' ? null : s.turn, pendingMismatch: s.pendingMismatch, scores: s.scores,
      winners: s.phase === 'results' ? winnersOf(s) : [], deadline: s.deadline, lastMiss: s.lastMiss,
      pairsLeft: s.matchedBy.filter((m) => m === null).length / 2, config: s.config,
    };
  },

  privateView(s, pid: PlayerId): MemoryPrivateView {
    const yourTurn = s.phase === 'playing' && s.turn === pid;
    return { yourTurn, waitingOnYou: yourTurn && !s.pendingMismatch };
  },

  status: (s) => (s.phase === 'results' ? 'finished' : 'active'),

  onTimeout: (s, now) => tick(s, now),
};

export { withClock };

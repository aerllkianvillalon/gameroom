import type { GameEngine, PlayerId, PlayerRef, Rng } from '@party/game-engine';
import { current, majorityOf, pickPrompts, step, tick, validate, withClock } from './rules';
import {
  MAX_PLAYERS, MIN_PLAYERS,
  type WyrAction, type WyrConfig, type WyrPrivateView, type WyrPublicView, type WyrState,
} from './types';

export const wyrEngine: GameEngine<WyrConfig, WyrState, WyrAction, WyrPublicView, WyrPrivateView> = {
  init(config, players: readonly PlayerRef[], rng: Rng): WyrState {
    const n = players.length;
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RangeError(`Would You Rather needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
    const ids = players.map((p) => p.id);
    return {
      config, order: ids, prompts: pickPrompts(config, rng), index: 0, phase: 'vote', votes: {},
      scores: Object.fromEntries(ids.map((id) => [id, 0])), majorityCounts: {}, tally: [0, 0], deadline: null,
    };
  },

  validate: (s, pid, a) => validate(s, pid, a),

  /** Throws on an illegal action. Servers call validate() first. */
  apply(s, pid, a) {
    const r = step(s, pid, a);
    if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
    return r.value;
  },

  publicView(s): WyrPublicView {
    const q = current(s);
    const shown = s.phase !== 'vote';
    return {
      phase: s.phase, order: s.order, index: s.index, total: s.prompts.length, a: q?.a ?? null, b: q?.b ?? null, topic: q?.topic ?? null,
      voted: Object.keys(s.votes), deadline: s.deadline,
      tally: shown ? s.tally : null, picks: shown ? s.votes : {}, majority: shown ? majorityOf(s) : [],
      scores: s.scores,
      standings: s.order.map((id) => ({ id, score: s.scores[id] ?? 0, majority: s.majorityCounts[id] ?? 0 }))
        .sort((x, y) => y.score - x.score || y.majority - x.majority),
      config: s.config,
    };
  },

  privateView(s, pid: PlayerId): WyrPrivateView {
    return { myChoice: s.votes[pid] ?? null, waitingOnYou: s.phase === 'vote' && !(pid in s.votes) };
  },

  status: (s) => (s.phase === 'results' ? 'finished' : 'active'),

  onTimeout: (s, now) => tick(s, now),
};

export { withClock };

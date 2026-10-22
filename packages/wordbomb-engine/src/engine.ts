import type { GameEngine, PlayerId, PlayerRef, Rng } from '@party/game-engine';
import { alive, judgesFor, pickFragment, step, tick, validate, withClock } from './rules';
import {
  MAX_PLAYERS, MIN_PLAYERS,
  type WordBombAction, type WordBombConfig, type WordBombPrivateView, type WordBombPublicView, type WordBombState,
} from './types';

export const wordBombEngine: GameEngine<WordBombConfig, WordBombState, WordBombAction, WordBombPublicView, WordBombPrivateView> = {
  init(config, players: readonly PlayerRef[], rng: Rng): WordBombState {
    const n = players.length;
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RangeError(`Word Bomb needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
    const order = rng.shuffle(players.map((p) => p.id));
    const s: WordBombState = {
      config, order, lives: Object.fromEntries(order.map((id) => [id, config.lives])), turn: order[0] as PlayerId, fragment: '',
      used: [], last: null, challenge: null, phase: 'playing', deadline: null, fuseMs: config.fuseSeconds * 1000,
      events: [], seq: 0, winner: null, wordCounts: Object.fromEntries(order.map((id) => [id, 0])),
    };
    s.fragment = pickFragment(s, rng);
    return s;
  },

  validate: (s, pid, a) => validate(s, pid, a),

  /** Throws on an illegal action. Servers call validate() first. */
  apply(s, pid, a, rng) {
    const r = step(s, pid, a, rng);
    if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
    return r.value;
  },

  publicView(s): WordBombPublicView {
    const c = s.challenge;
    return {
      phase: s.phase, order: s.order, lives: s.lives, maxLives: s.config.lives, turn: s.phase === 'results' ? null : s.turn,
      fragment: s.fragment, deadline: s.deadline, last: s.last,
      challenge: c ? { word: c.word, by: c.by, challenger: c.challenger, judged: Object.keys(c.votes), judges: judgesFor(s, c) } : null,
      usedCount: s.used.length, events: s.events, winner: s.winner, wordCounts: s.wordCounts,
      canChallenge: s.config.challenges && s.phase === 'playing' && s.last !== null && alive(s).length >= 3, config: s.config,
    };
  },

  privateView(s, pid: PlayerId): WordBombPrivateView {
    const out = (s.lives[pid] ?? 0) <= 0;
    const c = s.challenge;
    const mustJudge = Boolean(c && s.phase === 'challenge' && !out && pid !== c.by && pid !== c.challenger && !(pid in c.votes));
    const yourTurn = s.phase === 'playing' && s.turn === pid;
    return { yourTurn, mustJudge, eliminated: out, waitingOnYou: yourTurn || mustJudge };
  },

  status: (s) => (s.phase === 'results' ? 'finished' : 'active'),

  onTimeout: (s, now, rng) => tick(s, now, rng),
};

export { withClock };

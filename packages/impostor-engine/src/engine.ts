import type { GameEngine, PlayerId, PlayerRef, Result, Rng } from '@party/game-engine';
import { ownWord, speaker, step, validate, withClock } from './rules';
import {
  maxImpostors, MAX_PLAYERS, MIN_PLAYERS,
  type ImpostorAction, type ImpostorConfig, type ImpostorPrivateView, type ImpostorPublicView, type ImpostorState, type Secret,
} from './types';

export type ImpostorSetup = ImpostorConfig & { secret: Secret };

export const impostorEngine: GameEngine<ImpostorSetup, ImpostorState, ImpostorAction, ImpostorPublicView, ImpostorPrivateView> = {
  init({ secret, ...config }, players: readonly PlayerRef[], rng: Rng): ImpostorState {
    const n = players.length;
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RangeError(`ImpostorWho needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
    if (config.impostors < 1 || config.impostors > maxImpostors(n)) throw new RangeError(`${n} players can have 1 to ${maxImpostors(n)} impostors`);
    const ids = players.map((p) => p.id);
    return {
      config, secret, order: rng.shuffle(ids), impostors: rng.shuffle(ids).slice(0, config.impostors),
      phase: 'roles', acked: [], round: 1, turn: 0, clues: [], votes: {}, reveals: [], tiebreak: null,
      accused: [], guess: null, outcome: null, discussionDeadline: null,
    };
  },

  validate: (s, pid, a): Result<true> => validate(s, pid, a),

  /** Throws on an illegal action. Servers call validate() first. */
  apply(s, pid, a) {
    const r = step(s, pid, a);
    if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
    return r.value;
  },

  publicView(s): ImpostorPublicView {
    return {
      phase: s.phase, order: s.order, round: s.round, totalRounds: s.config.clueRounds, speaker: speaker(s), clues: s.clues,
      acked: s.acked.length, voted: Object.keys(s.votes), reveals: s.reveals,
      tiebreakCandidates: s.phase === 'tiebreak' ? (s.tiebreak?.candidates ?? []) : [],
      accused: s.accused, impostorCount: s.impostors.length, discussionDeadline: s.discussionDeadline, config: s.config, outcome: s.outcome,
    };
  },

  privateView(s, pid): ImpostorPrivateView {
    const impostor = s.impostors.includes(pid);
    const word = ownWord(s, pid);
    const told = s.config.impostorKnows !== 'different';
    const waiting =
      (s.phase === 'roles' && !s.acked.includes(pid)) ||
      (s.phase === 'clues' && speaker(s) === pid) ||
      ((s.phase === 'voting' || s.phase === 'tiebreak') && !s.votes[pid]) ||
      (s.phase === 'guess' && impostor);
    return {
      role: !told ? 'unknown' : impostor ? 'impostor' : 'crew',
      word,
      hint: impostor && s.config.impostorKnows === 'hint' ? s.secret.hint : null,
      hasAcked: s.acked.includes(pid),
      myVote: s.votes[pid] ?? null,
      waitingOnYou: Boolean(waiting),
    };
  },

  status: (s) => (s.phase === 'results' ? 'finished' : 'active'),

  /** When the discussion timer runs out, voting opens. */
  onTimeout(s, now) {
    if (s.phase !== 'discussion' || s.discussionDeadline === null || now < s.discussionDeadline) return s;
    const r = step(s, s.order[0] as PlayerId, { type: 'skip-discussion' });
    return r.ok ? r.value : s;
  },
};

export { withClock };

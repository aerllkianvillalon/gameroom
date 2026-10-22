import type { GameEngine, PlayerId, PlayerRef, Rng } from '@party/game-engine';
import { isWolf, nightPending, step, tick, validate, withClock } from './rules';
import {
  autoWolves, maxWolves, MAX_PLAYERS, MIN_PLAYERS,
  type Role, type WerewolfAction, type WerewolfConfig, type WerewolfPrivateView, type WerewolfPublicView, type WerewolfState,
} from './types';

export const wolfCountFor = (config: WerewolfConfig, players: number) =>
  config.werewolves === 0 ? autoWolves(players) : Math.min(Math.max(1, config.werewolves), maxWolves(players));

function waitingOn(s: WerewolfState, pid: PlayerId): boolean {
  if (s.phase === 'roles') return !s.acked.includes(pid);
  if (s.phase === 'night') return nightPending(s).includes(pid);
  if (s.phase === 'voting') return s.alive.includes(pid) && !(pid in s.votes);
  return false;
}

export const werewolfEngine: GameEngine<WerewolfConfig, WerewolfState, WerewolfAction, WerewolfPublicView, WerewolfPrivateView> = {
  init(config, players: readonly PlayerRef[], rng: Rng): WerewolfState {
    const n = players.length;
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RangeError(`Werewolf needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
    const ids = players.map((p) => p.id);
    const deck: Role[] = Array(wolfCountFor(config, n)).fill('werewolf');
    if (config.seer) deck.push('seer');
    if (config.doctor) deck.push('doctor');
    while (deck.length < n) deck.push('villager');
    const dealt = rng.shuffle(deck);
    return {
      config, order: ids, roles: Object.fromEntries(ids.map((id, i) => [id, dealt[i] as Role])), alive: [...ids], phase: 'roles', day: 1,
      acked: [], kills: {}, inspected: null, protected: null, lastProtected: null, seerResults: [], deaths: [], report: null,
      votes: {}, lastVotes: null, outcome: null, deadline: null,
    };
  },

  validate: (s, pid, a) => validate(s, pid, a),

  /** Throws on an illegal action. Servers call validate() first. */
  apply(s, pid, a) {
    const r = step(s, pid, a);
    if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
    return r.value;
  },

  publicView(s): WerewolfPublicView {
    return {
      phase: s.phase, day: s.day, order: s.order, alive: s.alive,
      dead: s.deaths.map((d) => ({ ...d, role: s.config.revealRoles || s.phase === 'results' ? (s.roles[d.id] as Role) : null })),
      report: s.report, acked: s.acked.length, voted: Object.keys(s.votes), lastVotes: s.lastVotes,
      wolfCount: Object.values(s.roles).filter((r) => r === 'werewolf').length, deadline: s.deadline,
      outcome: s.outcome, config: s.config,
    };
  },

  privateView(s, pid): WerewolfPrivateView {
    const role = s.roles[pid] as Role;
    const wolf = isWolf(s, pid);
    return {
      role,
      pack: wolf ? s.order.filter((id) => isWolf(s, id)) : [],
      packVotes: wolf ? s.kills : {},
      seerResults: role === 'seer' ? s.seerResults : [],
      chosen: s.phase !== 'night' ? null : wolf ? (s.kills[pid] ?? null) : role === 'seer' ? s.inspected : role === 'doctor' ? s.protected : null,
      cannotProtect: role === 'doctor' ? s.lastProtected : null,
      hasAcked: s.acked.includes(pid),
      myVote: s.votes[pid] ?? null,
      isAlive: s.alive.includes(pid),
      waitingOnYou: waitingOn(s, pid),
    };
  },

  status: (s) => (s.phase === 'results' ? 'finished' : 'active'),

  onTimeout: (s, now) => tick(s, now),
};

export { withClock };

import { fail, ok, type PlayerId, type Result } from '@party/game-engine';
import type { Role, WerewolfAction, WerewolfState } from './types';

export const isWolf = (s: WerewolfState, id: PlayerId) => s.roles[id] === 'werewolf';
export const wolvesAlive = (s: WerewolfState) => s.alive.filter((id) => isWolf(s, id));
const holder = (s: WerewolfState, role: Role) => s.alive.find((id) => s.roles[id] === role);

/** Who still owes the night an action. */
export function nightPending(s: WerewolfState): PlayerId[] {
  if (s.phase !== 'night') return [];
  const out = wolvesAlive(s).filter((id) => !(id in s.kills));
  const seer = holder(s, 'seer');
  if (seer && s.inspected === null) out.push(seer);
  const doc = holder(s, 'doctor');
  if (doc && s.protected === null) out.push(doc);
  return out;
}

export function validate(s: WerewolfState, pid: PlayerId, a: WerewolfAction): Result<true> {
  if (s.phase === 'results') return fail('game_over', 'The game is over.');
  if (!s.order.includes(pid)) return fail('not_player', 'You are not in this game.');
  const isAlive = s.alive.includes(pid);
  const target = 'target' in a ? a.target : null;
  switch (a.type) {
    case 'ack-role':
      if (s.phase !== 'roles') return fail('wrong_phase', 'Roles have already been shown.');
      return s.acked.includes(pid) ? fail('already_done', 'You already saw your role.') : ok(true);
    case 'kill':
      if (s.phase !== 'night') return fail('wrong_phase', 'It is not night.');
      if (!isAlive || !isWolf(s, pid)) return fail('not_wolf', 'Only living werewolves choose a victim.');
      if (!target || !s.alive.includes(target)) return fail('bad_target', 'Pick a living player.');
      return isWolf(s, target) ? fail('bad_target', 'You cannot pick a fellow werewolf.') : ok(true);
    case 'inspect':
      if (s.phase !== 'night') return fail('wrong_phase', 'It is not night.');
      if (!isAlive || s.roles[pid] !== 'seer') return fail('not_seer', 'Only the living seer can inspect.');
      if (s.inspected !== null) return fail('already_done', 'You already inspected someone tonight.');
      if (!target || !s.alive.includes(target) || target === pid) return fail('bad_target', 'Pick another living player.');
      return ok(true);
    case 'protect':
      if (s.phase !== 'night') return fail('wrong_phase', 'It is not night.');
      if (!isAlive || s.roles[pid] !== 'doctor') return fail('not_doctor', 'Only the living doctor can protect.');
      if (s.protected !== null) return fail('already_done', 'You already protected someone tonight.');
      if (!target || !s.alive.includes(target)) return fail('bad_target', 'Pick a living player.');
      return target === s.lastProtected ? fail('repeat_protect', 'You protected that player last night. Pick someone else.') : ok(true);
    case 'skip-discussion':
      return s.phase === 'discussion' && isAlive ? ok(true) : fail('wrong_phase', 'There is no discussion to skip.');
    case 'vote':
      if (s.phase !== 'voting') return fail('wrong_phase', 'Voting is not open.');
      if (!isAlive) return fail('dead', 'The dead cannot vote.');
      if (pid in s.votes) return fail('already_voted', 'You already voted.');
      if (!target || !s.alive.includes(target)) return fail('bad_target', 'Pick a living player.');
      return target === pid ? fail('self_vote', 'You cannot vote for yourself.') : ok(true);
  }
}

/** The single top choice, or null on a tie or no votes. */
export function plurality(votes: Record<PlayerId, PlayerId>): PlayerId | null {
  const tally: Record<PlayerId, number> = {};
  for (const t of Object.values(votes)) tally[t] = (tally[t] ?? 0) + 1;
  const ranked = Object.keys(tally).sort((a, b) => (tally[b] as number) - (tally[a] as number));
  const top = ranked[0];
  if (top === undefined) return null;
  return ranked[1] !== undefined && tally[ranked[1]] === tally[top] ? null : top;
}

function checkWin(s: WerewolfState): boolean {
  const wolves = wolvesAlive(s).length;
  const others = s.alive.length - wolves;
  const winner = wolves === 0 ? 'village' : wolves >= others ? 'wolves' : null;
  if (!winner) return false;
  s.phase = 'results';
  s.deadline = null;
  s.outcome = { winner, roles: s.roles, day: s.day };
  return true;
}

function kill(s: WerewolfState, id: PlayerId, cause: 'wolves' | 'vote') {
  s.alive = s.alive.filter((x) => x !== id);
  s.deaths.push({ id, day: s.day, cause });
}

function resolveNight(s: WerewolfState) {
  const victim = plurality(s.kills);
  const saved = victim !== null && victim === s.protected;
  if (victim !== null && !saved) kill(s, victim, 'wolves');
  if (s.inspected !== null) s.seerResults.push({ night: s.day, target: s.inspected, wolf: isWolf(s, s.inspected) });
  s.lastProtected = s.protected;
  s.report = { night: s.day, killed: victim !== null && !saved ? victim : null, saved };
  s.kills = {}; s.inspected = null; s.protected = null;
  s.deadline = null;
  if (!checkWin(s)) s.phase = 'discussion';
}

function settleVote(s: WerewolfState) {
  const lynched = plurality(s.votes);
  s.lastVotes = { day: s.day, votes: { ...s.votes }, lynched };
  if (lynched) kill(s, lynched, 'vote');
  s.votes = {};
  s.deadline = null;
  if (checkWin(s)) return;
  s.day++;
  s.phase = 'night';
  s.report = null;
}

/** Validates, then returns the next state. Never mutates the input. */
export function step(state: WerewolfState, pid: PlayerId, a: WerewolfAction): Result<WerewolfState> {
  const v = validate(state, pid, a);
  if (!v.ok) return v;
  const s = structuredClone(state);
  switch (a.type) {
    case 'ack-role':
      s.acked.push(pid);
      if (s.acked.length === s.order.length) { s.phase = 'night'; s.deadline = null; }
      break;
    case 'kill': s.kills[pid] = a.target; break;
    case 'inspect': s.inspected = a.target; break;
    case 'protect': s.protected = a.target; break;
    case 'skip-discussion': s.phase = 'voting'; s.deadline = null; break;
    case 'vote':
      s.votes[pid] = a.target;
      if (s.alive.every((id) => id in s.votes)) settleVote(s);
      break;
  }
  if (s.phase === 'night' && nightPending(s).length === 0) resolveNight(s);
  return ok(s);
}

/** A timer ran out: night resolves with the choices made, discussion opens voting, voting counts what was cast. */
export function tick(state: WerewolfState, now: number): WerewolfState {
  if (state.deadline === null || now < state.deadline) return state;
  const s = structuredClone(state);
  if (s.phase === 'night') resolveNight(s);
  else if (s.phase === 'discussion') { s.phase = 'voting'; s.deadline = null; }
  else if (s.phase === 'voting') settleVote(s);
  else return state;
  return s;
}

/** Owner calls this after each transition so each timer starts exactly once. */
export function withClock(s: WerewolfState, now: number): WerewolfState {
  const c = s.config;
  const secs = s.phase === 'night' ? c.nightSeconds : s.phase === 'discussion' ? c.discussionSeconds : s.phase === 'voting' ? c.voteSeconds : 0;
  return { ...s, deadline: secs > 0 ? (s.deadline ?? now + secs * 1000) : null };
}

import { fail, ok, type PlayerId, type Result, type Rng } from '@party/game-engine';
import { MAX_ROUNDS, PROMPTS } from './prompts';
import { POINTS_MAJORITY, type Prompt, type WyrAction, type WyrConfig, type WyrState } from './types';

export function pickPrompts(config: WyrConfig, rng: Rng): Prompt[] {
  const pool = PROMPTS.filter((x) => config.topic === 'mixed' || x.topic === config.topic);
  const n = Math.min(Math.max(1, config.rounds), MAX_ROUNDS, pool.length);
  // Which side shows first is random, so the order of the bank never favours "A".
  return rng.shuffle(pool).slice(0, n).map((x) => (rng.int(2) === 0 ? x : { ...x, a: x.b, b: x.a }));
}

export const current = (s: WyrState): Prompt | null => s.prompts[s.index] ?? null;

export function validate(s: WyrState, pid: PlayerId, a: WyrAction): Result<true> {
  if (s.phase === 'results') return fail('game_over', 'The game is over.');
  if (!s.order.includes(pid)) return fail('not_player', 'You are not in this game.');
  if (a.type !== 'vote') return fail('bad_action', 'That action does not belong to this game.');
  if (s.phase !== 'vote') return fail('wrong_phase', 'Voting is closed for this round.');
  if (pid in s.votes) return fail('already_voted', 'You already voted.');
  if (a.choice !== 0 && a.choice !== 1) return fail('bad_choice', 'Pick one of the two options.');
  return ok(true);
}

/** The players on the bigger side. Empty on a tie or when nobody voted. */
export function majorityOf(s: WyrState): PlayerId[] {
  const [x, y] = s.tally;
  if (x === y) return [];
  const side = x > y ? 0 : 1;
  return Object.keys(s.votes).filter((id) => s.votes[id] === side);
}

/** Counts the votes and moves to the reveal. Mutates `s`. */
function reveal(s: WyrState) {
  const t: [number, number] = [0, 0];
  for (const v of Object.values(s.votes)) t[v]++;
  s.tally = t;
  for (const id of majorityOf(s)) {
    s.majorityCounts[id] = (s.majorityCounts[id] ?? 0) + 1;
    if (s.config.scoring) s.scores[id] = (s.scores[id] ?? 0) + POINTS_MAJORITY;
  }
  s.phase = 'reveal';
  s.deadline = null;
}

function advance(s: WyrState) {
  s.deadline = null;
  if (s.index + 1 >= s.prompts.length) { s.phase = 'results'; return; }
  s.index++;
  s.phase = 'vote';
  s.votes = {};
  s.tally = [0, 0];
}

/** Validates, then returns the next state. Never mutates the input. */
export function step(state: WyrState, pid: PlayerId, a: WyrAction): Result<WyrState> {
  const v = validate(state, pid, a);
  if (!v.ok) return v;
  const s = structuredClone(state);
  s.votes[pid] = a.choice;
  if (Object.keys(s.votes).length === s.order.length) reveal(s);
  return ok(s);
}

/** Moves on when the vote timer or the reveal timer has run out. Returns the same object if nothing is due. */
export function tick(state: WyrState, now: number): WyrState {
  if (state.deadline === null || now < state.deadline) return state;
  const s = structuredClone(state);
  if (s.phase === 'vote') reveal(s);
  else if (s.phase === 'reveal') advance(s);
  else return state;
  return s;
}

/** Owner calls this after each transition so each timer starts exactly once. */
export function withClock(s: WyrState, now: number): WyrState {
  const secs = s.phase === 'vote' ? s.config.voteSeconds : s.phase === 'reveal' ? s.config.revealSeconds : 0;
  return { ...s, deadline: secs > 0 ? (s.deadline ?? now + secs * 1000) : null };
}

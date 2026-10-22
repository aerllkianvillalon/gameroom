import { fail, ok, type PlayerId, type Result, type Rng } from '@party/game-engine';
import { MAX_PAIRS, MIN_PAIRS, MISMATCH_MS, SYMBOLS, type MemoryAction, type MemoryConfig, type MemoryState } from './types';

/** Symbols for `pairs` pairs, shuffled. */
export function dealSymbols(config: MemoryConfig, rng: Rng): string[] {
  const n = Math.min(Math.max(MIN_PAIRS, config.pairs), MAX_PAIRS);
  const chosen = rng.shuffle(SYMBOLS).slice(0, n);
  return rng.shuffle([...chosen, ...chosen]);
}

export function nextPlayer(s: MemoryState, from: PlayerId): PlayerId {
  const i = s.order.indexOf(from);
  return s.order[(i + 1) % s.order.length] as PlayerId;
}

export function validate(s: MemoryState, pid: PlayerId, a: MemoryAction): Result<true> {
  if (s.phase === 'results') return fail('game_over', 'The game is over.');
  if (!s.order.includes(pid)) return fail('not_player', 'You are not in this game.');
  if (a.type !== 'flip') return fail('bad_action', 'That action does not belong to this game.');
  if (s.turn !== pid) return fail('not_your_turn', 'It is not your turn.');
  if (s.pendingMismatch) return fail('wait', 'Wait for the cards to flip back.');
  if (!Number.isInteger(a.index) || a.index < 0 || a.index >= s.symbols.length) return fail('bad_card', 'That card does not exist.');
  if (s.matchedBy[a.index] !== null) return fail('already_matched', 'That pair is already taken.');
  if (s.faceUp.includes(a.index)) return fail('already_up', 'That card is already face up.');
  return ok(true);
}

const unmatched = (s: MemoryState) => s.matchedBy.filter((m) => m === null).length;

function finishIfDone(s: MemoryState) {
  if (unmatched(s) === 0) { s.phase = 'results'; s.deadline = null; }
}

/** Validates, then returns the next state. Never mutates the input. */
export function step(state: MemoryState, pid: PlayerId, a: MemoryAction): Result<MemoryState> {
  const v = validate(state, pid, a);
  if (!v.ok) return v;
  const s = structuredClone(state);
  s.moves++;
  s.lastMiss = null;
  s.faceUp.push(a.index);
  s.deadline = null; // the flip timer restarts for the next flip
  if (s.faceUp.length === 2) {
    const [x, y] = s.faceUp as [number, number];
    if (s.symbols[x] === s.symbols[y]) {
      s.matchedBy[x] = pid; s.matchedBy[y] = pid;
      s.scores[pid] = (s.scores[pid] ?? 0) + 1;
      s.faceUp = [];
      finishIfDone(s); // a match keeps the turn
    } else {
      s.pendingMismatch = true;
    }
  }
  return ok(s);
}

/** Flips a wrong pair back and passes the turn. */
function settleMismatch(s: MemoryState) {
  s.lastMiss = s.turn;
  s.faceUp = [];
  s.pendingMismatch = false;
  s.turn = nextPlayer(s, s.turn);
  s.deadline = null;
}

/** A timer ran out: a wrong pair flips back, and a player who stalls loses the turn. */
export function tick(state: MemoryState, now: number): MemoryState {
  if (state.deadline === null || now < state.deadline || state.phase === 'results') return state;
  const s = structuredClone(state);
  s.moves++;
  if (s.pendingMismatch) settleMismatch(s);
  else { s.lastMiss = s.turn; s.faceUp = []; s.turn = nextPlayer(s, s.turn); s.deadline = null; }
  return s;
}

/** Owner calls this after each transition so each timer starts exactly once. */
export function withClock(s: MemoryState, now: number): MemoryState {
  if (s.phase === 'results') return { ...s, deadline: null };
  const ms = s.pendingMismatch ? MISMATCH_MS : s.config.flipSeconds * 1000;
  return { ...s, deadline: s.deadline ?? now + ms };
}

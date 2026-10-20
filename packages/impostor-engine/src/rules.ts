import { fail, ok, type PlayerId, type Result } from '@party/game-engine';
import type { ImpostorAction, ImpostorState, Outcome, Reason } from './types';

const squash = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
export const normalizeGuess = (t: string) => squash(t.replace(/^\s*(the|a|an)\s+/i, ''));
export const sanitizeClue = (t: string) => t.replace(/[\u0000-\u001F\u007F<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

/** The word this player was given (null if they were given none). */
export function ownWord(s: ImpostorState, pid: PlayerId): string | null {
  if (s.impostors.includes(pid)) return s.config.impostorKnows === 'different' ? s.secret.decoy : null;
  return s.secret.word;
}

export const speaker = (s: ImpostorState): PlayerId | null => (s.phase === 'clues' ? (s.order[s.turn] as PlayerId) : null);

export function validate(s: ImpostorState, pid: PlayerId, a: ImpostorAction): Result<true> {
  if (s.phase === 'results') return fail('game_over', 'The game is over.');
  if (!s.order.includes(pid)) return fail('not_player', 'You are not in this game.');
  switch (a.type) {
    case 'ack-role':
      if (s.phase !== 'roles') return fail('wrong_phase', 'Roles have already been shown.');
      return s.acked.includes(pid) ? fail('already_done', 'You already saw your role.') : ok(true);
    case 'clue': {
      if (s.phase !== 'clues') return fail('wrong_phase', 'It is not the clue phase.');
      if (speaker(s) !== pid) return fail('not_your_turn', 'It is not your turn to give a clue.');
      if (!s.config.typedClues) return ok(true);
      const text = sanitizeClue(a.text ?? '');
      if (!text) return fail('clue_empty', 'Type a clue first.');
      const mine = ownWord(s, pid);
      // Checked against the player's own word only, so a rejection never reveals anyone else's word.
      if (mine && squash(text).includes(squash(mine))) return fail('reveals_word', 'Your clue contains the secret word. Try another clue.');
      return ok(true);
    }
    case 'skip-discussion':
      return s.phase === 'discussion' ? ok(true) : fail('wrong_phase', 'There is no discussion to skip.');
    case 'vote': {
      if (s.phase !== 'voting' && s.phase !== 'tiebreak') return fail('wrong_phase', 'Voting is not open.');
      if (s.votes[pid]) return fail('already_voted', 'You already voted.');
      if (a.target === pid) return fail('self_vote', 'You cannot vote for yourself.');
      if (!s.order.includes(a.target)) return fail('bad_target', 'That player is not in the game.');
      if (s.phase === 'tiebreak' && !s.tiebreak?.candidates.includes(a.target)) return fail('bad_target', 'Vote for one of the tied players.');
      return ok(true);
    }
    case 'guess':
      if (s.phase !== 'guess') return fail('wrong_phase', 'There is no guess to make.');
      if (!s.impostors.includes(pid)) return fail('not_impostor', 'Only the impostor can guess.');
      return normalizeGuess(a.text) ? ok(true) : fail('guess_empty', 'Type a guess first.');
  }
}

type Accuse =
  | { kind: 'accused'; ids: PlayerId[] }
  | { kind: 'tie'; sure: PlayerId[]; tied: PlayerId[]; need: number }
  | { kind: 'short' };

/** Picks the top `k` vote-getters. Players with no votes can never be accused. */
export function accuse(tally: Record<PlayerId, number>, k: number): Accuse {
  const ranked = Object.keys(tally).sort((a, b) => (tally[b] as number) - (tally[a] as number));
  if (ranked.filter((id) => (tally[id] as number) > 0).length < k) return { kind: 'short' };
  const cut = tally[ranked[k - 1] as PlayerId] as number;
  const above = ranked.filter((id) => (tally[id] as number) > cut);
  const tied = ranked.filter((id) => tally[id] === cut);
  const need = k - above.length;
  return tied.length === need ? { kind: 'accused', ids: [...above, ...tied] } : { kind: 'tie', sure: above, tied, need };
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

function end(s: ImpostorState, winner: Outcome['winner'], reason: Reason) {
  s.phase = 'results';
  s.discussionDeadline = null;
  s.outcome = { winner, reason, accused: s.accused, impostors: s.impostors, word: s.secret.word, decoy: s.secret.decoy, guess: s.guess };
}

function finishAccusation(s: ImpostorState, ids: PlayerId[]) {
  s.accused = ids;
  if (!sameSet(ids, s.impostors)) return end(s, 'impostors', 'wrong-accusation');
  if (s.config.finalGuess) s.phase = 'guess';
  else end(s, 'crew', 'caught');
}

function settleVotes(s: ImpostorState) {
  const stage = s.phase === 'voting' ? 'vote' : 'tiebreak';
  s.reveals.push({ stage, votes: { ...s.votes } });
  const pool = stage === 'vote' ? s.order : (s.tiebreak as NonNullable<typeof s.tiebreak>).candidates;
  const tally: Record<PlayerId, number> = Object.fromEntries(pool.map((id) => [id, 0]));
  for (const target of Object.values(s.votes)) if (target in tally) tally[target] = (tally[target] as number) + 1;

  const res = accuse(tally, stage === 'vote' ? s.config.impostors : (s.tiebreak as NonNullable<typeof s.tiebreak>).need);
  if (res.kind === 'short') return end(s, 'impostors', 'not-enough-votes');
  if (res.kind === 'accused') return finishAccusation(s, stage === 'vote' ? res.ids : [...(s.tiebreak as NonNullable<typeof s.tiebreak>).sure, ...res.ids]);
  if (stage === 'vote' && s.config.tieBreak) {
    s.phase = 'tiebreak';
    s.tiebreak = { candidates: res.tied, sure: res.sure, need: res.need };
    s.votes = {};
    return;
  }
  end(s, 'impostors', 'tie');
}

/** Validates, then returns the next state. Never mutates the input. */
export function step(state: ImpostorState, pid: PlayerId, a: ImpostorAction): Result<ImpostorState> {
  const v = validate(state, pid, a);
  if (!v.ok) return v;
  const s = structuredClone(state);
  const n = s.order.length;
  switch (a.type) {
    case 'ack-role':
      s.acked.push(pid);
      if (s.acked.length === n) s.phase = 'clues';
      break;
    case 'clue':
      s.clues.push({ round: s.round, by: pid, text: s.config.typedClues ? sanitizeClue(a.text ?? '') : '' });
      s.turn++;
      if (s.turn >= n) {
        s.turn = 0;
        if (s.round >= s.config.clueRounds) s.phase = 'discussion';
        else s.round++;
      }
      break;
    case 'skip-discussion':
      s.phase = 'voting';
      s.discussionDeadline = null;
      break;
    case 'vote':
      s.votes[pid] = a.target;
      if (Object.keys(s.votes).length === n) settleVotes(s);
      break;
    case 'guess':
      s.guess = a.text.trim().slice(0, 60);
      if (normalizeGuess(a.text) === normalizeGuess(s.secret.word)) end(s, 'impostors', 'guessed-word');
      else end(s, 'crew', 'caught');
      break;
  }
  return ok(s);
}

/** Owner calls this after each transition so the discussion timer starts exactly once. */
export function withClock(s: ImpostorState, now: number): ImpostorState {
  const wants = s.phase === 'discussion' && s.config.discussionSeconds > 0;
  return { ...s, discussionDeadline: wants ? (s.discussionDeadline ?? now + s.config.discussionSeconds * 1000) : null };
}

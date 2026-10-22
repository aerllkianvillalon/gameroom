import { fail, ok, type PlayerId, type Result, type Rng } from '@party/game-engine';
import { FRAGMENTS } from './fragments';
import { MIN_WORD_LENGTH, type Challenge, type EventKind, type WordBombAction, type WordBombState } from './types';

/** Lower-case letters only; accents and punctuation are stripped. */
export const normalizeWord = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

export const alive = (s: WordBombState): PlayerId[] => s.order.filter((id) => (s.lives[id] ?? 0) > 0);

/** The next living player after `from`, wrapping around. */
export function nextAlive(s: WordBombState, from: PlayerId): PlayerId {
  const n = s.order.length;
  const start = s.order.indexOf(from);
  for (let i = 1; i <= n; i++) {
    const id = s.order[(start + i) % n] as PlayerId;
    if ((s.lives[id] ?? 0) > 0) return id;
  }
  return from;
}

export function pickFragment(s: Pick<WordBombState, 'config' | 'fragment'>, rng: Rng): string {
  const pool = FRAGMENTS[s.config.difficulty].filter((f) => f !== s.fragment);
  return rng.pick(pool);
}

/** A word is playable if it is long enough, has real letters, contains the fragment and is new. Whether it is a real word is up to the table (see challenges). */
export function checkWord(s: WordBombState, raw: string): Result<string> {
  const w = normalizeWord(raw);
  if (w.length < MIN_WORD_LENGTH) return fail('too_short', `Words need at least ${MIN_WORD_LENGTH} letters.`);
  if (new Set(w).size < 2) return fail('not_a_word', 'That does not look like a word.');
  if (!w.includes(s.fragment)) return fail('missing_fragment', `The word must contain "${s.fragment.toUpperCase()}".`);
  if (w === s.fragment) return fail('is_fragment', 'Use the letters inside a longer word.');
  if (s.used.includes(w)) return fail('already_used', 'Someone already used that word.');
  return ok(w);
}

export function validate(s: WordBombState, pid: PlayerId, a: WordBombAction): Result<true> {
  if (s.phase === 'results') return fail('game_over', 'The game is over.');
  if (!s.order.includes(pid)) return fail('not_player', 'You are not in this game.');
  if ((s.lives[pid] ?? 0) <= 0) return fail('eliminated', 'You are out of lives.');
  switch (a.type) {
    case 'word': {
      if (s.phase !== 'playing') return fail('wrong_phase', 'A challenge is being settled.');
      if (s.turn !== pid) return fail('not_your_turn', 'It is not your turn.');
      const r = checkWord(s, a.text);
      return r.ok ? ok(true) : r;
    }
    case 'challenge':
      if (!s.config.challenges) return fail('challenges_off', 'Challenges are turned off.');
      if (s.phase !== 'playing') return fail('wrong_phase', 'You cannot challenge right now.');
      if (s.turn !== pid) return fail('not_your_turn', 'Only the player whose turn it is can challenge.');
      if (!s.last) return fail('nothing_to_challenge', 'There is no word to challenge yet.');
      if (s.last.by === pid) return fail('own_word', 'You cannot challenge your own word.');
      if (judgesFor(s, { by: s.last.by, challenger: pid }).length === 0) return fail('no_judges', 'A challenge needs at least one other player to judge it.');
      return ok(true);
    case 'judge': {
      const c = s.challenge;
      if (s.phase !== 'challenge' || !c) return fail('wrong_phase', 'There is nothing to judge.');
      if (pid === c.by || pid === c.challenger) return fail('not_a_judge', 'You are part of this challenge, so others will judge it.');
      if (pid in c.votes) return fail('already_voted', 'You already voted.');
      return ok(true);
    }
  }
}

export const judgesFor = (s: WordBombState, c: Pick<Challenge, 'by' | 'challenger'>): PlayerId[] =>
  alive(s).filter((id) => id !== c.by && id !== c.challenger);

function event(s: WordBombState, kind: EventKind, player: PlayerId, word?: string) {
  s.seq++;
  s.events = [...s.events.slice(-5), { kind, player, word, seq: s.seq }];
}

function loseLife(s: WordBombState, id: PlayerId) {
  s.lives[id] = Math.max(0, (s.lives[id] ?? 0) - 1);
  if (s.lives[id] === 0) event(s, 'eliminated', id);
}

/** Ends the game if one player is left; otherwise hands the bomb to `next` with a new fragment. */
function passTo(s: WordBombState, next: PlayerId, rng: Rng) {
  const left = alive(s);
  s.challenge = null;
  s.deadline = null;
  if (left.length <= 1) {
    s.phase = 'results';
    s.winner = left[0] ?? null;
    return;
  }
  s.phase = 'playing';
  s.turn = (s.lives[next] ?? 0) > 0 ? next : nextAlive(s, next);
  s.fragment = pickFragment(s, rng);
  // The fuse gets shorter as the table thins out, never below 5 seconds.
  const cut = (s.order.length - left.length) * 1000;
  s.fuseMs = Math.max(5000, s.config.fuseSeconds * 1000 - cut);
}

function settleChallenge(s: WordBombState, rng: Rng) {
  const c = s.challenge as Challenge;
  const judges = judgesFor(s, c);
  const invalid = Object.values(c.votes).filter((v) => !v).length;
  const valid = Object.values(c.votes).length - invalid;
  // A word must be thrown out by more than half the judges. A tie keeps the word.
  const upheld = judges.length > 0 && invalid > valid;
  if (upheld) {
    s.used = s.used.filter((w) => w !== c.word);
    s.wordCounts[c.by] = Math.max(0, (s.wordCounts[c.by] ?? 0) - 1);
    loseLife(s, c.by);
    event(s, 'challenge-upheld', c.by, c.word);
  } else {
    loseLife(s, c.challenger);
    event(s, 'challenge-failed', c.challenger, c.word);
  }
  s.last = null;
  passTo(s, c.challenger, rng);
}

/** Validates, then returns the next state. Never mutates the input. */
export function step(state: WordBombState, pid: PlayerId, a: WordBombAction, rng: Rng): Result<WordBombState> {
  const v = validate(state, pid, a);
  if (!v.ok) return v;
  const s = structuredClone(state);
  switch (a.type) {
    case 'word': {
      const w = checkWord(s, a.text) as { ok: true; value: string };
      s.used.push(w.value);
      s.wordCounts[pid] = (s.wordCounts[pid] ?? 0) + 1;
      s.last = { by: pid, word: w.value, fragment: s.fragment };
      passTo(s, nextAlive(s, pid), rng);
      break;
    }
    case 'challenge': {
      const last = s.last as NonNullable<typeof s.last>;
      const c: Challenge = { word: last.word, by: last.by, challenger: pid, votes: {} };
      s.challenge = c;
      s.phase = 'challenge';
      s.deadline = null;
      break;
    }
    case 'judge': {
      const c = s.challenge as Challenge;
      c.votes[pid] = a.valid;
      if (judgesFor(s, c).every((id) => id in c.votes)) settleChallenge(s, rng);
      break;
    }
  }
  return ok(s);
}

/** The fuse ran out: the player holding the bomb loses a life. For a stalled challenge, the votes so far decide. */
export function tick(state: WordBombState, now: number, rng: Rng): WordBombState {
  if (state.deadline === null || now < state.deadline || state.phase === 'results') return state;
  const s = structuredClone(state);
  if (s.phase === 'challenge') { settleChallenge(s, rng); return s; }
  const holder = s.turn;
  event(s, 'exploded', holder, s.fragment);
  loseLife(s, holder);
  passTo(s, nextAlive(s, holder), rng);
  return s;
}

/** Owner calls this after each transition so each fuse starts exactly once. */
export function withClock(s: WordBombState, now: number): WordBombState {
  const ms = s.phase === 'playing' ? s.fuseMs : s.phase === 'challenge' ? 15_000 : 0;
  return { ...s, deadline: ms > 0 ? (s.deadline ?? now + ms) : null };
}

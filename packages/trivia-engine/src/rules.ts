import { fail, ok, type PlayerId, type Result, type Rng } from '@party/game-engine';
import { BANK, MAX_QUESTIONS } from './questions';
import { POINTS_CORRECT, SPEED_BONUS, type Question, type TriviaAction, type TriviaConfig, type TriviaState } from './types';

/** Picks `config.questions` questions for the chosen category and shuffles each one's options. */
export function pickQuestions(config: TriviaConfig, rng: Rng): Question[] {
  const pool = BANK.filter((b) => config.category === 'mixed' || b.category === config.category);
  const count = Math.min(Math.max(1, config.questions), MAX_QUESTIONS, pool.length);
  return rng.shuffle(pool).slice(0, count).map((b) => {
    const options = rng.shuffle([b.right, ...b.wrong]);
    return { id: b.id, category: b.category, text: b.text, options, answer: options.indexOf(b.right) };
  });
}

export const currentQuestion = (s: TriviaState): Question | null => s.questions[s.index] ?? null;

export function validate(s: TriviaState, pid: PlayerId, a: TriviaAction): Result<true> {
  if (s.phase === 'results') return fail('game_over', 'The game is over.');
  if (!s.order.includes(pid)) return fail('not_player', 'You are not in this game.');
  if (a.type !== 'answer') return fail('bad_action', 'That action does not belong to this game.');
  if (s.phase !== 'question') return fail('wrong_phase', 'The answer is already being revealed.');
  if (pid in s.answers) return fail('already_answered', 'You already answered this one.');
  if (!Number.isInteger(a.choice) || a.choice < 0 || a.choice >= (currentQuestion(s)?.options.length ?? 0)) return fail('bad_choice', 'Pick one of the answers.');
  return ok(true);
}

/** Scores the current question and moves to the reveal. Mutates `s`. */
function reveal(s: TriviaState) {
  const q = currentQuestion(s) as Question;
  const gains: Record<PlayerId, number> = Object.fromEntries(s.order.map((id) => [id, 0]));
  let rank = 0;
  for (const id of s.answerOrder) {
    if (s.answers[id] !== q.answer) continue;
    gains[id] = POINTS_CORRECT + (s.config.speedBonus ? (SPEED_BONUS[rank] ?? 0) : 0);
    s.correctCounts[id] = (s.correctCounts[id] ?? 0) + 1;
    rank++;
  }
  for (const id of s.order) s.scores[id] = (s.scores[id] ?? 0) + (gains[id] ?? 0);
  s.gains = gains;
  s.phase = 'reveal';
  s.deadline = null;
}

function advance(s: TriviaState) {
  s.deadline = null;
  if (s.index + 1 >= s.questions.length) { s.phase = 'results'; return; }
  s.index++;
  s.phase = 'question';
  s.answers = {};
  s.answerOrder = [];
  s.gains = {};
}

/** Validates, then returns the next state. Never mutates the input. */
export function step(state: TriviaState, pid: PlayerId, a: TriviaAction): Result<TriviaState> {
  const v = validate(state, pid, a);
  if (!v.ok) return v;
  const s = structuredClone(state);
  s.answers[pid] = a.choice;
  s.answerOrder.push(pid);
  if (s.answerOrder.length === s.order.length) reveal(s);
  return ok(s);
}

/** Moves on when the question timer or the reveal timer has run out. Returns the same object if nothing is due. */
export function tick(state: TriviaState, now: number): TriviaState {
  if (state.deadline === null || now < state.deadline) return state;
  const s = structuredClone(state);
  if (s.phase === 'question') reveal(s);
  else if (s.phase === 'reveal') advance(s);
  else return state;
  return s;
}

/** Owner calls this after each transition so each timer starts exactly once. */
export function withClock(s: TriviaState, now: number): TriviaState {
  const secs = s.phase === 'question' ? s.config.questionSeconds : s.phase === 'reveal' ? s.config.revealSeconds : 0;
  return { ...s, deadline: secs > 0 ? (s.deadline ?? now + secs * 1000) : null };
}

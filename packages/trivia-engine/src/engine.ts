import type { GameEngine, PlayerId, PlayerRef, Rng } from '@party/game-engine';
import { currentQuestion, pickQuestions, step, tick, validate, withClock } from './rules';
import {
  MAX_PLAYERS, MIN_PLAYERS,
  type Standing, type TriviaAction, type TriviaConfig, type TriviaPrivateView, type TriviaPublicView, type TriviaState,
} from './types';

export const standings = (s: TriviaState): Standing[] =>
  s.order.map((id) => ({ id, score: s.scores[id] ?? 0, correct: s.correctCounts[id] ?? 0 })).sort((a, b) => b.score - a.score || b.correct - a.correct);

export const triviaEngine: GameEngine<TriviaConfig, TriviaState, TriviaAction, TriviaPublicView, TriviaPrivateView> = {
  init(config, players: readonly PlayerRef[], rng: Rng): TriviaState {
    const n = players.length;
    if (n < MIN_PLAYERS || n > MAX_PLAYERS) throw new RangeError(`Trivia Battle needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
    const ids = players.map((p) => p.id);
    return {
      config, order: ids, questions: pickQuestions(config, rng), index: 0, phase: 'question', answers: {}, answerOrder: [],
      scores: Object.fromEntries(ids.map((id) => [id, 0])), gains: {}, correctCounts: {}, deadline: null,
    };
  },

  validate: (s, pid, a) => validate(s, pid, a),

  /** Throws on an illegal action. Servers call validate() first. */
  apply(s, pid, a) {
    const r = step(s, pid, a);
    if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
    return r.value;
  },

  publicView(s): TriviaPublicView {
    const q = currentQuestion(s);
    const showAnswer = s.phase !== 'question';
    return {
      phase: s.phase, order: s.order, index: s.index, total: s.questions.length,
      category: q?.category ?? null, text: q?.text ?? null, options: q?.options ?? [],
      answered: s.answerOrder, deadline: s.deadline, scores: s.scores,
      correct: showAnswer && q ? q.answer : null, picks: showAnswer ? s.answers : {}, gains: showAnswer ? s.gains : {},
      standings: standings(s), config: s.config,
    };
  },

  privateView(s, pid: PlayerId): TriviaPrivateView {
    return { myChoice: s.answers[pid] ?? null, waitingOnYou: s.phase === 'question' && !(pid in s.answers) };
  },

  status: (s) => (s.phase === 'results' ? 'finished' : 'active'),

  onTimeout: (s, now) => tick(s, now),
};

export { withClock };

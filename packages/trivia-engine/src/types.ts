import type { PlayerId } from '@party/game-engine';

export type TriviaCategory = 'science' | 'geography' | 'history' | 'culture';
export type CategorySetting = TriviaCategory | 'mixed';

export interface Question {
  id: string;
  category: TriviaCategory;
  text: string;
  /** Always four options, already shuffled. */
  options: string[];
  /** Index into `options`. Never sent to clients before the reveal. */
  answer: number;
}

export interface TriviaConfig {
  questions: number;
  questionSeconds: number;
  revealSeconds: number;
  category: CategorySetting;
  /** Faster correct answers earn extra points. */
  speedBonus: boolean;
}
export const DEFAULT_CONFIG: TriviaConfig = { questions: 10, questionSeconds: 20, revealSeconds: 6, category: 'mixed', speedBonus: true };
export const makeConfig = (p: Partial<TriviaConfig> = {}): TriviaConfig => ({ ...DEFAULT_CONFIG, ...p });

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 12;
export const POINTS_CORRECT = 100;
/** Bonus for the 1st, 2nd, 3rd... correct answer to a question. */
export const SPEED_BONUS = [50, 40, 30, 20, 10] as const;

export type Phase = 'question' | 'reveal' | 'results';
export type TriviaAction = { type: 'answer'; choice: number };

/** Server-only: holds the answer key. */
export interface TriviaState {
  config: TriviaConfig;
  order: PlayerId[];
  questions: Question[];
  index: number;
  phase: Phase;
  /** This question's picks. */
  answers: Record<PlayerId, number>;
  /** Players in the order they answered. */
  answerOrder: PlayerId[];
  scores: Record<PlayerId, number>;
  /** Points each player gained on the question just revealed. */
  gains: Record<PlayerId, number>;
  correctCounts: Record<PlayerId, number>;
  deadline: number | null;
}

export interface Standing { id: PlayerId; score: number; correct: number }

export interface TriviaPublicView {
  phase: Phase;
  order: PlayerId[];
  index: number;
  total: number;
  category: TriviaCategory | null;
  text: string | null;
  options: string[];
  /** Who has answered, never what they picked (until the reveal). */
  answered: PlayerId[];
  deadline: number | null;
  scores: Record<PlayerId, number>;
  /** Only present in `reveal` and `results`. */
  correct: number | null;
  picks: Record<PlayerId, number>;
  gains: Record<PlayerId, number>;
  standings: Standing[];
  config: TriviaConfig;
}

export interface TriviaPrivateView {
  myChoice: number | null;
  waitingOnYou: boolean;
}

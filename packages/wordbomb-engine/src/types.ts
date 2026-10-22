import type { PlayerId } from '@party/game-engine';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WordBombConfig {
  /** Seconds a player has before the bomb goes off. */
  fuseSeconds: number;
  lives: number;
  difficulty: Difficulty;
  /** Let the next player challenge a word that looks made up. */
  challenges: boolean;
}
export const DEFAULT_CONFIG: WordBombConfig = { fuseSeconds: 10, lives: 3, difficulty: 'medium', challenges: true };
export const makeConfig = (p: Partial<WordBombConfig> = {}): WordBombConfig => ({ ...DEFAULT_CONFIG, ...p });

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const MIN_WORD_LENGTH = 3;

export type Phase = 'playing' | 'challenge' | 'results';

export type WordBombAction =
  | { type: 'word'; text: string }
  | { type: 'challenge' }
  | { type: 'judge'; valid: boolean };

export interface LastWord { by: PlayerId; word: string; fragment: string }
export interface Challenge { word: string; by: PlayerId; challenger: PlayerId; votes: Record<PlayerId, boolean> }

export type EventKind = 'exploded' | 'word-rejected' | 'challenge-upheld' | 'challenge-failed' | 'eliminated';
export interface GameEvent { kind: EventKind; player: PlayerId; word?: string; seq: number }

export interface WordBombState {
  config: WordBombConfig;
  order: PlayerId[];
  lives: Record<PlayerId, number>;
  /** Whose turn it is. */
  turn: PlayerId;
  fragment: string;
  used: string[];
  last: LastWord | null;
  challenge: Challenge | null;
  phase: Phase;
  /** Fuse deadline in epoch ms; null until the owner starts the clock. */
  deadline: number | null;
  /** How long the fuse for this turn lasts. Shrinks a little as players are eliminated. */
  fuseMs: number;
  events: GameEvent[];
  seq: number;
  winner: PlayerId | null;
  wordCounts: Record<PlayerId, number>;
}

export interface WordBombPublicView {
  phase: Phase;
  order: PlayerId[];
  lives: Record<PlayerId, number>;
  maxLives: number;
  turn: PlayerId | null;
  fragment: string;
  deadline: number | null;
  last: LastWord | null;
  /** Challenge in progress: who is judging and who has judged. Votes stay hidden until it resolves. */
  challenge: { word: string; by: PlayerId; challenger: PlayerId; judged: PlayerId[]; judges: PlayerId[] } | null;
  usedCount: number;
  events: GameEvent[];
  winner: PlayerId | null;
  wordCounts: Record<PlayerId, number>;
  canChallenge: boolean;
  config: WordBombConfig;
}

export interface WordBombPrivateView {
  yourTurn: boolean;
  /** True when you are asked to judge a challenged word. */
  mustJudge: boolean;
  eliminated: boolean;
  waitingOnYou: boolean;
}

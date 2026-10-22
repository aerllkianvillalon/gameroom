import type { PlayerId } from '@party/game-engine';

export interface MemoryConfig {
  /** Number of pairs on the table. */
  pairs: number;
  /** Seconds a player has for each flip. */
  flipSeconds: number;
}
export const DEFAULT_CONFIG: MemoryConfig = { pairs: 8, flipSeconds: 15 };
export const makeConfig = (p: Partial<MemoryConfig> = {}): MemoryConfig => ({ ...DEFAULT_CONFIG, ...p });

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const MIN_PAIRS = 4;
export const SYMBOLS = ['🍎', '🚀', '🐙', '🎸', '🌵', '🍕', '🦊', '🎲', '🌈', '🔔', '🍩', '🏀'] as const;
export const MAX_PAIRS = SYMBOLS.length;
/** How long a wrong pair stays face up so everyone can remember it. */
export const MISMATCH_MS = 1800;

export type Phase = 'playing' | 'results';
export type MemoryAction = { type: 'flip'; index: number };

export interface MemoryState {
  config: MemoryConfig;
  order: PlayerId[];
  /** The hidden layout. Never sent to clients except for face-up and matched cards. */
  symbols: string[];
  /** Who won each card (by index), or null while it is still in play. */
  matchedBy: (PlayerId | null)[];
  /** Cards currently face up and not yet matched: 0, 1 or 2 indices. */
  faceUp: number[];
  turn: PlayerId;
  /** True while a wrong pair is showing, before it flips back. */
  pendingMismatch: boolean;
  scores: Record<PlayerId, number>;
  phase: Phase;
  deadline: number | null;
  /** Counts each flip, so clients can tell a new flip from a re-sent view. */
  moves: number;
  /** The last turn change, for a short message ("Ana missed"). */
  lastMiss: PlayerId | null;
}

export interface CardView {
  /** The emoji, or null while the card is face down. */
  symbol: string | null;
  matchedBy: PlayerId | null;
  faceUp: boolean;
}

export interface MemoryPublicView {
  phase: Phase;
  order: PlayerId[];
  cards: CardView[];
  turn: PlayerId | null;
  pendingMismatch: boolean;
  scores: Record<PlayerId, number>;
  winners: PlayerId[];
  deadline: number | null;
  lastMiss: PlayerId | null;
  pairsLeft: number;
  config: MemoryConfig;
}

export interface MemoryPrivateView { yourTurn: boolean; waitingOnYou: boolean }

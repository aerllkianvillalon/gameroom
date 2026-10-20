import type { PlayerId } from '@party/game-engine';

export const COLORS = ['red', 'yellow', 'green', 'blue'] as const;
export type Color = (typeof COLORS)[number];
export type CardValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface Card {
  id: number;
  color: Color | 'wild';
  value: CardValue;
}

/** Non-standard rules default to off. */
export interface UnoConfig {
  stackDraws: boolean;
  jumpIn: boolean;
  sevenZero: boolean;
  /** Cards drawn by a player caught without calling UNO. */
  unoPenalty: number;
  /** Seconds per turn; 0 disables the timer. */
  turnTimer: number;
  startingHand: number;
}

export const DEFAULT_CONFIG: UnoConfig = {
  stackDraws: false, jumpIn: false, sevenZero: false, unoPenalty: 2, turnTimer: 0, startingHand: 7,
};
export const makeConfig = (partial: Partial<UnoConfig> = {}): UnoConfig => ({ ...DEFAULT_CONFIG, ...partial });

export type UnoAction =
  | { type: 'play'; cardId: number; color?: Color; swapWith?: PlayerId; callUno?: boolean }
  | { type: 'draw' }
  | { type: 'pass' }
  | { type: 'call-uno' }
  | { type: 'catch-uno'; target: PlayerId };

/** What just happened, for UI messages and animations. */
export type UnoEvent =
  | { type: 'played'; by: PlayerId; card: Card }
  | { type: 'color'; color: Color }
  | { type: 'drew'; by: PlayerId; count: number }
  | { type: 'skipped'; player: PlayerId }
  | { type: 'reversed' }
  | { type: 'penalty'; player: PlayerId; count: number; reason: 'draw-effect' | 'stack' | 'uno' }
  | { type: 'uno'; by: PlayerId }
  | { type: 'caught'; target: PlayerId; by: PlayerId }
  | { type: 'swapped'; a: PlayerId; b: PlayerId }
  | { type: 'rotated' }
  | { type: 'passed'; by: PlayerId }
  | { type: 'won'; player: PlayerId };

/** Server-only. Contains every hand and the draw pile order. Never send this to a client. */
export interface UnoState {
  config: UnoConfig;
  order: PlayerId[];
  hands: Record<PlayerId, Card[]>;
  /** Draw from the END of the array. */
  drawPile: Card[];
  /** Top card is the LAST element. */
  discard: Card[];
  direction: 1 | -1;
  current: number;
  activeColor: Color;
  pendingDraw: number;
  pendingKind: 'draw2' | 'wild4' | null;
  /** Set when the current player drew a playable card and may play it or pass. */
  drewCardId: number | null;
  /** A player left on one card who has not called UNO yet; others may catch them. */
  unoPending: PlayerId | null;
  winner: PlayerId | null;
  events: UnoEvent[];
  turnDeadline: number | null;
}

export interface UnoPublicView {
  players: { id: PlayerId; cards: number }[];
  current: PlayerId;
  direction: 1 | -1;
  activeColor: Color;
  topCard: Card;
  drawCount: number;
  pendingDraw: number;
  drewCardPending: boolean;
  unoVulnerable: PlayerId | null;
  winner: PlayerId | null;
  events: UnoEvent[];
  turnDeadline: number | null;
  config: UnoConfig;
}

export interface UnoPrivateView {
  hand: Card[];
  playableCardIds: number[];
  yourTurn: boolean;
  canDraw: boolean;
  canPass: boolean;
}

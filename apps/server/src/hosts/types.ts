import type { PlayerId, Result, Room, Rng } from '@party/game-engine';
import type { CustomPack } from '@party/protocol';

export type Cancel = () => void;
export type Scheduler = (fn: () => void, ms: number) => Cancel;

export interface Timing {
  hostGraceMs: number;
  emptyTtlMs: number;
  maxAgeMs: number;
  sweepMs: number;
  /** How long a disconnected player's turn waits before the server plays for them. */
  awayDelayMs: number;
  botDelayMs: number;
}
export const DEFAULT_TIMING: Timing = {
  hostGraceMs: 60_000, emptyTtlMs: 10 * 60_000, maxAgeMs: 8 * 60 * 60_000, sweepMs: 60_000, awayDelayMs: 15_000, botDelayMs: 900,
};

export interface HostCtx {
  room: Room;
  rng: Rng;
  now: () => number;
  schedule: Scheduler;
  timing: Timing;
  isAway: (id: PlayerId) => boolean;
  /** Called whenever the game state changed, including moves the server made itself. */
  notify: () => void;
  recentWords: string[];
  rememberWords: (words: string[]) => void;
  pack?: CustomPack;
}

/** Runs one game's authoritative state inside a room. */
export interface GameHost {
  readonly gameId: string;
  act(pid: PlayerId, action: unknown): Result<true>;
  views(pid: PlayerId): { public: unknown; private: unknown };
  isOver(): boolean;
  /** Someone connected or disconnected: re-plan any waiting on away players. */
  onPresence(): void;
  dispose(): void;
}

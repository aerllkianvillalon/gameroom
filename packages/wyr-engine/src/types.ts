import type { PlayerId } from '@party/game-engine';

export type WyrTopic = 'silly' | 'thoughtful';
export type TopicSetting = WyrTopic | 'mixed';

export interface Prompt { id: string; topic: WyrTopic; a: string; b: string }

export interface WyrConfig {
  rounds: number;
  voteSeconds: number;
  revealSeconds: number;
  topic: TopicSetting;
  /** Players on the bigger side earn points. Off for a pure conversation game. */
  scoring: boolean;
}
export const DEFAULT_CONFIG: WyrConfig = { rounds: 8, voteSeconds: 20, revealSeconds: 8, topic: 'mixed', scoring: true };
export const makeConfig = (p: Partial<WyrConfig> = {}): WyrConfig => ({ ...DEFAULT_CONFIG, ...p });

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 16;
export const POINTS_MAJORITY = 100;

export type Phase = 'vote' | 'reveal' | 'results';
export type WyrAction = { type: 'vote'; choice: 0 | 1 };

export interface WyrState {
  config: WyrConfig;
  order: PlayerId[];
  prompts: Prompt[];
  index: number;
  phase: Phase;
  votes: Record<PlayerId, 0 | 1>;
  scores: Record<PlayerId, number>;
  /** Times each player landed on the bigger side. */
  majorityCounts: Record<PlayerId, number>;
  /** Result of the round just revealed. */
  tally: [number, number];
  deadline: number | null;
}

export interface WyrPublicView {
  phase: Phase;
  order: PlayerId[];
  index: number;
  total: number;
  a: string | null;
  b: string | null;
  topic: WyrTopic | null;
  /** Who has voted, never how (until the reveal). */
  voted: PlayerId[];
  deadline: number | null;
  /** Only in `reveal` and `results`. */
  tally: [number, number] | null;
  picks: Record<PlayerId, 0 | 1>;
  /** Who was on the bigger side this round; empty on a tie. */
  majority: PlayerId[];
  scores: Record<PlayerId, number>;
  standings: { id: PlayerId; score: number; majority: number }[];
  config: WyrConfig;
}

export interface WyrPrivateView { myChoice: 0 | 1 | null; waitingOnYou: boolean }

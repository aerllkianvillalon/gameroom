import type { PlayerId } from '@party/game-engine';

export type Role = 'villager' | 'werewolf' | 'seer' | 'doctor';

export interface WerewolfConfig {
  /** 0 picks a number that suits the table size. */
  werewolves: number;
  seer: boolean;
  doctor: boolean;
  nightSeconds: number;
  discussionSeconds: number;
  voteSeconds: number;
  /** Show a player's role when they are eliminated. */
  revealRoles: boolean;
}
export const DEFAULT_CONFIG: WerewolfConfig = { werewolves: 0, seer: true, doctor: true, nightSeconds: 45, discussionSeconds: 120, voteSeconds: 60, revealRoles: true };
export const makeConfig = (p: Partial<WerewolfConfig> = {}): WerewolfConfig => ({ ...DEFAULT_CONFIG, ...p });

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 16;
export const maxWolves = (players: number) => Math.max(1, Math.floor(players / 3));
export const autoWolves = (players: number) => Math.min(maxWolves(players), players >= 11 ? 3 : players >= 8 ? 2 : 1);

export type Phase = 'roles' | 'night' | 'discussion' | 'voting' | 'results';

export type WerewolfAction =
  | { type: 'ack-role' }
  | { type: 'kill'; target: PlayerId }
  | { type: 'inspect'; target: PlayerId }
  | { type: 'protect'; target: PlayerId }
  | { type: 'skip-discussion' }
  | { type: 'vote'; target: PlayerId };

export interface Death { id: PlayerId; day: number; cause: 'wolves' | 'vote' }
export interface NightReport { night: number; killed: PlayerId | null; saved: boolean }
export interface SeerResult { night: number; target: PlayerId; wolf: boolean }
export interface Outcome { winner: 'village' | 'wolves'; roles: Record<PlayerId, Role>; day: number }

/** Server-only: roles live here and nowhere else. */
export interface WerewolfState {
  config: WerewolfConfig;
  order: PlayerId[];
  roles: Record<PlayerId, Role>;
  alive: PlayerId[];
  phase: Phase;
  /** Counts nights: the first night is 1. */
  day: number;
  acked: PlayerId[];
  kills: Record<PlayerId, PlayerId>;
  inspected: PlayerId | null;
  protected: PlayerId | null;
  lastProtected: PlayerId | null;
  seerResults: SeerResult[];
  deaths: Death[];
  report: NightReport | null;
  votes: Record<PlayerId, PlayerId>;
  lastVotes: { day: number; votes: Record<PlayerId, PlayerId>; lynched: PlayerId | null } | null;
  outcome: Outcome | null;
  deadline: number | null;
}

export interface WerewolfPublicView {
  phase: Phase;
  day: number;
  order: PlayerId[];
  alive: PlayerId[];
  dead: { id: PlayerId; day: number; cause: 'wolves' | 'vote'; role: Role | null }[];
  report: NightReport | null;
  acked: number;
  voted: PlayerId[];
  lastVotes: WerewolfState['lastVotes'];
  wolfCount: number;
  deadline: number | null;
  outcome: Outcome | null;
  config: WerewolfConfig;
}

export interface WerewolfPrivateView {
  role: Role;
  /** Fellow werewolves (only for werewolves). */
  pack: PlayerId[];
  /** What the wolves have chosen so far (only for werewolves). */
  packVotes: Record<PlayerId, PlayerId>;
  seerResults: SeerResult[];
  /** Your own pending night choice. */
  chosen: PlayerId | null;
  /** The doctor cannot protect the same player two nights running. */
  cannotProtect: PlayerId | null;
  hasAcked: boolean;
  myVote: PlayerId | null;
  isAlive: boolean;
  waitingOnYou: boolean;
}

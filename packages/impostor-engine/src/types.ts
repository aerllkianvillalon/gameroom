import type { PlayerId } from '@party/game-engine';

export type ImpostorKnows = 'nothing' | 'hint' | 'different';
export interface Secret { word: string; hint: string; decoy: string }

export interface ImpostorConfig {
  impostors: number;
  impostorKnows: ImpostorKnows;
  clueRounds: number;
  discussionSeconds: number;
  tieBreak: boolean;
  finalGuess: boolean;
  /** true: clues are typed and recorded (online). false: clues are spoken aloud and only the turn advances (pass and play). */
  typedClues: boolean;
}
export const DEFAULT_CONFIG: ImpostorConfig = {
  impostors: 1, impostorKnows: 'nothing', clueRounds: 2, discussionSeconds: 90, tieBreak: true, finalGuess: true, typedClues: false,
};
export const makeConfig = (p: Partial<ImpostorConfig> = {}): ImpostorConfig => ({ ...DEFAULT_CONFIG, ...p });

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 12;
/** Impostors must stay a minority of the table. */
export const maxImpostors = (players: number) => Math.max(1, Math.floor((players - 1) / 2));

export type Phase = 'roles' | 'clues' | 'discussion' | 'voting' | 'tiebreak' | 'guess' | 'results';

export type ImpostorAction =
  | { type: 'ack-role' }
  | { type: 'clue'; text?: string }
  | { type: 'skip-discussion' }
  | { type: 'vote'; target: PlayerId }
  | { type: 'guess'; text: string };

export type Reason = 'caught' | 'guessed-word' | 'wrong-accusation' | 'tie' | 'not-enough-votes';
export interface Outcome {
  winner: 'crew' | 'impostors';
  reason: Reason;
  accused: PlayerId[];
  impostors: PlayerId[];
  word: string;
  decoy: string;
  guess: string | null;
}
export interface Reveal { stage: 'vote' | 'tiebreak'; votes: Record<PlayerId, PlayerId> }
export interface Clue { round: number; by: PlayerId; text: string }
export interface Tiebreak { candidates: PlayerId[]; sure: PlayerId[]; need: number }

/** Server-only: roles and the secret word live here and nowhere else. */
export interface ImpostorState {
  config: ImpostorConfig;
  secret: Secret;
  order: PlayerId[];
  impostors: PlayerId[];
  phase: Phase;
  acked: PlayerId[];
  round: number;
  turn: number;
  clues: Clue[];
  votes: Record<PlayerId, PlayerId>;
  reveals: Reveal[];
  tiebreak: Tiebreak | null;
  accused: PlayerId[];
  guess: string | null;
  outcome: Outcome | null;
  discussionDeadline: number | null;
}

export interface ImpostorPublicView {
  phase: Phase;
  order: PlayerId[];
  round: number;
  totalRounds: number;
  speaker: PlayerId | null;
  clues: Clue[];
  acked: number;
  /** Who has voted so far, never who they voted for. */
  voted: PlayerId[];
  /** Votes are only shown once everyone has voted. */
  reveals: Reveal[];
  tiebreakCandidates: PlayerId[];
  accused: PlayerId[];
  impostorCount: number;
  discussionDeadline: number | null;
  config: ImpostorConfig;
  /** Null until the game is over; this is the only place roles and the word appear publicly. */
  outcome: Outcome | null;
}

export interface ImpostorPrivateView {
  /** 'unknown' in "different word" mode, where nobody is told whether they are the impostor. */
  role: 'crew' | 'impostor' | 'unknown';
  word: string | null;
  hint: string | null;
  hasAcked: boolean;
  myVote: PlayerId | null;
  /** True when the game is waiting on this player. */
  waitingOnYou: boolean;
}

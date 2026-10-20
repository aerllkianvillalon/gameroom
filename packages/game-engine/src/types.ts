import type { Result } from './result';
import type { Rng } from './rng';

export const AVATAR_IDS = ['cat', 'dog', 'bird', 'fish', 'rabbit', 'squirrel', 'turtle', 'snail'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export type PlayerId = string;

export interface PlayerRef {
  id: PlayerId;
  name: string;
  avatar: AvatarId;
  isBot: boolean;
}

export type SettingValue = string | number | boolean;

/**
 * Contract every game implements. Rules live here, never in React or socket code,
 * so the same engine runs in the browser (offline) and on the server (online).
 *
 *  State        server-only; may contain hidden info (deck order, secret word, roles)
 *  PublicView   safe to broadcast to the whole room
 *  PrivateView  only ever sent to its owner (hand, own role)
 */
export interface GameEngine<Config, State, Action, PublicView, PrivateView> {
  init(config: Config, players: readonly PlayerRef[], rng: Rng): State;
  validate(state: State, playerId: PlayerId, action: Action): Result<true>;
  apply(state: State, playerId: PlayerId, action: Action, rng: Rng): State;
  publicView(state: State): PublicView;
  privateView(state: State, playerId: PlayerId): PrivateView;
  status(state: State): 'active' | 'finished';
  /** Called by a timer owner (server or offline adapter) when a deadline passes. */
  onTimeout?(state: State, now: number, rng: Rng): State;
}

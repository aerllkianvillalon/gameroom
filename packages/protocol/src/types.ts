import type { AvatarId, PlayerId, SettingValue } from '@party/game-engine';
import type { UnoAction } from '@party/uno-engine';
import type { ImpostorAction } from '@party/impostor-engine';
import type { TriviaAction } from '@party/trivia-engine';
import type { WordBombAction } from '@party/wordbomb-engine';
import type { WerewolfAction } from '@party/werewolf-engine';
import type { WyrAction } from '@party/wyr-engine';
import type { MemoryAction } from '@party/memory-engine';

export type GameId = 'uno' | 'impostor' | 'trivia' | 'wordbomb' | 'werewolf' | 'wyr' | 'memory';
export type GameAction = UnoAction | ImpostorAction | TriviaAction | WordBombAction | WerewolfAction | WyrAction | MemoryAction;
export type Settings = Record<string, SettingValue>;
export interface CustomPack { name: string; words: string[] }

/** Everything a client may send. Validated by `ClientMessageSchema` (zod) before the server acts on it. */
export type ClientMessage =
  | { type: 'create'; game: GameId; name: string; avatar: AvatarId; settings?: Settings; password?: string }
  | { type: 'join'; code: string; name: string; avatar: AvatarId; password?: string }
  | { type: 'resume'; code: string; token: string }
  | { type: 'ready'; ready: boolean }
  | { type: 'settings'; patch: Settings }
  | { type: 'add-bot' }
  | { type: 'kick'; playerId: PlayerId }
  | { type: 'start'; pack?: CustomPack }
  | { type: 'action'; action: GameAction }
  | { type: 'back-to-lobby' }
  | { type: 'leave' };

export type Ack<T = unknown> = { ok: true; data?: T } | { ok: false; code: string; message: string };

/** Returned on create / join / resume. The token is the player's only credential: keep it private. */
export interface Joined { code: string; playerId: PlayerId; token: string }

export interface RoomMemberView {
  id: PlayerId; name: string; avatar: AvatarId; isBot: boolean; ready: boolean; connected: boolean;
}
/** Safe for every member of the room. Never contains tokens or passwords. */
export interface RoomSnapshot {
  code: string; gameId: string; hostId: PlayerId; phase: 'lobby' | 'playing' | 'finished';
  members: RoomMemberView[]; minPlayers: number; maxPlayers: number; settings: Settings;
  you: PlayerId; hasPassword: boolean;
}
/** `public` is the same for everyone; `private` is only ever sent to its owner. */
export interface GameSnapshot { gameId: string; public: unknown; private: unknown; serverTime: number }

export interface ServerEvents {
  room: RoomSnapshot;
  game: GameSnapshot | null;
  closed: { reason: 'expired' | 'kicked' | 'replaced' | 'left' | 'shutdown' };
}
export const CLIENT_EVENT = 'msg';

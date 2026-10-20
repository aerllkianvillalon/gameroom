import type { AvatarId, PlayerId, Result, Room, SettingValue } from '@party/game-engine';

export interface CreateRoomArgs {
  gameId: string;
  minPlayers: number;
  maxPlayers: number;
  hostName: string;
  hostAvatar: AvatarId;
  settings: Record<string, SettingValue>;
}

/** What the UI needs from a transport. The Socket.IO adapter will implement the same surface in Phase 2. */
export interface RoomTransport {
  readonly kind: 'offline' | 'online';
  getRoom(): Room | null;
  subscribe(listener: () => void): () => void;
  createRoom(args: CreateRoomArgs): Result<Room>;
  addPlayer(name: string, avatar: AvatarId): Result<Room>;
  addBot(): Result<Room>;
  removePlayer(id: PlayerId): Result<Room>;
  updateSettings(patch: Record<string, SettingValue>): Result<Room>;
  start(): Result<Room>;
  returnToLobby(): void;
  leave(): void;
}

import {
  addMember, AVATAR_IDS, createId, createRoom, createRng, fail, generateRoomCode, nextBotName,
  randomSeed, removeMember, reopenLobby, setSettings, startRoom, validateName, type AvatarId, type PlayerId, type Result,
  type Room, type Rng, type SettingValue,
} from '@party/game-engine';
import type { CreateRoomArgs, RoomTransport } from './types';

/** Runs a room entirely in the browser. No network, no account. */
export class OfflineAdapter implements RoomTransport {
  readonly kind = 'offline' as const;
  private room: Room | null = null;
  private listeners = new Set<() => void>();
  private rng: Rng;

  constructor(rng: Rng = createRng(randomSeed())) {
    this.rng = rng;
  }

  getRoom = () => this.room;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private commit(next: Room | null) {
    this.room = next;
    this.listeners.forEach((l) => l());
  }

  private mutate(fn: (room: Room) => Result<Room>): Result<Room> {
    if (!this.room) return fail('no_room', 'There is no open room.');
    const result = fn(this.room);
    if (result.ok) this.commit(result.value);
    return result;
  }

  createRoom(args: CreateRoomArgs): Result<Room> {
    const name = validateName(args.hostName);
    if (!name.ok) return name;
    const room = createRoom({
      code: generateRoomCode(this.rng),
      gameId: args.gameId,
      mode: 'local',
      host: { id: createId(this.rng), name: name.value, avatar: args.hostAvatar, isBot: false },
      minPlayers: args.minPlayers,
      maxPlayers: args.maxPlayers,
      settings: args.settings,
      now: Date.now(),
    });
    this.commit(room);
    return { ok: true, value: room };
  }

  addPlayer(name: string, avatar: AvatarId): Result<Room> {
    const n = validateName(name);
    if (!n.ok) return n;
    return this.mutate((room) => addMember(room, { id: createId(this.rng), name: n.value, avatar, isBot: false }));
  }

  addBot(): Result<Room> {
    return this.mutate((room) =>
      addMember(room, { id: createId(this.rng), name: nextBotName(room, this.rng), avatar: this.rng.pick(AVATAR_IDS), isBot: true }),
    );
  }

  removePlayer(id: PlayerId): Result<Room> {
    return this.mutate((room) =>
      id === room.hostId ? fail('is_host', 'The host cannot be removed. Close the room instead.') : removeMember(room, id),
    );
  }

  updateSettings(patch: Record<string, SettingValue>): Result<Room> {
    return this.mutate((room) => setSettings(room, room.hostId, patch));
  }

  start(): Result<Room> {
    return this.mutate((room) => startRoom(room, room.hostId));
  }

  returnToLobby() {
    if (this.room) this.commit(reopenLobby(this.room));
  }

  leave() {
    this.commit(null);
  }
}

/** One local room at a time, shared by the whole app. */
export const offlineAdapter = new OfflineAdapter();

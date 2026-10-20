import { fail, ok, type Result } from './result';
import type { Rng } from './rng';
import type { PlayerId, PlayerRef, SettingValue } from './types';

export const ROOM_CODE_LENGTH = 5;
/** No I, L, O, 0, 1: codes get read aloud and typed on phones. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const MAX_NAME_LENGTH = 16;

export const BOT_NAMES = ['Biscuit', 'Pepper', 'Juniper', 'Waffles', 'Clover', 'Maple', 'Pixel', 'Nutmeg'] as const;

const CODE_RE = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export function generateRoomCode(rng: Rng, taken: ReadonlySet<string> = new Set()): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[rng.int(ROOM_CODE_ALPHABET.length)];
    if (!taken.has(code)) return code;
  }
  throw new Error('Could not generate a unique room code');
}

export const normalizeRoomCode = (input: string): string => input.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const isValidRoomCode = (code: string): boolean => CODE_RE.test(code);

export function sanitizeName(input: string): string {
  return input
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH)
    .trim();
}

export function validateName(input: string): Result<string> {
  const name = sanitizeName(input);
  return name ? ok(name) : fail('name_empty', 'Enter a name for this player.');
}

export type RoomMode = 'local' | 'online';
export type RoomPhase = 'lobby' | 'playing' | 'finished';

export interface RoomMember extends PlayerRef {
  ready: boolean;
  connected: boolean;
}

export interface Room {
  code: string;
  gameId: string;
  mode: RoomMode;
  hostId: PlayerId;
  members: RoomMember[];
  minPlayers: number;
  maxPlayers: number;
  settings: Record<string, SettingValue>;
  phase: RoomPhase;
  createdAt: number;
}

export interface CreateRoomInput {
  code: string;
  gameId: string;
  mode: RoomMode;
  host: PlayerRef;
  minPlayers: number;
  maxPlayers: number;
  settings: Record<string, SettingValue>;
  now: number;
}

export function createRoom(i: CreateRoomInput): Room {
  return {
    code: i.code,
    gameId: i.gameId,
    mode: i.mode,
    hostId: i.host.id,
    members: [{ ...i.host, ready: true, connected: true }],
    minPlayers: i.minPlayers,
    maxPlayers: i.maxPlayers,
    settings: { ...i.settings },
    phase: 'lobby',
    createdAt: i.now,
  };
}

const findMember = (room: Room, id: PlayerId) => room.members.find((m) => m.id === id);

export function addMember(room: Room, player: PlayerRef): Result<Room> {
  if (room.phase !== 'lobby') return fail('in_progress', 'This game has already started.');
  if (room.members.length >= room.maxPlayers) return fail('room_full', `This room is full (${room.maxPlayers} players).`);
  if (findMember(room, player.id)) return fail('duplicate_id', 'That player is already in the room.');
  if (room.members.some((m) => m.name.toLowerCase() === player.name.toLowerCase())) {
    return fail('name_taken', `"${player.name}" is already taken in this room.`);
  }
  const ready = player.isBot || room.mode === 'local';
  return ok({ ...room, members: [...room.members, { ...player, ready, connected: true }] });
}

/** Removes a member. Host passes to the first remaining human; a room with only bots left is emptied. */
export function removeMember(room: Room, id: PlayerId): Result<Room> {
  if (!findMember(room, id)) return fail('not_member', 'That player is not in the room.');
  const members = room.members.filter((m) => m.id !== id);
  if (members.every((m) => m.isBot)) return ok({ ...room, members: [] });
  const hostId = id === room.hostId ? (members.find((m) => !m.isBot) as RoomMember).id : room.hostId;
  return ok({ ...room, members, hostId });
}

export function setReady(room: Room, id: PlayerId, ready: boolean): Result<Room> {
  const m = findMember(room, id);
  if (!m) return fail('not_member', 'That player is not in the room.');
  return ok({ ...room, members: room.members.map((x) => (x.id === id ? { ...x, ready } : x)) });
}

export function setConnected(room: Room, id: PlayerId, connected: boolean): Result<Room> {
  if (!findMember(room, id)) return fail('not_member', 'That player is not in the room.');
  return ok({ ...room, members: room.members.map((x) => (x.id === id ? { ...x, connected } : x)) });
}

/** Hands the host role to another human member. */
export function setHost(room: Room, id: PlayerId): Result<Room> {
  const m = findMember(room, id);
  if (!m) return fail('not_member', 'That player is not in the room.');
  if (m.isBot) return fail('is_bot', 'A bot cannot be the host.');
  return ok({ ...room, hostId: id });
}

export function setSettings(room: Room, byId: PlayerId, patch: Record<string, SettingValue>): Result<Room> {
  if (byId !== room.hostId) return fail('not_host', 'Only the host can change settings.');
  if (room.phase !== 'lobby') return fail('in_progress', 'Settings are locked once the game starts.');
  return ok({ ...room, settings: { ...room.settings, ...patch } });
}

export function canStart(room: Room): Result<true> {
  if (room.phase !== 'lobby') return fail('in_progress', 'The game has already started.');
  if (room.members.length < room.minPlayers) {
    return fail('too_few', `Needs at least ${room.minPlayers} players (${room.members.length} so far).`);
  }
  if (room.members.length > room.maxPlayers) return fail('too_many', `At most ${room.maxPlayers} players can play.`);
  if (room.mode === 'online') {
    const waiting = room.members.find((m) => !m.isBot && !m.ready);
    if (waiting) return fail('not_ready', `Waiting for ${waiting.name} to get ready.`);
    const away = room.members.find((m) => !m.isBot && !m.connected);
    if (away) return fail('disconnected', `${away.name} is disconnected.`);
  }
  return ok(true);
}

export function startRoom(room: Room, byId: PlayerId): Result<Room> {
  if (byId !== room.hostId) return fail('not_host', 'Only the host can start the game.');
  const check = canStart(room);
  if (!check.ok) return check;
  return ok({ ...room, phase: 'playing' });
}

export function reopenLobby(room: Room): Room {
  return { ...room, phase: 'lobby' };
}

export function nextBotName(room: Room, rng: Rng): string {
  const used = new Set(room.members.map((m) => m.name.toLowerCase()));
  const free = BOT_NAMES.filter((n) => !used.has(n.toLowerCase()));
  return free.length ? rng.pick(free) : `Bot ${room.members.length + 1}`;
}

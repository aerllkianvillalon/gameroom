import {
  addMember, AVATAR_IDS, canStart, createId, createRng, createRoom, fail, generateRoomCode, nextBotName, normalizeRoomCode,
  ok, randomSeed, removeMember, reopenLobby, setConnected, setHost, setReady, setSettings, startRoom, validateName,
  type PlayerId, type Result, type Room, type Rng,
} from '@party/game-engine';
import { canCreateRoom, defaultSettings, getGame } from '@party/game-registry';
import { maxImpostors, parseWords, validatePack } from '@party/impostor-engine';
import type { Ack, ClientMessage, GameId, Joined, RoomSnapshot, ServerEvents } from '@party/protocol';
import { ImpostorHost } from './hosts/impostor';
import { DEFAULT_TIMING, type Cancel, type GameHost, type HostCtx, type Scheduler, type Timing } from './hosts/types';
import { TokenBucket } from './ratelimit';
import { sanitizeSettings } from './settings';
import { UnoHost } from './hosts/uno';

/** One connected client. The socket layer implements this; tests use a fake. */
export interface Conn {
  readonly id: string;
  send<E extends keyof ServerEvents>(event: E, payload: ServerEvents[E]): void;
}

export interface HubOptions {
  now?: () => number;
  rng?: Rng;
  schedule?: Scheduler;
  newToken?: () => string;
  timing?: Partial<Timing>;
  maxRooms?: number;
}

interface Seat { playerId: PlayerId; token: string; conn: Conn | null; left: boolean }
interface ServerRoom {
  room: Room;
  password: string | null;
  seats: Map<PlayerId, Seat>;
  game: GameHost | null;
  recentWords: string[];
  lastActivity: number;
  hostTimer: Cancel | null;
}

const ONLINE_GAMES: readonly GameId[] = ['uno', 'impostor'];
const BOTS_ONLINE: readonly GameId[] = ['uno'];
const err = (code: string, message: string): Ack => ({ ok: false, code, message });
const good = (data?: unknown): Ack => ({ ok: true, data });
const fromResult = (r: Result<unknown>): Ack => (r.ok ? good() : err(r.code, r.message));

/** Constant-time string compare so token checks do not leak how many characters matched. */
function sameToken(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

const timeoutScheduler: Scheduler = (fn, ms) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};
function randomHexToken(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Owns every room. Knows nothing about sockets: clients arrive as `Conn`s, messages arrive already validated.
 * The server is authoritative: clients never send state, only intents, and every intent is checked here.
 */
export class Hub {
  private rooms = new Map<string, ServerRoom>();
  private bindings = new Map<string, { code: string; playerId: PlayerId }>();
  private limiters = new Map<string, TokenBucket>();
  private now: () => number;
  private rng: Rng;
  private schedule: Scheduler;
  private newToken: () => string;
  private timing: Timing;
  private maxRooms: number;
  private cancelSweep: Cancel | null = null;

  constructor(opts: HubOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.rng = opts.rng ?? createRng(randomSeed());
    this.schedule = opts.schedule ?? timeoutScheduler;
    this.newToken = opts.newToken ?? randomHexToken;
    this.timing = { ...DEFAULT_TIMING, ...opts.timing };
    this.maxRooms = opts.maxRooms ?? 500;
    this.armSweep();
  }

  stats() {
    let players = 0;
    for (const sr of this.rooms.values()) for (const s of sr.seats.values()) if (s.conn) players++;
    return { rooms: this.rooms.size, players };
  }

  dispose() {
    this.cancelSweep?.();
    for (const sr of [...this.rooms.values()]) this.closeRoom(sr, 'shutdown');
  }

  // ---------------------------------------------------------------- entry points

  handle(conn: Conn, msg: ClientMessage): Ack {
    const heavy = msg.type === 'create' || msg.type === 'join' || msg.type === 'resume';
    let bucket = this.limiters.get(conn.id);
    if (!bucket) this.limiters.set(conn.id, (bucket = new TokenBucket(40, 20, this.now)));
    if (!bucket.take(heavy ? 8 : 1)) return err('rate_limited', 'You are doing that too fast. Wait a moment and try again.');

    switch (msg.type) {
      case 'create': return this.create(conn, msg);
      case 'join': return this.join(conn, msg);
      case 'resume': return this.resume(conn, msg);
      default: return this.inRoom(conn, msg);
    }
  }

  disconnect(conn: Conn) {
    this.limiters.delete(conn.id);
    const b = this.bindings.get(conn.id);
    if (!b) return;
    this.bindings.delete(conn.id);
    const sr = this.rooms.get(b.code);
    const seat = sr?.seats.get(b.playerId);
    if (!sr || !seat || seat.conn !== conn) return;
    seat.conn = null;
    this.setPresence(sr, seat.playerId, false);
    if (sr.room.hostId === seat.playerId) sr.hostTimer = this.schedule(() => this.transferHost(sr), this.timing.hostGraceMs);
    this.touch(sr);
    this.pushRoom(sr);
    sr.game?.onPresence();
  }

  // ---------------------------------------------------------------- joining

  private create(conn: Conn, msg: Extract<ClientMessage, { type: 'create' }>): Ack {
    if (this.bindings.has(conn.id)) return err('already_in_room', 'Leave your current room first.');
    const meta = getGame(msg.game);
    if (!meta || !canCreateRoom(meta) || !ONLINE_GAMES.includes(msg.game)) return err('bad_game', 'That game is not available online.');
    if (this.rooms.size >= this.maxRooms) return err('server_busy', 'The server is full right now. Try again in a few minutes.');
    const name = validateName(msg.name);
    if (!name.ok) return fromResult(name);
    if (!AVATAR_IDS.includes(msg.avatar)) return err('bad_avatar', 'Pick one of the avatars.');

    const code = generateRoomCode(this.rng, new Set(this.rooms.keys()));
    const hostId = createId(this.rng);
    const room = createRoom({
      code, gameId: meta.id, mode: 'online', host: { id: hostId, name: name.value, avatar: msg.avatar, isBot: false },
      minPlayers: meta.minPlayers, maxPlayers: meta.maxPlayers,
      settings: { ...defaultSettings(meta), ...sanitizeSettings(meta, msg.settings ?? {}) }, now: this.now(),
    });
    const sr: ServerRoom = { room, password: msg.password || null, seats: new Map(), game: null, recentWords: [], lastActivity: this.now(), hostTimer: null };
    this.rooms.set(code, sr);
    return this.seat(sr, conn, hostId);
  }

  private join(conn: Conn, msg: Extract<ClientMessage, { type: 'join' }>): Ack {
    if (this.bindings.has(conn.id)) return err('already_in_room', 'Leave your current room first.');
    const sr = this.rooms.get(normalizeRoomCode(msg.code));
    if (!sr) return err('no_such_room', 'No room has that code. Check it and try again.');
    if (sr.password !== null && !sameToken(msg.password ?? '', sr.password)) return err('bad_password', 'That room needs a password.');
    const name = validateName(msg.name);
    if (!name.ok) return fromResult(name);
    if (!AVATAR_IDS.includes(msg.avatar)) return err('bad_avatar', 'Pick one of the avatars.');
    const id = createId(this.rng);
    const added = addMember(sr.room, { id, name: name.value, avatar: msg.avatar, isBot: false });
    if (!added.ok) return fromResult(added);
    sr.room = added.value;
    return this.seat(sr, conn, id);
  }

  private resume(conn: Conn, msg: Extract<ClientMessage, { type: 'resume' }>): Ack {
    if (this.bindings.has(conn.id)) return err('already_in_room', 'Leave your current room first.');
    const sr = this.rooms.get(normalizeRoomCode(msg.code));
    const seat = sr && [...sr.seats.values()].find((s) => sameToken(s.token, msg.token));
    if (!sr || !seat || seat.left) return err('bad_session', 'That session has expired. Join the room again.');
    if (seat.conn && seat.conn !== conn) {
      this.bindings.delete(seat.conn.id);
      seat.conn.send('closed', { reason: 'replaced' });
    }
    seat.conn = conn;
    this.bindings.set(conn.id, { code: sr.room.code, playerId: seat.playerId });
    this.setPresence(sr, seat.playerId, true);
    if (sr.room.hostId === seat.playerId) { sr.hostTimer?.(); sr.hostTimer = null; }
    this.touch(sr);
    this.pushRoom(sr);
    this.pushGameTo(sr, seat);
    sr.game?.onPresence();
    return good({ code: sr.room.code, playerId: seat.playerId, token: seat.token } satisfies Joined);
  }

  private seat(sr: ServerRoom, conn: Conn, playerId: PlayerId): Ack {
    const token = this.newToken();
    const seat: Seat = { playerId, token, conn, left: false };
    sr.seats.set(playerId, seat);
    this.bindings.set(conn.id, { code: sr.room.code, playerId });
    this.touch(sr);
    this.pushRoom(sr);
    return good({ code: sr.room.code, playerId, token } satisfies Joined);
  }

  // ---------------------------------------------------------------- everything after joining

  private inRoom(conn: Conn, msg: ClientMessage): Ack {
    const b = this.bindings.get(conn.id);
    const sr = b && this.rooms.get(b.code);
    if (!b || !sr) return err('not_in_room', 'Join or create a room first.');
    const me = b.playerId;
    const isHost = sr.room.hostId === me;
    this.touch(sr);

    switch (msg.type) {
      case 'ready': {
        const r = setReady(sr.room, me, msg.ready);
        return this.commitRoom(sr, r);
      }
      case 'settings': {
        if (!isHost) return err('not_host', 'Only the host can change settings.');
        const meta = getGame(sr.room.gameId);
        return this.commitRoom(sr, setSettings(sr.room, me, meta ? sanitizeSettings(meta, msg.patch) : {}));
      }
      case 'add-bot': {
        if (!isHost) return err('not_host', 'Only the host can add bots.');
        if (!BOTS_ONLINE.includes(sr.room.gameId as GameId)) return err('no_bots', 'This game does not support bots.');
        return this.commitRoom(sr, addMember(sr.room, { id: createId(this.rng), name: nextBotName(sr.room, this.rng), avatar: this.rng.pick(AVATAR_IDS), isBot: true }));
      }
      case 'kick': {
        if (!isHost) return err('not_host', 'Only the host can remove players.');
        if (msg.playerId === me) return err('self_kick', 'Use Leave to leave the room.');
        if (sr.room.phase !== 'lobby') return err('in_progress', 'Players cannot be removed once the game starts.');
        const r = removeMember(sr.room, msg.playerId);
        if (!r.ok) return fromResult(r);
        const seat = sr.seats.get(msg.playerId);
        if (seat?.conn) { this.bindings.delete(seat.conn.id); seat.conn.send('closed', { reason: 'kicked' }); }
        sr.seats.delete(msg.playerId);
        return this.commitRoom(sr, r);
      }
      case 'start': return this.startGame(sr, me, isHost, msg.pack);
      case 'action': {
        if (!sr.game) return err('no_game', 'No game is running.');
        const r = sr.game.act(me, msg.action); // pushes to everyone via notify()
        return fromResult(r);
      }
      case 'back-to-lobby': {
        if (!isHost) return err('not_host', 'Only the host can return to the lobby.');
        if (!sr.game?.isOver()) return err('not_over', 'The game is still going.');
        sr.game.dispose();
        sr.game = null;
        sr.room = reopenLobby(sr.room);
        this.pushRoom(sr);
        for (const seat of sr.seats.values()) seat.conn?.send('game', null);
        return good();
      }
      case 'leave': return this.leave(sr, conn, me);
      default: return err('bad_message', 'That message was not understood.');
    }
  }

  private startGame(sr: ServerRoom, me: PlayerId, isHost: boolean, pack?: { name: string; words: string[] }): Ack {
    if (!isHost) return err('not_host', 'Only the host can start the game.');
    if (sr.game) return err('in_progress', 'The game has already started.');
    const { room } = sr;
    const check = canStart(room);
    if (!check.ok) return fromResult(check);
    if (room.gameId === 'impostor' && Number(room.settings.impostors ?? 1) > maxImpostors(room.members.length)) {
      return err('too_many_impostors', `With ${room.members.length} players you can have at most ${maxImpostors(room.members.length)} impostors.`);
    }
    let customPack: { name: string; words: string[] } | undefined;
    if (pack && room.gameId === 'impostor') {
      const words = parseWords(pack.words.join('\n'));
      const problem = validatePack(pack.name, words);
      if (problem) return err('bad_pack', problem);
      customPack = { name: pack.name.trim(), words };
    }
    const started = startRoom(room, me);
    if (!started.ok) return fromResult(started);
    sr.room = started.value;
    const ctx: HostCtx = {
      room: sr.room, rng: this.rng, now: this.now, schedule: this.schedule, timing: this.timing,
      isAway: (id) => { const s = sr.seats.get(id); return !s || s.left || s.conn === null; },
      notify: () => this.pushGame(sr),
      recentWords: sr.recentWords, rememberWords: (w) => { sr.recentWords = w; }, pack: customPack,
    };
    sr.game = room.gameId === 'impostor' ? new ImpostorHost(ctx) : new UnoHost(ctx);
    this.pushRoom(sr);
    this.pushGame(sr);
    return good();
  }

  private leave(sr: ServerRoom, conn: Conn, me: PlayerId): Ack {
    this.bindings.delete(conn.id);
    const seat = sr.seats.get(me);
    conn.send('closed', { reason: 'left' });
    if (sr.room.phase === 'lobby') {
      sr.seats.delete(me);
      const r = removeMember(sr.room, me);
      if (r.ok) sr.room = r.value;
      if (sr.room.members.length === 0 || ![...sr.seats.values()].some((s) => s.conn)) this.maybeCloseEmpty(sr);
    } else if (seat) {
      seat.left = true; // the game keeps going; the server plays for them
      seat.conn = null;
      this.setPresence(sr, me, false);
      sr.game?.onPresence();
    }
    if (this.rooms.has(sr.room.code)) {
      if (sr.room.hostId === me) this.transferHost(sr, true);
      this.pushRoom(sr);
    }
    return good();
  }

  // ---------------------------------------------------------------- helpers

  private commitRoom(sr: ServerRoom, r: Result<Room>): Ack {
    if (!r.ok) return fromResult(r);
    sr.room = r.value;
    this.pushRoom(sr);
    return good();
  }

  private setPresence(sr: ServerRoom, id: PlayerId, connected: boolean) {
    const r = setConnected(sr.room, id, connected);
    if (r.ok) sr.room = r.value;
  }

  private transferHost(sr: ServerRoom, force = false) {
    sr.hostTimer = null;
    const current = sr.seats.get(sr.room.hostId);
    if (!force && current?.conn) return;
    const next = sr.room.members.find((m) => !m.isBot && m.id !== sr.room.hostId && sr.seats.get(m.id)?.conn);
    if (!next) return;
    const r = setHost(sr.room, next.id);
    if (r.ok) { sr.room = r.value; this.pushRoom(sr); }
  }

  private maybeCloseEmpty(sr: ServerRoom) {
    if (![...sr.seats.values()].some((s) => s.conn)) this.closeRoom(sr, 'expired');
  }

  private touch(sr: ServerRoom) { sr.lastActivity = this.now(); }

  private snapshot(sr: ServerRoom, you: PlayerId): RoomSnapshot {
    const r = sr.room;
    return {
      code: r.code, gameId: r.gameId, hostId: r.hostId, phase: r.phase, minPlayers: r.minPlayers, maxPlayers: r.maxPlayers,
      settings: r.settings, you, hasPassword: sr.password !== null,
      members: r.members.map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, isBot: m.isBot, ready: m.ready, connected: m.connected })),
    };
  }

  private pushRoom(sr: ServerRoom) {
    for (const seat of sr.seats.values()) seat.conn?.send('room', this.snapshot(sr, seat.playerId));
  }

  private pushGameTo(sr: ServerRoom, seat: Seat) {
    if (!sr.game || !seat.conn) return;
    const v = sr.game.views(seat.playerId);
    seat.conn.send('game', { gameId: sr.game.gameId, public: v.public, private: v.private, serverTime: this.now() });
  }

  /** Each player gets their own copy: the public view plus only their own private view. */
  private pushGame(sr: ServerRoom) {
    for (const seat of sr.seats.values()) this.pushGameTo(sr, seat);
  }

  private closeRoom(sr: ServerRoom, reason: ServerEvents['closed']['reason']) {
    sr.hostTimer?.();
    sr.game?.dispose();
    for (const seat of sr.seats.values()) {
      if (seat.conn) { this.bindings.delete(seat.conn.id); seat.conn.send('closed', { reason }); }
    }
    this.rooms.delete(sr.room.code);
  }

  /** Rooms with nobody connected expire after emptyTtlMs; nothing lives longer than maxAgeMs. */
  private sweep() {
    const t = this.now();
    for (const sr of [...this.rooms.values()]) {
      const anyone = [...sr.seats.values()].some((s) => s.conn);
      if ((!anyone && t - sr.lastActivity > this.timing.emptyTtlMs) || t - sr.room.createdAt > this.timing.maxAgeMs) this.closeRoom(sr, 'expired');
    }
  }

  private armSweep() {
    this.cancelSweep = this.schedule(() => { this.sweep(); this.armSweep(); }, this.timing.sweepMs);
  }
}

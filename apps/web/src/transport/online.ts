import { CLIENT_EVENT, type Ack, type ClientMessage, type GameAction, type GameId, type GameSnapshot, type Joined, type RoomSnapshot, type ServerEvents, type Settings } from '@party/protocol/types';
import type { AvatarId, PlayerId } from '@party/game-engine';

/** The slice of a socket.io socket this client needs. Tests supply a fake. */
export interface SocketLike {
  readonly connected: boolean;
  on(event: string, fn: (...args: any[]) => void): unknown;
  emit(event: string, payload: unknown, ack?: (a: Ack) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
}
export interface SessionStore { get(): Joined | null; set(j: Joined | null): void }
export type Scheduler = (fn: () => void, ms: number) => () => void;

/** 'connected' means the server has confirmed us. We never claim it just because a socket object exists. */
export type Status = 'idle' | 'connecting' | 'connected' | 'reconnecting';
export type ClosedReason = ServerEvents['closed']['reason'];

export interface OnlineState {
  status: Status;
  room: RoomSnapshot | null;
  game: GameSnapshot | null;
  /** serverTime minus our clock, so server deadlines can be shown correctly on this device. */
  skewMs: number;
  session: Joined | null;
  closed: ClosedReason | null;
  /** True when connecting is taking long (free hosts sleep and need about a minute to wake). */
  slow: boolean;
  error: string;
}

const INITIAL: OnlineState = { status: 'idle', room: null, game: null, skewMs: 0, session: null, closed: null, slow: false, error: '' };

export const CLOSED_MESSAGES: Record<ClosedReason, string> = {
  expired: 'That room has expired.',
  kicked: 'The host removed you from the room.',
  replaced: 'You joined this room from another tab or device, so this one was disconnected.',
  left: 'You left the room.',
  shutdown: 'The server restarted, so the room was closed.',
};

const timeoutScheduler: Scheduler = (fn, ms) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

export interface OnlineDeps { socket: SocketLike; store: SessionStore; now?: () => number; schedule?: Scheduler }

export class OnlineClient {
  private state: OnlineState = { ...INITIAL };
  private listeners = new Set<() => void>();
  private cancelSlow: (() => void) | null = null;
  private now: () => number;
  private schedule: Scheduler;

  constructor(private deps: OnlineDeps) {
    this.now = deps.now ?? Date.now;
    this.schedule = deps.schedule ?? timeoutScheduler;
    const s = deps.socket;
    s.on('connect', () => this.onConnect());
    s.on('disconnect', () => this.set({ status: this.state.session ? 'reconnecting' : 'idle' }));
    s.on('connect_error', () => this.set({ error: 'Cannot reach the server.' }));
    s.on('room', (r: RoomSnapshot) => this.set({ room: r }));
    s.on('game', (g: GameSnapshot | null) => this.set(g ? { game: g, skewMs: g.serverTime - this.now() } : { game: null }));
    s.on('closed', (c: ServerEvents['closed']) => this.drop(c.reason));
    this.state.session = deps.store.get();
  }

  getState = () => this.state;
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  };
  private set(patch: Partial<OnlineState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Opens the connection. If we hold a session from before, it is resumed as soon as the socket is up. */
  connect() {
    if (this.deps.socket.connected) return;
    this.set({ status: this.state.session ? 'reconnecting' : 'connecting', slow: false, error: '' });
    this.deps.socket.connect();
    this.cancelSlow?.();
    this.cancelSlow = this.schedule(() => { if (!this.deps.socket.connected) this.set({ slow: true }); }, 4000);
  }

  private onConnect() {
    this.cancelSlow?.();
    this.set({ slow: false, error: '' });
    const s = this.state.session;
    if (!s) return this.set({ status: 'connected' });
    this.set({ status: 'reconnecting' });
    void this.request({ type: 'resume', code: s.code, token: s.token }).then((ack) => {
      if (ack.ok) return this.set({ status: 'connected', session: ack.data as Joined });
      if (ack.code === 'bad_session') return this.drop('expired', 'connected');
      this.set({ status: 'connected', error: ack.message });
    });
  }

  private drop(reason: ClosedReason, status: Status = this.state.status) {
    this.deps.store.set(null);
    this.set({ session: null, room: null, game: null, closed: reason, status });
  }

  private request(msg: ClientMessage, timeoutMs = 10_000): Promise<Ack> {
    if (!this.deps.socket.connected) return Promise.resolve({ ok: false, code: 'offline', message: 'You are not connected to the server.' });
    return new Promise((resolve) => {
      let done = false;
      const cancel = this.schedule(() => {
        if (!done) { done = true; resolve({ ok: false, code: 'timeout', message: 'The server did not answer. Try again.' }); }
      }, timeoutMs);
      this.deps.socket.emit(CLIENT_EVENT, msg, (a: Ack) => {
        if (done) return;
        done = true;
        cancel();
        resolve(a);
      });
    });
  }

  /** Resolves true once the server has confirmed the connection. Waits long enough for a sleeping free host to wake. */
  private ensureConnected(maxMs = 75_000): Promise<boolean> {
    if (this.deps.socket.connected && this.state.status === 'connected') return Promise.resolve(true);
    return new Promise((resolve) => {
      let finished = false;
      let unsub = () => {};
      let cancel = () => {};
      const finish = (v: boolean) => { if (!finished) { finished = true; unsub(); cancel(); resolve(v); } };
      unsub = this.subscribe(() => { if (this.state.status === 'connected') finish(true); });
      cancel = this.schedule(() => finish(false), maxMs);
      this.connect();
      if (this.state.status === 'connected') finish(true);
    });
  }

  private async enter(msg: ClientMessage): Promise<Ack<Joined>> {
    if (this.state.session) return { ok: false, code: 'already_in_room', message: 'Leave your current room first.' };
    if (!(await this.ensureConnected())) {
      return { ok: false, code: 'offline', message: 'Could not reach the server. If it was asleep, wait a minute and try again.' };
    }
    const ack = await this.request(msg);
    if (ack.ok) {
      const j = ack.data as Joined;
      this.deps.store.set(j);
      this.set({ session: j, closed: null, error: '' });
    }
    return ack as Ack<Joined>;
  }

  create(a: { game: GameId; name: string; avatar: AvatarId; settings?: Settings; password?: string }) {
    return this.enter({ type: 'create', ...a });
  }
  join(a: { code: string; name: string; avatar: AvatarId; password?: string }) {
    return this.enter({ type: 'join', ...a });
  }

  setReady = (ready: boolean) => this.request({ type: 'ready', ready });
  updateSettings = (patch: Settings) => this.request({ type: 'settings', patch });
  addBot = () => this.request({ type: 'add-bot' });
  kick = (playerId: PlayerId) => this.request({ type: 'kick', playerId });
  start = (pack?: { name: string; words: string[] }) => this.request({ type: 'start', ...(pack ? { pack } : {}) });
  action = (action: GameAction) => this.request({ type: 'action', action });
  backToLobby = () => this.request({ type: 'back-to-lobby' });

  async leave() {
    if (this.deps.socket.connected) await this.request({ type: 'leave' });
    this.deps.store.set(null);
    this.set({ session: null, room: null, game: null, closed: null });
  }

  dismissClosed() { this.set({ closed: null }); }
}

/** What stops the host from pressing Start, or null. The server re-checks everything. */
export function startProblem(room: RoomSnapshot): string | null {
  if (room.members.length < room.minPlayers) return `Needs at least ${room.minPlayers} players (${room.members.length} so far).`;
  const waiting = room.members.find((m) => !m.isBot && !m.ready);
  if (waiting) return `Waiting for ${waiting.name} to get ready.`;
  const away = room.members.find((m) => !m.isBot && !m.connected);
  if (away) return `${away.name} is disconnected.`;
  return null;
}

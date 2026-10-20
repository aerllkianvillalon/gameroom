import { describe, expect, it } from 'vitest';
import type { Ack, GameSnapshot, Joined, RoomSnapshot } from '@party/protocol/types';
import { OnlineClient, startProblem, type SessionStore, type SocketLike } from './online';

class FakeSocket implements SocketLike {
  connected = false;
  sent: any[] = [];
  pendingAck: ((a: Ack) => void) | null = null;
  respond: (msg: any) => Ack | null = () => ({ ok: true });
  private handlers = new Map<string, ((...a: any[]) => void)[]>();
  on(event: string, fn: (...a: any[]) => void) { this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]); }
  emit(_e: string, payload: unknown, ack?: (a: Ack) => void) {
    this.sent.push(payload);
    const r = this.respond(payload);
    if (r && ack) ack(r);
    else if (ack) this.pendingAck = ack;
  }
  connect() { this.serverSays('connect'); this.connected = true; this.serverSays('connect'); }
  disconnect() { this.connected = false; this.serverSays('disconnect'); }
  serverSays(event: string, ...args: any[]) { if (event === 'connect' && !this.connected) return; (this.handlers.get(event) ?? []).forEach((f) => f(...args)); }
  drop() { this.connected = false; this.serverSays('disconnect'); }
}
function memoryStore(initial: Joined | null = null): SessionStore & { value: Joined | null } {
  const s = { value: initial, get: () => s.value, set: (j: Joined | null) => { s.value = j; } };
  return s;
}
function setup(initial: Joined | null = null) {
  const socket = new FakeSocket();
  const store = memoryStore(initial);
  const timers: { fn: () => void; ms: number; dead: boolean }[] = [];
  const client = new OnlineClient({ socket, store, now: () => 5000, schedule: (fn, ms) => { const t = { fn, ms, dead: false }; timers.push(t); return () => { t.dead = true; }; } });
  const fire = (ms: number) => timers.filter((t) => !t.dead && t.ms === ms).forEach((t) => { t.dead = true; t.fn(); });
  return { socket, store, client, fire };
}
const J: Joined = { code: 'ABCDE', playerId: 'p1', token: 'secret-token-1' };
const room = (over: Partial<RoomSnapshot> = {}): RoomSnapshot => ({ code: 'ABCDE', gameId: 'uno', hostId: 'p1', phase: 'lobby', minPlayers: 2, maxPlayers: 8, settings: {}, you: 'p1', hasPassword: false,
  members: [{ id: 'p1', name: 'A', avatar: 'cat', isBot: false, ready: true, connected: true }], ...over });

describe('OnlineClient', () => {
  it('creates a room: connects, stores the session, and only then reports connected', async () => {
    const t = setup();
    t.socket.respond = (m) => (m.type === 'create' ? { ok: true, data: J } : { ok: true });
    expect(t.client.getState().status).toBe('idle');
    const ack = await t.client.create({ game: 'uno', name: 'A', avatar: 'cat' });
    expect(ack.ok).toBe(true);
    expect(t.client.getState().status).toBe('connected');
    expect(t.client.getState().session).toEqual(J);
    expect(t.store.value).toEqual(J);
    t.socket.serverSays('room', room());
    expect(t.client.getState().room!.code).toBe('ABCDE');
  });
  it('refuses to create or join while already in a room', async () => {
    const t = setup(J);
    const ack = await t.client.join({ code: 'ZZZZZ', name: 'A', avatar: 'cat' });
    expect(ack.ok ? 'ok' : ack.code).toBe('already_in_room');
    expect(t.socket.sent).toHaveLength(0);
  });
  it('surfaces server errors without storing a session', async () => {
    const t = setup();
    t.socket.respond = () => ({ ok: false, code: 'no_such_room', message: 'No room has that code.' });
    const ack = await t.client.join({ code: 'ZZZZZ', name: 'A', avatar: 'cat' });
    expect(ack.ok ? 'ok' : ack.code).toBe('no_such_room');
    expect(t.store.value).toBe(null);
    expect(t.client.getState().session).toBe(null);
  });
  it('after a drop it reports reconnecting, then resumes with the saved token and returns to connected', async () => {
    const t = setup();
    t.socket.respond = (m) => (m.type === 'create' ? { ok: true, data: J } : { ok: true, data: J });
    await t.client.create({ game: 'uno', name: 'A', avatar: 'cat' });
    t.socket.drop();
    expect(t.client.getState().status).toBe('reconnecting');
    t.socket.sent.length = 0;
    t.socket.connected = true;
    t.socket.serverSays('connect');
    expect(t.socket.sent[0]).toEqual({ type: 'resume', code: 'ABCDE', token: 'secret-token-1' });
    await Promise.resolve();
    expect(t.client.getState().status).toBe('connected');
  });
  it('stays "reconnecting" until the server confirms the resume, never claiming connected early', async () => {
    const t = setup(J);
    t.socket.respond = () => null; // the server has not answered yet
    t.client.connect();
    expect(t.socket.sent[0].type).toBe('resume');
    expect(t.client.getState().status).toBe('reconnecting');
    t.socket.pendingAck!({ ok: true, data: J });
    await Promise.resolve();
    expect(t.client.getState().status).toBe('connected');
  });
  it('a page reload resumes the stored session once connect() is called', async () => {
    const t = setup(J);
    t.socket.respond = (m) => (m.type === 'resume' ? { ok: true, data: J } : { ok: true });
    expect(t.client.getState().session).toEqual(J);
    t.client.connect();
    await Promise.resolve();
    expect(t.socket.sent[0].type).toBe('resume');
    expect(t.client.getState().status).toBe('connected');
  });
  it('an expired session is discarded and the player is told', async () => {
    const t = setup(J);
    t.socket.respond = () => ({ ok: false, code: 'bad_session', message: 'expired' });
    t.client.connect();
    await Promise.resolve();
    expect(t.store.value).toBe(null);
    const s = t.client.getState();
    expect([s.session, s.room, s.closed, s.status]).toEqual([null, null, 'expired', 'connected']);
  });
  it('being kicked, replaced or shut down clears everything', () => {
    for (const reason of ['kicked', 'replaced', 'shutdown'] as const) {
      const t = setup(J);
      t.socket.serverSays('room', room());
      t.socket.serverSays('closed', { reason });
      expect(t.store.value).toBe(null);
      expect(t.client.getState().room).toBe(null);
      expect(t.client.getState().closed).toBe(reason);
    }
  });
  it('requests fail fast when offline and time out when the server is silent', async () => {
    const t = setup();
    const offline = await t.client.action({ type: 'draw' });
    expect(offline.ok ? 'ok' : offline.code).toBe('offline');
    t.socket.connected = true;
    t.socket.respond = () => null; // never answers
    const pending = t.client.action({ type: 'draw' });
    t.fire(10_000);
    const late = await pending;
    expect(late.ok ? 'ok' : late.code).toBe('timeout');
  });
  it('flags a slow connection and computes the server clock skew', () => {
    const t = setup();
    t.socket.connect = () => {}; // never connects
    t.client.connect();
    expect(t.client.getState().slow).toBe(false);
    t.fire(4000);
    expect(t.client.getState().slow).toBe(true);
    const g: GameSnapshot = { gameId: 'uno', public: {}, private: {}, serverTime: 8000 };
    t.socket.serverSays('game', g);
    expect(t.client.getState().skewMs).toBe(3000);
  });
  it('leave() clears local state even if the server is gone', async () => {
    const t = setup(J);
    t.socket.serverSays('room', room());
    await t.client.leave();
    expect(t.store.value).toBe(null);
    expect(t.client.getState().room).toBe(null);
  });
  it('notifies subscribers on every change', () => {
    const t = setup();
    let n = 0;
    t.client.subscribe(() => n++);
    t.socket.serverSays('room', room());
    t.socket.serverSays('game', null);
    expect(n).toBe(2);
  });
});

describe('startProblem', () => {
  it('explains what is missing', () => {
    expect(startProblem(room({ minPlayers: 2 }))).toContain('at least 2');
    const two = room({ members: [
      { id: 'p1', name: 'A', avatar: 'cat', isBot: false, ready: true, connected: true },
      { id: 'p2', name: 'B', avatar: 'cat', isBot: false, ready: false, connected: true },
    ] });
    expect(startProblem(two)).toContain('B');
    two.members[1]!.ready = true;
    two.members[1]!.connected = false;
    expect(startProblem(two)).toContain('disconnected');
    two.members[1]!.connected = true;
    expect(startProblem(two)).toBe(null);
  });
});

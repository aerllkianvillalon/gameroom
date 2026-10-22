import { describe, expect, it } from 'vitest';
import { createRng } from '@party/game-engine';
import type { Ack, ClientMessage, GameSnapshot, Joined, RoomSnapshot, ServerEvents } from '@party/protocol';
import { Hub, type Conn } from './hub';
import type { Scheduler } from './hosts/types';

// ---------- test doubles ----------
class FakeConn implements Conn {
  room: RoomSnapshot[] = [];
  game: (GameSnapshot | null)[] = [];
  closed: ServerEvents['closed'][] = [];
  constructor(readonly id: string) {}
  send<E extends keyof ServerEvents>(event: E, payload: ServerEvents[E]) {
    if (event === 'room') this.room.push(payload as RoomSnapshot);
    else if (event === 'game') this.game.push(payload as GameSnapshot | null);
    else this.closed.push(payload as ServerEvents['closed']);
  }
  get lastRoom() { return this.room[this.room.length - 1]!; }
  get lastGame() { return this.game[this.game.length - 1] ?? null; }
  /** Everything this client has ever been sent, as text (for leak checks). */
  get transcript() { return JSON.stringify([this.room, this.game, this.closed]); }
}

function world(timing = {}) {
  let now = 1_000_000;
  const tasks: { at: number; fn: () => void; dead: boolean }[] = [];
  const schedule: Scheduler = (fn, ms) => {
    const t = { at: now + ms, fn, dead: false };
    tasks.push(t);
    return () => { t.dead = true; };
  };
  const advance = (ms: number) => {
    const target = now + ms;
    for (;;) {
      const due = tasks.filter((t) => !t.dead && t.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      due.dead = true;
      now = Math.max(now, due.at);
      due.fn();
    }
    now = target;
  };
  let n = 0;
  const hub = new Hub({ now: () => now, schedule, rng: createRng(7), newToken: () => `token-${++n}-abcdefgh`, timing });
  const conns: FakeConn[] = [];
  const conn = () => { const c = new FakeConn(`c${conns.length}`); conns.push(c); return c; };
  return { hub, advance, conn, now: () => now };
}
type W = ReturnType<typeof world>;

const joined = (a: Ack) => { if (!a.ok) throw new Error(`${a.code}: ${a.message}`); return a.data as Joined; };
const send = (w: W, c: Conn, m: ClientMessage) => w.hub.handle(c, m);
const okAck = (a: Ack) => { if (!a.ok) throw new Error(`${a.code}: ${a.message}`); return a; };
const codeOf = (a: Ack) => (a.ok ? 'ok' : a.code);

/** n humans in a room; everyone ready. */
function lobby(w: W, game: Extract<ClientMessage, { type: 'create' }>['game'], n: number, settings = {}) {
  const conns = [w.conn()];
  const host = joined(send(w, conns[0]!, { type: 'create', game, name: 'P0', avatar: 'cat', settings }));
  const members = [host];
  for (let i = 1; i < n; i++) {
    const c = w.conn();
    conns.push(c);
    members.push(joined(send(w, c, { type: 'join', code: host.code, name: `P${i}`, avatar: 'dog' })));
    okAck(send(w, c, { type: 'ready', ready: true }));
  }
  return { code: host.code, conns, members };
}
const byId = (l: ReturnType<typeof lobby>, id: string) => l.conns[l.members.findIndex((m) => m.playerId === id)]!;
const gameOf = (c: FakeConn) => c.lastGame!;
const pub = (c: FakeConn) => gameOf(c).public as Record<string, any>;
const priv = (c: FakeConn) => gameOf(c).private as Record<string, any>;

// ---------- tests ----------
describe('creating and joining', () => {
  it('creates a room with a short code and never leaks tokens in snapshots', () => {
    const w = world();
    const c = w.conn();
    const j = joined(send(w, c, { type: 'create', game: 'uno', name: ' Ana ', avatar: 'cat' }));
    expect(j.code).toHaveLength(5);
    expect(c.lastRoom.members[0]!.name).toBe('Ana');
    expect(c.lastRoom.you).toBe(j.playerId);
    expect(c.lastRoom.hasPassword).toBe(false);
    expect(c.transcript).not.toContain(j.token);
  });
  it('validates games, names and double-creating', () => {
    const w = world();
    const c = w.conn();
    expect(codeOf(send(w, c, { type: 'create', game: 'drawing' as 'uno', name: 'A', avatar: 'cat' }))).toBe('bad_game');
    expect(codeOf(send(w, c, { type: 'create', game: 'uno', name: ' <> ', avatar: 'cat' }))).toBe('name_empty');
    expect(codeOf(send(w, c, { type: 'create', game: 'uno', name: 'A', avatar: 'cat' }))).toBe('ok');
    expect(codeOf(send(w, c, { type: 'create', game: 'uno', name: 'A', avatar: 'cat' }))).toBe('already_in_room');
  });
  it('rejects wrong codes, duplicate names, full rooms and joins after the start', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    const x = w.conn();
    expect(codeOf(send(w, x, { type: 'join', code: 'ZZZZZ', name: 'X', avatar: 'cat' }))).toBe('no_such_room');
    expect(codeOf(send(w, x, { type: 'join', code: l.code.toLowerCase(), name: 'p0', avatar: 'cat' }))).toBe('name_taken');
    okAck(send(w, l.conns[0]!, { type: 'start' }));
    expect(codeOf(send(w, x, { type: 'join', code: l.code, name: 'Late', avatar: 'cat' }))).toBe('in_progress');
    const small = lobby(w, 'impostor', 12);
    expect(codeOf(send(w, w.conn(), { type: 'join', code: small.code, name: 'One too many', avatar: 'cat' }))).toBe('room_full');
  });
  it('protects password rooms', () => {
    const w = world();
    const host = w.conn();
    const j = joined(send(w, host, { type: 'create', game: 'uno', name: 'H', avatar: 'cat', password: 'sesame' }));
    expect(host.lastRoom.hasPassword).toBe(true);
    const x = w.conn();
    expect(codeOf(send(w, x, { type: 'join', code: j.code, name: 'X', avatar: 'cat' }))).toBe('bad_password');
    expect(codeOf(send(w, x, { type: 'join', code: j.code, name: 'X', avatar: 'cat', password: 'wrong' }))).toBe('bad_password');
    expect(codeOf(send(w, x, { type: 'join', code: j.code, name: 'X', avatar: 'cat', password: 'sesame' }))).toBe('ok');
    expect(JSON.stringify(x.room)).not.toContain('sesame');
  });
});

describe('lobby rules', () => {
  it('only the host can change settings, add bots, kick or start; settings are sanitized', () => {
    const w = world();
    const l = lobby(w, 'uno', 3);
    const [host, guest] = [l.conns[0]!, l.conns[1]!];
    expect(codeOf(send(w, guest, { type: 'settings', patch: { stackDraws: true } }))).toBe('not_host');
    expect(codeOf(send(w, guest, { type: 'add-bot' }))).toBe('not_host');
    expect(codeOf(send(w, guest, { type: 'kick', playerId: l.members[2]!.playerId }))).toBe('not_host');
    expect(codeOf(send(w, guest, { type: 'start' }))).toBe('not_host');
    okAck(send(w, host, { type: 'settings', patch: { stackDraws: true, turnTimer: 9999, bogus: 1, botDifficulty: 'nightmare' } }));
    const s = host.lastRoom.settings;
    expect(s.stackDraws).toBe(true);
    expect(s.turnTimer).toBe(120);
    expect(s.bogus).toBe(undefined);
    expect(s.botDifficulty).toBe('medium');
    expect(guest.lastRoom.settings.stackDraws).toBe(true); // everyone sees the change
  });
  it('needs every human ready and enough players; the host can kick', () => {
    const w = world();
    const host = w.conn();
    const j = joined(send(w, host, { type: 'create', game: 'impostor', name: 'H', avatar: 'cat' }));
    expect(codeOf(send(w, host, { type: 'start' }))).toBe('too_few');
    const a = w.conn(); const b = w.conn();
    const ja = joined(send(w, a, { type: 'join', code: j.code, name: 'A', avatar: 'dog' }));
    joined(send(w, b, { type: 'join', code: j.code, name: 'B', avatar: 'dog' }));
    expect(codeOf(send(w, host, { type: 'start' }))).toBe('not_ready');
    expect(codeOf(send(w, host, { type: 'kick', playerId: j.playerId }))).toBe('self_kick');
    okAck(send(w, host, { type: 'kick', playerId: ja.playerId }));
    expect(a.closed).toEqual([{ reason: 'kicked' }]);
    expect(host.lastRoom.members).toHaveLength(2);
    expect(codeOf(send(w, a, { type: 'ready', ready: true }))).toBe('not_in_room');
  });
  it('bots are allowed in UNO but not ImpostorWho', () => {
    const w = world();
    const u = lobby(w, 'uno', 1);
    expect(codeOf(send(w, u.conns[0]!, { type: 'add-bot' }))).toBe('ok');
    expect(u.conns[0]!.lastRoom.members[1]!.isBot).toBe(true);
    const i = lobby(w, 'impostor', 1);
    expect(codeOf(send(w, i.conns[0]!, { type: 'add-bot' }))).toBe('no_bots');
  });
  it('leaving the lobby passes the host on; the last one out closes the room', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    okAck(send(w, l.conns[0]!, { type: 'leave' }));
    expect(l.conns[1]!.lastRoom.hostId).toBe(l.members[1]!.playerId);
    okAck(send(w, l.conns[1]!, { type: 'leave' }));
    expect(w.hub.stats().rooms).toBe(0);
    expect(codeOf(send(w, w.conn(), { type: 'join', code: l.code, name: 'X', avatar: 'cat' }))).toBe('no_such_room');
  });
});

describe('UNO online: server authority and hidden hands', () => {
  it('each player is sent only their own hand, and cannot play out of turn', () => {
    const w = world();
    const l = lobby(w, 'uno', 3);
    okAck(send(w, l.conns[0]!, { type: 'start' }));
    for (const c of l.conns) {
      expect(priv(c).hand).toHaveLength(7);
      expect(JSON.stringify(pub(c))).not.toContain('"hand"');
    }
    for (const c of l.conns) {
      for (const other of l.conns) {
        if (other === c) continue;
        for (const card of priv(other).hand) expect(c.transcript).not.toContain(JSON.stringify(card));
      }
    }
    const current = pub(l.conns[0]!).current as string;
    const idle = l.conns.find((c) => c !== byId(l, current))!;
    expect(codeOf(send(w, idle, { type: 'action', action: { type: 'draw' } }))).toBe('not_your_turn');
    expect(codeOf(send(w, idle, { type: 'action', action: { type: 'play', cardId: priv(idle).hand[0].id, color: 'red' } }))).toBe('not_your_turn');
    expect(codeOf(send(w, byId(l, current), { type: 'action', action: { type: 'ack-role' } }))).toBe('bad_action');
  });
  it('a legal move reaches everyone with fresh views', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    okAck(send(w, l.conns[0]!, { type: 'start' }));
    const cur = byId(l, pub(l.conns[0]!).current);
    const before = l.conns.map((c) => c.game.length);
    const v = priv(cur);
    const action = v.playableCardIds.length
      ? { type: 'play' as const, cardId: v.playableCardIds[0], color: 'red' as const }
      : { type: 'draw' as const };
    okAck(send(w, cur, { type: 'action', action }));
    l.conns.forEach((c, i) => expect(c.game.length).toBeGreaterThan(before[i]!));
  });
  it('plays a whole game against a bot, which moves by itself', () => {
    const w = world();
    const l = lobby(w, 'uno', 1);
    const me = l.conns[0]!;
    okAck(send(w, me, { type: 'add-bot' }));
    okAck(send(w, me, { type: 'start' }));
    for (let i = 0; i < 4000 && !pub(me).winner; i++) {
      const v = priv(me);
      if (v.yourTurn) {
        const action = v.canPass ? { type: 'pass' as const }
          : v.playableCardIds.length ? { type: 'play' as const, cardId: v.playableCardIds[0], color: 'blue' as const }
          : { type: 'draw' as const };
        okAck(send(w, me, { type: 'action', action }));
      } else w.advance(1000);
    }
    expect(pub(me).winner).not.toBe(null);
    expect(codeOf(send(w, me, { type: 'back-to-lobby' }))).toBe('ok');
    expect(me.lastGame).toBe(null);
    expect(me.lastRoom.phase).toBe('lobby');
  });
});

describe('ImpostorWho online: hidden roles and words', () => {
  function start(w: W, extra = {}) {
    const l = lobby(w, 'impostor', 4, { finalGuess: true, ...extra });
    okAck(send(w, l.conns[0]!, { type: 'start' }));
    const impostor = l.conns.find((c) => priv(c).role === 'impostor')!;
    const crew = l.conns.filter((c) => c !== impostor);
    const word = priv(crew[0]!).word as string;
    return { l, impostor, crew, word };
  }
  it('assigns one impostor; only the crew sees the word; the public view is clean', () => {
    const w = world();
    const { l, impostor, crew, word } = start(w);
    expect(l.conns.filter((c) => priv(c).role === 'impostor')).toHaveLength(1);
    expect(priv(impostor).word).toBe(null);
    for (const c of crew) expect(priv(c).word).toBe(word);
    for (const c of l.conns) {
      expect(JSON.stringify(pub(c))).not.toContain(word);
      expect(JSON.stringify(pub(c))).not.toContain('"impostors":[');
    }
    expect(impostor.transcript).not.toContain(word);
    expect(JSON.stringify(pub(impostor).outcome)).toBe('null');
  });
  it('runs a full round: typed clues (no word leaks), secret votes, results', () => {
    const w = world();
    const { l, impostor, crew, word } = start(w);
    for (const c of l.conns) okAck(send(w, c, { type: 'action', action: { type: 'ack-role' } }));
    expect(pub(l.conns[0]!).phase).toBe('clues');
    let first = true;
    while (pub(l.conns[0]!).phase === 'clues') {
      const speaker = byId(l, pub(l.conns[0]!).speaker);
      if (first && speaker !== impostor) {
        expect(codeOf(send(w, speaker, { type: 'action', action: { type: 'clue', text: `it is a ${word.toUpperCase()}` } }))).toBe('reveals_word');
      }
      first = false;
      expect(codeOf(send(w, impostor === speaker ? crew[0]! : impostor, { type: 'action', action: { type: 'clue', text: 'x' } }))).toBe('not_your_turn');
      okAck(send(w, speaker, { type: 'action', action: { type: 'clue', text: 'something round' } }));
    }
    expect(pub(l.conns[0]!).phase).toBe('discussion');
    expect((pub(l.conns[0]!).clues as unknown[]).length).toBe(8);
    okAck(send(w, l.conns[1]!, { type: 'action', action: { type: 'skip-discussion' } }));
    const impId = l.members[l.conns.indexOf(impostor)]!.playerId;
    const other = l.members.find((m) => m.playerId !== impId)!.playerId;
    for (const [i, c] of l.conns.entries()) {
      const me = l.members[i]!.playerId;
      okAck(send(w, c, { type: 'action', action: { type: 'vote', target: me === impId ? other : impId } }));
      if (i < l.conns.length - 1) {
        expect(pub(l.conns[0]!).reveals).toEqual([]); // nobody sees votes until the last one lands
        expect(JSON.stringify(l.conns[0]!.lastGame)).not.toContain(`"${impId}":"`);
      }
    }
    expect(pub(l.conns[0]!).phase).toBe('guess');
    expect(codeOf(send(w, crew[0]!, { type: 'action', action: { type: 'guess', text: word } }))).toBe('not_impostor');
    okAck(send(w, impostor, { type: 'action', action: { type: 'guess', text: 'definitely wrong' } }));
    const out = pub(l.conns[0]!).outcome;
    expect(out.winner).toBe('crew');
    expect(out.word).toBe(word);
    expect(out.impostors).toEqual([impId]);
    // the host can now start another round
    expect(codeOf(send(w, l.conns[1]!, { type: 'back-to-lobby' }))).toBe('not_host');
    expect(codeOf(send(w, l.conns[0]!, { type: 'back-to-lobby' }))).toBe('ok');
    expect(codeOf(send(w, l.conns[0]!, { type: 'start' }))).toBe('ok');
    expect(priv(l.conns[0]!).hasAcked).toBe(false);
  });
  it('rejects too many impostors and bad custom packs', () => {
    const w = world();
    const l = lobby(w, 'impostor', 3, { impostors: 2 });
    expect(codeOf(send(w, l.conns[0]!, { type: 'start' }))).toBe('too_many_impostors');
    okAck(send(w, l.conns[0]!, { type: 'settings', patch: { impostors: 1 } }));
    expect(codeOf(send(w, l.conns[0]!, { type: 'start', pack: { name: 'Tiny', words: ['a', 'b'] } }))).toBe('bad_pack');
  });
  it('uses the host-supplied custom pack', () => {
    const w = world();
    const l = lobby(w, 'impostor', 3);
    const words = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'];
    okAck(send(w, l.conns[0]!, { type: 'start', pack: { name: 'NATO', words } }));
    const crewWord = l.conns.map((c) => priv(c).word).find(Boolean) as string;
    expect(words).toContain(crewWord);
  });
});

describe('reconnecting', () => {
  it('shows presence, restores private state on resume, and rejects bad tokens', () => {
    const w = world();
    const l = lobby(w, 'uno', 3);
    okAck(send(w, l.conns[0]!, { type: 'start' }));
    const hand = JSON.stringify(priv(l.conns[1]!).hand);
    w.hub.disconnect(l.conns[1]!);
    expect(l.conns[0]!.lastRoom.members[1]!.connected).toBe(false);
    const fresh = w.conn();
    expect(codeOf(send(w, fresh, { type: 'resume', code: l.code, token: 'nope-nope-nope' }))).toBe('bad_session');
    const j = joined(send(w, fresh, { type: 'resume', code: l.code, token: l.members[1]!.token }));
    expect(j.playerId).toBe(l.members[1]!.playerId);
    expect(l.conns[0]!.lastRoom.members[1]!.connected).toBe(true);
    expect(JSON.stringify(priv(fresh).hand)).toBe(hand);
    expect(fresh.lastRoom.you).toBe(j.playerId);
  });
  it('a second connection with the same token replaces the first', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    const second = w.conn();
    okAck(send(w, second, { type: 'resume', code: l.code, token: l.members[1]!.token }));
    expect(l.conns[1]!.closed).toEqual([{ reason: 'replaced' }]);
    expect(codeOf(send(w, l.conns[1]!, { type: 'ready', ready: false }))).toBe('not_in_room');
    expect(codeOf(send(w, second, { type: 'ready', ready: false }))).toBe('ok');
  });
  it('another player cannot take over a seat with a guessed token or a stolen code', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    const thief = w.conn();
    expect(codeOf(send(w, thief, { type: 'resume', code: l.code, token: l.members[0]!.token.slice(0, -1) + 'x' }))).toBe('bad_session');
    expect(codeOf(send(w, thief, { type: 'resume', code: 'ZZZZZ', token: l.members[0]!.token }))).toBe('bad_session');
  });
  it('hands the host role on after the grace period, but not if the host returns in time', () => {
    const w = world();
    const l = lobby(w, 'uno', 3);
    w.hub.disconnect(l.conns[0]!);
    w.advance(59_000);
    expect(l.conns[1]!.lastRoom.hostId).toBe(l.members[0]!.playerId);
    w.advance(2_000);
    expect(l.conns[1]!.lastRoom.hostId).not.toBe(l.members[0]!.playerId);
    const w2 = world();
    const l2 = lobby(w2, 'uno', 3);
    w2.hub.disconnect(l2.conns[0]!);
    w2.advance(30_000);
    okAck(send(w2, w2.conn(), { type: 'resume', code: l2.code, token: l2.members[0]!.token }));
    w2.advance(60_000);
    expect(l2.conns[1]!.lastRoom.hostId).toBe(l2.members[0]!.playerId);
  });
});

describe('away players never stall a game', () => {
  it('UNO: the server plays for a disconnected player after the delay', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    okAck(send(w, l.conns[0]!, { type: 'start' }));
    const cur = pub(l.conns[0]!).current as string;
    const awayConn = byId(l, cur);
    const stay = l.conns.find((c) => c !== awayConn)!;
    const before = JSON.stringify([pub(stay).current, pub(stay).players]);
    w.hub.disconnect(awayConn);
    w.advance(14_000);
    expect(JSON.stringify([pub(stay).current, pub(stay).players])).toBe(before);
    w.advance(2_000);
    expect(JSON.stringify([pub(stay).current, pub(stay).players])).not.toBe(before);
  });
  it('ImpostorWho: a disconnected player is acked, clued and voted for automatically', () => {
    const w = world();
    const l = lobby(w, 'impostor', 3);
    okAck(send(w, l.conns[0]!, { type: 'start' }));
    w.hub.disconnect(l.conns[2]!);
    okAck(send(w, l.conns[0]!, { type: 'action', action: { type: 'ack-role' } }));
    okAck(send(w, l.conns[1]!, { type: 'action', action: { type: 'ack-role' } }));
    expect(pub(l.conns[0]!).phase).toBe('roles');
    w.advance(16_000);
    expect(pub(l.conns[0]!).phase).toBe('clues');
  });
  it('someone who leaves mid-game is played for and cannot resume', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    okAck(send(w, l.conns[0]!, { type: 'start' }));
    okAck(send(w, l.conns[1]!, { type: 'leave' }));
    expect(codeOf(send(w, w.conn(), { type: 'resume', code: l.code, token: l.members[1]!.token }))).toBe('bad_session');
    expect(l.conns[0]!.lastRoom.members[1]!.connected).toBe(false);
  });
});

describe('abuse and cleanup', () => {
  it('rate limits floods, then recovers', () => {
    const w = world();
    const l = lobby(w, 'uno', 1);
    const results = Array.from({ length: 80 }, () => codeOf(send(w, l.conns[0]!, { type: 'ready', ready: true })));
    expect(results).toContain('rate_limited');
    w.advance(3_000);
    expect(codeOf(send(w, l.conns[0]!, { type: 'ready', ready: true }))).toBe('ok');
  });
  it('makes joining attempts expensive', () => {
    const w = world();
    const c = w.conn();
    const results = Array.from({ length: 20 }, () => codeOf(send(w, c, { type: 'join', code: 'ZZZZZ', name: 'X', avatar: 'cat' })));
    expect(results.filter((r) => r === 'rate_limited').length).toBeGreaterThan(10);
  });
  it('actions before joining are refused', () => {
    const w = world();
    expect(codeOf(send(w, w.conn(), { type: 'start' }))).toBe('not_in_room');
  });
  it('expires empty rooms after the TTL and caps total age', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    for (const c of l.conns) w.hub.disconnect(c);
    w.advance(5 * 60_000);
    expect(w.hub.stats().rooms).toBe(1);
    w.advance(6 * 60_000);
    expect(w.hub.stats().rooms).toBe(0);
    const w2 = world();
    const l2 = lobby(w2, 'uno', 2);
    w2.advance(8 * 3600_000 + 120_000);
    expect(w2.hub.stats().rooms).toBe(0);
    expect(l2.conns[0]!.closed).toEqual([{ reason: 'expired' }]);
  });
  it('refuses new rooms when the server is full', () => {
    const w2 = new Hub({ maxRooms: 1, schedule: () => () => {} });
    const a = new FakeConn('a'); const b = new FakeConn('b');
    expect(codeOf(w2.handle(a, { type: 'create', game: 'uno', name: 'A', avatar: 'cat' }))).toBe('ok');
    expect(codeOf(w2.handle(b, { type: 'create', game: 'uno', name: 'B', avatar: 'cat' }))).toBe('server_busy');
  });
  it('dispose closes every room cleanly', () => {
    const w = world();
    const l = lobby(w, 'uno', 2);
    w.hub.dispose();
    expect(l.conns[0]!.closed).toEqual([{ reason: 'shutdown' }]);
    expect(w.hub.stats().rooms).toBe(0);
  });
});

describe('trivia, word bomb and werewolf online', () => {
  const start = (w: W, l: ReturnType<typeof lobby>) => okAck(send(w, l.conns[0]!, { type: 'start' }));

  it('trivia: hides the key, reveals when all answered, and the clock moves it on', () => {
    const w = world();
    const l = lobby(w, 'trivia', 3, { questions: 3 });
    start(w, l);
    const c0 = l.conns[0]!;
    expect(pub(c0).phase).toBe('question');
    expect(pub(c0).correct).toBeNull();
    expect(JSON.stringify(gameOf(c0))).not.toContain('"answer"');
    for (const c of l.conns) okAck(send(w, c, { type: 'action', action: { type: 'answer', choice: 0 } }));
    expect(codeOf(send(w, c0, { type: 'action', action: { type: 'answer', choice: 1 } }))).toBe('wrong_phase');
    expect(pub(c0).phase).toBe('reveal');
    expect(pub(c0).correct).toBeGreaterThanOrEqual(0);
    w.advance(6_000);
    expect(pub(c0).phase).toBe('question');
    expect(pub(c0).index).toBe(1);
    w.advance(20_000);
    expect(pub(c0).phase).toBe('reveal');
    expect(codeOf(send(w, c0, { type: 'action', action: { type: 'kill', target: 'x' } as never }))).toBe('bad_action');
  });

  it('word bomb: only the holder plays, and an unplayed bomb explodes', () => {
    const w = world();
    const l = lobby(w, 'wordbomb', 3, { fuseSeconds: 5 });
    start(w, l);
    const first = pub(l.conns[0]!);
    const holder = byId(l, first.turn);
    const other = l.conns.find((c) => c !== holder)!;
    expect(codeOf(send(w, other, { type: 'action', action: { type: 'word', text: 'whatever' } }))).toBe('not_your_turn');
    expect(codeOf(send(w, holder, { type: 'action', action: { type: 'word', text: 'qxjkv' } }))).toBe('missing_fragment');
    w.advance(5_100);
    const after = pub(l.conns[0]!);
    expect(after.lives[first.turn]).toBe(2);
    expect(after.turn).not.toBe(first.turn);
    expect(after.events.at(-1).kind).toBe('exploded');
  });

  it('werewolf: roles stay private and the server confirms the role reveal for an absent player', () => {
    const w = world();
    const l = lobby(w, 'werewolf', 5);
    start(w, l);
    const roles = l.conns.map((c) => priv(c).role as string);
    expect(roles.filter((r) => r === 'werewolf')).toHaveLength(1);
    for (const c of l.conns) {
      const mine = priv(c).role as string;
      const t = c.transcript;
      if (mine !== 'werewolf') expect(priv(c).pack).toEqual([]);
      expect(pub(c)).not.toHaveProperty('roles');
      expect(t).not.toContain('"outcome":{');
    }
    const away = l.conns[4]!;
    w.hub.disconnect(away);
    for (const c of l.conns.slice(0, 4)) okAck(send(w, c, { type: 'action', action: { type: 'ack-role' } }));
    expect(pub(l.conns[0]!).phase).toBe('roles');
    w.advance(16_000);
    expect(pub(l.conns[0]!).phase).toBe('night');
  });

  it('would you rather: hides votes until everyone has voted', () => {
    const w = world();
    const l = lobby(w, 'wyr', 3, { rounds: 3 });
    start(w, l);
    const [c0, c1, c2] = l.conns as [typeof l.conns[0], typeof l.conns[0], typeof l.conns[0]];
    okAck(send(w, c0, { type: 'action', action: { type: 'vote', choice: 1 } }));
    expect(pub(c1).tally).toBeNull();
    expect(pub(c1).picks).toEqual({});
    expect(codeOf(send(w, c0, { type: 'action', action: { type: 'vote', choice: 0 } }))).toBe('already_voted');
    okAck(send(w, c1, { type: 'action', action: { type: 'vote', choice: 1 } }));
    okAck(send(w, c2, { type: 'action', action: { type: 'vote', choice: 0 } }));
    expect(pub(c0).phase).toBe('reveal');
    expect(pub(c0).tally).toEqual([1, 2]);
  });

  it('memory: face-down cards carry no symbols, and a stalled turn passes on', () => {
    const w = world();
    const l = lobby(w, 'memory', 2);
    start(w, l);
    const first = pub(l.conns[0]!);
    expect(first.cards.every((c: { symbol: string | null }) => c.symbol === null)).toBe(true);
    const holder = byId(l, first.turn);
    const other = l.conns.find((c) => c !== holder)!;
    expect(codeOf(send(w, other, { type: 'action', action: { type: 'flip', index: 0 } }))).toBe('not_your_turn');
    okAck(send(w, holder, { type: 'action', action: { type: 'flip', index: 0 } }));
    expect(pub(other).cards.filter((c: { symbol: string | null }) => c.symbol !== null)).toHaveLength(1);
    w.advance(15_100);
    const after = pub(l.conns[0]!);
    expect(after.turn).not.toBe(first.turn);
    expect(after.cards.every((c: { symbol: string | null }) => c.symbol === null)).toBe(true);
  });
});

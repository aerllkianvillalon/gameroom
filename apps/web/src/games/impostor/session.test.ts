import { describe, expect, it } from 'vitest';
import { addMember, createId, createRng, createRoom, type Room } from '@party/game-engine';
import type { Scheduler } from '../uno/session';
import { configFromRoom, groupsForCategory, ImpostorSession } from './session';

function makeRoom(n: number, settings: Record<string, string | number | boolean> = {}): Room {
  const rng = createRng(2);
  const mk = (i: number) => ({ id: createId(rng), name: `P${i}`, avatar: 'cat' as const, isBot: false });
  let room = createRoom({ code: 'ABCDE', gameId: 'impostor', mode: 'local', host: mk(0), minPlayers: 3, maxPlayers: 12, settings, now: 0 });
  for (let i = 1; i < n; i++) { const r = addMember(room, mk(i)); if (r.ok) room = r.value; }
  return room;
}
function fakeTime() {
  const queue: (() => void)[] = [];
  let now = 1000;
  const schedule: Scheduler = (fn) => { queue.push(fn); return () => { const i = queue.indexOf(fn); if (i >= 0) queue.splice(i, 1); }; };
  return { schedule, now: () => now, advance: (ms: number) => { now += ms; }, queue };
}
const pool = [{ hint: 'h', words: ['one', 'two', 'three'] }];

describe('ImpostorSession', () => {
  it('reads settings from the room and keeps impostors a minority', () => {
    const c = configFromRoom(makeRoom(4, { impostors: 3, clueRounds: 3, impostorKnows: 'hint', tieBreak: false }));
    expect(c.impostors).toBe(1);
    expect(c.clueRounds).toBe(3);
    expect(c.impostorKnows).toBe('hint');
    expect(c.tieBreak).toBe(false);
    expect(c.typedClues).toBe(false);
  });
  it('resolves built-in categories and custom packs, falling back safely', () => {
    expect(groupsForCategory('animals', [])[0]!.hint).toContain('pet');
    expect(groupsForCategory('pack:x1', [{ id: 'x1', name: 'Mine', words: ['a', 'b'] }])[0]!.words).toEqual(['a', 'b']);
    expect(groupsForCategory('pack:gone', []).length).toBeGreaterThan(0);
    expect(groupsForCategory('nonsense', []).length).toBeGreaterThan(0);
  });
  it('plays a full game through act() and starts the discussion timer once', () => {
    const t = fakeTime();
    const s = new ImpostorSession(makeRoom(4, { discussionSeconds: 60, finalGuess: false }), pool, { rng: createRng(3), now: t.now, schedule: t.schedule });
    const order = () => s.getState().order;
    for (const id of order()) expect(s.act(id, { type: 'ack-role' }).ok).toBe(true);
    while (s.getState().phase === 'clues') s.act(s.getState().order[s.getState().turn]!, { type: 'clue' });
    expect(s.getState().phase).toBe('discussion');
    expect(s.getState().discussionDeadline).toBe(61000);
    expect(t.queue).toHaveLength(1);
    t.advance(61000);
    t.queue.shift()!();
    expect(s.getState().phase).toBe('voting');
    const imp = s.getState().impostors[0]!;
    const other = order().find((id) => id !== imp)!;
    for (const id of order()) s.act(id, { type: 'vote', target: id === imp ? other : imp });
    expect(s.getState().outcome?.winner).toBe('crew');
  });
  it('rematch picks a fresh word and reports the recent list', () => {
    const t = fakeTime();
    const seen: string[][] = [];
    const s = new ImpostorSession(makeRoom(3), pool, { rng: createRng(4), now: t.now, schedule: t.schedule, onWord: (r) => seen.push(r) });
    const first = s.getState().secret.word;
    s.restart();
    expect(s.getState().secret.word).not.toBe(first);
    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain(first);
    expect(s.getState().phase).toBe('roles');
  });
  it('dispose cancels the timer', () => {
    const t = fakeTime();
    const s = new ImpostorSession(makeRoom(3, { discussionSeconds: 30 }), pool, { rng: createRng(5), now: t.now, schedule: t.schedule });
    for (const id of s.getState().order) s.act(id, { type: 'ack-role' });
    while (s.getState().phase === 'clues') s.act(s.getState().order[s.getState().turn]!, { type: 'clue' });
    expect(t.queue).toHaveLength(1);
    s.dispose();
    expect(t.queue).toHaveLength(0);
  });
});

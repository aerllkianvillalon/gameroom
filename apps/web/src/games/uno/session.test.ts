import { describe, expect, it } from 'vitest';
import { addMember, createId, createRng, createRoom, type Room } from '@party/game-engine';
import { chooseBotAction, currentPlayer } from '@party/uno-engine';
import { UnoSession, type Scheduler } from './session';

function makeRoom(humans: string[], bots: string[], settings: Record<string, string | number | boolean> = {}): Room {
  const rng = createRng(3);
  const mk = (name: string, isBot: boolean) => ({ id: createId(rng), name, avatar: 'cat' as const, isBot });
  let room = createRoom({ code: 'ABCDE', gameId: 'uno', mode: 'local', host: mk(humans[0]!, false), minPlayers: 2, maxPlayers: 8, settings, now: 0 });
  for (const n of [...humans.slice(1).map((h) => mk(h, false)), ...bots.map((b) => mk(b, true))]) {
    const r = addMember(room, n);
    if (!r.ok) throw new Error(r.message);
    room = r.value;
  }
  return room;
}

function fakeTime() {
  const queue: { fn: () => void; ms: number }[] = [];
  let now = 1000;
  const schedule: Scheduler = (fn, ms) => {
    const item = { fn, ms };
    queue.push(item);
    return () => { const i = queue.indexOf(item); if (i >= 0) queue.splice(i, 1); };
  };
  return { schedule, now: () => now, advance: (ms: number) => { now += ms; }, queue, runNext: () => queue.shift()?.fn() };
}

describe('UnoSession', () => {
  it('plays a whole game: bots move on their own, the human acts through act()', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const t = fakeTime();
      const room = makeRoom(['Hu'], ['Biscuit', 'Pepper'], { botDifficulty: 'hard' });
      const s = new UnoSession(room, { rng: createRng(seed), now: t.now, schedule: t.schedule });
      const human = s.humans[0]!;
      let guard = 0;
      while (!s.getState().winner && guard++ < 6000) {
        if (currentPlayer(s.getState()) === human) {
          const r = s.act(human, chooseBotAction(s.getState(), human, 'medium', createRng(guard)));
          if (!r.ok) throw new Error(`seed ${seed}: ${r.code}`);
        } else t.runNext();
      }
      expect(s.getState().winner).not.toBe(null);
    }
  });

  it('rejects actions for bots, out-of-turn humans, and illegal moves without changing state', () => {
    const t = fakeTime();
    const room = makeRoom(['Ana', 'Bo'], []);
    const s = new UnoSession(room, { rng: createRng(1), now: t.now, schedule: t.schedule });
    const before = s.getState();
    const [cur, other] = [currentPlayer(before), s.humans.find((h) => h !== currentPlayer(before))!];
    expect(s.act(other, { type: 'draw' }).ok).toBe(false);
    expect(s.act(cur, { type: 'pass' }).ok).toBe(false);
    expect(s.getState()).toBe(before);
    const botRoom = makeRoom(['Ana'], ['Pepper']);
    const bs = new UnoSession(botRoom, { rng: createRng(1), now: t.now, schedule: t.schedule });
    const botId = botRoom.members.find((m) => m.isBot)!.id;
    expect(bs.act(botId, { type: 'draw' }).ok).toBe(false);
  });

  it('restart deals a fresh game and bumps the turn counter; dispose stops scheduling', () => {
    const t = fakeTime();
    const s = new UnoSession(makeRoom(['Ana', 'Bo'], []), { rng: createRng(2), now: t.now, schedule: t.schedule });
    const seq = s.getTurnSeq();
    s.restart();
    expect(s.getTurnSeq()).toBeGreaterThan(seq);
    s.dispose();
    expect(t.queue).toHaveLength(0);
  });

  it('turn timer: after the deadline the clock task acts for the current player', () => {
    const t = fakeTime();
    const s = new UnoSession(makeRoom(['Ana', 'Bo'], [], { turnTimer: 15 }), { rng: createRng(4), now: t.now, schedule: t.schedule });
    const first = s.getState();
    expect(first.turnDeadline).toBe(16000);
    t.advance(16000);
    t.runNext();
    const after = s.getState();
    const cur = currentPlayer(first);
    const changed = currentPlayer(after) !== cur || after.hands[cur]!.length !== first.hands[cur]!.length;
    expect(changed).toBe(true);
  });

  it('notifies subscribers on every committed move', () => {
    const t = fakeTime();
    const s = new UnoSession(makeRoom(['Ana', 'Bo'], []), { rng: createRng(6), now: t.now, schedule: t.schedule });
    let calls = 0;
    s.subscribe(() => calls++);
    const cur = currentPlayer(s.getState());
    const legal = chooseBotAction(s.getState(), cur, 'easy', createRng(1));
    expect(s.act(cur, legal).ok).toBe(true);
    expect(calls).toBe(1);
  });
});

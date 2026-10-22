import { describe, expect, it } from 'vitest';
import { createRng, type PlayerRef } from '@party/game-engine';
import { autoWolves, makeConfig, plurality, step, tick, werewolfEngine, withClock, type Role, type WerewolfAction, type WerewolfState } from './index';

const P = (id: string): PlayerRef => ({ id, name: id, avatar: 'cat', isBot: false });
const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
const start = (cfg = {}, n = 6) => werewolfEngine.init(makeConfig(cfg), ids.slice(0, n).map(P), createRng(11));
const go = (s: WerewolfState, id: string, a: WerewolfAction) => { const r = step(s, id, a); if (!r.ok) throw new Error(`${r.code}: ${r.message}`); return r.value; };
const who = (s: WerewolfState, r: Role) => s.order.filter((id) => s.roles[id] === r);
const ackAll = (s: WerewolfState) => s.order.reduce((acc, id) => go(acc, id, { type: 'ack-role' }), s);
/** Moves to night 1 and returns a table with known role holders. */
const night = () => { const s = ackAll(start()); return { s, wolf: who(s, 'werewolf')[0]!, seer: who(s, 'seer')[0]!, doc: who(s, 'doctor')[0]!, vill: who(s, 'villager') }; };

describe('werewolf setup', () => {
  it('deals the right mix', () => {
    const s = start();
    expect(who(s, 'werewolf').length).toBe(autoWolves(6));
    expect(who(s, 'seer').length).toBe(1);
    expect(who(s, 'doctor').length).toBe(1);
    expect(who(s, 'villager').length).toBe(3);
  });
  it('scales wolves with table size and clamps custom counts', () => {
    expect([5, 8, 11, 16].map(autoWolves)).toEqual([1, 2, 3, 3]);
    expect(who(werewolfEngine.init(makeConfig({ werewolves: 9 }), ids.map(P), createRng(1)), 'werewolf').length).toBe(2);
  });
  it('never leaks roles through the public view', () => {
    const s = start();
    const pub = JSON.stringify(werewolfEngine.publicView(s));
    expect(pub).not.toContain('"roles":{');
    expect(pub).not.toContain('"werewolf"');
  });
  it('only wolves see the pack; only the seer sees results', () => {
    const { s, wolf, seer, vill } = night();
    expect(werewolfEngine.privateView(s, wolf).pack).toContain(wolf);
    expect(werewolfEngine.privateView(s, vill[0]!).pack).toEqual([]);
    expect(werewolfEngine.privateView(s, seer).role).toBe('seer');
  });
});

describe('werewolf night', () => {
  it('waits until every night role acted, then dawn reports the kill', () => {
    let { s, wolf, seer, doc, vill } = night();
    const victim = vill[0]!;
    s = go(s, wolf, { type: 'kill', target: victim });
    s = go(s, seer, { type: 'inspect', target: wolf });
    expect(s.phase).toBe('night');
    s = go(s, doc, { type: 'protect', target: doc });
    expect(s.phase).toBe('discussion');
    expect(s.report).toEqual({ night: 1, killed: victim, saved: false });
    expect(s.alive).not.toContain(victim);
    expect(werewolfEngine.privateView(s, seer).seerResults).toEqual([{ night: 1, target: wolf, wolf: true }]);
  });
  it('the doctor can save the victim, but not the same player twice in a row', () => {
    let { s, wolf, seer, doc, vill } = night();
    const victim = vill[0]!;
    s = go(s, wolf, { type: 'kill', target: victim });
    s = go(s, seer, { type: 'inspect', target: vill[1]! });
    s = go(s, doc, { type: 'protect', target: victim });
    expect(s.report).toEqual({ night: 1, killed: null, saved: true });
    expect(s.alive).toContain(victim);
    s = go(s, 'a', { type: 'skip-discussion' });
    expect(s.phase).toBe('voting');
    expect(werewolfEngine.privateView(s, doc).cannotProtect).toBe(victim);
  });
  it('rejects wrong-role and illegal night actions', () => {
    const { s, wolf, seer, doc, vill } = night();
    expect(step(s, vill[0]!, { type: 'kill', target: vill[1]! }).ok).toBe(false);
    expect(step(s, wolf, { type: 'kill', target: wolf }).ok).toBe(false);
    expect(step(s, seer, { type: 'inspect', target: seer }).ok).toBe(false);
    expect(step(s, doc, { type: 'inspect', target: wolf }).ok).toBe(false);
    expect(step(s, wolf, { type: 'vote', target: vill[0]! }).ok).toBe(false);
  });
  it('night timeout resolves with partial choices; split wolves kill nobody', () => {
    const s0 = withClock(night().s, 0);
    const t = tick(s0, 45_000);
    expect(t.phase).toBe('discussion');
    expect(t.report).toEqual({ night: 1, killed: null, saved: false });
    expect(plurality({ x: 'a', y: 'b' })).toBeNull();
    expect(plurality({ x: 'a', y: 'a', z: 'b' })).toBe('a');
  });
});

describe('werewolf day and win conditions', () => {
  const toVoting = () => {
    const { s, wolf, seer, doc, vill } = night();
    let t = go(s, wolf, { type: 'kill', target: vill[0]! });
    t = go(t, seer, { type: 'inspect', target: wolf });
    t = go(t, doc, { type: 'protect', target: doc });
    t = go(t, t.alive[0]!, { type: 'skip-discussion' });
    return { s: t, wolf };
  };
  it('lynching the wolf ends the game for the village', () => {
    let { s, wolf } = toVoting();
    for (const id of s.alive) if (id !== wolf) s = go(s, id, { type: 'vote', target: wolf });
    s = go(s, wolf, { type: 'vote', target: s.alive.find((x) => x !== wolf)! });
    expect(s.phase).toBe('results');
    expect(s.outcome?.winner).toBe('village');
    expect(Object.keys(s.outcome!.roles).length).toBe(6);
  });
  it('a tied vote lynches nobody and night returns', () => {
    let { s } = toVoting();
    const [x, y, r0, r1, r2] = s.alive as [string, string, string, string, string];
    s = go(s, x, { type: 'vote', target: y });
    s = go(s, y, { type: 'vote', target: x });
    s = go(s, r0, { type: 'vote', target: x });
    s = go(s, r1, { type: 'vote', target: y });
    s = go(s, r2, { type: 'vote', target: r0 });
    expect(s.lastVotes?.lynched).toBeNull();
    expect(s.phase).toBe('night');
    expect(s.day).toBe(2);
  });
  it('wolves win once they equal everyone else', () => {
    let { s, wolf } = toVoting(); // night 1 killed a villager: 5 alive
    const lynch = (st: WerewolfState) => {
      const innocent = st.alive.find((id) => id !== wolf)!;
      for (const id of st.alive) st = go(st, id, { type: 'vote', target: id === innocent ? wolf : innocent });
      return st;
    };
    s = lynch(s); // 4 alive: wolf + 3, night 2
    expect(s.phase).toBe('night');
    const runNight = (st: WerewolfState) => {
      const victim = st.alive.find((id) => id !== wolf && st.roles[id] !== 'doctor' && st.roles[id] !== 'seer') ?? st.alive.find((id) => id !== wolf)!;
      st = go(st, wolf, { type: 'kill', target: victim });
      for (const id of st.alive) {
        if (st.roles[id] === 'seer' && st.phase === 'night') st = go(st, id, { type: 'inspect', target: wolf });
        if (st.roles[id] === 'doctor' && st.phase === 'night') st = go(st, id, { type: 'protect', target: st.alive.find((x) => x !== victim && x !== st.lastProtected)! });
      }
      return st;
    };
    s = runNight(s); // 3 alive: wolf + 2
    expect(s.alive.length).toBe(3);
    expect(s.phase).toBe('discussion');
    s = go(s, s.alive[0]!, { type: 'skip-discussion' });
    s = lynch(s); // wolf + 1 left: wolves equal the rest
    expect(s.phase).toBe('results');
    expect(s.outcome?.winner).toBe('wolves');
  });
  it('voting timeout counts the votes cast; dead players cannot vote', () => {
    let { s } = toVoting();
    const dead = werewolfEngine.publicView(s).dead[0]!.id;
    expect(step(s, dead, { type: 'vote', target: s.alive[0]! }).ok).toBe(false);
    s = tick(withClock(s, 0), 60_000);
    expect(s.phase).toBe('night');
    expect(s.lastVotes?.lynched).toBeNull();
  });
});

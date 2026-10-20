import { describe, expect, it } from 'vitest';
import { createRng, type PlayerRef } from '@party/game-engine';
import {
  accuse, CATEGORIES, impostorEngine, makeConfig, normalizeGuess, packToGroups, parseWords, pickSecret, pushRecent,
  step, validatePack, withClock, type ImpostorAction, type ImpostorConfig, type ImpostorState,
} from './index';

const SECRET = { word: 'zxqword', hint: 'A made-up thing', decoy: 'decoyword' };
const players = (n: number): PlayerRef[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}`, avatar: 'cat', isBot: false }));
const newGame = (n: number, cfg: Partial<ImpostorConfig> = {}, seed = 1): ImpostorState =>
  impostorEngine.init({ ...makeConfig(cfg), secret: SECRET }, players(n), createRng(seed));
const go = (s: ImpostorState, who: string, a: ImpostorAction) => {
  const r = step(s, who, a);
  if (!r.ok) throw new Error(`${r.code}: ${r.message}`);
  return r.value;
};
const code = (s: ImpostorState, who: string, a: ImpostorAction) => { const r = step(s, who, a); return r.ok ? 'ok' : r.code; };
const ackAll = (s: ImpostorState) => s.order.reduce((st, id) => go(st, id, { type: 'ack-role' }), s);
const speakAll = (s: ImpostorState) => { let st = s; while (st.phase === 'clues') st = go(st, st.order[st.turn]!, { type: 'clue' }); return st; };
const toVoting = (s: ImpostorState) => go(speakAll(ackAll(s)), 'p0', { type: 'skip-discussion' });
const voteAll = (s: ImpostorState, pick: (voter: string) => string) => s.order.reduce((st, id) => go(st, id, { type: 'vote', target: pick(id) }), s);
const innocent = (s: ImpostorState) => s.order.find((id) => !s.impostors.includes(id))!;

describe('setup and roles', () => {
  it('assigns the configured number of impostors and validates counts', () => {
    expect(newGame(5, { impostors: 2 }).impostors).toHaveLength(2);
    expect(() => newGame(2)).toThrow();
    expect(() => newGame(13)).toThrow();
    expect(() => newGame(3, { impostors: 2 })).toThrow();
    expect(() => newGame(5, { impostors: 0 })).toThrow();
  });
  it('varies who the impostor is across seeds', () => {
    const who = new Set(Array.from({ length: 30 }, (_, i) => newGame(5, {}, i + 1).impostors[0]));
    expect(who.size).toBeGreaterThan(2);
  });
});

describe('hidden information', () => {
  it('public view never exposes the word or roles before the game ends', () => {
    let s = newGame(4);
    for (const stage of [() => s, () => (s = ackAll(s)), () => (s = speakAll(s)), () => (s = go(s, 'p0', { type: 'skip-discussion' }))]) {
      const pub = JSON.stringify(impostorEngine.publicView(stage()));
      expect(pub).not.toContain('zxqword');
      expect(pub).not.toContain('decoyword');
      expect(pub).not.toContain('"impostors":['); // only a count is public, never the list
      expect(impostorEngine.publicView(s).outcome).toBe(null);
    }
  });
  it('"nothing" mode: the impostor sees no word, the crew sees the word', () => {
    const s = newGame(4, { impostorKnows: 'nothing' });
    const imp = impostorEngine.privateView(s, s.impostors[0]!);
    expect(imp).toEqual({ role: 'impostor', word: null, hint: null, hasAcked: false, myVote: null, waitingOnYou: true });
    const crew = impostorEngine.privateView(s, innocent(s));
    expect(crew.role).toBe('crew');
    expect(crew.word).toBe('zxqword');
  });
  it('"hint" mode gives the impostor only the hint', () => {
    const s = newGame(4, { impostorKnows: 'hint' });
    const imp = JSON.stringify(impostorEngine.privateView(s, s.impostors[0]!));
    expect(imp).toContain('A made-up thing');
    expect(imp).not.toContain('zxqword');
  });
  it('"different" mode: the impostor gets the decoy and nobody is told their role', () => {
    const s = newGame(4, { impostorKnows: 'different' });
    const imp = impostorEngine.privateView(s, s.impostors[0]!);
    expect(imp.word).toBe('decoyword');
    expect(imp.role).toBe('unknown');
    expect(impostorEngine.privateView(s, innocent(s)).role).toBe('unknown');
    expect(JSON.stringify(imp)).not.toContain('zxqword');
  });
  it('votes stay secret until everyone has voted', () => {
    let s = toVoting(newGame(4));
    s = go(s, 'p0', { type: 'vote', target: 'p1' });
    const pub = impostorEngine.publicView(s);
    expect(pub.voted).toEqual(['p0']);
    expect(pub.reveals).toEqual([]);
    expect(JSON.stringify(pub)).not.toContain('"p1"'.repeat(2));
    expect(impostorEngine.privateView(s, 'p0').myVote).toBe('p1');
    expect(impostorEngine.privateView(s, 'p2').myVote).toBe(null);
  });
});

describe('roles and clue phases', () => {
  it('clues only start once everyone has seen their role, and each player acks once', () => {
    let s = newGame(3);
    expect(code(s, s.order[0]!, { type: 'clue' })).toBe('wrong_phase');
    s = go(s, 'p0', { type: 'ack-role' });
    expect(code(s, 'p0', { type: 'ack-role' })).toBe('already_done');
    expect(s.phase).toBe('roles');
    s = go(go(s, 'p1', { type: 'ack-role' }), 'p2', { type: 'ack-role' });
    expect(s.phase).toBe('clues');
  });
  it('enforces turn order and runs the configured number of rounds', () => {
    let s = ackAll(newGame(3, { clueRounds: 2 }));
    const first = s.order[0]!;
    expect(code(s, s.order[1]!, { type: 'clue' })).toBe('not_your_turn');
    let turns = 0;
    while (s.phase === 'clues') { expect(s.order[s.turn]).toBe(s.order[turns % 3]); s = go(s, s.order[s.turn]!, { type: 'clue' }); turns++; }
    expect(turns).toBe(6);
    expect(s.phase).toBe('discussion');
    expect(first).toBe(s.order[0]);
  });
  it('typed clues are recorded; empty ones and ones containing your own word are rejected', () => {
    const s = ackAll(newGame(4, { typedClues: true, impostorKnows: 'nothing' }));
    const who = s.order[s.turn]!;
    expect(code(s, who, { type: 'clue', text: '   ' })).toBe('clue_empty');
    const isImp = s.impostors.includes(who);
    expect(code(s, who, { type: 'clue', text: 'it is a ZXQ-Word!' })).toBe(isImp ? 'ok' : 'reveals_word'); // impostor has no word to leak
    const after = go(s, who, { type: 'clue', text: ' round   thing <b>' });
    expect(after.clues[0]).toEqual({ round: 1, by: who, text: 'round thing b' });
  });
  it('spoken clues ignore any text', () => {
    const s = ackAll(newGame(3));
    expect(go(s, s.order[0]!, { type: 'clue', text: 'ignored' }).clues[0]!.text).toBe('');
  });
});

describe('discussion timer', () => {
  it('starts once, survives re-clocking, and opens voting at the deadline', () => {
    const s = withClock(speakAll(ackAll(newGame(3, { discussionSeconds: 60 }))), 1000);
    expect(s.discussionDeadline).toBe(61000);
    expect(withClock(s, 9000).discussionDeadline).toBe(61000);
    expect(impostorEngine.onTimeout!(s, 30000, createRng(1))).toBe(s);
    expect(impostorEngine.onTimeout!(s, 61000, createRng(1)).phase).toBe('voting');
  });
  it('any player can skip to voting', () => {
    expect(toVoting(newGame(3)).phase).toBe('voting');
  });
});

describe('voting rules', () => {
  it('rejects self-votes, double votes, outsiders, and votes outside the voting phase', () => {
    const early = ackAll(newGame(4));
    expect(code(early, 'p0', { type: 'vote', target: 'p1' })).toBe('wrong_phase');
    const s = toVoting(newGame(4));
    expect(code(s, 'p0', { type: 'vote', target: 'p0' })).toBe('self_vote');
    expect(code(s, 'p0', { type: 'vote', target: 'nobody' })).toBe('bad_target');
    expect(code(s, 'zed', { type: 'vote', target: 'p1' })).toBe('not_player');
    expect(code(go(s, 'p0', { type: 'vote', target: 'p1' }), 'p0', { type: 'vote', target: 'p2' })).toBe('already_voted');
  });
});

describe('outcomes', () => {
  it('catching the impostor lets them guess; a wrong guess means the crew wins', () => {
    let s = toVoting(newGame(4));
    const imp = s.impostors[0]!;
    s = voteAll(s, (v) => (v === imp ? innocent(s) : imp));
    expect(s.phase).toBe('guess');
    expect(s.accused).toEqual([imp]);
    expect(code(s, innocent(s), { type: 'guess', text: 'zxqword' })).toBe('not_impostor');
    const end = go(s, imp, { type: 'guess', text: 'banana' });
    expect(end.outcome).toMatchObject({ winner: 'crew', reason: 'caught' });
  });
  it('a correct guess (ignoring case, spacing and articles) steals the win', () => {
    let s = toVoting(newGame(4));
    const imp = s.impostors[0]!;
    s = voteAll(s, (v) => (v === imp ? innocent(s) : imp));
    const end = go(s, imp, { type: 'guess', text: '  The ZXQ word ' });
    expect(end.outcome).toMatchObject({ winner: 'impostors', reason: 'guessed-word' });
    expect(normalizeGuess('An Ice-Cream')).toBe('icecream');
  });
  it('without final guess the crew wins immediately when the impostor is caught', () => {
    let s = toVoting(newGame(4, { finalGuess: false }));
    const imp = s.impostors[0]!;
    s = voteAll(s, (v) => (v === imp ? innocent(s) : imp));
    expect(s.outcome).toMatchObject({ winner: 'crew', reason: 'caught' });
  });
  it('accusing an innocent player means the impostors win', () => {
    let s = toVoting(newGame(4));
    const victim = innocent(s);
    s = voteAll(s, (v) => (v === victim ? s.impostors[0]! : victim));
    expect(s.outcome).toMatchObject({ winner: 'impostors', reason: 'wrong-accusation' });
  });
  it('results reveal roles and the word, and the game is then locked', () => {
    let s = toVoting(newGame(4, { finalGuess: false }));
    const imp = s.impostors[0]!;
    s = voteAll(s, (v) => (v === imp ? innocent(s) : imp));
    const pub = impostorEngine.publicView(s);
    expect(pub.outcome).toMatchObject({ word: 'zxqword', impostors: [imp] });
    expect(impostorEngine.status(s)).toBe('finished');
    expect(code(s, 'p0', { type: 'vote', target: 'p1' })).toBe('game_over');
  });
});

describe('ties', () => {
  // 4 players, 1 impostor. Votes: p0->p1, p1->p0, p2->p0, p3->p1 gives a 2-2 tie between p0 and p1.
  const tie = (s: ImpostorState) => (['p0', 'p1', 'p2', 'p3'] as const).reduce((st, v) => go(st, v, { type: 'vote', target: { p0: 'p1', p1: 'p0', p2: 'p0', p3: 'p1' }[v] }), s);
  it('a tie triggers a tie-break vote among only the tied players', () => {
    const s = tie(toVoting(newGame(4, { tieBreak: true })));
    expect(s.phase).toBe('tiebreak');
    expect(impostorEngine.publicView(s).tiebreakCandidates.sort()).toEqual(['p0', 'p1']);
    expect(impostorEngine.publicView(s).reveals).toHaveLength(1);
    expect(code(s, 'p2', { type: 'vote', target: 'p3' })).toBe('bad_target');
    const decided = voteAll(s, (v) => (v === 'p0' ? 'p1' : 'p0'));
    expect(['guess', 'results']).toContain(decided.phase);
  });
  it('a second tie, or a tie with tie-breaks off, means the impostors win', () => {
    expect(tie(toVoting(newGame(4, { tieBreak: false }))).outcome).toMatchObject({ winner: 'impostors', reason: 'tie' });
    const s = tie(toVoting(newGame(4, { tieBreak: true })));
    const again = s.order.reduce((st, v) => go(st, v, { type: 'vote', target: v === 'p0' ? 'p1' : v === 'p1' ? 'p0' : v === 'p2' ? 'p0' : 'p1' }), s);
    expect(again.outcome).toMatchObject({ winner: 'impostors', reason: 'tie' });
  });
});

describe('multiple impostors', () => {
  it('accuse() takes the top k vote-getters and reports boundary ties', () => {
    expect(accuse({ a: 3, b: 2, c: 0 }, 2)).toEqual({ kind: 'accused', ids: ['a', 'b'] });
    expect(accuse({ a: 3, b: 1, c: 1 }, 2)).toEqual({ kind: 'tie', sure: ['a'], tied: ['b', 'c'], need: 1 });
    expect(accuse({ a: 3, b: 0, c: 0 }, 2)).toEqual({ kind: 'short' });
    expect(accuse({ a: 1, b: 1 }, 1)).toEqual({ kind: 'tie', sure: [], tied: ['a', 'b'], need: 1 });
  });
  it('the group must accuse exactly the impostors', () => {
    let s = toVoting(newGame(6, { impostors: 2, finalGuess: false }));
    const [i1, i2] = s.impostors as [string, string];
    const crew = s.order.filter((id) => !s.impostors.includes(id));
    // Crew split between the two impostors; the impostors vote for each other. Both end up accused.
    s = s.order.reduce((st, v) => go(st, v, { type: 'vote', target: v === i1 ? i2 : v === i2 ? i1 : crew.indexOf(v) % 2 === 0 ? i1 : i2 }), s);
    expect(s.outcome).toMatchObject({ winner: 'crew', reason: 'caught' });
  });
  it('accusing one impostor and one innocent loses', () => {
    let s = toVoting(newGame(6, { impostors: 2, finalGuess: false }));
    const crew = s.order.filter((id) => !s.impostors.includes(id));
    const [i1] = s.impostors as [string, string];
    s = s.order.reduce((st, v) => go(st, v, { type: 'vote', target: v === i1 ? crew[0]! : v === crew[0] ? i1 : (crew.indexOf(v) % 2 === 0 ? i1 : crew[0]!) }), s);
    expect(s.outcome).toMatchObject({ winner: 'impostors', reason: 'wrong-accusation' });
  });
});

describe('word pools and packs', () => {
  it('every built-in category has plenty of unique words and plausible decoys', () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(['objects', 'food', 'animals', 'places', 'movies', 'games']);
    for (const c of CATEGORIES) {
      const words = c.groups.flatMap((g) => g.words);
      expect(words.length).toBeGreaterThan(20);
      expect(new Set(words.map((w) => w.toLowerCase())).size).toBe(words.length);
    }
  });
  it('pickSecret avoids recent words and always gives a different decoy', () => {
    const groups = CATEGORIES[1]!.groups;
    const all = groups.flatMap((g) => g.words);
    const recent = all.slice(0, all.length - 3);
    const rng = createRng(11);
    for (let i = 0; i < 50; i++) {
      const s = pickSecret(groups, rng, recent);
      expect(recent).not.toContain(s.word);
      expect(s.decoy).not.toBe(s.word);
    }
  });
  it('falls back to repeats when every word is recent, and rejects tiny pools', () => {
    const groups = [{ hint: 'h', words: ['a1', 'b2'] }];
    expect(pickSecret(groups, createRng(1), ['a1', 'b2']).word).toMatch(/a1|b2/);
    expect(() => pickSecret([{ hint: 'h', words: ['solo'] }], createRng(1))).toThrow();
  });
  it('recent list is capped and moves repeats to the end', () => {
    let r: string[] = [];
    for (let i = 0; i < 60; i++) r = pushRecent(r, `w${i}`);
    expect(r).toHaveLength(40);
    expect(pushRecent(['x', 'y'], 'X')).toEqual(['y', 'X']);
  });
  it('parses and validates custom packs', () => {
    expect(parseWords('Cat, dog\n  CAT \n\n<b>bird</b>,')).toEqual(['Cat', 'dog', 'bbird/b']);
    expect(validatePack('', ['a'])).toContain('name');
    expect(validatePack('Pets', ['a', 'b'])).toContain('at least 6');
    expect(validatePack('Pets', ['a', 'b', 'c', 'd', 'e', 'f'])).toBe(null);
    expect(packToGroups({ id: '1', name: 'Pets', words: ['a', 'b'] })[0]!.hint).toContain('Pets');
  });
});

describe('full games (fuzz)', () => {
  it('300 random games always end with a winner and never throw', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const r = createRng(seed);
      const n = 3 + (seed % 8);
      const cfg = makeConfig({
        impostors: 1 + (seed % Math.max(1, Math.floor((n - 1) / 2))), tieBreak: seed % 2 === 0, finalGuess: seed % 3 !== 0,
        typedClues: seed % 5 === 0, clueRounds: 1 + (seed % 3), impostorKnows: (['nothing', 'hint', 'different'] as const)[seed % 3]!,
      });
      let s = impostorEngine.init({ ...cfg, secret: SECRET }, players(n), r);
      let guard = 0;
      while (s.phase !== 'results' && guard++ < 500) {
        let who = s.order[0]!;
        let a: ImpostorAction = { type: 'skip-discussion' };
        if (s.phase === 'roles') { who = s.order.find((id) => !s.acked.includes(id))!; a = { type: 'ack-role' }; }
        else if (s.phase === 'clues') { who = s.order[s.turn]!; a = { type: 'clue', text: `clue ${guard}` }; }
        else if (s.phase === 'voting' || s.phase === 'tiebreak') {
          who = s.order.find((id) => !s.votes[id])!;
          const pool = s.phase === 'tiebreak' ? s.tiebreak!.candidates : s.order;
          const options = pool.filter((id) => id !== who);
          a = { type: 'vote', target: options[r.int(options.length)]! };
        } else if (s.phase === 'guess') { who = s.impostors[0]!; a = { type: 'guess', text: r.next() < 0.3 ? 'zxqword' : 'nope' }; }
        const res = step(s, who, a);
        if (!res.ok) throw new Error(`seed ${seed} phase ${s.phase}: ${res.code} ${JSON.stringify(a)}`);
        s = res.value;
      }
      if (s.phase !== 'results') throw new Error(`seed ${seed} stuck in ${s.phase}`);
      expect(['crew', 'impostors']).toContain(s.outcome!.winner);
    }
  });
});

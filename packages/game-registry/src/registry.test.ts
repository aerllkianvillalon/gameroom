import { describe, expect, it } from 'vitest';
import { canCreateRoom, defaultSettings, getGame, listGames } from './index';

describe('game registry', () => {
  const games = listGames();
  it('has unique ids and sane player limits', () => {
    expect(new Set(games.map((g) => g.id)).size).toBe(games.length);
    for (const g of games) expect(g.minPlayers).toBeLessThanOrEqual(g.maxPlayers);
  });
  it('lists both priority games first and never marks unfinished games playable', () => {
    expect(games.slice(0, 2).map((g) => g.id)).toEqual(['uno', 'impostor']);
    expect(games.filter((g) => g.status === 'playable').map((g) => g.id)).toEqual(['uno', 'impostor', 'trivia', 'wordbomb', 'werewolf', 'wyr', 'memory']); // update when another game ships
    for (const id of ['uno', 'impostor']) expect(getGame(id)!.modes).toContain('online');
    expect(getGame('uno')!.modes).not.toContain('lan'); // LAN is not built
  });
  it('coming-soon games cannot create rooms', () => {
    expect(canCreateRoom(getGame('drawing')!)).toBe(false);
    expect(canCreateRoom(getGame('trivia')!)).toBe(true);
    expect(canCreateRoom(getGame('uno')!)).toBe(true);
  });
  it('every setting default is inside its own bounds and options', () => {
    for (const g of games) {
      const d = defaultSettings(g);
      for (const s of g.settings) {
        if (s.type === 'number') expect(d[s.key]).toBeGreaterThanOrEqual(s.min), expect(d[s.key]).toBeLessThanOrEqual(s.max);
        if (s.type === 'select') expect(s.options.map((o) => o.value)).toContain(d[s.key]);
      }
    }
  });
  it('playable and in-development games have rules text', () => {
    for (const g of games.filter((x) => x.status !== 'coming-soon')) expect(g.rules.length).toBeGreaterThan(0);
  });
});

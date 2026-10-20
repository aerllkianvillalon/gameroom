import { describe, expect, it } from 'vitest';
import { fitsGroup, GROUP_SIZES, isGroupSize, listGames, sortByFit } from './index';

const uno = { minPlayers: 2, maxPlayers: 8 };
const impostor = { minPlayers: 3, maxPlayers: 12 };

describe('fitsGroup', () => {
  it('matches a game to each group size by its min and max players', () => {
    expect(fitsGroup(uno, '2')).toBe(true);
    expect(fitsGroup(uno, '3-4')).toBe(true);
    expect(fitsGroup(uno, '5-8')).toBe(true);
    expect(fitsGroup(uno, '9+')).toBe(false);
    expect(fitsGroup(impostor, '2')).toBe(false);
    expect(fitsGroup(impostor, '3-4')).toBe(true);
    expect(fitsGroup(impostor, '9+')).toBe(true);
  });
  it('counts a partial overlap as a fit', () => {
    expect(fitsGroup({ minPlayers: 2, maxPlayers: 6 }, '5-8')).toBe(true);
    expect(fitsGroup({ minPlayers: 5, maxPlayers: 16 }, '3-4')).toBe(false);
    expect(fitsGroup({ minPlayers: 4, maxPlayers: 4 }, '3-4')).toBe(true);
  });
  it('has non-overlapping, ordered options and a type guard', () => {
    for (let i = 1; i < GROUP_SIZES.length; i += 1) expect(GROUP_SIZES[i]!.min).toBe(GROUP_SIZES[i - 1]!.max + 1);
    expect(isGroupSize('3-4')).toBe(true);
    expect(isGroupSize('10')).toBe(false);
    expect(isGroupSize(null)).toBe(false);
  });
});

describe('sortByFit', () => {
  const games = [{ id: 'a', ...impostor }, { id: 'b', ...uno }, { id: 'c', minPlayers: 6, maxPlayers: 6 }];
  it('keeps the order when no size is picked and does not mutate the input', () => {
    const copy = [...games];
    expect(sortByFit(games, null).map((g) => g.id)).toEqual(['a', 'b', 'c']);
    expect(games).toEqual(copy);
  });
  it('puts fitting games first and keeps the original order inside each group', () => {
    expect(sortByFit(games, '2').map((g) => g.id)).toEqual(['b', 'a', 'c']);
    expect(sortByFit(games, '5-8').map((g) => g.id)).toEqual(['a', 'b', 'c']);
    expect(sortByFit(games, '9+').map((g) => g.id)).toEqual(['a', 'b', 'c']);
  });
  it('works on the real registry', () => {
    const playable = listGames().filter((g) => g.status === 'playable');
    expect(sortByFit(playable, '2').map((g) => g.id)).toEqual(['uno', 'impostor']);
    expect(sortByFit(playable, '9+').map((g) => g.id)).toEqual(['impostor', 'uno']);
  });
});

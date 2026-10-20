import type { GameMeta } from './types';

/** The group sizes offered by the "Who's playing?" picker. */
export type GroupSize = '2' | '3-4' | '5-8' | '9+';

export interface GroupSizeOption {
  id: GroupSize;
  /** Short label for the picker button. */
  label: string;
  /** Reads naturally after "works for". */
  phrase: string;
  min: number;
  max: number;
}

export const GROUP_SIZES: readonly GroupSizeOption[] = [
  { id: '2', label: '2', phrase: '2 players', min: 2, max: 2 },
  { id: '3-4', label: '3-4', phrase: '3 or 4 players', min: 3, max: 4 },
  { id: '5-8', label: '5-8', phrase: '5 to 8 players', min: 5, max: 8 },
  { id: '9+', label: '9+', phrase: '9 or more players', min: 9, max: Number.POSITIVE_INFINITY },
];

export const isGroupSize = (v: unknown): v is GroupSize => GROUP_SIZES.some((o) => o.id === v);

type Limits = Pick<GameMeta, 'minPlayers' | 'maxPlayers'>;

/**
 * True when the game can be played by at least one head-count inside the group's range.
 * A game for 2 to 8 fits "5-8" even though 9 is too many: the group can still pick a number that works.
 */
export function fitsGroup(game: Limits, size: GroupSize): boolean {
  const o = GROUP_SIZES.find((x) => x.id === size);
  if (!o) return false;
  return game.minPlayers <= o.max && game.maxPlayers >= o.min;
}

/** Games that fit come first, in their original order; the rest follow, also in their original order. No size: unchanged. */
export function sortByFit<T extends Limits>(games: readonly T[], size: GroupSize | null): T[] {
  if (!size) return [...games];
  return [...games.filter((g) => fitsGroup(g, size)), ...games.filter((g) => !fitsGroup(g, size))];
}

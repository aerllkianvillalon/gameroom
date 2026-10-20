import type { SettingValue } from '@party/game-engine';
import { GAMES } from './games';
import type { GameCategory, GameMeta, PlayMode } from './types';

export * from './types';
export * from './fit';
export { GAMES };

export const CATEGORY_LABELS: Record<GameCategory, string> = {
  cards: 'Cards', social: 'Social deduction', words: 'Words', trivia: 'Trivia', drawing: 'Drawing', action: 'Reflex and memory',
};

export const MODE_LABELS: Record<PlayMode, string> = {
  online: 'Online rooms', 'pass-and-play': 'Pass and play', bots: 'Bots', lan: 'Local network',
};

export const listGames = (): readonly GameMeta[] => GAMES;
export const getGame = (id: string): GameMeta | undefined => GAMES.find((g) => g.id === id);
/** Rooms can be created for every game that is not just a listing. */
export const canCreateRoom = (g: GameMeta): boolean => g.status !== 'coming-soon';

export function defaultSettings(g: GameMeta): Record<string, SettingValue> {
  return Object.fromEntries(g.settings.map((s) => [s.key, s.default]));
}

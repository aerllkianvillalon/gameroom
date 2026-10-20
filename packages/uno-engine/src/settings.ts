import type { SettingValue } from '@party/game-engine';
import type { BotLevel } from './bot';
import { makeConfig, type UnoConfig } from './types';

type Settings = Record<string, SettingValue>;

/** Room settings (as edited in the lobby) to engine config. Used by the browser and the server alike. */
export function configFromSettings(s: Settings): UnoConfig {
  return makeConfig({
    stackDraws: Boolean(s.stackDraws), jumpIn: Boolean(s.jumpIn), sevenZero: Boolean(s.sevenZero),
    unoPenalty: Number(s.unoPenalty ?? 2), turnTimer: Number(s.turnTimer ?? 0),
  });
}

export function botLevelFromSettings(s: Settings): BotLevel {
  return s.botDifficulty === 'easy' || s.botDifficulty === 'hard' ? s.botDifficulty : 'medium';
}

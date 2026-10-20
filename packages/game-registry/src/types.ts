import type { SettingValue } from '@party/game-engine';

/**
 * playable        engine implemented and tested
 * in-development  being built; rooms can be created but Start stays locked
 * coming-soon     listed only; no rooms
 */
export type GameStatus = 'playable' | 'in-development' | 'coming-soon';
export type PlayMode = 'online' | 'pass-and-play' | 'bots' | 'lan';
export type GameCategory = 'cards' | 'social' | 'words' | 'trivia' | 'drawing' | 'action';

export type SettingDef = { key: string; label: string; help?: string } & (
  | { type: 'toggle'; default: boolean }
  | { type: 'number'; default: number; min: number; max: number; step?: number; unit?: string }
  | { type: 'select'; default: string; options: { value: string; label: string }[] }
);

export interface GameMeta {
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: GameCategory;
  status: GameStatus;
  priority: boolean;
  minPlayers: number;
  maxPlayers: number;
  modes: PlayMode[];
  settings: SettingDef[];
  rules: string[];
  /** Hex colour used for the game's accent rule and badges. */
  accent: string;
}

export type SettingsRecord = Record<string, SettingValue>;

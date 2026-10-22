import type { SettingValue } from '@party/game-engine';
import { makeConfig, type Difficulty } from './types';

export function configFromSettings(s: Record<string, SettingValue>) {
  const d = s.difficulty === 'easy' || s.difficulty === 'hard' ? s.difficulty : 'medium';
  return makeConfig({
    fuseSeconds: Number(s.fuseSeconds ?? 10),
    lives: Number(s.lives ?? 3),
    difficulty: d as Difficulty,
    challenges: Boolean(s.challenges ?? true),
  });
}

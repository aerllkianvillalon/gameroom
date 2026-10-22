import type { SettingValue } from '@party/game-engine';
import { makeConfig, type CategorySetting, type TriviaConfig } from './types';

const CATEGORIES = ['science', 'geography', 'history', 'culture'];

/** Room settings to engine config. */
export function configFromSettings(s: Record<string, SettingValue>): TriviaConfig {
  const cat = String(s.category ?? 'mixed');
  return makeConfig({
    questions: Number(s.questions ?? 10),
    questionSeconds: Number(s.questionSeconds ?? 20),
    revealSeconds: Number(s.revealSeconds ?? 6),
    category: (CATEGORIES.includes(cat) ? cat : 'mixed') as CategorySetting,
    speedBonus: Boolean(s.speedBonus ?? true),
  });
}

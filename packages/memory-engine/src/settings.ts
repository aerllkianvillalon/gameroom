import type { SettingValue } from '@party/game-engine';
import { makeConfig, type MemoryConfig } from './types';

export function configFromSettings(s: Record<string, SettingValue>): MemoryConfig {
  return makeConfig({ pairs: Number(s.pairs ?? 8), flipSeconds: Number(s.flipSeconds ?? 15) });
}

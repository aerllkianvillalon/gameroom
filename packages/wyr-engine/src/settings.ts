import type { SettingValue } from '@party/game-engine';
import { makeConfig, type TopicSetting, type WyrConfig } from './types';

export function configFromSettings(s: Record<string, SettingValue>): WyrConfig {
  const t = s.topic === 'silly' || s.topic === 'thoughtful' ? s.topic : 'mixed';
  return makeConfig({
    rounds: Number(s.rounds ?? 8),
    voteSeconds: Number(s.voteSeconds ?? 20),
    revealSeconds: Number(s.revealSeconds ?? 8),
    topic: t as TopicSetting,
    scoring: Boolean(s.scoring ?? true),
  });
}

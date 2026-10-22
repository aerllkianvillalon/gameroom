import type { SettingValue } from '@party/game-engine';
import { makeConfig, type WerewolfConfig } from './types';

export function configFromSettings(s: Record<string, SettingValue>): WerewolfConfig {
  return makeConfig({
    werewolves: Number(s.werewolves ?? 0),
    seer: Boolean(s.seer ?? true),
    doctor: Boolean(s.doctor ?? true),
    nightSeconds: Number(s.nightSeconds ?? 45),
    discussionSeconds: Number(s.discussionSeconds ?? 120),
    voteSeconds: Number(s.voteSeconds ?? 60),
    revealRoles: Boolean(s.revealRoles ?? true),
  });
}

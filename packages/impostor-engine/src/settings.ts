import type { SettingValue } from '@party/game-engine';
import { makeConfig, maxImpostors, type ImpostorConfig } from './types';

/** Room settings to engine config. Impostors are clamped so they stay a minority of `players`. */
export function configFromSettings(s: Record<string, SettingValue>, players: number, typedClues: boolean): ImpostorConfig {
  const knows = s.impostorKnows === 'hint' || s.impostorKnows === 'different' ? s.impostorKnows : 'nothing';
  return makeConfig({
    impostors: Math.min(Math.max(1, Number(s.impostors ?? 1)), maxImpostors(players)),
    impostorKnows: knows,
    clueRounds: Number(s.clueRounds ?? 2),
    discussionSeconds: Number(s.discussionSeconds ?? 90),
    tieBreak: Boolean(s.tieBreak ?? true),
    finalGuess: Boolean(s.finalGuess ?? true),
    typedClues,
  });
}

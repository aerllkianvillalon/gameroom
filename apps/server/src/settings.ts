import type { SettingValue } from '@party/game-engine';
import type { GameMeta } from '@party/game-registry';

/** Keeps only known settings with in-range values. Anything else a client sends is dropped. */
export function sanitizeSettings(meta: GameMeta, patch: Record<string, SettingValue>): Record<string, SettingValue> {
  const out: Record<string, SettingValue> = {};
  for (const def of meta.settings) {
    const v = patch[def.key];
    if (v === undefined) continue;
    if (def.type === 'toggle' && typeof v === 'boolean') out[def.key] = v;
    else if (def.type === 'number' && typeof v === 'number' && Number.isFinite(v)) out[def.key] = Math.min(def.max, Math.max(def.min, Math.round(v)));
    else if (def.type === 'select' && typeof v === 'string' && def.options.some((o) => o.value === v)) out[def.key] = v;
  }
  return out;
}

import type { SettingDef } from '@party/game-registry';
import type { SettingValue } from '@party/game-engine';

const field = 'min-h-[44px] rounded-lg border border-line bg-ink-800 px-3 text-paper';

type Extra = Record<string, { value: string; label: string }[]>;

export function SettingsForm({ defs, values, onChange, extraOptions = {} }: { defs: SettingDef[]; values: Record<string, SettingValue>; onChange: (patch: Record<string, SettingValue>) => void; extraOptions?: Extra }) {
  if (defs.length === 0) return <p className="text-paper-dim">This game has no settings.</p>;
  return (
    <div className="space-y-5">
      {defs.map((d) => {
        const id = `setting-${d.key}`;
        const help = d.help ? <span id={`${id}-help`} className="block text-sm text-paper-dim">{d.help}</span> : null;
        const aria = d.help ? { 'aria-describedby': `${id}-help` } : {};
        if (d.type === 'toggle')
          return (
            <div key={d.key} className="flex items-start gap-3">
              <input id={id} type="checkbox" className="mt-1 h-6 w-6 accent-[rgb(var(--card-yellow))]" checked={Boolean(values[d.key])} onChange={(e) => onChange({ [d.key]: e.target.checked })} {...aria} />
              <label htmlFor={id} className="font-medium">{d.label}{help}</label>
            </div>
          );
        return (
          <div key={d.key}>
            <label htmlFor={id} className="mb-1 block font-medium">{d.label}</label>
            {d.type === 'select' ? (
              <select id={id} className={field} value={String(values[d.key])} onChange={(e) => onChange({ [d.key]: e.target.value })} {...aria}>
                {[...d.options, ...(extraOptions[d.key] ?? [])].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <span className="flex items-center gap-2">
                <input id={id} type="number" className={`${field} w-24`} min={d.min} max={d.max} step={d.step ?? 1} value={Number(values[d.key])}
                  onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange({ [d.key]: Math.min(d.max, Math.max(d.min, Math.round(n))) }); }} {...aria} />
                {d.unit && <span className="text-paper-dim">{d.unit}</span>}
              </span>
            )}
            {help}
          </div>
        );
      })}
    </div>
  );
}

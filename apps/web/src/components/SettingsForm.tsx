import type { SettingDef } from '@party/game-registry';
import type { SettingValue } from '@party/game-engine';

const field = 'field';

type Extra = Record<string, { value: string; label: string }[]>;

export function SettingsForm({ defs, values, onChange, extraOptions = {} }: { defs: SettingDef[]; values: Record<string, SettingValue>; onChange: (patch: Record<string, SettingValue>) => void; extraOptions?: Extra }) {
  if (defs.length === 0) return <p className="text-paper-dim">This game has no settings.</p>;
  return (
    <div className="space-y-5">
      {defs.map((d) => {
        const id = `setting-${d.key}`;
        const help = d.help ? <span id={`${id}-help`} className="mt-0.5 block text-sm font-normal text-paper-dim">{d.help}</span> : null;
        const aria = d.help ? { 'aria-describedby': `${id}-help` } : {};
        if (d.type === 'toggle')
          return (
            <div key={d.key} className="panel-flat flex items-center justify-between gap-4 p-4">
              <label htmlFor={id} className="min-w-0 flex-1 font-semibold">{d.label}{help}</label>
              <input id={id} type="checkbox" className="switch" checked={Boolean(values[d.key])} onChange={(e) => onChange({ [d.key]: e.target.checked })} {...aria} />
            </div>
          );
        return (
          <div key={d.key}>
            <label htmlFor={id} className="mb-1.5 block font-semibold">{d.label}</label>
            {d.type === 'select' ? (
              <select id={id} className={field} value={String(values[d.key])} onChange={(e) => onChange({ [d.key]: e.target.value })} {...aria}>
                {[...d.options, ...(extraOptions[d.key] ?? [])].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <span className="flex items-center gap-2">
                <input id={id} type="number" className={`${field} !w-28`} min={d.min} max={d.max} step={d.step ?? 1} value={Number(values[d.key])}
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

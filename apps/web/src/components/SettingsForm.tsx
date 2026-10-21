import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { SettingDef } from '@party/game-registry';
import type { SettingValue } from '@party/game-engine';

const field = 'field';

type NumberDef = Extract<SettingDef, { type: 'number' }>;

/**
 * Number input that lets you type freely. The value is only clamped and saved on blur / Enter / the +/- buttons,
 * so clearing the box or typing "6" no longer snaps to the old limit mid-edit.
 */
function NumberField({ id, def, value, onCommit, aria }: { id: string; def: NumberDef; value: number; onCommit: (n: number) => void; aria: { 'aria-describedby'?: string } }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const step = def.step ?? 1;
  const clamp = (n: number) => Math.min(def.max, Math.max(def.min, Math.round(n)));
  const commit = (raw: string) => {
    const n = Number(raw);
    const next = raw.trim() !== '' && Number.isFinite(n) ? clamp(n) : value;
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };
  const bump = (dir: 1 | -1) => { const next = clamp(value + dir * step); setDraft(String(next)); if (next !== value) onCommit(next); };
  const stepBtn = 'btn btn-secondary !min-h-[44px] !min-w-[44px] !px-0';
  return (
    <span className="flex items-center gap-2">
      <button type="button" className={stepBtn} onClick={() => bump(-1)} disabled={value <= def.min} aria-label={`Decrease ${def.label}`}><Minus size={18} aria-hidden="true" /></button>
      <input id={id} type="text" inputMode="numeric" pattern="[0-9]*" className={`${field} !w-20 text-center`} value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }}
        {...aria} />
      <button type="button" className={stepBtn} onClick={() => bump(1)} disabled={value >= def.max} aria-label={`Increase ${def.label}`}><Plus size={18} aria-hidden="true" /></button>
      {def.unit && <span className="text-paper-dim">{def.unit}</span>}
    </span>
  );
}

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
              <NumberField id={id} def={d} value={Number(values[d.key])} onCommit={(n) => onChange({ [d.key]: n })} aria={aria} />
            )}
            {help}
          </div>
        );
      })}
    </div>
  );
}

import { useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { GROUP_SIZES, isGroupSize, type GroupSize } from '@party/game-registry';

/** The chosen group size lives in the URL (?players=3-4) so it survives a reload and can be shared. */
export function useGroupParam(): [GroupSize | null, (next: GroupSize | null) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get('players');
  const value = isGroupSize(raw) ? raw : null;
  const set = (next: GroupSize | null) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next) p.set('players', next); else p.delete('players');
      return p;
    }, { replace: true });
  };
  return [value, set];
}

export function GroupPicker({ value, onChange, status }: { value: GroupSize | null; onChange: (v: GroupSize | null) => void; status: string }) {
  return (
    <section aria-labelledby="who" className="panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="who" className="section-title">Who&rsquo;s playing?</h2>
        {value && (
          <button type="button" aria-label="Clear group size" onClick={() => onChange(null)} className="chip-in btn btn-ghost !min-h-[44px] !px-3 text-sm">
            <X size={16} aria-hidden="true" /> Clear
          </button>
        )}
      </div>
      <p role="status" className="mt-1 min-h-[1.5rem] text-[0.9375rem] text-paper-dim">{status || 'Tap a group size to match games to it.'}</p>

      <div role="group" aria-labelledby="who" className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
        {GROUP_SIZES.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              aria-label={o.phrase}
              onClick={() => onChange(on ? null : o.id)}
              className={`btn ${on ? 'btn-primary' : 'btn-secondary'} !min-h-[68px] flex-col !gap-0.5 !rounded-[18px] !px-1 sm:!min-h-[76px]`}
            >
              {on && <span className="chip-in absolute -right-1.5 -top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-950 text-card-yellow" aria-hidden="true"><Check size={12} strokeWidth={4} /></span>}
              <span className="text-[clamp(1.375rem,6vw,1.875rem)] font-extrabold leading-none tracking-[-0.03em]">{o.label}</span>
              <span className={`text-xs font-semibold ${on ? 'text-ink-950/70' : 'text-paper-dim'}`}>players</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

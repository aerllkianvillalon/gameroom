import { useSearchParams } from 'react-router-dom';
import { Check, Users, X } from 'lucide-react';
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
    <section aria-labelledby="who" className="rounded-3xl border border-line bg-ink-800/90 p-4 backdrop-blur sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink-700 text-card-yellow" aria-hidden="true"><Users size={22} /></span>
          <div className="min-w-0">
            <h2 id="who" className="whitespace-nowrap text-xl font-bold leading-tight sm:text-2xl">Who&rsquo;s playing?</h2>
          </div>
        </div>
        {value && (
          <button type="button" aria-label="Clear group size" onClick={() => onChange(null)} className="chip-in inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-paper-dim transition-colors hover:bg-ink-700 hover:text-paper">
            <X size={16} aria-hidden="true" /> <span className="hidden min-[400px]:inline">Clear</span>
          </button>
        )}
      </div>

      <p role="status" className="mt-3 min-h-[2.5rem] text-sm text-paper-dim sm:min-h-[1.5rem] sm:text-base">{status || 'Tap a group size to match games to it.'}</p>

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
              className={`group relative flex min-h-[64px] flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 transition-colors duration-200 sm:min-h-[76px] ${on ? 'border-paper bg-paper text-ink-900 shadow-lg' : 'border-line bg-ink-900/60 text-paper hover:border-paper-dim hover:bg-ink-700 active:bg-ink-700'}`}
            >
              {on && <span className="chip-in absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-card-green text-white" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>}
              <span className="font-display text-[clamp(1.25rem,5.5vw,1.75rem)] font-bold leading-none">{o.label}</span>
              <span className={`mt-1 text-xs sm:text-sm ${on ? 'text-ink-700' : 'text-paper-dim'}`}>players</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

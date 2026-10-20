import { useMemo, useState } from 'react';
import { CATEGORY_LABELS, GROUP_SIZES, fitsGroup, listGames, sortByFit, type GameCategory } from '@party/game-registry';
import { GameCard, SoonCard, type Fit } from '../ui/GameCard';
import { GroupPicker, useGroupParam } from '../ui/GroupPicker';

export function Library() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<GameCategory | 'all'>('all');
  const [group, setGroup] = useGroupParam();

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return listGames().filter((g) => (cat === 'all' || g.category === cat) && (!needle || `${g.title} ${g.tagline}`.toLowerCase().includes(needle)));
  }, [q, cat]);
  const playable = useMemo(() => sortByFit(matches.filter((g) => g.status === 'playable'), group), [matches, group]);
  const soon = matches.filter((g) => g.status !== 'playable');
  const cats = ['all', ...Array.from(new Set(listGames().map((g) => g.category)))] as (GameCategory | 'all')[];

  const fitCount = group ? playable.filter((g) => fitsGroup(g, group)).length : playable.length;
  const phrase = GROUP_SIZES.find((o) => o.id === group)?.phrase ?? '';
  const status = !group
    ? ''
    : fitCount === 0
      ? `Nothing here fits ${phrase}. Try another size or clear the search.`
      : `${fitCount} of ${playable.length} ${playable.length === 1 ? 'game works' : 'games work'} for ${phrase}.`;
  const fitOf = (g: (typeof playable)[number]): Fit => (!group ? 'neutral' : fitsGroup(g, group) ? 'fit' : 'nofit');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">All games</h1>
        <p className="mt-2 text-lg text-paper-dim">Pick one to see how it works, then play.</p>
      </div>

      <GroupPicker value={group} onChange={setGroup} status={status} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="search">Search games</label>
        <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games" className="min-h-[44px] w-full rounded-lg border border-line bg-ink-800 px-3 sm:max-w-xs" />
        <div role="group" aria-label="Category" className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className={`min-h-[44px] rounded-full border px-4 font-medium ${cat === c ? 'border-paper bg-paper text-ink-900' : 'border-line text-paper-dim hover:bg-ink-700'}`}>
              {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {matches.length === 0 && <p className="text-paper-dim">No games match "{q}". Clear the search or pick another category.</p>}

      {playable.length > 0 && (
        <section aria-label="Games you can play">
          <ul className="game-grid grid gap-6 sm:grid-cols-2">
            {playable.map((g) => <li key={g.id}><GameCard game={g} fit={fitOf(g)} as="h2" /></li>)}
          </ul>
        </section>
      )}

      {soon.length > 0 && (
        <section aria-labelledby="soon">
          <h2 id="soon" className="mb-3 text-xl font-bold text-paper-dim">Coming soon</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {soon.map((g) => <li key={g.id}><SoonCard game={g} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

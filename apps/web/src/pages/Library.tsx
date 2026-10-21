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
    <div className="space-y-8 pb-4">
      <div>
        <h1 className="page-title">All games</h1>
        <p className="lede mt-3">Pick one to see how it works, then play.</p>
      </div>

      <GroupPicker value={group} onChange={setGroup} status={status} />

      <div className="flex flex-col gap-4">
        <label className="sr-only" htmlFor="search">Search games</label>
        <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games" className="field sm:max-w-sm" />
        <div role="group" aria-label="Category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
          {cats.map((c) => (
            <button key={c} type="button" aria-pressed={cat === c} onClick={() => setCat(c)} className="chip">
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
          <h2 id="soon" className="section-title mb-3 text-paper-dim">Coming soon</h2>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {soon.map((g) => <li key={g.id} className="min-w-0"><SoonCard game={g} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

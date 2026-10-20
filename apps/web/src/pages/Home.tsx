import { useMemo } from 'react';
import { listGames, fitsGroup, sortByFit, GROUP_SIZES } from '@party/game-registry';
import { LinkButton } from '../ui/Button';
import type { Fit } from '../ui/GameCard';
import { GameCarousel } from '../ui/GameCarousel';
import { GroupPicker, useGroupParam } from '../ui/GroupPicker';
import { useOnline } from '../hooks/useOnlineClient';

export function Home() {
  const online = useOnline();
  const [group, setGroup] = useGroupParam();
  const playable = useMemo(() => sortByFit(listGames().filter((g) => g.status === 'playable'), group), [group]);
  const soon = useMemo(() => listGames().filter((g) => g.status !== "playable"), []);

  const slides = useMemo(() => [...playable, ...soon], [playable, soon]);
  const fitCount = group ? playable.filter((g) => fitsGroup(g, group)).length : playable.length;
  const phrase = GROUP_SIZES.find((o) => o.id === group)?.phrase ?? '';
  const status = !group
    ? ''
    : fitCount === 0
      ? `Nothing here fits ${phrase} yet. Try another size.`
      : `${fitCount} of ${playable.length} ${playable.length === 1 ? 'game works' : 'games work'} for ${phrase}.`;
  const fitOf = (g: (typeof playable)[number]): Fit => (!group ? 'neutral' : fitsGroup(g, group) ? 'fit' : 'nofit');

  return (
    <div className="space-y-12">
      <section aria-labelledby="tonight">
        <h1 id="tonight" aria-label="What are we playing tonight?" className="text-[clamp(2.25rem,8vw,3.75rem)] font-bold leading-[1.05]">
          {'What are we playing tonight?'.split(' ').map((w, i) => <span key={i} className="hero-word mr-[0.26em]" style={{ animationDelay: `${80 + i * 90}ms` }}>{w}</span>)}
        </h1>
        <p className="hero-sub mt-3 max-w-xl text-lg text-paper-dim">Pick a game, then pick how to play. No account needed.</p>
      </section>

      {online.session && (
        <section aria-label="Your room" className="rounded-xl border border-card-yellow bg-ink-800 p-5">
          <h2 className="text-xl font-bold">You are in room {online.session.code}</h2>
          <LinkButton to={`/room/${online.session.code}`} className="mt-3">Return to the room</LinkButton>
        </section>
      )}

      <div className="space-y-6">
        <GroupPicker value={group} onChange={setGroup} status={status} />
        <GameCarousel games={slides} fitOf={fitOf} />
      </div>

      <section aria-labelledby="how">
        <h2 id="how" className="mb-4 text-2xl font-bold">How do you want to play?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-ink-800 p-5">
            <h3 className="text-xl font-bold">Play on this device</h3>
            <p className="mt-1 text-paper-dim">Pass one device around the table, or add bots. Works without internet once the page has loaded.</p>
            <LinkButton to="/create" className="mt-4">Start here</LinkButton>
          </div>
          <div className="rounded-2xl border border-line bg-ink-800 p-5">
            <h3 className="text-xl font-bold">Play online with a room code</h3>
            <p className="mt-1 text-paper-dim">Everyone plays from their own device. Needs internet. The free server can take up to a minute to wake the first time.</p>
            <LinkButton to="/create?mode=online" className="mt-4">Create a room</LinkButton>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border-2 border-dashed border-line p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold">Got a code from a friend?</h3>
            <p className="text-paper-dim">Type it in and you are at the table.</p>
          </div>
          <LinkButton to="/join" variant="secondary" className="min-h-[52px] border-2 border-paper px-8 text-lg">Join with a code</LinkButton>
        </div>
      </section>
    </div>
  );
}

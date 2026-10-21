import { useMemo } from 'react';
import { KeyRound, Smartphone, Wifi } from 'lucide-react';
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
    <div className="space-y-12 lg:space-y-16">
      <section aria-labelledby="tonight" className="grid items-end gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        <div>
          <h1 id="tonight" aria-label="What are we playing tonight?" className="font-display text-[clamp(3.25rem,15.5vw,5rem)] font-extrabold leading-[0.9] tracking-[-0.045em] text-balance lg:text-[clamp(4.5rem,7.4vw,6.75rem)]">
            {'What are we playing tonight?'.split(' ').map((w, i) => <span key={i} className="hero-word mr-[0.2em]" style={{ animationDelay: `${60 + i * 80}ms` }}>{w}</span>)}
          </h1>
          <p className="hero-sub lede mt-4 sm:mt-5">Pick a game, then pick how to play. No account needed.</p>
          <div className="hero-sub mt-6 hidden gap-3 lg:flex">
            <LinkButton to="/create" className="btn-lg">Create a room</LinkButton>
            <LinkButton to="/join" variant="secondary" className="btn-lg"><KeyRound size={20} aria-hidden="true" /> Join with a code</LinkButton>
          </div>
        </div>
        <HeroFan />
      </section>

      {online.session && (
        <section aria-label="Your room" className="hint flex flex-wrap items-center justify-between gap-3 !p-4">
          <h2 className="font-display text-xl font-bold">You are in room {online.session.code}</h2>
          <LinkButton to={`/room/${online.session.code}`}>Return to the room</LinkButton>
        </section>
      )}

      <div className="space-y-6">
        <GroupPicker value={group} onChange={setGroup} status={status} />
        <GameCarousel games={slides} fitOf={fitOf} />
      </div>

      <section aria-labelledby="how">
        <h2 id="how" className="section-title mb-4 !text-[1.75rem]">How do you want to play?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="panel flex flex-col p-6">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card-green text-ink-950 shadow-[0_4px_0_rgb(0_0_0/0.25)]"><Smartphone size={26} aria-hidden="true" /></span>
            <h3 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-[-0.025em]">Play on this device</h3>
            <p className="mt-2 flex-1 text-paper-dim">Pass one device around the table, or add bots. Works without internet once the page has loaded.</p>
            <LinkButton to="/create" className="mt-5 w-full sm:w-auto sm:self-start">Start here</LinkButton>
          </div>
          <div className="panel flex flex-col p-6">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-card-blue text-ink-950 shadow-[0_4px_0_rgb(0_0_0/0.25)]"><Wifi size={26} aria-hidden="true" /></span>
            <h3 className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-[-0.025em]">Play online with a room code</h3>
            <p className="mt-2 flex-1 text-paper-dim">Everyone plays from their own device. Needs internet. The free server can take up to a minute to wake the first time.</p>
            <LinkButton to="/create?mode=online" className="mt-5 w-full sm:w-auto sm:self-start">Create a room</LinkButton>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 rounded-[24px] border-2 border-dashed border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h3 className="font-display text-2xl font-extrabold leading-tight tracking-[-0.025em]">Got a code from a friend?</h3>
            <p className="mt-1 text-paper-dim">Type it in and you are at the table.</p>
          </div>
          <LinkButton to="/join" variant="secondary" className="btn-lg w-full sm:w-auto">Join with a code</LinkButton>
        </div>
      </section>
    </div>
  );
}

/** The one big moment on the page: five cards deal themselves into a fan, once. Decorative. */
function HeroFan() {
  const cards: { c: 'red' | 'yellow' | 'green' | 'blue' | 'wild'; l: string; r: number }[] = [
    { c: 'green', l: '5', r: -26 }, { c: 'red', l: '7', r: -13 }, { c: 'wild', l: 'Wild', r: 0 }, { c: 'yellow', l: '+2', r: 13 }, { c: 'blue', l: '3', r: 26 },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto hidden h-[13.5rem] w-full max-w-[22rem] pb-5 sm:block sm:h-[18.5rem] sm:max-w-[26rem] lg:h-[21rem] lg:max-w-[28rem]">
      <div className="fan">
        {cards.map((k, i) => (
          <div key={i} className={`fan-card pcard ${k.c === 'wild' ? 'pcard-wild' : `pcard-${k.c}`}`}
            style={{ '--r': `${k.r}deg`, '--i': i, height: '100%', aspectRatio: '5 / 7', zIndex: i === 2 ? 3 : i < 2 ? i : 5 - i } as React.CSSProperties}>
            <div className="pcard-face"><span className="pcard-corner tl" style={{ fontSize: '1.25rem' }}>{k.c === 'wild' ? '' : k.l}</span><span className="pcard-mid" style={{ fontSize: k.c === 'wild' ? 'clamp(1.1rem,3.4vw,1.6rem)' : 'clamp(3rem,9vw,5.5rem)' }}>{k.l}</span><span className="pcard-corner br" style={{ fontSize: '1.25rem' }}>{k.c === 'wild' ? '' : k.l}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

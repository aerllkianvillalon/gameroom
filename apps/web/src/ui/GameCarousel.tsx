import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { MODE_LABELS, type GameMeta } from '@party/game-registry';
import { GameIcon, StatusBadge, playersLabel } from './GameBits';
import type { Fit } from './GameCard';

function Slide({ game: g, fit, active, index, count, clone }: { game: GameMeta; fit: Fit; active: boolean; index: number; count: number; clone: boolean }) {
  const soon = g.status !== 'playable';
  // Art follows the pointer a little: sets --px / --py (-1 to 1) on the art element, no re-render.
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--px', String(((e.clientX - r.left) / r.width) * 2 - 1));
    e.currentTarget.style.setProperty('--py', String(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const untilt = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.style.setProperty('--px', '0'); e.currentTarget.style.setProperty('--py', '0'); };
  return (
    <li
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}: ${g.title}`}
      aria-hidden={clone || undefined}
      data-active={active}
      className="carousel-slide w-[78%] shrink-0 snap-center sm:w-[26rem] lg:w-[32rem]"
    >
      <Link
        to={`/games/${g.id}`}
        tabIndex={clone ? -1 : undefined}
        data-fit={fit}
        className="group block h-full overflow-hidden rounded-[1.75rem] border-2 bg-ink-800"
        style={{ borderColor: active && !soon ? g.accent : 'rgb(var(--line))', borderStyle: soon ? 'dashed' : 'solid' }}
      >
        <div
          onPointerMove={tilt}
          onPointerLeave={untilt}
          className="relative flex h-44 items-center justify-center overflow-hidden sm:h-60"
          style={{ background: `linear-gradient(140deg, ${g.accent}, ${g.accent}99)`, filter: soon ? 'saturate(0.45)' : undefined }}
          aria-hidden="true"
        >
          <span className="par par-3 absolute -bottom-10 -right-6 rotate-12 text-white/15"><GameIcon id={g.id} size={220} /></span>
          <span className="par par-2 absolute"><span className="carousel-art-card a block h-28 w-20 rounded-2xl border-2 border-white/40 bg-white/20 sm:h-40 sm:w-28" /></span>
          <span className="par par-3 absolute"><span className="carousel-art-card b block h-28 w-20 rounded-2xl border-2 border-black/20 bg-black/15 sm:h-40 sm:w-28" /></span>
          <span className="par par-1 relative"><span className="art-tile block -rotate-6 rounded-3xl bg-ink-900/90 p-4 text-paper shadow-xl sm:p-5"><GameIcon id={g.id} size={52} /></span></span>
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-2xl font-bold leading-tight sm:text-3xl">{g.title}</h2>
            {soon && <StatusBadge status={g.status} />}
          </div>
          <p className="mt-1 text-base text-paper-dim sm:text-lg">{g.tagline}</p>
          <p className="mt-3 font-semibold sm:mt-4">{playersLabel(g.minPlayers, g.maxPlayers)}</p>
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Ways to play">
            {g.modes.filter((m) => m !== 'lan').map((m) => <li key={m} className="rounded-full border border-line px-2.5 py-0.5 text-sm text-paper-dim">{MODE_LABELS[m]}</li>)}
          </ul>
          {fit === 'fit' && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-card-green"><Check size={16} aria-hidden="true" /> Works for your group</p>}
          {fit === 'nofit' && <p className="mt-3 text-sm font-semibold text-paper-dim">Not made for this group size</p>}
          <span className={`mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-xl px-6 font-semibold sm:mt-5 ${soon ? 'border border-line text-paper' : 'bg-paper text-ink-900'}`}>
            {soon ? 'See what is planned' : 'Play'} <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </li>
  );
}

const arrow = 'inline-flex h-12 w-12 shrink-0 items-center sm:h-14 sm:w-14 justify-center rounded-full border-2 border-line bg-ink-800 transition-colors hover:bg-ink-700 active:bg-ink-700';

/**
 * An endless slideshow of games. The list is drawn three times and the view quietly jumps back to the
 * middle copy once scrolling settles, so you can keep going either way. Scroll-snap handles swiping.
 * The accent of the game in the middle tints the page background (--glow).
 */
export function GameCarousel({ games, fitOf }: { games: readonly GameMeta[]; fitOf: (g: GameMeta) => Fit }) {
  const track = useRef<HTMLUListElement>(null);
  const n = games.length;
  const loop = n > 1;
  const copies = loop ? 3 : 1;
  const [pos, setPos] = useState(loop ? n : 0);
  const ids = games.map((g) => g.id).join(',');

  const nearest = useCallback(() => {
    const el = track.current;
    if (!el) return 0;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0, dist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const s = c as HTMLElement;
      const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }, []);

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'full' || document.documentElement.dataset.motion === 'reduce';

  const scrollToIndex = useCallback((i: number, smooth: boolean) => {
    const el = track.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({ left: slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2, behavior: smooth && !reduced() ? 'smooth' : 'auto' });
  }, []);

  // New list (e.g. a different group size): start on the first game of the middle copy.
  useLayoutEffect(() => {
    const start = loop ? n : 0;
    scrollToIndex(start, false);
    setPos(start);
  }, [ids, loop, n, scrollToIndex]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0, settle = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setPos(nearest()));
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        // Scrolling stopped. If we are in an outer copy, jump to the identical slide in the middle copy.
        if (!loop) return;
        const p = nearest();
        if (p >= n && p < 2 * n) return;
        const target = (p % n) + n;
        const a = el.children[p] as HTMLElement, b = el.children[target] as HTMLElement;
        el.scrollLeft += b.offsetLeft - a.offsetLeft;
        setPos(target);
      }, 140);
    };
    const onResize = () => scrollToIndex(nearest(), false);
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(settle); el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); };
  }, [loop, n, nearest, scrollToIndex]);

  const total = copies * n;
  const goTo = (i: number) => scrollToIndex(Math.max(0, Math.min(total - 1, i)), true);
  const active = n ? ((pos % n) + n) % n : 0;
  const goToGame = (g: number) => {
    // The copy of that game closest to where we are now.
    const best = [g, g + n, g + 2 * n].filter((c) => c < total).sort((a, b) => Math.abs(a - pos) - Math.abs(b - pos))[0] ?? g;
    goTo(best);
  };

  const accent = games[active]?.accent;
  useEffect(() => { if (accent) document.documentElement.style.setProperty('--glow', accent); }, [accent]);
  useEffect(() => () => { document.documentElement.style.removeProperty('--glow'); }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(pos + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(pos - 1); }
  };

  if (n === 0) return null;
  const items = Array.from({ length: copies }, (_, c) => games.map((g, i) => ({ g, i, c }))).flat();
  return (
    <section aria-roledescription="carousel" aria-label="Games" className="-mx-4 sm:-mx-6 lg:-mx-10">
      <ul
        ref={track}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Swipe or use the arrow keys to browse games"
        className="carousel-track flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-[11%] py-4 sm:gap-6 sm:px-[calc(50%-13rem)] lg:px-[calc(50%-16rem)]"
      >
        {items.map(({ g, i, c }) => <Slide key={`${c}-${g.id}`} game={g} fit={fitOf(g)} active={c * n + i === pos} index={i} count={n} clone={loop && c !== 1} />)}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">{games[active]?.title}, {active + 1} of {n}</p>
      <div className="mt-3 flex items-center justify-center gap-4 px-4 sm:gap-8">
        <button type="button" className={arrow} onClick={() => goTo(pos - 1)} aria-label="Previous game"><ChevronLeft size={26} aria-hidden="true" /></button>
        <div className="flex min-w-0 items-center justify-center" role="group" aria-label="Choose a game">
          {games.map((g, i) => (
            <button key={g.id} type="button" onClick={() => goToGame(i)} aria-label={g.title} aria-current={i === active ? 'true' : undefined} className="group inline-flex h-11 w-[clamp(0.9rem,3.6vw,1.4rem)] items-center justify-center">
              <span className={`block h-2.5 rounded-full transition-all duration-300 ${i === active ? 'w-6' : 'w-2.5 bg-line group-hover:bg-paper-dim'}`} style={i === active ? { background: g.accent } : undefined} />
            </button>
          ))}
        </div>
        <button type="button" className={arrow} onClick={() => goTo(pos + 1)} aria-label="Next game"><ChevronRight size={26} aria-hidden="true" /></button>
      </div>
    </section>
  );
}

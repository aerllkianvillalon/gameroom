import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { MODE_LABELS, type GameMeta } from '@party/game-registry';
import { GameArt } from './GameArt';
import { GameIcon, StatusBadge, playersLabel } from './GameBits';

/** neutral: no group size picked. fit / nofit: a size is picked and the game does or does not work for it. */
export type Fit = 'neutral' | 'fit' | 'nofit';

/** Large, tappable card for a game you can play now. The whole card is one link to the game's page. */
export function GameCard({ game: g, fit = 'neutral', as: Heading = 'h3' }: { game: GameMeta; fit?: Fit; as?: 'h2' | 'h3' }) {
  return (
    <Link to={`/games/${g.id}`} data-fit={fit} className="game-card group block h-full overflow-hidden bg-ink-800">
      <GameArt id={g.id} accent={g.accent} className="game-art h-44 sm:h-52" />
      <div className="p-5">
        <Heading className="font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.03em]">{g.title}</Heading>
        <p className="mt-2 text-paper-dim">{g.tagline}</p>
        <p className="mt-4 font-semibold">{playersLabel(g.minPlayers, g.maxPlayers)}</p>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Ways to play">
          {g.modes.filter((m) => m !== 'lan').map((m) => <li key={m} className="pill">{MODE_LABELS[m]}</li>)}
        </ul>
        {fit === 'fit' && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-card-green"><Check size={16} strokeWidth={3} aria-hidden="true" /> Works for your group</p>}
        {fit === 'nofit' && <p className="mt-3 text-sm font-semibold text-paper-dim">Not made for this group size</p>}
        <span className="btn btn-primary mt-5 w-full sm:w-auto">Play <ArrowRight size={18} strokeWidth={3} aria-hidden="true" className="transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1" /></span>
      </div>
    </Link>
  );
}

/** Quieter, smaller card for games that are listed but not playable yet. */
export function SoonCard({ game: g }: { game: GameMeta }) {
  return (
    <Link to={`/games/${g.id}`} className="panel-flat group flex min-h-[64px] min-w-0 items-center gap-3 p-3 pr-4 transition-colors hover:bg-ink-700/80">
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-ink-950" style={{ background: g.accent }}><GameIcon id={g.id} size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[1.0625rem] font-bold leading-tight">{g.title}</span>
        <span className="block truncate text-sm text-paper-dim">{g.tagline}</span>
      </span>
      <StatusBadge status={g.status} />
    </Link>
  );
}

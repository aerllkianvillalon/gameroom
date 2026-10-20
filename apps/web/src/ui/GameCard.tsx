import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { MODE_LABELS, type GameMeta } from '@party/game-registry';
import { GameIcon, StatusBadge, playersLabel } from './GameBits';

/** neutral: no group size picked. fit / nofit: a size is picked and the game does or does not work for it. */
export type Fit = 'neutral' | 'fit' | 'nofit';

/** Large, tappable card for a game you can play now. The whole card is one link to the game's page. */
export function GameCard({ game: g, fit = 'neutral', as: Heading = 'h3' }: { game: GameMeta; fit?: Fit; as?: 'h2' | 'h3' }) {
  return (
    <Link to={`/games/${g.id}`} data-fit={fit} className="game-card group block h-full overflow-hidden border-2 border-line bg-ink-800">
      <div className="game-art relative flex h-28 items-center justify-center overflow-hidden sm:h-32" style={{ background: `linear-gradient(135deg, ${g.accent}, ${g.accent}aa)` }} aria-hidden="true">
        <span className="absolute -left-4 top-5 h-24 w-16 -rotate-12 rounded-xl bg-white/20" />
        <span className="absolute -right-3 top-2 h-24 w-16 rotate-12 rounded-xl bg-black/15" />
        <span className="relative -rotate-6 rounded-2xl bg-ink-900/85 p-4 text-paper shadow-lg"><GameIcon id={g.id} size={40} /></span>
      </div>
      <div className="p-5">
        <Heading className="text-2xl font-bold">{g.title}</Heading>
        <p className="mt-1 text-paper-dim">{g.tagline}</p>
        <p className="mt-3 font-semibold">{playersLabel(g.minPlayers, g.maxPlayers)}</p>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Ways to play">
          {g.modes.filter((m) => m !== 'lan').map((m) => <li key={m} className="rounded-full border border-line px-2.5 py-0.5 text-sm text-paper-dim">{MODE_LABELS[m]}</li>)}
        </ul>
        {fit === 'fit' && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-card-green"><Check size={16} aria-hidden="true" /> Works for your group</p>}
        {fit === 'nofit' && <p className="mt-3 text-sm font-semibold text-paper-dim">Not made for this group size</p>}
        <span className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-paper px-5 py-2.5 font-semibold text-ink-900">Play <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" /></span>
      </div>
    </Link>
  );
}

/** Quieter, smaller card for games that are listed but not playable yet. */
export function SoonCard({ game: g }: { game: GameMeta }) {
  return (
    <Link to={`/games/${g.id}`} className="flex min-h-[44px] items-center gap-3 rounded-xl border border-line bg-ink-800/60 p-3 hover:bg-ink-700" style={{ borderLeft: `5px solid ${g.accent}` }}>
      <span className="shrink-0 text-paper-dim"><GameIcon id={g.id} size={22} /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-semibold">{g.title}</span>
        <span className="block text-sm text-paper-dim">{g.tagline}</span>
      </span>
      <StatusBadge status={g.status} />
    </Link>
  );
}

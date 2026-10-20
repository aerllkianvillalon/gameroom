import { ArrowLeftRight, Ban } from 'lucide-react';
import type { Card, Color } from '@party/uno-engine';
import { cardName } from './messages';

export const SWATCH: Record<Color, string> = {
  red: 'bg-card-red text-paper', yellow: 'bg-card-yellow text-ink-950', green: 'bg-card-green text-ink-950', blue: 'bg-card-blue text-paper',
};
const INITIAL: Record<Color, string> = { red: 'R', yellow: 'Y', green: 'G', blue: 'B' };
const SIZE = { sm: 'h-24 w-16 text-3xl', md: 'h-32 w-[5.5rem] text-4xl', lg: 'h-40 w-28 text-5xl' };
const WILD_BG =
  'conic-gradient(from 45deg, rgb(var(--card-red)) 0 25%, rgb(var(--card-blue)) 0 50%, rgb(var(--card-green)) 0 75%, rgb(var(--card-yellow)) 0)';

function Glyph({ card }: { card: Card }) {
  switch (card.value) {
    case 'skip': return <Ban size={32} strokeWidth={3} aria-hidden="true" />;
    case 'reverse': return <ArrowLeftRight size={32} strokeWidth={3} aria-hidden="true" />;
    case 'draw2': return <>+2</>;
    case 'wild4': return <>+4</>;
    case 'wild': return <span className="text-base">Wild</span>;
    default: return <>{card.value}</>;
  }
}

interface Props {
  card: Card;
  size?: keyof typeof SIZE;
  playable?: boolean;
  onClick?: () => void;
}

/** Colour is never the only cue: each coloured card also carries its initial in the corner. */
export function UnoCard({ card, size = 'md', playable = false, onClick }: Props) {
  const wild = card.color === 'wild';
  const face = wild ? 'text-paper' : SWATCH[card.color as Color];
  const cls = `relative flex shrink-0 select-none items-center justify-center rounded-xl border-4 font-display font-bold shadow-md shadow-black/40 ${SIZE[size]} ${face} ${
    onClick ? (playable ? 'border-paper -translate-y-3' : 'border-paper/30 opacity-60') : 'border-paper'
  } ${onClick ? 'transition-transform' : ''}`;
  const inner = (
    <>
      {!wild && <span className="absolute left-1.5 top-0.5 text-xs">{INITIAL[card.color as Color]}</span>}
      <span className={wild ? 'rounded-lg bg-ink-950/80 px-2 py-1' : ''}><Glyph card={card} /></span>
    </>
  );
  const style = wild ? { background: WILD_BG } : undefined;
  if (!onClick) return <div role="img" aria-label={cardName(card)} className={cls} style={style}>{inner}</div>;
  return (
    <button type="button" onClick={onClick} aria-label={`${cardName(card)}${playable ? '' : ', cannot be played now'}`} className={cls} style={style}>
      {inner}
    </button>
  );
}

export function CardBack({ size = 'lg' }: { size?: keyof typeof SIZE }) {
  return (
    <div aria-hidden="true" className={`rounded-xl border-4 border-paper/70 bg-ink-700 shadow-md shadow-black/40 ${SIZE[size]}`}
      style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 8px, rgb(var(--line)) 8px 10px)' }} />
  );
}

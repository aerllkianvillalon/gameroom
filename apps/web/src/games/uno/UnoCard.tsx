import { ArrowLeftRight, Ban } from 'lucide-react';
import type { Card, Color } from '@party/uno-engine';
import { cardName } from './messages';

/** Used by the colour pickers and the "colour in play" dot. */
export const SWATCH: Record<Color, string> = {
  red: 'bg-card-red text-paper', yellow: 'bg-card-yellow text-ink-950', green: 'bg-card-green text-ink-950', blue: 'bg-card-blue text-paper',
};
const INITIAL: Record<Color, string> = { red: 'R', yellow: 'Y', green: 'G', blue: 'B' };
/** Card sizes. Fonts scale with the card so a card reads the same at every size. */
const SIZE = {
  sm: { box: 'h-24 w-[4.2rem]', mid: 'text-[2rem]', icon: 26 },
  md: { box: 'h-[8.5rem] w-[6rem]', mid: 'text-[2.75rem]', icon: 36 },
  lg: { box: 'h-[10.5rem] w-[7.5rem]', mid: 'text-[3.5rem]', icon: 46 },
};

function Glyph({ card, size }: { card: Card; size: number }) {
  switch (card.value) {
    case 'skip': return <Ban size={size} strokeWidth={3.2} aria-hidden="true" />;
    case 'reverse': return <ArrowLeftRight size={size} strokeWidth={3.2} aria-hidden="true" />;
    case 'draw2': return <>+2</>;
    case 'wild4': return <>+4</>;
    case 'wild': return <span className="text-[0.4em] tracking-normal">Wild</span>;
    default: return <>{card.value}</>;
  }
}
const corner = (card: Card): string => (card.value === 'draw2' ? '+2' : card.value === 'wild4' ? '+4' : card.value === 'wild' ? '' : card.value === 'skip' ? '⊘' : card.value === 'reverse' ? '⇄' : String(card.value));

interface Props {
  card: Card;
  size?: keyof typeof SIZE;
  playable?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Colour is never the only cue: each coloured card also carries its initial in the corner. */
export function UnoCard({ card, size = 'md', playable = false, onClick, className = '' }: Props) {
  const wild = card.color === 'wild';
  const z = SIZE[size];
  const cls = `pcard ${wild ? 'pcard-wild' : `pcard-${card.color}`} ${z.box} ${onClick ? `hand-card ${playable ? '' : 'cursor-not-allowed'}` : ''} ${className}`;
  const inner = (
    <span className="pcard-face">
      {!wild && <span className="pcard-corner tl">{corner(card)}</span>}
      {!wild && <span className="pcard-corner br">{corner(card)}</span>}
      <span className={`pcard-mid ${z.mid}`}><Glyph card={card} size={z.icon} /></span>
      {!wild && <span className="absolute bottom-1.5 left-1.5 z-[1] rounded-md bg-black/25 px-1 text-[0.65rem] font-bold leading-tight">{INITIAL[card.color as Color]}</span>}
    </span>
  );
  if (!onClick) return <div role="img" aria-label={cardName(card)} className={cls}>{inner}</div>;
  return (
    <button type="button" data-playable={playable} onClick={onClick} aria-label={`${cardName(card)}${playable ? '' : ', cannot be played now'}`} className={cls}>
      {inner}
    </button>
  );
}

export function CardBack({ size = 'lg', className = '' }: { size?: keyof typeof SIZE; className?: string }) {
  return (
    <div aria-hidden="true" className={`pcard pcard-back ${SIZE[size].box} ${className}`}><div className="pcard-face" /></div>
  );
}

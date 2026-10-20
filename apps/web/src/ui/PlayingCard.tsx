import type { CSSProperties } from 'react';

export type CardColor = 'red' | 'yellow' | 'green' | 'blue';
const FACE: Record<CardColor, string> = {
  red: 'bg-card-red text-paper',
  yellow: 'bg-card-yellow text-ink-950',
  green: 'bg-card-green text-ink-950',
  blue: 'bg-card-blue text-paper',
};

/** Decorative card face. The real table cards arrive with the UNO UI in Phase 2. */
export function PlayingCard({ color, label, style }: { color: CardColor; label: string; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" style={style} className={`relative h-44 w-[7.25rem] rounded-xl border-4 border-paper font-display shadow-lg shadow-black/40 ${FACE[color]}`}>
      <span className="absolute left-2 top-1 text-lg font-bold leading-none">{label}</span>
      <span className="absolute inset-0 flex items-center justify-center text-6xl font-bold">{label}</span>
      <span className="absolute bottom-1 right-2 rotate-180 text-lg font-bold leading-none">{label}</span>
    </div>
  );
}

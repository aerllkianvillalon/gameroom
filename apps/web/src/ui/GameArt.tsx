import type { CSSProperties, ReactNode } from 'react';
import { GameIcon } from './GameBits';

/** A small decorative card. Sizes come from the art's own height (cqh), so the art scales with its frame. */
function Mini({ color, label, style, wild }: { color?: 'red' | 'yellow' | 'green' | 'blue'; label: ReactNode; style?: CSSProperties; wild?: boolean }) {
  return (
    <div className={`pcard ${wild ? 'pcard-wild' : `pcard-${color}`} absolute`} style={{ height: '66cqh', aspectRatio: '5 / 7', borderRadius: '8cqh', padding: '2cqh', ...style }}>
      <div className="pcard-face" style={{ borderRadius: '7cqh' }}>
        <span className="pcard-corner tl" style={{ fontSize: '9cqh', left: '3cqh', top: '2.4cqh' }}>{wild ? '' : label}</span>
        <span className="pcard-mid" style={{ fontSize: '26cqh' }}>{label}</span>
      </div>
    </div>
  );
}

const PAWNS: { x: number; h: number; c: string }[] = [
  { x: 10, h: 34, c: 'rgb(var(--paper))' },
  { x: 29, h: 42, c: 'rgb(var(--card-blue))' },
  { x: 71, h: 40, c: 'rgb(var(--card-green))' },
  { x: 90, h: 32, c: 'rgb(var(--card-yellow))' },
];

/** Hand-built art for each game, drawn from the game's own pieces. */
export function GameArt({ id, accent, className = '', style }: { id: string; accent: string; className?: string; style?: CSSProperties }) {
  const base: CSSProperties = { background: `linear-gradient(150deg, ${accent}, color-mix(in srgb, ${accent} 62%, #0a0b1c))`, containerType: 'size', ...style };
  return (
    <div className={`art ${className}`} style={base} aria-hidden="true">
      {id === 'uno' ? (
        <div className="absolute inset-0">
          <div className="par par-3 absolute inset-0"><Mini color="blue" label="7" style={{ left: '50%', top: '17%', translate: '-100% 0', rotate: '-15deg' }} /></div>
          <div className="par par-2 absolute inset-0"><Mini color="yellow" label="+2" style={{ left: '50%', top: '17%', translate: '0% 0', rotate: '13deg' }} /></div>
          <div className="par par-1 absolute inset-0"><Mini color="red" label="9" style={{ left: '50%', top: '12%', translate: '-50% 0', rotate: '-2deg' }} /></div>
        </div>
      ) : id === 'impostor' ? (
        <div className="absolute inset-0">
          {/* Spotlight on the suspect, plus a few drifting question marks */}
          <span className="absolute left-1/2 top-0 h-full" style={{ width: '78cqh', translate: '-50% 0', clipPath: 'polygon(38% 0, 62% 0, 100% 100%, 0 100%)', background: 'linear-gradient(rgb(255 255 255 / .42), rgb(255 255 255 / .05))' }} />
          <div className="par par-3 absolute inset-0">
            {[{ l: '9%', t: '14%', s: 17, r: -14 }, { l: '88%', t: '24%', s: 22, r: 12 }, { l: '73%', t: '8%', s: 13, r: 8 }].map((q, i) => (
              <span key={i} className="absolute font-display font-extrabold leading-none text-white/25" style={{ left: q.l, top: q.t, fontSize: `${q.s}cqh`, rotate: `${q.r}deg` }}>?</span>
            ))}
          </div>
          <div className="par par-2 absolute inset-0">
            {PAWNS.map((p, i) => (
              <span key={i} className="art-pawn" style={{ left: `${p.x}%`, width: '19cqh', height: `${p.h}cqh`, background: p.c, translate: '-50% 0', opacity: 0.92 }} />
            ))}
          </div>
          <div className="par par-1 absolute inset-0">
            <span className="absolute left-1/2 rounded-[50%] bg-black/30" style={{ bottom: '-3cqh', width: '40cqh', height: '8cqh', translate: '-50% 0', filter: 'blur(1.5cqh)' }} />
            <span className="art-pawn" style={{ left: '50%', width: '27cqh', height: '56cqh', translate: '-50% 0', background: 'rgb(var(--ink-950))', outline: '2cqh dashed rgb(var(--paper) / .8)', outlineOffset: '1.6cqh', borderRadius: '9999px 9999px 4cqh 4cqh' }}>
              <span className="absolute left-1/2 font-display font-extrabold leading-none text-paper" style={{ top: '-10.4cqh', translate: '-50% -50%', fontSize: '14cqh' }}>?</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0">
          <span className="par par-3 absolute -right-[8cqh] -bottom-[14cqh] text-white/20" style={{ rotate: '12deg' }}><GameIcon id={id} size={200} /></span>
          <span className="carousel-art-card a absolute left-1/2 top-[14%] block rounded-[8cqh] border-2 border-white/40 bg-white/15" style={{ height: '66cqh', aspectRatio: '5 / 7', translate: '-120% 0', rotate: '-10deg' }} />
          <span className="carousel-art-card b absolute left-1/2 top-[14%] block rounded-[8cqh] border-2 border-black/20 bg-black/15" style={{ height: '66cqh', aspectRatio: '5 / 7', translate: '20% 0', rotate: '9deg' }} />
          <span className="par par-1 absolute inset-0 flex items-center justify-center">
            <span className="art-tile block rounded-[10cqh] bg-ink-950/90 text-paper shadow-xl" style={{ padding: '10cqh', boxShadow: '0 1.6cqh 0 rgb(0 0 0 / .3)' }}><GameIcon id={id} size={58} /></span>
          </span>
        </div>
      )}
    </div>
  );
}
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
      ) : id === 'trivia' ? (
        <div className="absolute inset-0">
          {/* A question card with four answers, one lit green, and a score chip */}
          <span className="par par-3 absolute font-display font-extrabold leading-none text-white/25" style={{ left: '8%', top: '10%', fontSize: '30cqh', rotate: '-12deg' }}>?</span>
          <div className="par par-1 absolute inset-0">
            <div className="absolute left-1/2 top-[14%] flex flex-col" style={{ width: '112cqh', translate: '-50% 0', rotate: '-3deg', background: 'rgb(var(--ink-950))', borderRadius: '9cqh', padding: '7cqh', gap: '4.5cqh', boxShadow: '0 2cqh 0 rgb(0 0 0 / .3)' }}>
              <span className="block" style={{ height: '5cqh', width: '78%', borderRadius: '9999px', background: 'rgb(var(--paper))' }} />
              <span className="block" style={{ height: '5cqh', width: '46%', borderRadius: '9999px', background: 'rgb(var(--paper) / .55)' }} />
              <div className="grid grid-cols-2" style={{ gap: '3cqh', marginTop: '2cqh' }}>
                {['A', 'B', 'C', 'D'].map((l, i) => (
                  <span key={l} className={`flex items-center font-display font-extrabold`} style={{ gap: '2.5cqh', height: '13cqh', borderRadius: '5cqh', padding: '0 3.5cqh', fontSize: '7cqh', background: i === 2 ? 'rgb(var(--card-green))' : 'rgb(var(--paper) / .14)', color: i === 2 ? 'rgb(var(--ink-950))' : 'rgb(var(--paper))' }}>
                    {l}<span className="block" style={{ height: '2.6cqh', flex: 1, borderRadius: '9999px', background: i === 2 ? 'rgb(var(--ink-950) / .45)' : 'rgb(var(--paper) / .35)' }} />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="par par-1 absolute inset-0">
            <span className="absolute font-display font-extrabold text-ink-950" style={{ right: '9%', top: '12%', fontSize: '11cqh', rotate: '9deg', background: 'rgb(var(--paper))', padding: '2cqh 5cqh', borderRadius: '9999px', boxShadow: '0 1.4cqh 0 rgb(0 0 0 / .25)' }}>+100</span>
          </div>
        </div>
      ) : id === 'wordbomb' ? (
        <div className="absolute inset-0">
          {/* A lit bomb, with letter tiles scattered around it */}
          <div className="par par-3 absolute inset-0">
            {[{ l: '10%', t: '16%', c: 'T', r: -14 }, { l: '86%', t: '22%', c: 'R', r: 12 }, { l: '78%', t: '66%', c: 'E', r: -8 }, { l: '14%', t: '64%', c: 'A', r: 10 }].map((x) => (
              <span key={x.c} className="absolute flex items-center justify-center font-display font-extrabold text-ink-950" style={{ left: x.l, top: x.t, width: '19cqh', height: '19cqh', borderRadius: '4cqh', rotate: `${x.r}deg`, fontSize: '12cqh', background: 'rgb(var(--paper) / .85)', boxShadow: '0 1.2cqh 0 rgb(0 0 0 / .25)' }}>{x.c}</span>
            ))}
          </div>
          <div className="par par-1 absolute inset-0">
            <span className="absolute left-1/2" style={{ top: '6%', width: '3.6cqh', height: '17cqh', translate: '14cqh 0', rotate: '28deg', transformOrigin: 'bottom', background: 'rgb(var(--paper) / .9)', borderRadius: '9999px' }} />
            <span className="absolute left-1/2" style={{ top: '1%', width: '11cqh', height: '11cqh', translate: '17.5cqh 0', rotate: '45deg', background: 'rgb(var(--card-yellow))', clipPath: 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)' }} />
            <span className="absolute left-1/2 flex items-center justify-center font-display font-extrabold uppercase text-paper" style={{ top: '18%', width: '66cqh', height: '66cqh', translate: '-50% 0', borderRadius: '50%', fontSize: '19cqh', letterSpacing: '0.02em', background: 'radial-gradient(circle at 34% 30%, rgb(255 255 255 / .22), transparent 38%), rgb(var(--ink-950))', boxShadow: '0 2cqh 0 rgb(0 0 0 / .3)' }}>ING</span>
          </div>
        </div>
      ) : id === 'werewolf' ? (
        <div className="absolute inset-0">
          {/* Night sky: moon, stars and a dark ridge */}
          <div className="par par-3 absolute inset-0">
            {[{ l: '12%', t: '14%', s: 3 }, { l: '28%', t: '30%', s: 2 }, { l: '40%', t: '9%', s: 2.4 }, { l: '88%', t: '48%', s: 2.6 }, { l: '70%', t: '12%', s: 2 }, { l: '6%', t: '46%', s: 2.2 }].map((d, i) => (
              <span key={i} className="absolute rounded-full" style={{ left: d.l, top: d.t, width: `${d.s}cqh`, height: `${d.s}cqh`, background: 'rgb(255 255 255 / .8)' }} />
            ))}
          </div>
          <div className="par par-2 absolute inset-0">
            <span className="absolute rounded-full" style={{ left: '56%', top: '9%', width: '46cqh', height: '46cqh', background: 'rgb(var(--paper))', boxShadow: '0 0 0 4cqh rgb(255 255 255 / .12), 0 0 0 9cqh rgb(255 255 255 / .07)' }}>
              <span className="absolute rounded-full" style={{ left: '14%', top: '58%', width: '11cqh', height: '11cqh', background: 'rgb(0 0 0 / .08)' }} />
              <span className="absolute rounded-full" style={{ left: '52%', top: '22%', width: '8cqh', height: '8cqh', background: 'rgb(0 0 0 / .08)' }} />
            </span>
          </div>
          <div className="par par-1 absolute inset-0">
            <span className="absolute inset-x-0 bottom-0" style={{ height: '46%', background: 'rgb(var(--ink-950))', clipPath: 'polygon(0 55%, 14% 30%, 30% 52%, 46% 20%, 62% 48%, 80% 26%, 100% 50%, 100% 100%, 0 100%)' }} />
          </div>
        </div>
      ) : id === 'wyr' ? (
        <div className="absolute inset-0">
          {/* Two choices facing off: blue A against red B, with a vote bubble */}
          <span className="par par-3 absolute font-display font-extrabold leading-none text-white/25" style={{ left: '6%', top: '8%', fontSize: '26cqh', rotate: '-10deg' }}>?</span>
          <div className="par par-1 absolute inset-0">
            <div className="absolute flex items-center font-display font-extrabold" style={{ left: '7%', top: '17%', width: '78cqh', height: '30cqh', borderRadius: '8cqh', padding: '0 6cqh', gap: '4cqh', fontSize: '15cqh', rotate: '-5deg', background: 'rgb(var(--card-blue))', color: 'rgb(var(--ink-950))', boxShadow: '0 2cqh 0 rgb(0 0 0 / .3)' }}>
              A<span className="block" style={{ height: '4cqh', flex: 1, borderRadius: '9999px', background: 'rgb(var(--ink-950) / .4)' }} />
            </div>
            <div className="absolute flex items-center font-display font-extrabold" style={{ right: '7%', top: '49%', width: '78cqh', height: '30cqh', borderRadius: '8cqh', padding: '0 6cqh', gap: '4cqh', fontSize: '15cqh', rotate: '4deg', background: 'rgb(var(--card-red))', color: 'rgb(var(--ink-950))', boxShadow: '0 2cqh 0 rgb(0 0 0 / .3)' }}>
              B<span className="block" style={{ height: '4cqh', flex: 1, borderRadius: '9999px', background: 'rgb(var(--ink-950) / .4)' }} />
            </div>
            <span className="absolute left-1/2 top-1/2 flex items-center justify-center font-display font-extrabold text-ink-950" style={{ width: '24cqh', height: '24cqh', translate: '-50% -50%', borderRadius: '50%', fontSize: '9cqh', background: 'rgb(var(--paper))', boxShadow: '0 1.4cqh 0 rgb(0 0 0 / .3)' }}>OR</span>
          </div>
        </div>
      ) : id === 'memory' ? (
        <div className="absolute inset-0">
          {/* A grid of cards: two flipped to a matching pair, the rest face down */}
          <div className="par par-1 absolute inset-0">
            <div className="absolute left-1/2 top-[11%] grid grid-cols-4" style={{ width: '120cqh', translate: '-50% 0', gap: '4cqh', rotate: '-3deg' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const up = i === 1 || i === 6;
                return (
                  <span key={i} className="flex items-center justify-center font-display font-extrabold" style={{ aspectRatio: '1', borderRadius: '5cqh', fontSize: up ? '14cqh' : '9cqh', background: up ? 'rgb(var(--paper))' : 'rgb(var(--ink-950))', color: up ? 'rgb(var(--ink-950))' : 'rgb(var(--paper) / .35)', boxShadow: '0 1.4cqh 0 rgb(0 0 0 / .3)', outline: up ? '1.2cqh solid rgb(var(--card-yellow))' : 'none' }}>
                    {up ? '★' : '?'}
                  </span>
                );
              })}
            </div>
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
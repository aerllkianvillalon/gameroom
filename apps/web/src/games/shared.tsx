import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

export const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

/** Title bar used by the online-only game tables. */
export function GameHeader({ title, onLeave, extra }: { title: string; onLeave: () => void; extra?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-[1.625rem] font-extrabold leading-none tracking-[-0.03em]">{title}</h1>
      <div className="flex flex-wrap items-center gap-2">{extra}<Button variant="ghost" onClick={onLeave}>Leave game</Button></div>
    </header>
  );
}

export function BackToLobby({ isHost, onBack }: { isHost: boolean; onBack: () => void }) {
  return isHost ? <Button autoFocus onClick={onBack}>Back to lobby</Button> : <p className="text-paper-dim">Waiting for the host to start another round.</p>;
}

/**
 * Countdown bar. Turns red and pulses (unless the player prefers reduced motion) in the last 5 seconds.
 * The number itself is shown by the caller, so this is purely visual and hidden from screen readers.
 */
export function TimerBar({ secs, total }: { secs: number | null; total: number }) {
  if (secs === null || total <= 0) return null;
  const pct = Math.max(0, Math.min(100, (secs / total) * 100));
  const urgent = secs <= 5;
  return (
    <div aria-hidden="true" className="h-2 w-full overflow-hidden rounded-full bg-paper/10">
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${urgent ? 'bg-card-red motion-safe:animate-pulse' : 'bg-card-yellow'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

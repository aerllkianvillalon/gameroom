import { useEffect, useRef } from 'react';
import { motionReduced } from '../effects/motion';

/**
 * Page background: one pool of light over the table. It takes the colour of the game on screen (--glow), and leans a
 * little towards your cursor or last tap. Two static layers (dots, grain) give it texture.
 * Decorative only: behind everything, never blocks input, and completely still when motion is reduced.
 */
export function Ambient() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || motionReduced()) return;
    let raf = 0, nx = 0, ny = 0;
    const apply = () => { raf = 0; el.style.setProperty('--lx', nx.toFixed(3)); el.style.setProperty('--ly', ny.toFixed(3)); };
    const aim = (e: PointerEvent) => {
      nx = (e.clientX / window.innerWidth) * 2 - 1;
      ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', aim, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', aim); };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="ambient-pool" />
      <div className="ambient-pool-2" />
      <div className="ambient-dots" />
      <div className="ambient-vignette absolute inset-0" />
      <div className="ambient-grain absolute inset-0" />
    </div>
  );
}

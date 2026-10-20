import { useEffect, useRef } from 'react';
import { motionReduced } from '../effects/motion';

const BLOBS = ['a', 'b', 'c', 'd', 'glow'] as const;

/**
 * Page background: a slow aurora. Large soft colour clouds (red, yellow, green, blue) drift over the dark page,
 * and one more cloud takes the colour of the game on screen (--glow) so it is the brightest.
 * The clouds lean a little towards your cursor or your last tap. Decorative only: behind everything, never blocks
 * input, and completely still when motion is reduced.
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
    window.addEventListener('pointerdown', aim, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', aim); window.removeEventListener('pointerdown', aim); };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="ambient pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {BLOBS.map((b) => (
        <span key={b} className={`aurora aurora-${b}`}><span /></span>
      ))}
      <div className="ambient-vignette absolute inset-0" />
      <div className="ambient-grain absolute inset-0" />
    </div>
  );
}

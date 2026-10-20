/** True when the player asked for less motion (Settings), or their device did and Settings does not override it. */
export function motionReduced(): boolean {
  if (typeof document === 'undefined') return true;
  const m = document.documentElement.dataset.motion;
  return m === 'reduce' || (m !== 'full' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

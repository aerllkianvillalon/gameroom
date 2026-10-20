import { useEffect, useState } from 'react';

/** Whole seconds until `deadline` (epoch ms), or null when there is no deadline. */
export function useSecondsLeft(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [deadline]);
  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000));
}

import { useEffect, useRef } from 'react';
import { fireConfetti } from '../effects/confetti';

/** Fires confetti once when `win` turns true. Does nothing if it is already true on first render (e.g. after a reload). */
export function useCelebrate(win: boolean) {
  const before = useRef(win);
  useEffect(() => {
    if (win && !before.current) fireConfetti();
    before.current = win;
  }, [win]);
}

import { useEffect } from 'react';
import { usePrefs } from '../store/prefs';

export function useApplyPrefs() {
  const { motion, highContrast, textSize } = usePrefs();
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = motion;
    root.dataset.contrast = highContrast ? 'high' : 'normal';
    root.dataset.text = textSize;
  }, [motion, highContrast, textSize]);
}

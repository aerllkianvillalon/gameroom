import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AvatarId } from '@party/game-engine';

export interface Prefs {
  playerName: string;
  avatar: AvatarId;
  motion: 'system' | 'reduce' | 'full';
  highContrast: boolean;
  textSize: 'normal' | 'large';
  seenImpostorTutorial: boolean;
  sound: boolean;
}
interface PrefsStore extends Prefs {
  update: (patch: Partial<Prefs>) => void;
}

/** Simple preferences live in localStorage. Word packs will use IndexedDB in Phase 3. */
export const usePrefs = create<PrefsStore>()(
  persist(
    (set) => ({
      playerName: '',
      avatar: 'cat',
      motion: 'system',
      highContrast: false,
      textSize: 'normal',
      seenImpostorTutorial: false,
      sound: false,
      update: (patch) => set(patch),
    }),
    { name: 'gameroom.prefs.v1' },
  ),
);

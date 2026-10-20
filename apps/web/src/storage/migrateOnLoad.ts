import { migrateLegacyKeys } from './migrate';

/**
 * Imported first in main.tsx. ES modules run in import order, so this finishes before the
 * preferences store (which reads "gameroom.prefs.v1" when it is created) is evaluated.
 */
try { migrateLegacyKeys(window.localStorage); } catch { /* storage blocked */ }

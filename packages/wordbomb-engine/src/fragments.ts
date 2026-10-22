import type { Difficulty } from './types';

/** Letter groups that appear in plenty of common words, grouped by how hard they are to match. */
export const FRAGMENTS: Record<Difficulty, readonly string[]> = {
  easy: ['ar', 'er', 'st', 'th', 'ch', 'in', 'on', 're', 'an', 'or', 'en', 'al', 'at', 'ou', 'ea'],
  medium: ['ing', 'ent', 'ter', 'ove', 'all', 'ate', 'est', 'ous', 'man', 'ion', 'ard', 'ack', 'ill', 'ver', 'out', 'her', 'ton', 'ble'],
  hard: ['ght', 'tch', 'mpl', 'oug', 'nds', 'rch', 'ldr', 'ssi', 'ndl', 'ugh', 'wor', 'kin', 'xpe', 'ffe', 'ppo'],
};

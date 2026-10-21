const KEY = 'gameroom.recentWords.v1';

/** Words used in recent games, so rematches do not repeat them. Plain preference data, so localStorage. */
export function getRecentWords(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((w): w is string => typeof w === 'string') : [];
  } catch {
    return [];
  }
}
export function setRecentWords(words: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(words)); } catch { /* storage unavailable: recents just reset */ }
}

const ROOMS_KEY = 'gameroom.recentRooms.v1';
export interface RecentRoom { code: string; gameId: string; at: number }
const MAX_ROOMS = 5;
/** Rooms live in server memory and expire, so a recent room is a shortcut, not a promise it still exists. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function getRecentRooms(now = Date.now()): RecentRoom[] {
  try {
    const raw = JSON.parse(localStorage.getItem(ROOMS_KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((r): r is RecentRoom => !!r && typeof r.code === 'string' && typeof r.gameId === 'string' && typeof r.at === 'number')
      .filter((r) => now - r.at < MAX_AGE_MS)
      .slice(0, MAX_ROOMS);
  } catch {
    return [];
  }
}

export function addRecentRoom(room: { code: string; gameId: string }, now = Date.now()) {
  const next = [{ ...room, at: now }, ...getRecentRooms(now).filter((r) => r.code !== room.code)].slice(0, MAX_ROOMS);
  try { localStorage.setItem(ROOMS_KEY, JSON.stringify(next)); } catch { /* storage unavailable: no shortcuts */ }
}

export function removeRecentRoom(code: string, now = Date.now()) {
  const next = getRecentRooms(now).filter((r) => r.code !== code);
  try { localStorage.setItem(ROOMS_KEY, JSON.stringify(next)); } catch { /* storage unavailable: nothing to remove */ }
}

export function clearRecentRooms() {
  try { localStorage.removeItem(ROOMS_KEY); } catch { /* storage unavailable: nothing to clear */ }
}

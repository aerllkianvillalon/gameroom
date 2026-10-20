import { io } from 'socket.io-client';
import { OnlineClient, type SessionStore, type SocketLike } from './online';
import type { Joined } from '@party/protocol/types';

const KEY = 'gameroom.session.v1';

/** The seat token lives in localStorage so a reload or a dropped tab can rejoin the same seat. */
const localSessionStore: SessionStore = {
  get() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      return raw && typeof raw.code === 'string' && typeof raw.playerId === 'string' && typeof raw.token === 'string' ? (raw as Joined) : null;
    } catch { return null; }
  },
  set(j) {
    try { if (j) localStorage.setItem(KEY, JSON.stringify(j)); else localStorage.removeItem(KEY); } catch { /* storage unavailable: no rejoin after reload */ }
  },
};

export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let client: OnlineClient | null = null;
/** Created on first use. The socket does not connect until something calls connect(). */
export function getOnlineClient(): OnlineClient {
  if (!client) {
    const socket = io(SERVER_URL, { autoConnect: false, transports: ['websocket', 'polling'], reconnectionDelayMax: 5000 });
    client = new OnlineClient({ socket: socket as unknown as SocketLike, store: localSessionStore });
  }
  return client;
}

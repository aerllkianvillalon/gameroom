import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
};
/** Browser network state only. It says nothing about whether a game server is reachable. */
export const useBrowserOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

import { useSyncExternalStore } from 'react';
import { getOnlineClient } from '../transport/online-instance';

export const useOnline = () => {
  const c = getOnlineClient();
  return useSyncExternalStore(c.subscribe, c.getState);
};

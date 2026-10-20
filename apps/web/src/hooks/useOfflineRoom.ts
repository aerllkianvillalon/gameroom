import { useSyncExternalStore } from 'react';
import { offlineAdapter } from '../transport/offline-adapter';

export const useOfflineRoom = () => useSyncExternalStore(offlineAdapter.subscribe, offlineAdapter.getRoom);

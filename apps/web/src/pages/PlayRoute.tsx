import { ImpostorTable } from '../games/impostor/ImpostorTable';
import { UnoTable } from '../games/uno/UnoTable';
import { useOfflineRoom } from '../hooks/useOfflineRoom';

/** Picks the table for whichever game the open room is playing. */
export function PlayRoute() {
  const room = useOfflineRoom();
  return room?.gameId === 'impostor' ? <ImpostorTable /> : <UnoTable />;
}

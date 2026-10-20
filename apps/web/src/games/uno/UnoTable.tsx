import { useState, useSyncExternalStore } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PlayerId } from '@party/game-engine';
import { unoEngine, type UnoAction } from '@party/uno-engine';
import { Button, LinkButton } from '../../ui/Button';
import { useOfflineRoom } from '../../hooks/useOfflineRoom';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';
import { offlineAdapter } from '../../transport/offline-adapter';
import { UnoBoard } from './UnoBoard';
import { getActiveSession, setActiveSession, type UnoSession } from './session';

/** Pass-and-play and solo-vs-bots: one device, the local session runs the rules. */
export function UnoTable() {
  const { code = '' } = useParams();
  const room = useOfflineRoom();
  const session = getActiveSession();
  if (!room || !session || room.code !== code.toUpperCase() || session.room.code !== room.code) {
    return (
      <div>
        <h1 className="text-3xl font-bold">No game in progress</h1>
        <p className="mt-2 max-w-md text-paper-dim">Games live only while this tab stays open. Reloading the page ends them.</p>
        <LinkButton to="/create?game=uno" className="mt-6">Start a new room</LinkButton>
      </div>
    );
  }
  return <LocalTable session={session} code={room.code} />;
}

function LocalTable({ session, code }: { session: UnoSession; code: string }) {
  const nav = useNavigate();
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const seq = session.getTurnSeq();
  const pub = unoEngine.publicView(state);
  const [unlock, setUnlock] = useState<{ id: PlayerId; seq: number } | null>(null);
  const [game, setGame] = useState(0);
  const secondsLeft = useSecondsLeft(pub.turnDeadline);

  // Pass-and-play: a hand is only shown to the human whose turn it is, after they confirm the handoff.
  // The hand locks again as soon as the turn moves on.
  const multi = session.humans.length > 1;
  const cur = pub.current;
  const unlocked = unlock !== null && unlock.id === cur && unlock.seq === seq;
  const viewerId: PlayerId | null = multi ? (unlocked ? cur : null) : (session.humans[0] ?? null);
  const needHandoff = multi && !pub.winner && session.isHuman(cur) && !unlocked;
  const priv = viewerId ? unoEngine.privateView(state, viewerId) : null;

  const send = async (a: UnoAction) => {
    if (!viewerId) return 'It is not your turn to look at the cards.';
    const r = session.act(viewerId, a);
    return r.ok ? null : r.message;
  };
  const leave = () => {
    setActiveSession(null);
    offlineAdapter.returnToLobby();
    nav(`/lobby/${code}`);
  };
  const rematch = () => { session.restart(); setUnlock(null); setGame((g) => g + 1); };

  const handArea = needHandoff ? (
    <div className="rounded-xl border border-card-yellow bg-ink-800 p-6 text-center">
      <h2 className="text-2xl font-bold">Pass the device to {session.nameOf(cur)}</h2>
      <p className="mx-auto mt-2 max-w-sm text-paper-dim">Everyone else, look away. Hands stay hidden until {session.nameOf(cur)} confirms.</p>
      <Button className="mt-5" onClick={() => setUnlock({ id: cur, seq })}>I am {session.nameOf(cur)}. Show my hand</Button>
    </div>
  ) : !priv ? <p className="text-paper-dim">Waiting for {session.nameOf(cur)}...</p> : undefined;

  return (
    <UnoBoard
      pub={pub} priv={priv} viewerId={viewerId} nameOf={session.nameOf} avatarOf={session.avatarOf}
      secondsLeft={secondsLeft} send={send} handArea={handArea} onLeave={leave} resetKey={game}
      winnerActions={<><Button autoFocus onClick={rematch}>Rematch</Button><Button variant="secondary" onClick={leave}>Back to lobby</Button></>}
    />
  );
}

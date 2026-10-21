import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bot, Copy, Crown, X } from 'lucide-react';
import type { PlayerId } from '@party/game-engine';
import type { ImpostorAction, ImpostorPrivateView, ImpostorPublicView } from '@party/impostor-engine';
import type { UnoAction, UnoPrivateView, UnoPublicView } from '@party/uno-engine';
import { getGame } from '@party/game-registry';
import { Button, LinkButton } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { SettingsForm } from '../components/SettingsForm';
import { UnoBoard } from '../games/uno/UnoBoard';
import { OnlineImpostor } from './OnlineImpostor';
import { useOnline } from '../hooks/useOnlineClient';
import { useSecondsLeft } from '../hooks/useSecondsLeft';
import { usePacks } from '../hooks/usePacks';
import { getOnlineClient } from '../transport/online-instance';
import { CLOSED_MESSAGES, startProblem } from '../transport/online';
import { addRecentRoom } from '../storage/recent';

export function ConnectingNote({ slow }: { slow: boolean }) {
  return (
    <div role="status">
      <h1 className="page-title">Connecting...</h1>
      <p className="lede mt-3">{slow ? 'This is taking a while. Free hosting puts the server to sleep when nobody is playing, and waking it can take about a minute. Hang on.' : 'Reaching the game server.'}</p>
    </div>
  );
}

/** /room/:code: the lobby while waiting, the game once it starts. Everything shown here comes from the server. */
export function OnlineRoom() {
  const { code = '' } = useParams();
  const st = useOnline();
  const client = getOnlineClient();
  useEffect(() => { client.connect(); }, [client]);
  const joinedCode = st.session?.code;
  const joinedGame = st.room?.gameId;
  useEffect(() => { if (joinedCode && joinedGame) addRecentRoom({ code: joinedCode, gameId: joinedGame }); }, [joinedCode, joinedGame]);

  if (!st.session || st.session.code !== code.toUpperCase()) {
    return (
      <div>
        <h1 className="page-title">{st.closed ? 'You are no longer in this room' : 'You are not in this room'}</h1>
        <p className="lede mt-3">{st.closed ? CLOSED_MESSAGES[st.closed] : 'Join with the code, or start your own room.'}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton to={`/join?code=${encodeURIComponent(code)}`}>Join with a code</LinkButton>
          <LinkButton to="/create" variant="secondary">Create a room</LinkButton>
        </div>
      </div>
    );
  }
  if (!st.room) return <ConnectingNote slow={st.slow} />;
  return st.room.phase === 'lobby' || !st.game ? <OnlineLobby /> : <OnlineGame />;
}

function OnlineLobby() {
  const st = useOnline();
  const client = getOnlineClient();
  const nav = useNavigate();
  const { packs } = usePacks();
  const [packId, setPackId] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const room = st.room!;
  const game = getGame(room.gameId);
  const isHost = room.hostId === room.you;
  const me = room.members.find((m) => m.id === room.you);
  const problem = startProblem(room);
  const full = room.members.length >= room.maxPlayers;
  const link = `${window.location.origin}/join?code=${room.code}`;

  const run = async (p: Promise<{ ok: boolean; message?: string }>) => { const a = await p; setError(a.ok ? '' : (a.message ?? 'That did not work.')); };
  const start = async () => {
    const pack = room.gameId === 'impostor' ? packs.find((p) => p.id === packId) : undefined;
    await run(client.start(pack ? { name: pack.name, words: pack.words } : undefined));
  };
  const leave = async () => { await client.leave(); nav('/'); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError(`Copy this link instead: ${link}`); }
  };

  return (
    <div className="grid gap-10 pb-4 md:grid-cols-[1.2fr_1fr]">
      <section>
        <h1 className="page-title">{game?.title ?? 'Lobby'}</h1>
        <p className="mt-2 text-paper-dim">Room code</p>
        <p className="font-display text-5xl font-bold tracking-widest" aria-label={`Room code ${room.code.split('').join(' ')}`}>{room.code}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={copy}><Copy size={16} aria-hidden="true" />{copied ? 'Link copied' : 'Copy invite link'}</Button>
          {room.hasPassword && <span className="text-sm text-paper-dim">Friends will need the password too.</span>}
        </div>

        <h2 className="section-title mt-8">Players <span className="text-paper-dim">{room.members.length} of {room.maxPlayers}</span></h2>
        <ul className="mt-3 space-y-2">
          {room.members.map((m) => (
            <li key={m.id} className="panel-flat flex items-center gap-3 p-3">
              <Avatar id={m.avatar} />
              <span className="flex-1 font-semibold">
                {m.name}{m.id === room.you && <span className="ml-2 text-sm font-normal text-paper-dim">You</span>}
                {m.id === room.hostId && <span className="ml-2 inline-flex items-center gap-1 text-sm font-normal text-paper-dim"><Crown size={14} aria-hidden="true" />Host</span>}
                {m.isBot && <span className="ml-2 inline-flex items-center gap-1 text-sm font-normal text-paper-dim"><Bot size={14} aria-hidden="true" />Bot</span>}
              </span>
              <span className={`text-sm ${!m.connected ? 'text-card-red' : m.ready ? 'text-card-green' : 'text-paper-dim'}`}>{!m.connected ? 'Disconnected' : m.ready ? 'Ready' : 'Not ready'}</span>
              {isHost && m.id !== room.you && <button type="button" aria-label={`Remove ${m.name}`} onClick={() => void run(client.kick(m.id))} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-paper-dim hover:bg-ink-700 hover:text-paper"><X size={18} aria-hidden="true" /></button>}
            </li>
          ))}
        </ul>
        {isHost && !full && game?.modes.includes('bots') && <Button className="mt-3" variant="secondary" onClick={() => void run(client.addBot())}>Add bot</Button>}
        {error && <p role="alert" className="mt-3 text-card-red">{error}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {isHost
            ? <Button className="btn-lg" disabled={problem !== null} onClick={start} aria-describedby={problem ? 'start-reason' : undefined}>Start game</Button>
            : <Button className="btn-lg" variant={me?.ready ? 'secondary' : 'primary'} aria-pressed={Boolean(me?.ready)} onClick={() => void run(client.setReady(!me?.ready))}>{me?.ready ? 'Not ready' : 'I am ready'}</Button>}
          <Button variant="ghost" className="btn-lg" onClick={leave}>Leave room</Button>
        </div>
        {isHost && problem && <p id="start-reason" className="mt-3 max-w-md text-paper-dim">{problem}</p>}
        {!isHost && <p className="mt-3 text-paper-dim">Waiting for the host to start.</p>}
      </section>
      <section>
        <h2 className="section-title mb-4">Settings</h2>
        {game && (isHost
          ? <SettingsForm defs={game.settings} values={room.settings} onChange={(p) => void run(client.updateSettings(p))} />
          : <ul className="space-y-1 text-paper-dim">{game.settings.map((s) => <li key={s.key}>{s.label}: <span className="text-paper">{String(room.settings[s.key])}</span></li>)}</ul>)}
        {isHost && room.gameId === 'impostor' && packs.length > 0 && (
          <div className="mt-5">
            <label htmlFor="pack" className="mb-1 block font-medium">Use one of my word packs</label>
            <select id="pack" value={packId} onChange={(e) => setPackId(e.target.value)} className="field">
              <option value="">No, use the category above</option>
              {packs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.words.length} words)</option>)}
            </select>
            <p className="mt-1 text-sm text-paper-dim">Your pack is sent to the server only when the game starts.</p>
          </div>
        )}
        <p className="mt-6 text-sm text-paper-dim"><Link to="/rules" className="underline">Read the rules</Link></p>
      </section>
    </div>
  );
}

function OnlineGame() {
  const st = useOnline();
  const client = getOnlineClient();
  const nav = useNavigate();
  const room = st.room!;
  const g = st.game!;
  const members = new Map(room.members.map((m) => [m.id, m]));
  const nameOf = (id: PlayerId) => members.get(id)?.name ?? 'Player';
  const avatarOf = (id: PlayerId) => members.get(id)?.avatar ?? 'cat';
  const isHost = room.hostId === room.you;
  const leave = async () => { await client.leave(); nav('/'); };
  const toLobby = async () => { await client.backToLobby(); };

  if (room.gameId === 'impostor') {
    return (
      <OnlineImpostor
        pub={g.public as ImpostorPublicView} priv={g.private as ImpostorPrivateView} me={room.you} isHost={isHost}
        nameOf={nameOf} avatarOf={avatarOf} skewMs={st.skewMs} onLeave={leave} onPlayAgain={toLobby}
        send={async (a: ImpostorAction) => { const r = await client.action(a); return r.ok ? null : r.message; }}
      />
    );
  }
  return <OnlineUno pub={g.public as UnoPublicView} priv={g.private as UnoPrivateView} me={room.you} skewMs={st.skewMs} isHost={isHost} nameOf={nameOf} avatarOf={avatarOf} onLeave={leave} onBack={toLobby} />;
}

function OnlineUno({ pub, priv, me, skewMs, isHost, nameOf, avatarOf, onLeave, onBack }: {
  pub: UnoPublicView; priv: UnoPrivateView; me: PlayerId; skewMs: number; isHost: boolean;
  nameOf: (id: PlayerId) => string; avatarOf: (id: PlayerId) => import('@party/game-engine').AvatarId; onLeave: () => void; onBack: () => void;
}) {
  const client = getOnlineClient();
  const secondsLeft = useSecondsLeft(pub.turnDeadline === null ? null : pub.turnDeadline - skewMs);
  return (
    <UnoBoard
      pub={pub} priv={priv} viewerId={me} nameOf={nameOf} avatarOf={avatarOf} secondsLeft={secondsLeft}
      send={async (a: UnoAction) => { const r = await client.action(a); return r.ok ? null : r.message; }}
      onLeave={onLeave}
      winnerActions={isHost
        ? <Button autoFocus onClick={onBack}>Back to lobby</Button>
        : <p className="text-paper-dim">Waiting for the host to start another round.</p>}
    />
  );
}
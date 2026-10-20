import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Bot, X } from 'lucide-react';
import { AVATAR_IDS, canStart, MAX_NAME_LENGTH, type SettingValue } from '@party/game-engine';
import { getGame } from '@party/game-registry';
import { Button, LinkButton } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { SettingsForm } from '../components/SettingsForm';
import { useOfflineRoom } from '../hooks/useOfflineRoom';
import { offlineAdapter } from '../transport/offline-adapter';
import { setActiveSession as setUnoSession, UnoSession } from '../games/uno/session';
import { groupsForCategory, ImpostorSession, setActiveSession as setImpostorSession } from '../games/impostor/session';
import { getRecentWords, setRecentWords } from '../storage/recent';
import { packOptions, usePacks } from '../hooks/usePacks';
import { maxImpostors } from '@party/impostor-engine';

export function Lobby() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const room = useOfflineRoom();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { packs } = usePacks();

  if (!room || room.code !== code.toUpperCase()) {
    return (
      <div>
        <h1 className="text-3xl font-bold">This room is not open</h1>
        <p className="mt-2 max-w-md text-paper-dim">Local rooms exist only while this tab stays open. Reloading the page closes them.</p>
        <LinkButton to="/create" className="mt-6">Create a room</LinkButton>
      </div>
    );
  }

  if (room.phase !== 'lobby') {
    return (
      <div>
        <h1 className="text-3xl font-bold">Game in progress</h1>
        <LinkButton to={`/play/${room.code}`} className="mt-6">Return to the table</LinkButton>
      </div>
    );
  }

  const game = getGame(room.gameId);
  const check = canStart(room);
  const supportsBots = game?.modes.includes('bots') ?? false;
  const full = room.members.length >= room.maxPlayers;
  const unusedAvatar = AVATAR_IDS.find((a) => !room.members.some((m) => m.avatar === a)) ?? AVATAR_IDS[0];
  const run = (r: { ok: boolean; message?: string }) => setError(r.ok ? '' : (r.message ?? ''));

  const tooManyImpostors = room.gameId === 'impostor' && Number(room.settings.impostors ?? 1) > maxImpostors(room.members.length);
  const canPlay = (game?.id === 'uno' || game?.id === 'impostor') && game.status === 'playable' && check.ok && !tooManyImpostors;
  const start = () => {
    const r = offlineAdapter.start();
    if (!r.ok) return setError(r.message);
    if (r.value.gameId === 'impostor') {
      setImpostorSession(new ImpostorSession(r.value, groupsForCategory(String(r.value.settings.category ?? 'objects'), packs), { recent: getRecentWords(), onWord: setRecentWords }));
    } else setUnoSession(new UnoSession(r.value));
    nav(`/play/${r.value.code}`);
  };

  const startReason = game && game.status !== 'playable'
    ? `${game.title} cannot be started yet. Its gameplay is the next thing being built.`
    : !check.ok ? check.message
    : tooManyImpostors ? `With ${room.members.length} players you can have at most ${maxImpostors(room.members.length)} impostor${maxImpostors(room.members.length) === 1 ? '' : 's'}. Lower the setting or add players.` : '';

  return (
    <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
      <section>
        <h1 className="text-4xl font-bold">{game?.title ?? 'Lobby'}</h1>
        <p className="mt-1 text-paper-dim">Local room <span className="font-display font-bold tracking-widest text-paper">{room.code}</span>. Everyone plays on this device.</p>
        <h2 className="mt-8 text-xl font-bold">Players ({room.members.length} of {room.maxPlayers})</h2>
        <ul className="mt-3 space-y-2">
          {room.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-lg border border-line bg-ink-800 p-3">
              <Avatar id={m.avatar} />
              <span className="flex-1 font-semibold">{m.name}{m.id === room.hostId && <span className="ml-2 text-sm font-normal text-paper-dim">Host</span>}{m.isBot && <span className="ml-2 inline-flex items-center gap-1 text-sm font-normal text-paper-dim"><Bot size={14} aria-hidden="true" />Bot</span>}</span>
              {m.id !== room.hostId && <button type="button" aria-label={`Remove ${m.name}`} onClick={() => run(offlineAdapter.removePlayer(m.id))} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-paper-dim hover:bg-ink-700 hover:text-paper"><X size={18} aria-hidden="true" /></button>}
            </li>
          ))}
        </ul>
        {!full && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="pname" className="mb-1 block text-sm font-medium">Add a player</label>
              <input id="pname" value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => setName(e.target.value)} className="min-h-[44px] rounded-lg border border-line bg-ink-800 px-3" />
            </div>
            <Button variant="secondary" onClick={() => { const r = offlineAdapter.addPlayer(name, unusedAvatar); run(r); if (r.ok) setName(''); }}>Add player</Button>
            {supportsBots && <Button variant="secondary" onClick={() => run(offlineAdapter.addBot())}>Add bot</Button>}
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-card-red">{error}</p>}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button disabled={!canPlay} onClick={start} aria-describedby={startReason ? 'start-reason' : undefined}>Start game</Button>
          <Button variant="ghost" onClick={() => { offlineAdapter.leave(); nav('/games'); }}>Close room</Button>
        </div>
        {startReason && <p id="start-reason" className="mt-3 max-w-md text-paper-dim">{startReason}</p>}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">Settings</h2>
        {game && <SettingsForm defs={game.settings} values={room.settings} onChange={(p: Record<string, SettingValue>) => run(offlineAdapter.updateSettings(p))} extraOptions={packOptions(packs)} />}
      </section>
    </div>
  );
}

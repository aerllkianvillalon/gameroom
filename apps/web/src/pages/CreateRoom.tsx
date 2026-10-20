import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { canCreateRoom, defaultSettings, getGame, listGames } from '@party/game-registry';
import { MAX_NAME_LENGTH, type SettingValue } from '@party/game-engine';
import { Button } from '../ui/Button';
import { SettingsForm } from '../components/SettingsForm';
import { offlineAdapter } from '../transport/offline-adapter';
import { getOnlineClient } from '../transport/online-instance';
import { useOnline } from '../hooks/useOnlineClient';
import { usePrefs } from '../store/prefs';
import { StatusBadge } from '../ui/GameBits';
import { packOptions, usePacks } from '../hooks/usePacks';

export function CreateRoom() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const prefs = usePrefs();
  const online = useOnline();
  const { packs } = usePacks();
  const choices = listGames().filter(canCreateRoom);
  const initial = getGame(params.get('game') ?? '');
  const [gameId, setGameId] = useState(initial && canCreateRoom(initial) ? initial.id : (choices[0]?.id ?? ''));
  const game = getGame(gameId);
  const [where, setWhere] = useState<'local' | 'online'>(params.get('mode') === 'online' ? 'online' : 'local');
  const [settings, setSettings] = useState<Record<string, SettingValue>>(() => (game ? defaultSettings(game) : {}));
  const [name, setName] = useState(prefs.playerName);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canOnline = Boolean(game?.modes.includes('online'));
  const mode = where === 'online' && canOnline ? 'online' : 'local';

  const pick = (id: string) => {
    const g = getGame(id);
    if (!g) return;
    setGameId(id);
    setSettings(defaultSettings(g));
  };

  const submit = async () => {
    if (!game) return;
    if (mode === 'local') {
      const r = offlineAdapter.createRoom({ gameId: game.id, minPlayers: game.minPlayers, maxPlayers: game.maxPlayers, hostName: name, hostAvatar: prefs.avatar, settings });
      if (!r.ok) return setError(r.message);
      prefs.update({ playerName: r.value.members[0]?.name ?? name });
      return nav(`/lobby/${r.value.code}`);
    }
    setBusy(true);
    const ack = await getOnlineClient().create({ game: game.id as 'uno' | 'impostor', name, avatar: prefs.avatar, settings, password: password || undefined });
    setBusy(false);
    if (!ack.ok) return setError(ack.message);
    prefs.update({ playerName: name.trim() });
    nav(`/room/${ack.data?.code}`);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl font-bold">Create a room</h1>
      {online.session && <p role="status" className="mt-4 rounded-lg border border-card-yellow bg-ink-800 p-3">You are already in online room {online.session.code}. Leave it first to create another.</p>}
      <fieldset className="mt-8">
        <legend className="mb-2 text-xl font-bold">Game</legend>
        <div className="space-y-2">
          {choices.map((g) => (
            <label key={g.id} className={`flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 ${g.id === gameId ? 'border-paper bg-ink-700' : 'border-line bg-ink-800'}`}>
              <span className="flex items-center gap-3"><input type="radio" name="game" checked={g.id === gameId} onChange={() => pick(g.id)} className="h-5 w-5 accent-[rgb(var(--card-yellow))]" /><span className="font-semibold">{g.title}</span></span>
              <StatusBadge status={g.status} />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-8">
        <legend className="mb-2 text-xl font-bold">Where you play</legend>
        <label className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border p-3 ${mode === 'local' ? 'border-paper bg-ink-700' : 'border-line'}`}>
          <input type="radio" name="where" checked={mode === 'local'} onChange={() => setWhere('local')} className="h-5 w-5 accent-[rgb(var(--card-yellow))]" />
          <span><span className="font-semibold">This device</span><span className="block text-sm text-paper-dim">Pass and play{game?.modes.includes('bots') ? ', plus bots' : ''}. Works without internet.</span></span>
        </label>
        <label className={`mt-2 flex min-h-[44px] items-center gap-3 rounded-lg border p-3 ${canOnline ? 'cursor-pointer' : 'opacity-60'} ${mode === 'online' ? 'border-paper bg-ink-700' : 'border-line'}`}>
          <input type="radio" name="where" disabled={!canOnline} checked={mode === 'online'} onChange={() => setWhere('online')} className="h-5 w-5 accent-[rgb(var(--card-yellow))]" />
          <span><span className="font-semibold">Online room</span><span className="block text-sm text-paper-dim">{canOnline ? 'Friends join from their own devices with a code. Needs internet.' : 'Not available for this game.'}</span></span>
        </label>
      </fieldset>
      <div className="mt-8">
        <label htmlFor="host" className="mb-1 block text-xl font-bold">Your name</label>
        <input id="host" value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => { setName(e.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'host-err' : undefined} className="min-h-[44px] w-full max-w-xs rounded-lg border border-line bg-ink-800 px-3" />
      </div>
      {mode === 'online' && (
        <div className="mt-6">
          <label htmlFor="pw" className="mb-1 block font-medium">Room password (optional)</label>
          <input id="pw" type="text" value={password} maxLength={32} autoComplete="off" onChange={(e) => setPassword(e.target.value)} className="min-h-[44px] w-full max-w-xs rounded-lg border border-line bg-ink-800 px-3" />
          <p className="mt-1 text-sm text-paper-dim">Leave it empty for a room anyone with the code can join.</p>
        </div>
      )}
      {game && game.settings.length > 0 && (
        <section className="mt-8"><h2 className="mb-3 text-xl font-bold">{game.title} settings</h2>
          <SettingsForm defs={game.settings} values={settings} onChange={(p) => setSettings((s) => ({ ...s, ...p }))} extraOptions={mode === 'local' ? packOptions(packs) : {}} />
          {mode === 'online' && game.id === 'impostor' && <p className="mt-3 text-sm text-paper-dim">You can pick one of your own word packs in the lobby, right before starting.</p>}
        </section>
      )}
      {error && <p id="host-err" role="alert" className="mt-6 text-card-red">{error}</p>}
      <Button className="mt-8" onClick={() => void submit()} disabled={!game || busy || (mode === 'online' && Boolean(online.session))}>{busy ? 'Connecting...' : 'Create room'}</Button>
      {busy && <p role="status" className="mt-3 max-w-md text-sm text-paper-dim">Free hosting puts the server to sleep when idle, so the first connection can take up to a minute.</p>}
    </div>
  );
}

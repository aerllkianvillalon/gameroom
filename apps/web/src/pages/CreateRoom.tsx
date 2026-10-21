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
    <div className="max-w-2xl pb-6">
      <h1 className="page-title">Create a room</h1>
      {online.session && <p role="status" className="hint mt-4">You are already in online room {online.session.code}. Leave it first to create another.</p>}
      <fieldset className="mt-8">
        <legend className="section-title mb-3">Game</legend>
        <div className="space-y-2">
          {choices.map((g) => (
            <label key={g.id} className="choice justify-between">
              <span className="flex items-center gap-3"><input type="radio" name="game" checked={g.id === gameId} onChange={() => pick(g.id)} /><span className="font-semibold">{g.title}</span></span>
              <StatusBadge status={g.status} />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-8">
        <legend className="section-title mb-3">Where you play</legend>
        <label className="choice">
          <input type="radio" name="where" checked={mode === 'local'} onChange={() => setWhere('local')} />
          <span><span className="font-semibold">This device</span><span className="block text-sm text-paper-dim">Pass and play{game?.modes.includes('bots') ? ', plus bots' : ''}. Works without internet.</span></span>
        </label>
        <label className="choice mt-2">
          <input type="radio" name="where" disabled={!canOnline} checked={mode === 'online'} onChange={() => setWhere('online')} />
          <span><span className="font-semibold">Online room</span><span className="block text-sm text-paper-dim">{canOnline ? 'Friends join from their own devices with a code. Needs internet.' : 'Not available for this game.'}</span></span>
        </label>
      </fieldset>
      <div className="mt-8">
        <label htmlFor="host" className="section-title mb-3 block">Your name</label>
        <input id="host" value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => { setName(e.target.value); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'host-err' : undefined} className="field max-w-sm" />
      </div>
      {mode === 'online' && (
        <div className="mt-6">
          <label htmlFor="pw" className="mb-1 block font-medium">Room password (optional)</label>
          <input id="pw" type="text" value={password} maxLength={32} autoComplete="off" onChange={(e) => setPassword(e.target.value)} className="field max-w-sm" />
          <p className="mt-1 text-sm text-paper-dim">Leave it empty for a room anyone with the code can join.</p>
        </div>
      )}
      {game && game.settings.length > 0 && (
        <section className="mt-8"><h2 className="section-title mb-4">{game.title} settings</h2>
          <SettingsForm defs={game.settings} values={settings} onChange={(p) => setSettings((s) => ({ ...s, ...p }))} extraOptions={mode === 'local' ? packOptions(packs) : {}} />
          {mode === 'online' && game.id === 'impostor' && <p className="mt-3 text-sm text-paper-dim">You can pick one of your own word packs in the lobby, right before starting.</p>}
        </section>
      )}
      {error && <p id="host-err" role="alert" className="mt-6 text-card-red">{error}</p>}
      <Button className="btn-lg mt-8 w-full sm:w-auto" onClick={() => void submit()} disabled={!game || busy || (mode === 'online' && Boolean(online.session))}>{busy ? 'Connecting...' : 'Create room'}</Button>
      {busy && <p role="status" className="mt-3 max-w-md text-sm text-paper-dim">Free hosting puts the server to sleep when idle, so the first connection can take up to a minute.</p>}
    </div>
  );
}

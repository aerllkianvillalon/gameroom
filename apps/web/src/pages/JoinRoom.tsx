import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isValidRoomCode, MAX_NAME_LENGTH, normalizeRoomCode, validateName } from '@party/game-engine';
import { Button } from '../ui/Button';
import { usePrefs } from '../store/prefs';
import { getOnlineClient } from '../transport/online-instance';
import { useOnline } from '../hooks/useOnlineClient';
import { getRecentRooms } from '../storage/recent';
import { getGame } from '@party/game-registry';

export function JoinRoom() {
  const prefs = usePrefs();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const online = useOnline();
  const [code, setCode] = useState(params.get('code') ?? '');
  const [name, setName] = useState(prefs.playerName);
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; name?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [recent] = useState(() => getRecentRooms());

  const submit = async () => {
    const c = normalizeRoomCode(code);
    const n = validateName(name);
    const next: typeof errors = {};
    if (!isValidRoomCode(c)) next.code = 'Room codes are 5 letters or numbers, like K7M2X.';
    if (!n.ok) next.name = n.message;
    setErrors(next);
    if (Object.keys(next).length > 0 || !n.ok) return;
    setBusy(true);
    const ack = await getOnlineClient().join({ code: c, name: n.value, avatar: prefs.avatar, password: password || undefined });
    setBusy(false);
    if (!ack.ok) {
      if (ack.code === 'bad_password') setNeedsPassword(true);
      return setErrors({ form: ack.message });
    }
    prefs.update({ playerName: n.value });
    nav(`/room/${ack.data?.code}`);
  };

  return (
    <div className="max-w-md">
      <h1 className="text-4xl font-bold">Join a room</h1>
      <p className="mt-2 text-paper-dim">Ask the host for the 5-character code.</p>
      {online.session && <p role="status" className="mt-4 rounded-lg border border-card-yellow bg-ink-800 p-3">You are already in room {online.session.code}. Leave it first to join another.</p>}
      {recent.length > 0 && !online.session && (
        <div className="mt-6">
          <h2 className="mb-2 font-medium">Recent rooms</h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button key={r.code} type="button" onClick={() => setCode(r.code)} className="min-h-[44px] rounded-lg border border-line bg-ink-800 px-3 hover:bg-ink-700">
                <span className="font-display tracking-widest">{r.code}</span>
                <span className="ml-2 text-sm text-paper-dim">{getGame(r.gameId)?.title ?? r.gameId}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-paper-dim">Rooms close when they empty, so an old one may no longer exist.</p>
        </div>
      )}
      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="code" className="mb-1 block font-medium">Room code</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" aria-invalid={Boolean(errors.code)} aria-describedby={errors.code ? 'code-err' : undefined} className="min-h-[44px] w-full rounded-lg border border-line bg-ink-800 px-3 font-display text-xl uppercase tracking-widest" />
          {errors.code && <p id="code-err" role="alert" className="mt-1 text-card-red">{errors.code}</p>}
        </div>
        <div>
          <label htmlFor="jname" className="mb-1 block font-medium">Your name</label>
          <input id="jname" value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-err' : undefined} className="min-h-[44px] w-full rounded-lg border border-line bg-ink-800 px-3" />
          {errors.name && <p id="name-err" role="alert" className="mt-1 text-card-red">{errors.name}</p>}
        </div>
        {needsPassword && (
          <div>
            <label htmlFor="jpw" className="mb-1 block font-medium">Room password</label>
            <input id="jpw" value={password} autoComplete="off" onChange={(e) => setPassword(e.target.value)} className="min-h-[44px] w-full rounded-lg border border-line bg-ink-800 px-3" />
          </div>
        )}
        <Button onClick={() => void submit()} disabled={busy || Boolean(online.session)}>{busy ? 'Connecting...' : 'Join room'}</Button>
        {busy && <p role="status" className="text-sm text-paper-dim">Free hosting puts the server to sleep when idle, so the first connection can take up to a minute.</p>}
        {errors.form && <p role="alert" className="rounded-lg border border-card-red bg-ink-800 p-4">{errors.form}</p>}
      </div>
    </div>
  );
}

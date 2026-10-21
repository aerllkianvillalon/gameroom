import { useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isValidRoomCode, MAX_NAME_LENGTH, normalizeRoomCode, validateName } from '@party/game-engine';
import { Button } from '../ui/Button';
import { usePrefs } from '../store/prefs';
import { getOnlineClient } from '../transport/online-instance';
import { useOnline } from '../hooks/useOnlineClient';
import { clearRecentRooms, getRecentRooms, removeRecentRoom } from '../storage/recent';
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
  const [recent, setRecent] = useState(() => getRecentRooms());

  const forget = (c: string) => { removeRecentRoom(c); setRecent(getRecentRooms()); };
  const forgetAll = () => { clearRecentRooms(); setRecent([]); };

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
    <div className="mx-auto max-w-md pb-4 lg:mx-0">
      <h1 className="page-title">Join a room</h1>
      <p className="lede mt-3">Ask the host for the 5-character code.</p>
      {online.session && <p role="status" className="hint mt-4">You are already in room {online.session.code}. Leave it first to join another.</p>}
      {recent.length > 0 && !online.session && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="section-title !text-lg">Recent rooms</h2>
            <button type="button" onClick={forgetAll} className="min-h-[44px] rounded-lg px-2 text-sm text-paper-dim underline-offset-4 hover:text-paper hover:underline">Clear all</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <span key={r.code} className="chip !bg-ink-800/80 !pr-1 !text-paper">
                <button type="button" onClick={() => setCode(r.code)} className="inline-flex min-h-[44px] items-center">
                  <span className="font-display font-extrabold tracking-[0.18em] text-paper">{r.code}</span>
                  <span className="ml-2 text-sm text-paper-dim">{getGame(r.gameId)?.title ?? r.gameId}</span>
                </button>
                <button type="button" aria-label={`Remove recent room ${r.code}`} onClick={() => forget(r.code)} className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-paper-dim hover:bg-ink-700 hover:text-paper"><X size={16} aria-hidden="true" /></button>
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-paper-dim">Rooms close when they empty, so an old one may no longer exist.</p>
        </div>
      )}
      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="code" className="mb-1 block font-medium">Room code</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="off" aria-invalid={Boolean(errors.code)} aria-describedby={errors.code ? 'code-err' : undefined} className="field !min-h-[76px] !rounded-[20px] text-center font-display text-[2.5rem] font-extrabold uppercase tracking-[0.28em] placeholder:tracking-[0.28em]" spellCheck={false} inputMode="text" placeholder="K7M2X" />
          {errors.code && <p id="code-err" role="alert" className="mt-1 text-card-red">{errors.code}</p>}
        </div>
        <div>
          <label htmlFor="jname" className="mb-1 block font-medium">Your name</label>
          <input id="jname" value={name} maxLength={MAX_NAME_LENGTH} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-err' : undefined} className="field w-full" />
          {errors.name && <p id="name-err" role="alert" className="mt-1 text-card-red">{errors.name}</p>}
        </div>
        {needsPassword && (
          <div>
            <label htmlFor="jpw" className="mb-1 block font-medium">Room password</label>
            <input id="jpw" value={password} autoComplete="off" onChange={(e) => setPassword(e.target.value)} className="field w-full" />
          </div>
        )}
        <Button className="btn-lg w-full" onClick={() => void submit()} disabled={busy || Boolean(online.session)}>{busy ? 'Connecting...' : 'Join room'}</Button>
        {busy && <p role="status" className="text-sm text-paper-dim">Free hosting puts the server to sleep when idle, so the first connection can take up to a minute.</p>}
        {errors.form && <p role="alert" className="hint hint-red">{errors.form}</p>}
      </div>
    </div>
  );
}

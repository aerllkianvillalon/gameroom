import { useState } from 'react';
import { Button } from './Button';
import { clearLocalData } from '../storage/clearData';

/** Two-step button: it asks once, wipes this browser's GameRoom data, then reloads. */
export function ClearDataButton() {
  const [state, setState] = useState<'idle' | 'confirm' | 'working'>('idle');
  const run = async () => {
    setState('working');
    await clearLocalData();
    window.location.assign('/');
  };
  if (state === 'idle') return <Button variant="secondary" onClick={() => setState('confirm')}>Clear data on this device</Button>;
  return (
    <div role="alertdialog" aria-labelledby="clr-t" className="rounded-xl border border-card-red bg-ink-800 p-4">
      <p id="clr-t" className="font-medium">Remove your name, avatar, settings, saved seat, recent rooms and custom word packs from this browser?</p>
      <p className="mt-1 text-sm text-paper-dim">This cannot be undone. If you are in an online room you will lose your seat.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={run} disabled={state === 'working'}>{state === 'working' ? 'Clearing...' : 'Yes, clear it'}</Button>
        <Button variant="ghost" onClick={() => setState('idle')} disabled={state === 'working'}>Cancel</Button>
      </div>
    </div>
  );
}

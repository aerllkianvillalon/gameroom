import { AVATAR_IDS, MAX_NAME_LENGTH, sanitizeName } from '@party/game-engine';
import { Avatar } from '../ui/Avatar';
import { usePrefs } from '../store/prefs';
import { playCue } from '../audio/sound';
import { ClearDataButton } from '../ui/ClearDataButton';
import { Link } from 'react-router-dom';

const sel = 'min-h-[44px] rounded-lg border border-line bg-ink-800 px-3';

export function SettingsPage() {
  const p = usePrefs();
  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-4xl font-bold">Settings</h1>
      <p className="text-paper-dim">Saved on this device only.</p>
      <div>
        <label htmlFor="pn" className="mb-1 block font-medium">Default player name</label>
        <input id="pn" defaultValue={p.playerName} maxLength={MAX_NAME_LENGTH} onBlur={(e) => { const n = sanitizeName(e.target.value); e.target.value = n; p.update({ playerName: n }); }} className={`${sel} w-full max-w-xs`} />
      </div>
      <fieldset>
        <legend className="mb-2 font-medium">Avatar</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_IDS.map((a) => (
            <label key={a} className={`cursor-pointer rounded-full p-1 ${p.avatar === a ? 'ring-4 ring-paper' : ''}`}>
              <input type="radio" name="avatar" value={a} checked={p.avatar === a} onChange={() => p.update({ avatar: a })} className="sr-only" />
              <span className="sr-only">{a}</span><Avatar id={a} size={48} />
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="motion" className="mb-1 block font-medium">Motion</label>
        <select id="motion" className={sel} value={p.motion} onChange={(e) => p.update({ motion: e.target.value as typeof p.motion })}>
          <option value="system">Follow my device</option><option value="reduce">Reduce motion</option><option value="full">Allow all motion</option>
        </select>
      </div>
      <div>
        <label htmlFor="ts" className="mb-1 block font-medium">Text size</label>
        <select id="ts" className={sel} value={p.textSize} onChange={(e) => p.update({ textSize: e.target.value as typeof p.textSize })}>
          <option value="normal">Normal</option><option value="large">Large</option>
        </select>
      </div>
      <div className="flex items-start gap-3">
        <input id="snd" type="checkbox" className="mt-1 h-6 w-6 accent-[rgb(var(--card-yellow))]" checked={p.sound} onChange={(e) => { p.update({ sound: e.target.checked }); playCue('yourTurn', e.target.checked); }} />
        <label htmlFor="snd" className="font-medium">Sound cues (your turn, plays, winning)</label>
      </div>
      <div className="flex items-start gap-3">
        <input id="hc" type="checkbox" className="mt-1 h-6 w-6 accent-[rgb(var(--card-yellow))]" checked={p.highContrast} onChange={(e) => p.update({ highContrast: e.target.checked })} />
        <label htmlFor="hc" className="font-medium">High contrast borders and secondary text</label>
      </div>
      <section aria-labelledby="yd" className="border-t border-line pt-6">
        <h2 id="yd" className="text-xl font-bold">Your data</h2>
        <p className="mb-3 mt-1 text-paper-dim">Remove everything GameRoom saved in this browser. See <Link to="/privacy" className="underline underline-offset-4">Privacy</Link> and <Link to="/cookies" className="underline underline-offset-4">Cookies and storage</Link>.</p>
        <ClearDataButton />
      </section>
    </div>
  );
}

import { AVATAR_IDS, MAX_NAME_LENGTH, sanitizeName } from '@party/game-engine';
import { Avatar } from '../ui/Avatar';
import { usePrefs } from '../store/prefs';
import { playCue } from '../audio/sound';
import { ClearDataButton } from '../ui/ClearDataButton';
import { Link } from 'react-router-dom';

const sel = 'field';

export function SettingsPage() {
  const p = usePrefs();
  return (
    <div className="max-w-xl space-y-7 pb-4">
      <h1 className="page-title">Settings</h1>
      <p className="lede -mt-4">Saved on this device only.</p>
      <div>
        <label htmlFor="pn" className="mb-1.5 block font-semibold">Default player name</label>
        <input id="pn" defaultValue={p.playerName} maxLength={MAX_NAME_LENGTH} onBlur={(e) => { const n = sanitizeName(e.target.value); e.target.value = n; p.update({ playerName: n }); }} className={`${sel} max-w-xs`} />
      </div>
      <fieldset>
        <legend className="mb-3 font-semibold">Avatar</legend>
        <div className="flex flex-wrap gap-2">
          {AVATAR_IDS.map((a) => (
            <label key={a} className={`cursor-pointer rounded-full p-1 transition-transform active:scale-90 ${p.avatar === a ? 'ring-4 ring-card-yellow ring-offset-4 ring-offset-ink-900' : 'opacity-80 hover:opacity-100'}`}>
              <input type="radio" name="avatar" value={a} checked={p.avatar === a} onChange={() => p.update({ avatar: a })} className="sr-only" />
              <span className="sr-only">{a}</span><Avatar id={a} size={48} />
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="motion" className="mb-1.5 block font-semibold">Motion</label>
        <select id="motion" className={sel} value={p.motion} onChange={(e) => p.update({ motion: e.target.value as typeof p.motion })}>
          <option value="system">Follow my device</option><option value="reduce">Reduce motion</option><option value="full">Allow all motion</option>
        </select>
      </div>
      <div>
        <label htmlFor="ts" className="mb-1.5 block font-semibold">Text size</label>
        <select id="ts" className={sel} value={p.textSize} onChange={(e) => p.update({ textSize: e.target.value as typeof p.textSize })}>
          <option value="normal">Normal</option><option value="large">Large</option>
        </select>
      </div>
      <div className="panel-flat flex items-center justify-between gap-4 p-4">
        <label htmlFor="snd" className="font-semibold">Sound cues <span className="block text-sm font-normal text-paper-dim">Your turn, plays, winning</span></label>
        <input id="snd" type="checkbox" className="switch" checked={p.sound} onChange={(e) => { p.update({ sound: e.target.checked }); playCue('yourTurn', e.target.checked); }} />
      </div>
      <div className="panel-flat flex items-center justify-between gap-4 p-4">
        <label htmlFor="hc" className="font-semibold">High contrast <span className="block text-sm font-normal text-paper-dim">Stronger borders and secondary text</span></label>
        <input id="hc" type="checkbox" className="switch" checked={p.highContrast} onChange={(e) => p.update({ highContrast: e.target.checked })} />
      </div>
      <section aria-labelledby="yd" className="border-t border-line pt-6">
        <h2 id="yd" className="section-title">Your data</h2>
        <p className="mb-3 mt-1 text-paper-dim">Remove everything GameRoom saved in this browser. See <Link to="/privacy" className="underline underline-offset-4">Privacy</Link> and <Link to="/cookies" className="underline underline-offset-4">Cookies and storage</Link>.</p>
        <ClearDataButton />
      </section>
    </div>
  );
}

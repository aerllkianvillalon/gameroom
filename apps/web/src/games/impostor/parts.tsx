import { useState, type ReactNode } from 'react';
import { Eye } from 'lucide-react';
import type { PlayerId } from '@party/game-engine';
import type { ImpostorPrivateView, Reason, Reveal } from '@party/impostor-engine';
import { Button } from '../../ui/Button';

export const REASONS: Record<Reason, string> = {
  caught: 'The impostor was caught.',
  'guessed-word': 'The impostor was caught, but guessed the secret word.',
  'wrong-accusation': 'The group accused the wrong player.',
  tie: 'The vote ended in a tie, so nobody was accused.',
  'not-enough-votes': 'Not enough votes to accuse anyone.',
};

export const TUTORIAL = [
  { title: 'One of you is the impostor', body: 'Everyone gets the same secret word, except the impostor. Depending on the host\'s settings, the impostor gets no word, a vague hint, or a different word.' },
  { title: 'See your role in private', body: 'The device is passed around. Each player sees a "pass the device" screen first, then their secret, then taps Hide before handing it on. Never peek at someone else\'s turn.' },
  { title: 'Give clues out loud', body: 'Take turns saying one clue about the word. Be specific enough to prove you know it, and vague enough that the impostor cannot work it out.' },
  { title: 'Talk, then vote in secret', body: 'Discuss who sounded suspicious. Then everyone votes privately on the device. Votes are shown together, so nobody can copy the crowd.' },
  { title: 'Win by catching, or by escaping', body: 'The group wins by accusing the impostor. A caught impostor gets one guess at the secret word and can still win by getting it right.' },
];

export function Panel({ children, tone = 'plum' }: { children: ReactNode; tone?: 'plum' | 'plain' }) {
  return <div className={`fade-in p-5 sm:p-7 ${tone === 'plum' ? 'panel panel-plum' : 'panel'}`}>{children}</div>;
}

export function RoleCard({ view, onHide }: { view: ImpostorPrivateView; onHide: () => void | Promise<void> }) {
  const impostor = view.role === 'impostor';
  return (
    <Panel>
      <div className="text-center">
        <p className="mx-auto inline-flex items-center gap-2 text-sm font-semibold text-paper-dim"><Eye className="text-plum" size={18} aria-hidden="true" /> Only you can see this</p>
        <div className={`secret-card mx-auto mt-4 max-w-sm rounded-[24px] px-5 py-8 ${impostor ? 'secret-card-dark' : ''}`}>
          {impostor ? (
            <>
              <h2 className="font-display text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] text-card-red">You are the impostor</h2>
              <p className="mt-4 text-lg">{view.hint ? <>Your hint: <strong>{view.hint}</strong></> : 'You get no word. Listen closely and blend in.'}</p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-ink-700">{view.role === 'crew' ? 'You are on the crew. The word is' : 'Your word is'}</h2>
              <p className="mt-2 break-words font-display text-[clamp(2.5rem,13vw,3.75rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">{view.word}</p>
            </>
          )}
        </div>
        <p className="mx-auto mt-5 max-w-sm text-sm text-paper-dim">Remember it, then hide this screen before passing the device on.</p>
        <Button className="btn-lg mt-4 w-full sm:w-auto" onClick={onHide}>Hide and continue</Button>
      </div>
    </Panel>
  );
}

export function RevealScreen({ reveal, nameOf, onContinue }: { reveal: Reveal; nameOf: (id: PlayerId) => string; onContinue?: () => void }) {
  const tally: Record<string, number> = {};
  for (const t of Object.values(reveal.votes)) tally[t] = (tally[t] ?? 0) + 1;
  const ranked = Object.keys(tally).sort((a, b) => (tally[b] ?? 0) - (tally[a] ?? 0));
  return (
    <Panel>
      <h2 className="section-title !text-[1.75rem]">{reveal.stage === 'vote' ? 'Votes revealed' : 'Tie-break votes revealed'}</h2>
      <ol className="mt-4 space-y-1">
        {ranked.map((id) => <li key={id} className="panel-flat flex justify-between px-4 py-3"><span className="font-semibold">{nameOf(id)}</span><span>{tally[id]} {tally[id] === 1 ? 'vote' : 'votes'}</span></li>)}
      </ol>
      <ul className="mt-4 space-y-1 text-sm text-paper-dim">
        {Object.entries(reveal.votes).map(([from, to]) => <li key={from}>{nameOf(from)} voted for {nameOf(to)}</li>)}
      </ul>
      {onContinue && <Button className="btn-lg mt-6 w-full sm:w-auto" onClick={onContinue}>Continue</Button>}
    </Panel>
  );
}

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = TUTORIAL[i] as (typeof TUTORIAL)[number];
  const last = i === TUTORIAL.length - 1;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <div className="sheet-backdrop absolute inset-0 bg-ink-950/75 backdrop-blur-[3px]" aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="How to play ImpostorWho" className="sheet-panel panel-plum relative w-full max-w-md rounded-t-[32px] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[inset_0_1.5px_0_rgb(var(--plum)/0.5),0_-30px_60px_-20px_rgb(0_0_0/0.8)] sm:rounded-[32px] sm:px-6 sm:pt-6">
        <div className="sheet-grabber sm:hidden" aria-hidden="true" />
        <div className="flex gap-1.5" role="img" aria-label={`Step ${i + 1} of ${TUTORIAL.length}`}>
          {TUTORIAL.map((_, k) => <span key={k} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${k <= i ? 'bg-plum' : 'bg-line/60'}`} />)}
        </div>
        <h2 key={i} className="fade-in section-title mt-5 !text-[1.875rem] !leading-[1.02]">{step.title}</h2>
        <p key={`b${i}`} className="fade-in mt-3 text-[1.0625rem] leading-relaxed text-paper/90">{step.body}</p>
        <div className="mt-7 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onClose}>Skip</Button>
          <div className="flex gap-2">
            {i > 0 && <Button variant="secondary" onClick={() => setI(i - 1)}>Back</Button>}
            <Button autoFocus onClick={() => (last ? onClose() : setI(i + 1))}>{last ? 'Got it' : 'Next'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

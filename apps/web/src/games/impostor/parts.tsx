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
  return <div className={`fade-in rounded-2xl border p-6 ${tone === 'plum' ? 'border-plum/40 bg-[#1a1626]' : 'border-line bg-ink-800'}`}>{children}</div>;
}

export function RoleCard({ view, onHide }: { view: ImpostorPrivateView; onHide: () => void | Promise<void> }) {
  return (
    <Panel>
      <div className="text-center">
        <Eye className="mx-auto text-plum" size={32} aria-hidden="true" />
        {view.role === 'impostor' ? (
          <>
            <h2 className="mt-3 text-3xl font-bold text-card-red">You are the impostor</h2>
            <p className="mt-3 text-lg">{view.hint ? <>Your hint: <strong>{view.hint}</strong></> : 'You get no word. Listen closely and blend in.'}</p>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-xl font-bold text-paper-dim">{view.role === 'crew' ? 'You are on the crew. The word is' : 'Your word is'}</h2>
            <p className="mt-2 font-display text-5xl font-bold">{view.word}</p>
          </>
        )}
        <p className="mx-auto mt-4 max-w-sm text-sm text-paper-dim">Remember it, then hide this screen before passing the device on.</p>
        <Button className="mt-5" onClick={onHide}>Hide and continue</Button>
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
      <h2 className="text-2xl font-bold">{reveal.stage === 'vote' ? 'Votes revealed' : 'Tie-break votes revealed'}</h2>
      <ol className="mt-4 space-y-1">
        {ranked.map((id) => <li key={id} className="flex justify-between rounded-lg bg-ink-800 px-3 py-2"><span className="font-semibold">{nameOf(id)}</span><span>{tally[id]} {tally[id] === 1 ? 'vote' : 'votes'}</span></li>)}
      </ol>
      <ul className="mt-4 space-y-1 text-sm text-paper-dim">
        {Object.entries(reveal.votes).map(([from, to]) => <li key={from}>{nameOf(from)} voted for {nameOf(to)}</li>)}
      </ul>
      {onContinue && <Button className="mt-5" onClick={onContinue}>Continue</Button>}
    </Panel>
  );
}

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = TUTORIAL[i] as (typeof TUTORIAL)[number];
  const last = i === TUTORIAL.length - 1;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/80 p-4">
      <div role="dialog" aria-modal="true" aria-label="How to play ImpostorWho" className="w-full max-w-md rounded-xl border border-plum/40 bg-[#1a1626] p-6">
        <p className="text-sm text-paper-dim">Step {i + 1} of {TUTORIAL.length}</p>
        <h2 className="mt-1 text-2xl font-bold">{step.title}</h2>
        <p className="mt-3 text-lg">{step.body}</p>
        <div className="mt-6 flex flex-wrap justify-between gap-2">
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


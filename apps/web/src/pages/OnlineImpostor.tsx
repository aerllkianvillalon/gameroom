import { useState } from 'react';
import { useCelebrate } from '../hooks/useCelebrate';
import { HelpCircle } from 'lucide-react';
import type { AvatarId, PlayerId } from '@party/game-engine';
import type { ImpostorAction, ImpostorPrivateView, ImpostorPublicView } from '@party/impostor-engine';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Panel, REASONS, RevealScreen, RoleCard, Tutorial } from '../games/impostor/parts';
import { useSecondsLeft } from '../hooks/useSecondsLeft';
import { usePrefs } from '../store/prefs';

interface Props {
  pub: ImpostorPublicView;
  priv: ImpostorPrivateView;
  me: PlayerId;
  isHost: boolean;
  nameOf: (id: PlayerId) => string;
  avatarOf: (id: PlayerId) => AvatarId;
  skewMs: number;
  /** Resolves null when accepted, or a message to show. */
  send: (a: ImpostorAction) => Promise<string | null>;
  onLeave: () => void;
  onPlayAgain: () => void;
}

/** Online ImpostorWho: everyone has their own screen, so there are no handoffs and votes are simultaneous. */
export function OnlineImpostor({ pub, priv, me, isHost, nameOf, avatarOf, skewMs, send, onLeave, onPlayAgain }: Props) {
  const prefs = usePrefs();
  const [help, setHelp] = useState(!prefs.seenImpostorTutorial);
  const [roleShown, setRoleShown] = useState(true); // role card visible until the player taps Hide
  const [clue, setClue] = useState('');
  const [pick, setPick] = useState<PlayerId | null>(null);
  const [guess, setGuess] = useState('');
  const [notice, setNotice] = useState('');
  // Confetti only for the winning side: the crew wins and you are not an impostor, or the impostors win and you are one.
  useCelebrate(pub.outcome ? (pub.outcome.winner === 'crew') !== pub.outcome.impostors.includes(me) : false);
  const secondsLeft = useSecondsLeft(pub.discussionDeadline === null ? null : pub.discussionDeadline - skewMs);

  const act = async (a: ImpostorAction) => {
    const problem = await send(a);
    setNotice(problem ?? '');
    return problem === null;
  };
  const closeHelp = () => { setHelp(false); prefs.update({ seenImpostorTutorial: true }); };
  const lastReveal = pub.reveals[pub.reveals.length - 1];

  let body;
  if (pub.phase === 'roles') {
    body = priv.hasAcked ? (
      <Panel><h2 className="text-2xl font-bold">Waiting for everyone</h2><p className="mt-2 text-paper-dim">{pub.acked} of {pub.order.length} players have seen their role.</p></Panel>
    ) : roleShown ? (
      <RoleCard view={priv} onHide={async () => { setRoleShown(false); if (!(await act({ type: 'ack-role' }))) setRoleShown(true); }} />
    ) : <Panel><p>Sending...</p></Panel>;
  } else if (pub.phase === 'clues') {
    const myTurn = pub.speaker === me;
    body = (
      <Panel>
        <p className="text-sm text-paper-dim">Clue round {pub.round} of {pub.totalRounds}</p>
        <h2 className="mt-1 text-2xl font-bold">{myTurn ? 'Your clue' : `${pub.speaker ? nameOf(pub.speaker) : ''} is thinking of a clue`}</h2>
        {priv.word && <p className="mt-1 text-paper-dim">Your word: <strong className="text-paper">{priv.word}</strong>. Do not type it.</p>}
        {priv.role === 'impostor' && <p className="mt-1 text-paper-dim">You are the impostor. {priv.hint ? `Hint: ${priv.hint}.` : 'Blend in.'}</p>}
        {myTurn && (
          <div className="mt-4 flex flex-wrap gap-2">
            <label htmlFor="clue" className="sr-only">Your clue</label>
            <input id="clue" value={clue} maxLength={40} onChange={(e) => setClue(e.target.value)} className="min-h-[44px] flex-1 rounded-lg border border-line bg-ink-800 px-3 text-lg" />
            <Button disabled={!clue.trim()} onClick={async () => { if (await act({ type: 'clue', text: clue })) setClue(''); }}>Send clue</Button>
          </div>
        )}
        <ClueList pub={pub} nameOf={nameOf} />
      </Panel>
    );
  } else if (pub.phase === 'discussion') {
    body = (
      <Panel>
        <h2 className="text-3xl font-bold">Discuss</h2>
        <p className="mt-2 max-w-md text-paper-dim">Who gave a clue that was too vague, or too specific? Talk it through in your voice chat or in person, then vote.</p>
        {secondsLeft !== null && <p className="mt-4 font-display text-5xl font-bold">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</p>}
        {isHost ? <Button className="mt-5" onClick={() => void act({ type: 'skip-discussion' })}>Go to voting now</Button> : <p className="mt-4 text-paper-dim">Voting opens when the timer ends or the host moves on.</p>}
        <ClueList pub={pub} nameOf={nameOf} />
      </Panel>
    );
  } else if (pub.phase === 'voting' || pub.phase === 'tiebreak') {
    const options = (pub.phase === 'tiebreak' ? pub.tiebreakCandidates : pub.order).filter((id) => id !== me);
    body = priv.myVote ? (
      <Panel>
        <h2 className="text-2xl font-bold">Vote locked in</h2>
        <p className="mt-2 text-paper-dim">You voted for {nameOf(priv.myVote)}. {pub.voted.length} of {pub.order.length} players have voted. Votes are shown together once everyone is done.</p>
      </Panel>
    ) : (
      <Panel>
        {lastReveal && pub.phase === 'tiebreak' && <p className="mb-3 rounded-lg border border-card-yellow p-3">The vote was tied. Choose between the tied players.</p>}
        <h2 className="text-2xl font-bold">{pub.phase === 'tiebreak' ? 'Break the tie' : 'Who is the impostor?'}</h2>
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">Your vote</legend>
          {options.map((id) => (
            <label key={id} className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border p-3 ${pick === id ? 'border-paper bg-ink-700' : 'border-line bg-ink-800'}`}>
              <input type="radio" name="vote" className="h-5 w-5 accent-[rgb(var(--plum))]" checked={pick === id} onChange={() => setPick(id)} />
              <Avatar id={avatarOf(id)} size={32} /><span className="font-semibold">{nameOf(id)}</span>
            </label>
          ))}
        </fieldset>
        <Button className="mt-5" disabled={!pick} onClick={async () => { if (pick && (await act({ type: 'vote', target: pick }))) setPick(null); }}>Lock in my vote</Button>
      </Panel>
    );
  } else if (pub.phase === 'guess') {
    const accusedMe = pub.accused.includes(me);
    body = accusedMe ? (
      <Panel>
        <h2 className="text-2xl font-bold">You were caught. What was the secret word?</h2>
        <label htmlFor="guess" className="sr-only">Your guess</label>
        <input id="guess" value={guess} maxLength={60} onChange={(e) => setGuess(e.target.value)} className="mt-4 min-h-[44px] w-full rounded-lg border border-line bg-ink-800 px-3 text-lg" />
        <Button className="mt-4" disabled={!guess.trim()} onClick={() => void act({ type: 'guess', text: guess })}>Submit guess</Button>
      </Panel>
    ) : (
      <Panel><h2 className="text-2xl font-bold">{pub.accused.map(nameOf).join(' and ')} {pub.accused.length > 1 ? 'were' : 'was'} caught</h2><p className="mt-2 text-paper-dim">One last chance: they are guessing the secret word to steal the win.</p></Panel>
    );
  } else if (pub.outcome) {
    const o = pub.outcome;
    body = (
      <Panel>
        <h2 className="text-3xl font-bold">{o.winner === 'crew' ? 'The group wins' : o.impostors.length > 1 ? 'The impostors win' : 'The impostor wins'}</h2>
        <p className="mt-1 text-lg text-paper-dim">{REASONS[o.reason]}</p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm text-paper-dim">{o.impostors.length > 1 ? 'Impostors' : 'Impostor'}</dt><dd className="text-lg font-semibold">{o.impostors.map(nameOf).join(', ')}</dd></div>
          <div><dt className="text-sm text-paper-dim">Secret word</dt><dd className="text-lg font-semibold">{o.word}</dd></div>
          {pub.config.impostorKnows === 'different' && <div><dt className="text-sm text-paper-dim">The impostor's word</dt><dd className="text-lg font-semibold">{o.decoy}</dd></div>}
          {o.guess && <div><dt className="text-sm text-paper-dim">Final guess</dt><dd className="text-lg font-semibold">{o.guess}</dd></div>}
        </dl>
        <div className="mt-6">{isHost ? <Button autoFocus onClick={onPlayAgain}>Back to lobby</Button> : <p className="text-paper-dim">Waiting for the host to start another round.</p>}</div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">ImpostorWho</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setHelp(true)}><HelpCircle size={18} aria-hidden="true" />How to play</Button>
          <Button variant="ghost" onClick={onLeave}>Leave game</Button>
        </div>
      </header>
      {notice && <p role="alert" className="text-card-yellow">{notice}</p>}
      {lastReveal && pub.phase !== 'voting' && pub.phase !== 'roles' && <RevealScreen reveal={lastReveal} nameOf={nameOf} />}
      <div key={pub.phase}>{body}</div>
      {help && <Tutorial onClose={closeHelp} />}
    </div>
  );
}

function ClueList({ pub, nameOf }: { pub: ImpostorPublicView; nameOf: (id: PlayerId) => string }) {
  if (pub.clues.length === 0) return null;
  return (
    <ul aria-label="Clues so far" className="mt-5 space-y-1">
      {pub.clues.map((c, i) => (
        <li key={i} className="flex gap-2 rounded-lg bg-ink-800 px-3 py-2"><span className="font-semibold">{nameOf(c.by)}</span><span className="text-paper-dim">round {c.round}:</span><span>{c.text}</span></li>
      ))}
    </ul>
  );
}

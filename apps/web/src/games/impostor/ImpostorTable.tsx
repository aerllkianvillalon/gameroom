import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { useCelebrate } from '../../hooks/useCelebrate';
import { useNavigate, useParams } from 'react-router-dom';
import { EyeOff, HelpCircle } from 'lucide-react';
import type { PlayerId } from '@party/game-engine';
import { impostorEngine } from '@party/impostor-engine';
import { Avatar } from '../../ui/Avatar';
import { Button, LinkButton } from '../../ui/Button';
import { useOfflineRoom } from '../../hooks/useOfflineRoom';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';
import { offlineAdapter } from '../../transport/offline-adapter';
import { usePrefs } from '../../store/prefs';
import { Panel, REASONS, RevealScreen, RoleCard, Tutorial } from './parts';
import { getActiveSession, setActiveSession, type ImpostorSession } from './session';

function Handoff({ name, button, onConfirm, note }: { name: string; button: string; onConfirm: () => void; note?: string }) {
  return (
    <Panel>
      <div className="text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[20px] bg-plum text-ink-950 shadow-[0_4px_0_rgb(0_0_0/0.3)]"><EyeOff size={32} aria-hidden="true" /></span>
        <h2 className="section-title mt-4 !text-[1.875rem]">Pass the device to {name}</h2>
        <p className="mx-auto mt-2 max-w-sm text-paper-dim">{note ?? `Everyone else, look away. Nothing is shown until ${name} confirms.`}</p>
        <Button className="btn-lg mt-6 w-full sm:w-auto" onClick={onConfirm}>I am {name}. {button}</Button>
      </div>
    </Panel>
  );
}

export function ImpostorTable() {
  const { code = '' } = useParams();
  const room = useOfflineRoom();
  const session = getActiveSession();
  if (!room || !session || room.code !== code.toUpperCase() || session.room.code !== room.code) {
    return (
      <div>
        <h1 className="page-title">No game in progress</h1>
        <p className="mt-2 max-w-md text-paper-dim">Games live only while this tab stays open. Reloading the page ends them.</p>
        <LinkButton to="/create?game=impostor" className="mt-6">Start a new room</LinkButton>
      </div>
    );
  }
  return <Table session={session} code={room.code} />;
}

function Table({ session, code }: { session: ImpostorSession; code: string }) {
  const nav = useNavigate();
  const state = useSyncExternalStore(session.subscribe, session.getState);
  const pub = impostorEngine.publicView(state);
  const prefs = usePrefs();
  const [help, setHelp] = useState(!prefs.seenImpostorTutorial);
  const [showing, setShowing] = useState(false); // a role card is on screen
  const [ready, setReady] = useState<PlayerId | null>(null); // player who confirmed the handoff for a ballot or guess
  const [pick, setPick] = useState<PlayerId | null>(null);
  const [guess, setGuess] = useState('');
  const [seen, setSeen] = useState(0); // vote reveals already acknowledged
  const [notice, setNotice] = useState('');
  useCelebrate(Boolean(pub.outcome)); // one shared screen: the whole table celebrates the end of a round
  const secondsLeft = useSecondsLeft(pub.discussionDeadline);
  const nameOf = session.nameOf;

  const act = (who: PlayerId, a: Parameters<ImpostorSession['act']>[1]) => {
    const r = session.act(who, a);
    setNotice(r.ok ? '' : r.message);
    return r.ok;
  };
  const leave = () => {
    setActiveSession(null);
    offlineAdapter.returnToLobby();
    nav(`/lobby/${code}`);
  };
  const rematch = () => { session.restart(); setShowing(false); setReady(null); setPick(null); setGuess(''); setSeen(0); setNotice(''); };
  const closeHelp = () => { setHelp(false); prefs.update({ seenImpostorTutorial: true }); };

  let body: ReactNode = null;
  const pendingReveal = pub.reveals[seen];

  if (pendingReveal) {
    body = <RevealScreen reveal={pendingReveal} nameOf={nameOf} onContinue={() => setSeen(seen + 1)} />;
  } else if (pub.phase === 'roles') {
    const next = state.order.find((id) => !state.acked.includes(id));
    if (next) {
      body = showing
        ? <RoleCard view={impostorEngine.privateView(state, next)} onHide={() => { if (act(next, { type: 'ack-role' })) setShowing(false); }} />
        : <Handoff name={nameOf(next)} button="Show my role" onConfirm={() => setShowing(true)} />;
    }
  } else if (pub.phase === 'clues') {
    const done = new Set(pub.clues.filter((c) => c.round === pub.round).map((c) => c.by));
    body = (
      <Panel>
        <p className="pill">Clue round {pub.round} of {pub.totalRounds}</p>
        <h2 className="section-title mt-1 !text-[2rem] !leading-[1.02]">{pub.speaker ? nameOf(pub.speaker) : ''}, say your clue out loud</h2>
        <p className="mt-2 text-paper-dim">One word or a short phrase. Do not say the secret word.</p>
        <Button className="btn-lg mt-6 w-full sm:w-auto" onClick={() => pub.speaker && act(pub.speaker, { type: 'clue' })}>Clue given</Button>
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Clue order">
          {pub.order.map((id) => (
            <li key={id} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${id === pub.speaker ? 'border-plum bg-ink-700' : 'border-line'}`}>
              <Avatar id={session.avatarOf(id)} size={22} />{nameOf(id)}{done.has(id) ? ', done' : id === pub.speaker ? ', up now' : ''}
            </li>
          ))}
        </ul>
      </Panel>
    );
  } else if (pub.phase === 'discussion') {
    body = (
      <Panel>
        <h2 className="section-title !text-[2rem]">Discuss</h2>
        <p className="mt-2 max-w-md text-paper-dim">Who gave a clue that was too vague, or too specific? Argue it out, then vote.</p>
        {secondsLeft !== null && <p className="mt-4 font-display text-5xl font-bold" aria-live="off">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</p>}
        <Button className="btn-lg mt-6 w-full sm:w-auto" onClick={() => act(pub.order[0] as PlayerId, { type: 'skip-discussion' })}>Go to voting</Button>
      </Panel>
    );
  } else if (pub.phase === 'voting' || pub.phase === 'tiebreak') {
    const voter = state.order.find((id) => !state.votes[id]);
    if (voter) {
      const options = (pub.phase === 'tiebreak' ? pub.tiebreakCandidates : pub.order).filter((id) => id !== voter);
      body = ready !== voter ? (
        <Handoff name={nameOf(voter)} button="Show my ballot" onConfirm={() => { setReady(voter); setPick(null); }}
          note={`${pub.voted.length} of ${pub.order.length} votes are locked in. Nothing is shown until ${nameOf(voter)} confirms.`} />
      ) : (
        <Panel>
          <h2 className="section-title !text-[1.625rem]">{nameOf(voter)}, {pub.phase === 'tiebreak' ? 'break the tie' : 'who is the impostor?'}</h2>
          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Your vote</legend>
            {options.map((id) => (
              <label key={id} className="choice">
                <input type="radio" name="vote"  checked={pick === id} onChange={() => setPick(id)} />
                <Avatar id={session.avatarOf(id)} size={32} /><span className="font-semibold">{nameOf(id)}</span>
              </label>
            ))}
          </fieldset>
          <Button className="btn-lg mt-6 w-full sm:w-auto" disabled={!pick} onClick={() => { if (pick && act(voter, { type: 'vote', target: pick })) { setReady(null); setPick(null); } }}>Lock in my vote</Button>
        </Panel>
      );
    }
  } else if (pub.phase === 'guess') {
    const guesser = pub.accused[0] as PlayerId;
    body = ready !== guesser ? (
      <Handoff name={nameOf(guesser)} button="Make my guess" onConfirm={() => setReady(guesser)}
        note={`${pub.accused.map(nameOf).join(' and ')} ${pub.accused.length > 1 ? 'were' : 'was'} caught. One last chance: guess the secret word to steal the win.`} />
    ) : (
      <Panel>
        <h2 className="section-title !text-[1.625rem]">{nameOf(guesser)}, what was the secret word?</h2>
        <label htmlFor="guess" className="sr-only">Your guess</label>
        <input id="guess" value={guess} maxLength={60} onChange={(e) => setGuess(e.target.value)} className="field mt-4 !text-lg" />
        <Button className="btn-lg mt-6 w-full sm:w-auto" disabled={!guess.trim()} onClick={() => { if (act(guesser, { type: 'guess', text: guess })) { setReady(null); setGuess(''); } }}>Submit guess</Button>
      </Panel>
    );
  } else if (pub.outcome) {
    const o = pub.outcome;
    body = (
      <Panel>
        <h2 className="section-title !text-[2rem]">{o.winner === 'crew' ? 'The group wins' : o.impostors.length > 1 ? 'The impostors win' : 'The impostor wins'}</h2>
        <p className="mt-1 text-lg text-paper-dim">{REASONS[o.reason]}</p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div><dt className="text-sm text-paper-dim">{o.impostors.length > 1 ? 'Impostors' : 'Impostor'}</dt><dd className="text-lg font-semibold">{o.impostors.map(nameOf).join(', ')}</dd></div>
          <div><dt className="text-sm text-paper-dim">Secret word</dt><dd className="text-lg font-semibold">{o.word}</dd></div>
          {pub.config.impostorKnows === 'different' && <div><dt className="text-sm text-paper-dim">The impostor's word</dt><dd className="text-lg font-semibold">{o.decoy}</dd></div>}
          {o.guess && <div><dt className="text-sm text-paper-dim">Final guess</dt><dd className="text-lg font-semibold">{o.guess}</dd></div>}
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button autoFocus onClick={rematch}>Play again</Button>
          <Button variant="secondary" onClick={leave}>Back to lobby</Button>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[1.625rem] font-extrabold leading-none tracking-[-0.03em]">ImpostorWho</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => setHelp(true)}><HelpCircle size={18} aria-hidden="true" />How to play</Button>
          <Button variant="ghost" onClick={leave}>Leave game</Button>
        </div>
      </header>
      {notice && <p role="alert" className="text-card-yellow">{notice}</p>}
      <div key={`${pub.phase}-${seen}-${showing}-${ready}`}>{body}</div>
      {help && <Tutorial onClose={closeHelp} />}
    </div>
  );
}

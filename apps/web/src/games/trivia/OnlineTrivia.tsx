import { useState } from 'react';
import type { AvatarId, PlayerId } from '@party/game-engine';
import { CATEGORY_LABELS, type TriviaAction, type TriviaPrivateView, type TriviaPublicView } from '@party/trivia-engine';
import { Avatar } from '../../ui/Avatar';
import { Panel } from '../impostor/parts';
import { BackToLobby, GameHeader, TimerBar } from '../shared';
import { useCelebrate } from '../../hooks/useCelebrate';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';

interface Props {
  pub: TriviaPublicView; priv: TriviaPrivateView; me: PlayerId; isHost: boolean; skewMs: number;
  nameOf: (id: PlayerId) => string; avatarOf: (id: PlayerId) => AvatarId;
  send: (a: TriviaAction) => Promise<string | null>; onLeave: () => void; onBack: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];
/** Each answer keeps its own colour so players can find it quickly. Letters stay visible too, so colour is never the only cue. */
const TONES = ['bg-card-red', 'bg-card-blue', 'bg-card-yellow', 'bg-card-green'];

export function OnlineTrivia({ pub, priv, me, isHost, skewMs, nameOf, avatarOf, send, onLeave, onBack }: Props) {
  const [notice, setNotice] = useState('');
  const secs = useSecondsLeft(pub.deadline === null ? null : pub.deadline - skewMs);
  const top = pub.standings[0];
  useCelebrate(pub.phase === 'results' && top?.id === me);
  const answer = async (choice: number) => setNotice((await send({ type: 'answer', choice })) ?? '');
  const revealed = pub.phase !== 'question';
  const lastQuestionDone = pub.phase === 'results';

  return (
    <div className="space-y-5">
      <GameHeader title="Trivia Battle" onLeave={onLeave} />
      {notice && <p role="alert" className="text-card-yellow">{notice}</p>}
      {!lastQuestionDone && pub.text && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="pill">Question {pub.index + 1} of {pub.total}{pub.category ? ` · ${CATEGORY_LABELS[pub.category]}` : ''}</p>
            {pub.phase === 'question' && secs !== null && <p className="font-display text-3xl font-bold" aria-label={`${secs} seconds left`}>{secs}</p>}
          </div>
          {pub.phase === 'question' && <div className="mt-3"><TimerBar secs={secs} total={pub.config.questionSeconds} /></div>}
          <h2 className="section-title mt-4 !text-[1.75rem]">{pub.text}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {pub.options.map((o, i) => {
              const mine = priv.myChoice === i;
              const right = revealed && pub.correct === i;
              const wrongPick = revealed && mine && !right;
              const who = revealed ? Object.entries(pub.picks).filter(([, c]) => c === i).map(([id]) => nameOf(id)) : [];
              return (
                <li key={i}>
                  <button
                    type="button" disabled={priv.myChoice !== null || revealed} onClick={() => void answer(i)} aria-pressed={mine}
                    className={`choice w-full justify-start text-left ${mine ? 'ring-2 ring-paper' : ''} ${right ? 'border-card-green bg-card-green/15' : ''} ${wrongPick ? 'border-card-red bg-card-red/15' : ''}`}
                  >
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] font-display text-lg font-extrabold text-ink-950 ${TONES[i]}`}>{LETTERS[i]}</span>
                    <span className="flex-1 font-semibold">{o}{right && <span className="sr-only"> (correct)</span>}{wrongPick && <span className="sr-only"> (your wrong answer)</span>}</span>
                  </button>
                  {who.length > 0 && <p className="mt-1 text-sm text-paper-dim">{who.join(', ')}</p>}
                </li>
              );
            })}
          </ul>
          {pub.phase === 'question' && priv.myChoice !== null && <p role="status" className="mt-4 text-paper-dim">Locked in. {pub.answered.length} of {pub.order.length} players have answered.</p>}
          {revealed && <p role="status" className="mt-4 font-semibold">{(pub.gains[me] ?? 0) > 0 ? `Correct! +${pub.gains[me]} points` : priv.myChoice === null ? 'You ran out of time.' : 'Not this time.'}</p>}
        </Panel>
      )}
      {lastQuestionDone && (
        <Panel>
          <h2 className="section-title !text-[2rem]">{top ? `${nameOf(top.id)} wins` : 'Game over'}</h2>
          <div className="mt-5"><BackToLobby isHost={isHost} onBack={onBack} /></div>
        </Panel>
      )}
      <section aria-label="Scoreboard">
        <h2 className="section-title mb-3 !text-[1.25rem]">Scores</h2>
        <ol className="space-y-2">
          {pub.standings.map((p, i) => (
            <li key={p.id} className="panel-flat flex items-center gap-3 p-3">
              <span className="w-6 font-display font-bold text-paper-dim">{i + 1}</span>
              <Avatar id={avatarOf(p.id)} size={32} />
              <span className="flex-1 font-semibold">{nameOf(p.id)}{p.id === me && <span className="ml-2 text-sm font-normal text-paper-dim">You</span>}</span>
              {revealed && !lastQuestionDone && (pub.gains[p.id] ?? 0) > 0 && <span className="text-sm text-card-green">+{pub.gains[p.id]}</span>}
              <span className="font-display text-xl font-bold">{p.score}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

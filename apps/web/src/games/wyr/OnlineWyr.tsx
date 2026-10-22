import { useState } from 'react';
import type { AvatarId, PlayerId } from '@party/game-engine';
import type { WyrAction, WyrPrivateView, WyrPublicView } from '@party/wyr-engine';
import { Avatar } from '../../ui/Avatar';
import { Panel } from '../impostor/parts';
import { BackToLobby, GameHeader, TimerBar } from '../shared';
import { useCelebrate } from '../../hooks/useCelebrate';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';

interface Props {
  pub: WyrPublicView; priv: WyrPrivateView; me: PlayerId; isHost: boolean; skewMs: number;
  nameOf: (id: PlayerId) => string; avatarOf: (id: PlayerId) => AvatarId;
  send: (a: WyrAction) => Promise<string | null>; onLeave: () => void; onBack: () => void;
}

/** Each side keeps its own colour and a letter, so colour is never the only cue. */
const SIDES = [
  { letter: 'A', badge: 'bg-card-blue', bar: 'bg-card-blue' },
  { letter: 'B', badge: 'bg-card-red', bar: 'bg-card-red' },
] as const;

export function OnlineWyr({ pub, priv, me, isHost, skewMs, nameOf, avatarOf, send, onLeave, onBack }: Props) {
  const [notice, setNotice] = useState('');
  const secs = useSecondsLeft(pub.deadline === null ? null : pub.deadline - skewMs);
  const top = pub.standings[0];
  const done = pub.phase === 'results';
  useCelebrate(done && pub.config.scoring && top?.id === me);
  const revealed = pub.phase !== 'vote';
  const texts = [pub.a, pub.b];
  const total = (pub.tally?.[0] ?? 0) + (pub.tally?.[1] ?? 0);
  const vote = async (choice: 0 | 1) => setNotice((await send({ type: 'vote', choice })) ?? '');

  return (
    <div className="space-y-5">
      <GameHeader title="Would You Rather" onLeave={onLeave} />
      {notice && <p role="alert" className="text-card-yellow">{notice}</p>}
      {!done && pub.a && pub.b && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="pill">Round {pub.index + 1} of {pub.total}</p>
            {pub.phase === 'vote' && secs !== null && <p className="font-display text-3xl font-bold" aria-label={`${secs} seconds left`}>{secs}</p>}
          </div>
          {pub.phase === 'vote' && <div className="mt-3"><TimerBar secs={secs} total={pub.config.voteSeconds} /></div>}
          <h2 className="section-title mt-4 !text-[1.5rem]">Would you rather...</h2>
          <ul className="mt-4 grid gap-3">
            {SIDES.map((side, i) => {
              const mine = priv.myChoice === i;
              const count = pub.tally?.[i] ?? 0;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const voters = revealed ? Object.entries(pub.picks).filter(([, c]) => c === i).map(([id]) => id) : [];
              const won = revealed && pub.tally !== null && count > (pub.tally[1 - i] ?? 0);
              return (
                <li key={side.letter}>
                  <button
                    type="button" disabled={priv.myChoice !== null || revealed} onClick={() => void vote(i as 0 | 1)} aria-pressed={mine}
                    className={`choice relative w-full justify-start overflow-hidden text-left ${mine ? 'ring-2 ring-paper' : ''} ${won ? 'border-card-green' : ''}`}
                  >
                    {revealed && <span aria-hidden="true" className={`absolute inset-y-0 left-0 opacity-20 ${side.bar}`} style={{ width: `${pct}%` }} />}
                    <span className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] font-display text-lg font-extrabold text-ink-950 ${side.badge}`}>{side.letter}</span>
                    <span className="relative flex-1 text-lg font-semibold">{texts[i]}</span>
                    {revealed && <span className="relative font-display text-2xl font-bold">{pct}%<span className="sr-only"> ({count} of {total} votes{won ? ', the bigger side' : ''})</span></span>}
                  </button>
                  {voters.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Players who picked ${side.letter}`}>
                      {voters.map((id) => <li key={id} className="inline-flex items-center gap-1.5 text-sm text-paper-dim"><Avatar id={avatarOf(id)} size={20} />{nameOf(id)}</li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {pub.phase === 'vote' && priv.myChoice !== null && <p role="status" className="mt-4 text-paper-dim">Locked in. {pub.voted.length} of {pub.order.length} players have voted.</p>}
          {revealed && pub.config.scoring && <p role="status" className="mt-4 font-semibold">{pub.majority.includes(me) ? 'You were on the bigger side! +100' : pub.majority.length === 0 ? 'A tie, so nobody scores.' : priv.myChoice === null ? 'You did not vote this round.' : 'You were in the minority.'}</p>}
        </Panel>
      )}
      {done && (
        <Panel>
          <h2 className="section-title !text-[2rem]">{pub.config.scoring && top ? `${nameOf(top.id)} wins` : 'That is a wrap'}</h2>
          <p className="mt-1 text-paper-dim">{pub.config.scoring ? 'Most time on the bigger side.' : 'Thanks for playing.'}</p>
          <div className="mt-5"><BackToLobby isHost={isHost} onBack={onBack} /></div>
        </Panel>
      )}
      {pub.config.scoring && (
        <section aria-label="Scoreboard">
          <h2 className="section-title mb-3 !text-[1.25rem]">Scores</h2>
          <ol className="grid gap-2 sm:grid-cols-2">
            {pub.standings.map((p, i) => (
              <li key={p.id} className="panel-flat flex items-center gap-3 p-3">
                <span className="w-6 font-display font-bold text-paper-dim">{i + 1}</span>
                <Avatar id={avatarOf(p.id)} size={32} />
                <span className="flex-1 font-semibold">{nameOf(p.id)}{p.id === me && <span className="ml-2 text-sm font-normal text-paper-dim">You</span>}</span>
                <span className="font-display text-xl font-bold">{p.score}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

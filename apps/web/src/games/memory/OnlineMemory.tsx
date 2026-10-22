import { useState } from 'react';
import type { AvatarId, PlayerId } from '@party/game-engine';
import type { MemoryAction, MemoryPrivateView, MemoryPublicView } from '@party/memory-engine';
import { Avatar } from '../../ui/Avatar';
import { Panel } from '../impostor/parts';
import { BackToLobby, GameHeader, TimerBar } from '../shared';
import { useCelebrate } from '../../hooks/useCelebrate';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';

interface Props {
  pub: MemoryPublicView; priv: MemoryPrivateView; me: PlayerId; isHost: boolean; skewMs: number;
  nameOf: (id: PlayerId) => string; avatarOf: (id: PlayerId) => AvatarId;
  send: (a: MemoryAction) => Promise<string | null>; onLeave: () => void; onBack: () => void;
}

export function OnlineMemory({ pub, priv, me, isHost, skewMs, nameOf, avatarOf, send, onLeave, onBack }: Props) {
  const [notice, setNotice] = useState('');
  const secs = useSecondsLeft(pub.deadline === null ? null : pub.deadline - skewMs);
  const done = pub.phase === 'results';
  useCelebrate(done && pub.winners.includes(me));
  const flip = async (index: number) => setNotice((await send({ type: 'flip', index })) ?? '');
  const canFlip = priv.yourTurn && !pub.pendingMismatch && !done;
  const cols = pub.cards.length > 16 ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-4';
  const ranked = [...pub.order].sort((a, b) => (pub.scores[b] ?? 0) - (pub.scores[a] ?? 0));

  return (
    <div className="space-y-5">
      <GameHeader title="Memory Match" onLeave={onLeave} />
      {notice && <p role="alert" className="text-card-yellow">{notice}</p>}
      {done ? (
        <Panel>
          <h2 className="section-title !text-[2rem]">{pub.winners.length > 1 ? `${pub.winners.map(nameOf).join(' and ')} tie` : `${nameOf(pub.winners[0] as PlayerId)} wins`}</h2>
          <p className="mt-1 text-paper-dim">Every pair has been found.</p>
          <div className="mt-5"><BackToLobby isHost={isHost} onBack={onBack} /></div>
        </Panel>
      ) : (
        <Panel tone="plain">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="pill">{priv.yourTurn ? 'Your turn' : pub.turn ? `${nameOf(pub.turn)}'s turn` : ''}</p>
            <p className="text-paper-dim">{pub.pairsLeft} {pub.pairsLeft === 1 ? 'pair' : 'pairs'} left</p>
          </div>
          {!pub.pendingMismatch && secs !== null && (
            <div className="mt-3">
              <TimerBar secs={secs} total={pub.config.flipSeconds} />
              <p className="sr-only" aria-live="off">{secs} seconds left</p>
            </div>
          )}
          <p role="status" className="mt-3 min-h-[1.5rem] text-paper-dim">
            {pub.pendingMismatch ? 'No match.' : pub.lastMiss ? `${nameOf(pub.lastMiss)} missed.` : priv.yourTurn ? 'Flip a card.' : ''}
          </p>
          <ul className={`mt-3 grid gap-2 sm:gap-3 ${cols}`} aria-label="Cards">
            {pub.cards.map((c, i) => {
              const shown = c.symbol !== null;
              const taken = c.matchedBy !== null;
              return (
                <li key={i}>
                  <button
                    type="button" disabled={!canFlip || shown} onClick={() => void flip(i)}
                    aria-label={taken ? `Card ${i + 1}: ${c.symbol}, matched by ${nameOf(c.matchedBy as PlayerId)}` : shown ? `Card ${i + 1}: ${c.symbol}, face up` : `Card ${i + 1}, face down`}
                    className={`flex aspect-square w-full items-center justify-center rounded-[16px] border-2 text-[clamp(1.75rem,8vw,2.75rem)] transition-colors ${taken ? 'border-card-green bg-card-green/15' : shown ? 'border-paper bg-paper/10' : 'border-paper/15 bg-ink-800 hover:bg-ink-700 disabled:hover:bg-ink-800'}`}
                  >
                    {shown ? <span aria-hidden="true">{c.symbol}</span> : <span aria-hidden="true" className="font-display text-2xl font-extrabold text-paper/30">?</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      <section aria-label="Scores">
        <h2 className="section-title mb-3 !text-[1.25rem]">Pairs found</h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {ranked.map((id) => (
            <li key={id} className={`panel-flat flex items-center gap-3 p-3 ${pub.turn === id ? 'ring-2 ring-card-yellow' : ''}`}>
              <Avatar id={avatarOf(id)} size={32} />
              <span className="flex-1 font-semibold">{nameOf(id)}{id === me && <span className="ml-2 text-sm font-normal text-paper-dim">You</span>}</span>
              <span className="font-display text-xl font-bold">{pub.scores[id] ?? 0}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

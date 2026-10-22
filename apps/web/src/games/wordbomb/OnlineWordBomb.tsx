import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import type { AvatarId, PlayerId } from '@party/game-engine';
import type { EventKind, WordBombAction, WordBombPrivateView, WordBombPublicView } from '@party/wordbomb-engine';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Panel } from '../impostor/parts';
import { BackToLobby, GameHeader, TimerBar } from '../shared';
import { useCelebrate } from '../../hooks/useCelebrate';
import { useSecondsLeft } from '../../hooks/useSecondsLeft';

interface Props {
  pub: WordBombPublicView; priv: WordBombPrivateView; me: PlayerId; isHost: boolean; skewMs: number;
  nameOf: (id: PlayerId) => string; avatarOf: (id: PlayerId) => AvatarId;
  send: (a: WordBombAction) => Promise<string | null>; onLeave: () => void; onBack: () => void;
}

const EVENT_TEXT: Record<EventKind, (who: string, word?: string) => string> = {
  exploded: (who, f) => `The bomb exploded on ${who}${f ? ` (${f.toUpperCase()})` : ''}.`,
  'word-rejected': (who) => `${who}'s word was rejected.`,
  'challenge-upheld': (who, w) => `${who}'s word "${w}" was thrown out.`,
  'challenge-failed': (who, w) => `"${w}" stood. ${who} loses a life.`,
  eliminated: (who) => `${who} is out.`,
};

export function OnlineWordBomb({ pub, priv, me, isHost, skewMs, nameOf, avatarOf, send, onLeave, onBack }: Props) {
  const [text, setText] = useState('');
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const secs = useSecondsLeft(pub.deadline === null ? null : pub.deadline - skewMs);
  useCelebrate(pub.phase === 'results' && pub.winner === me);
  useEffect(() => { if (priv.yourTurn) input.current?.focus(); }, [priv.yourTurn, pub.fragment]);
  const act = async (a: WordBombAction) => { const p = await send(a); setNotice(p ?? ''); return p === null; };
  const recent = [...pub.events].reverse().slice(0, 3);
  const judging = pub.challenge;

  return (
    <div className="space-y-5">
      <GameHeader title="Word Bomb" onLeave={onLeave} />
      {notice && <p role="alert" className="text-card-yellow">{notice}</p>}
      {pub.phase === 'results' ? (
        <Panel>
          <h2 className="section-title !text-[2rem]">{pub.winner ? `${nameOf(pub.winner)} wins` : 'Nobody wins'}</h2>
          <p className="mt-1 text-paper-dim">{pub.usedCount} words were played.</p>
          <div className="mt-5"><BackToLobby isHost={isHost} onBack={onBack} /></div>
        </Panel>
      ) : judging ? (
        <Panel>
          <h2 className="section-title !text-[1.625rem]">Is "{judging.word}" a real word?</h2>
          <p className="mt-2 text-paper-dim">{nameOf(judging.challenger)} challenged {nameOf(judging.by)}'s word. {judging.judged.length} of {judging.judges.length} judges have voted.</p>
          {priv.mustJudge
            ? <div className="mt-5 flex flex-wrap gap-3"><Button className="btn-lg" onClick={() => void act({ type: 'judge', valid: true })}>It is a word</Button><Button className="btn-lg" variant="secondary" onClick={() => void act({ type: 'judge', valid: false })}>Not a word</Button></div>
            : <p className="mt-4 text-paper-dim">{judging.judges.includes(me) ? 'Vote locked in.' : 'Waiting for the judges.'}</p>}
          {secs !== null && <p className="mt-4 text-sm text-paper-dim">{secs}s left</p>}
          <div className="mt-2"><TimerBar secs={secs} total={15} /></div>
        </Panel>
      ) : (
        <Panel>
          <p className="pill">{pub.turn ? (priv.yourTurn ? 'Your turn' : `${nameOf(pub.turn)} has the bomb`) : ''}</p>
          <p className="mt-4 text-center font-display text-[clamp(3.5rem,18vw,6rem)] font-extrabold uppercase leading-none tracking-wide" aria-label={`Letters: ${pub.fragment.split('').join(' ')}`}>{pub.fragment}</p>
          {secs !== null && <p className={`mt-2 text-center font-display text-3xl font-bold ${secs <= 3 ? 'text-card-red motion-safe:animate-pulse' : ''}`} aria-label={`${secs} seconds left`}>{secs}</p>}
          <div className="mx-auto mt-3 max-w-sm"><TimerBar secs={secs} total={pub.config.fuseSeconds} /></div>
          {priv.yourTurn && (
            <div className="mt-4 flex flex-wrap gap-2">
              <label htmlFor="word" className="sr-only">Your word</label>
              <input
                id="word" ref={input} value={text} maxLength={40} autoComplete="off" autoCapitalize="none" spellCheck={false}
                onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) void act({ type: 'word', text }).then((ok) => ok && setText('')); }}
                className="field flex-1 text-lg"
              />
              <Button disabled={!text.trim()} onClick={async () => { if (await act({ type: 'word', text })) setText(''); }}>Play word</Button>
            </div>
          )}
          {priv.yourTurn && pub.canChallenge && pub.last && pub.last.by !== me && (
            <div className="mt-4">
              <Button variant="secondary" onClick={() => void act({ type: 'challenge' })}>Challenge "{pub.last.word}"</Button>
              <p className="mt-1 text-sm text-paper-dim">Think {nameOf(pub.last.by)} made it up? The others will judge it.</p>
            </div>
          )}
          {pub.last && <p className="mt-4 text-paper-dim">Last word: <strong className="text-paper">{pub.last.word}</strong> by {nameOf(pub.last.by)}</p>}
          {priv.eliminated && <p className="mt-4 text-card-red">You are out of lives. Keep watching until the game ends.</p>}
        </Panel>
      )}
      {recent.length > 0 && (
        <ul aria-label="Recent events" className="space-y-1 text-paper-dim">
          {recent.map((e) => <li key={e.seq}>{EVENT_TEXT[e.kind](nameOf(e.player), e.word)}</li>)}
        </ul>
      )}
      <ul aria-label="Players" className="grid gap-2 sm:grid-cols-2">
        {pub.order.map((id) => {
          const lives = pub.lives[id] ?? 0;
          return (
            <li key={id} className={`panel-flat flex items-center gap-3 p-3 ${lives === 0 ? 'opacity-50' : ''} ${pub.turn === id ? 'ring-2 ring-card-yellow' : ''}`}>
              <Avatar id={avatarOf(id)} size={32} />
              <span className="flex-1 font-semibold">{nameOf(id)}{id === me && <span className="ml-2 text-sm font-normal text-paper-dim">You</span>}</span>
              <span className="flex items-center gap-0.5 text-card-red" aria-label={`${lives} lives`}>
                {Array.from({ length: pub.maxLives }, (_, i) => <Heart key={i} size={16} fill={i < lives ? 'currentColor' : 'none'} className={i < lives ? '' : 'opacity-30'} aria-hidden="true" />)}
              </span>
              <span className="w-8 text-right text-sm text-paper-dim" title="Words played">{pub.wordCounts[id] ?? 0}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

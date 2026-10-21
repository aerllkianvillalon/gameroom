import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogOut, RotateCcw, RotateCw, Timer } from 'lucide-react';
import type { AvatarId, PlayerId } from '@party/game-engine';
import { COLORS, type Card, type Color, type UnoAction, type UnoPrivateView, type UnoPublicView } from '@party/uno-engine';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { CardBack, SWATCH, UnoCard } from './UnoCard';
import { describeEvents } from './messages';
import { usePrefs } from '../../store/prefs';
import { playCue } from '../../audio/sound';
import { useCelebrate } from '../../hooks/useCelebrate';
import { motionReduced } from '../../effects/motion';

const COLOR_ORDER: Record<string, number> = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
const sortHand = (hand: Card[]) =>
  [...hand].sort((a, b) => (COLOR_ORDER[a.color] ?? 9) - (COLOR_ORDER[b.color] ?? 9) || String(a.value).localeCompare(String(b.value), undefined, { numeric: true }));

export function Modal({ title, onClose, children }: { title: string; onClose?: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!onClose) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4">
      <div className="sheet-backdrop absolute inset-0 bg-ink-950/75 backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="sheet-panel relative w-full max-w-md rounded-t-[32px] bg-ink-800 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[inset_0_1.5px_0_rgb(var(--line)),0_-30px_60px_-20px_rgb(0_0_0/0.8)] sm:rounded-[32px] sm:px-6 sm:pt-6">
        <div className="sheet-grabber sm:hidden" aria-hidden="true" />
        <h2 className="section-title !text-[1.625rem]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/**
 * The UNO window. Whoever presses first wins: the player on one card is safe,
 * anyone else makes them draw. It is the same big button for everyone, so nobody has a head start.
 */
function UnoRace({ target, targetName, viewerId, shared, onPress, onShared }: {
  target: PlayerId; targetName: string; viewerId: PlayerId | null;
  shared?: UnoBoardProps['sharedUno'];
  onPress: (a: UnoAction) => Promise<void>;
  onShared: (fn: () => Promise<string | null>) => Promise<void>;
}) {
  const big = 'btn-lg w-full !min-h-[64px] text-2xl sm:w-auto sm:min-w-[16rem]';
  return (
    <div role="group" aria-label="UNO" className="panel flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-display text-lg font-extrabold leading-tight">{targetName} is down to one card!<span className="block text-sm font-semibold text-paper-dim">First to press UNO wins the race.</span></p>
      {shared ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className={big} onClick={() => void onShared(shared.call)}>UNO! ({targetName})</Button>
          <Button className={big} onClick={() => void onShared(shared.catchIt)}>UNO! (everyone else)</Button>
        </div>
      ) : viewerId ? (
        <Button className={big} onClick={() => void onPress(viewerId === target ? { type: 'call-uno' } : { type: 'catch-uno', target })}>UNO!</Button>
      ) : null}
    </div>
  );
}

export interface UnoBoardProps {
  pub: UnoPublicView;
  /** Null when this device should not show a hand (pass-and-play between turns, or a spectator). */
  priv: UnoPrivateView | null;
  viewerId: PlayerId | null;
  nameOf: (id: PlayerId) => string;
  avatarOf: (id: PlayerId) => AvatarId;
  secondsLeft: number | null;
  /** Resolves null when the move was accepted, or a message to show the player. */
  send: (a: UnoAction) => Promise<string | null>;
  /** Replaces the hand area (pass-and-play handoff screen, or a waiting message). */
  handArea?: ReactNode;
  onLeave: () => void;
  /** Buttons for the winner dialog (rematch, back to lobby, or a waiting note). */
  winnerActions: ReactNode;
  /**
   * Shared-device games (pass-and-play) have no single viewer, so UNO is pressed by whoever is
   * quickest: one button for the player on one card, one for everybody else.
   */
  sharedUno?: { call: () => Promise<string | null>; catchIt: () => Promise<string | null> };
  /** Bumps whenever the local UI should forget half-finished input (a new game started). */
  resetKey?: number;
}

/** The table, the players and the hand. Knows nothing about where the game state comes from. */
export function UnoBoard({ pub, priv, viewerId, nameOf, avatarOf, secondsLeft, send, handArea, onLeave, winnerActions, sharedUno, resetKey = 0 }: UnoBoardProps) {
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Card | null>(null);
  useEffect(() => { setNotice(''); setPending(null); }, [resetKey]);

  const sound = usePrefs((p) => p.sound);
  const myTurn = viewerId !== null && pub.current === viewerId && !pub.winner;
  const wasMyTurn = useRef(false);
  useEffect(() => {
    if (myTurn && !wasMyTurn.current) playCue('yourTurn', sound);
    wasMyTurn.current = myTurn;
  }, [myTurn, sound]);
  const hadWinner = useRef(Boolean(pub.winner));
  useEffect(() => {
    if (pub.winner && !hadWinner.current) playCue('win', sound);
    hadWinner.current = Boolean(pub.winner);
  }, [pub.winner, sound]);
  // Confetti when you win, or when someone on this shared device does (no single viewer then).
  useCelebrate(Boolean(pub.winner) && (viewerId === null || pub.winner === viewerId));

  // Keep the player whose turn it is in view in the seat strip (it scrolls sideways on phones).
  const turnId = pub.winner ? null : pub.current;
  useEffect(() => {
    if (turnId === null) return;
    const el = document.querySelector<HTMLElement>('[aria-label="Players"] [data-turn="true"]');
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: motionReduced() ? 'auto' : 'smooth' });
  }, [turnId]);

  const playable = new Set(priv?.playableCardIds ?? []);
  const go = async (a: UnoAction) => {
    const problem = await send(a);
    setNotice(problem ?? '');
    if (!problem) { setPending(null);  }
  };
  const playCard = (card: Card) => {
    if (!playable.has(card.id)) return setNotice('That card cannot be played right now.');
    if (card.color === 'wild' || (card.value === 7 && pub.config.sevenZero)) return setPending(card);
    void go({ type: 'play', cardId: card.id });
  };

  const cur = pub.current;
  const lines = describeEvents(pub.events, nameOf, viewerId);
  const turnLine = pub.winner ? '' : viewerId && cur === viewerId ? 'Your turn' : `${nameOf(cur)}'s turn`;
  const hand = priv ? sortHand(priv.hand) : [];
  const Dir = pub.direction === 1 ? RotateCw : RotateCcw;

  const tilt = `${(((String(pub.topCard.id).split('').reduce((n, ch) => n + ch.charCodeAt(0), 0)) % 15) - 7)}deg`;

  return (
    <div className="space-y-4 sm:space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-[1.625rem] font-extrabold leading-none tracking-[-0.03em]">Colour Cards</h1>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-paper-dim">
          <span className="pill"><Dir size={15} aria-hidden="true" />{pub.direction === 1 ? 'Clockwise' : 'Counter-clockwise'}</span>
          {secondsLeft !== null && <span className={`pill ${secondsLeft <= 5 ? '!text-card-red' : ''}`}><Timer size={15} aria-hidden="true" />{secondsLeft}s</span>}
          <Button variant="danger" onClick={onLeave} className="!min-h-[44px]" aria-label="Leave the game"><LogOut size={16} aria-hidden="true" />Leave</Button>
        </div>
      </header>

      <ul aria-label="Players" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {pub.players.map((p) => {
          const turn = p.id === cur && !pub.winner;
          return (
            <li key={p.id} data-turn={turn} className={`seat flex shrink-0 items-center gap-2.5 rounded-[18px] py-2 pl-2 pr-3.5 ${turn ? 'turn-ring bg-ink-700 shadow-[inset_0_0_0_2.5px_rgb(var(--card-yellow))]' : 'panel-flat'}`}>
              <Avatar id={avatarOf(p.id)} size={38} />
              <div className="min-w-0">
                <p className="max-w-[7.5rem] truncate font-display text-[0.9375rem] font-bold leading-tight">{p.id === viewerId ? 'You' : nameOf(p.id)}</p>
                <p className="text-[0.8125rem] leading-tight text-paper-dim">{p.cards} {p.cards === 1 ? 'card' : 'cards'}{turn ? ', turn' : ''}</p>
              </div>
              {p.cards === 1 && <span className="rounded-md bg-card-yellow px-1.5 py-0.5 font-display text-xs font-extrabold text-ink-950">UNO</span>}
            </li>
          );
        })}
      </ul>

      <section aria-label="Table" className="felt mx-auto flex max-w-4xl items-center justify-center gap-7 px-4 py-7 sm:gap-14 sm:py-10">
        <button type="button" disabled={!priv?.canDraw} onClick={() => void go({ type: 'draw' })} className="group relative z-[1] flex flex-col items-center gap-3 disabled:cursor-not-allowed">
          <span className="relative block">
            <CardBack className="absolute left-0 top-0 translate-x-[6px] translate-y-[6px] opacity-60" />
            <CardBack className="absolute left-0 top-0 translate-x-[3px] translate-y-[3px] opacity-80" />
            <CardBack className={`relative transition-transform ${priv?.canDraw ? 'group-hover:-translate-y-1.5 group-active:translate-y-0' : 'opacity-70'}`} />
          </span>
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${priv?.canDraw ? 'bg-card-yellow text-ink-950' : 'bg-ink-950/60 text-paper'}`}>{pub.pendingDraw > 0 ? `Draw ${pub.pendingDraw}` : `Draw (${pub.drawCount})`}</span>
        </button>
        <div className="relative z-[1] flex flex-col items-center gap-3">
          <div key={pub.topCard.id} className="card-land" style={{ '--tilt': tilt } as React.CSSProperties}><UnoCard card={pub.topCard} size="lg" /></div>
          <span className="inline-flex items-center gap-2 rounded-full bg-ink-950/60 py-1 pl-1.5 pr-3 text-sm font-bold">
            <span key={pub.activeColor} className={`color-flash inline-block h-5 w-5 rounded-full ${SWATCH[pub.activeColor]} shadow-[0_0_0_2px_rgb(var(--paper))]`} aria-hidden="true" />
            {pub.activeColor[0]?.toUpperCase()}{pub.activeColor.slice(1)} in play
          </span>
        </div>
      </section>

      <div role="status" aria-live="polite" className="min-h-[3.25rem] px-1">
        {turnLine && <p className={`font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] ${myTurn ? 'text-card-yellow' : ''}`}>{turnLine}</p>}
        {lines.length > 0 && <p className="mt-0.5 text-paper-dim">{lines.join('. ')}</p>}
        {pub.pendingDraw > 0 && <p className="mt-0.5 font-semibold text-card-yellow">Draw {pub.pendingDraw}, or stack another draw card.</p>}
      </div>
      {notice && <p role="alert" className="hint">{notice}</p>}

      {pub.unoVulnerable && !pub.winner && (
        <UnoRace
          target={pub.unoVulnerable} targetName={nameOf(pub.unoVulnerable)} viewerId={viewerId}
          shared={sharedUno}
          onPress={async (a) => { const problem = await send(a); setNotice(problem ?? ''); }}
          onShared={async (fn) => { const problem = await fn(); setNotice(problem ?? ''); }}
        />
      )}

      {handArea ?? (priv && viewerId ? (
        <section aria-label="Your hand" className="sticky bottom-0 z-20 -mx-4 bg-gradient-to-t from-ink-900 via-ink-900/95 to-transparent px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-6 sm:static sm:mx-0 sm:bg-none sm:p-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {priv.canPass && <Button variant="secondary" onClick={() => void go({ type: 'pass' })}>Pass and keep the card</Button>}
          </div>
          <ul className="-mx-4 flex overflow-x-auto px-6 pb-4 pt-5 [scrollbar-width:none] sm:mx-0 sm:justify-center sm:px-2">
            {hand.map((card, i) => (
              <li key={card.id} className="hand-in -ml-9 shrink-0 first:ml-0 sm:-ml-5" style={{ animationDelay: `${Math.min(i, 12) * 45}ms`, zIndex: playable.has(card.id) ? 2 : 1 }}>
                <span className={`block transition-transform duration-200 ${playable.has(card.id) && myTurn ? '-translate-y-3' : ''}`}><UnoCard card={card} playable={playable.has(card.id)} onClick={() => playCard(card)} /></span>
              </li>
            ))}
          </ul>
        </section>
      ) : null)}

      {pending && pending.color === 'wild' && (
        <Modal title="Choose a colour" onClose={() => setPending(null)}>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {COLORS.map((c: Color, i) => (
              <button key={c} type="button" autoFocus={i === 0} onClick={() => void go({ type: 'play', cardId: pending.id, color: c })}
                className={`btn !min-h-[72px] !rounded-[20px] text-xl ${SWATCH[c]}`} style={{ '--lip': '0 0 0' } as React.CSSProperties}>{c[0]?.toUpperCase()}{c.slice(1)}</button>
            ))}
          </div>
          <Button variant="ghost" className="mt-4 w-full" onClick={() => setPending(null)}>Cancel</Button>
        </Modal>
      )}
      {pending && pending.color !== 'wild' && (
        <Modal title="Swap hands with" onClose={() => setPending(null)}>
          <div className="mt-5 space-y-2">
            {pub.players.filter((p) => p.id !== viewerId).map((p, i) => (
              <Button key={p.id} variant="secondary" autoFocus={i === 0} className="w-full justify-between"
                onClick={() => void go({ type: 'play', cardId: pending.id, swapWith: p.id })}>
                <span>{nameOf(p.id)}</span><span className="text-paper-dim">{p.cards} cards</span>
              </Button>
            ))}
          </div>
          <Button variant="ghost" className="mt-4 w-full" onClick={() => setPending(null)}>Cancel</Button>
        </Modal>
      )}
      {pub.winner && (
        <Modal title={`${pub.winner === viewerId ? 'You win' : `${nameOf(pub.winner)} wins`}!`}>
          <p className="mt-2 text-paper-dim">First to empty their hand.</p>
          <div className="mt-6 flex flex-wrap gap-3">{winnerActions}</div>
        </Modal>
      )}
    </div>
  );
}
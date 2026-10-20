import { useEffect, useRef, useState, type ReactNode } from 'react';
import { RotateCcw, RotateCw, Timer } from 'lucide-react';
import type { AvatarId, PlayerId } from '@party/game-engine';
import { COLORS, type Card, type Color, type UnoAction, type UnoPrivateView, type UnoPublicView } from '@party/uno-engine';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { CardBack, SWATCH, UnoCard } from './UnoCard';
import { describeEvents } from './messages';
import { usePrefs } from '../../store/prefs';
import { playCue } from '../../audio/sound';
import { useCelebrate } from '../../hooks/useCelebrate';

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/80 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-sm rounded-xl border border-line bg-ink-800 p-6">
        <h2 className="text-xl font-bold">{title}</h2>
        {children}
      </div>
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
  /** Bumps whenever the local UI should forget half-finished input (a new game started). */
  resetKey?: number;
}

/** The table, the players and the hand. Knows nothing about where the game state comes from. */
export function UnoBoard({ pub, priv, viewerId, nameOf, avatarOf, secondsLeft, send, handArea, onLeave, winnerActions, resetKey = 0 }: UnoBoardProps) {
  const [armUno, setArmUno] = useState(false);
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState<Card | null>(null);
  useEffect(() => { setArmUno(false); setNotice(''); setPending(null); }, [resetKey]);

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

  const playable = new Set(priv?.playableCardIds ?? []);
  const go = async (a: UnoAction) => {
    const problem = await send(a);
    setNotice(problem ?? '');
    if (!problem) { setPending(null); if (a.type === 'play') setArmUno(false); }
  };
  const playCard = (card: Card) => {
    if (!playable.has(card.id)) return setNotice('That card cannot be played right now.');
    if (card.color === 'wild' || (card.value === 7 && pub.config.sevenZero)) return setPending(card);
    void go({ type: 'play', cardId: card.id, callUno: armUno });
  };

  const cur = pub.current;
  const lines = describeEvents(pub.events, nameOf, viewerId);
  const turnLine = pub.winner ? '' : viewerId && cur === viewerId ? 'Your turn' : `${nameOf(cur)}'s turn`;
  const hand = priv ? sortHand(priv.hand) : [];
  const Dir = pub.direction === 1 ? RotateCw : RotateCcw;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Colour Cards</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-paper-dim">
          <span className="inline-flex items-center gap-1.5"><Dir size={16} aria-hidden="true" />{pub.direction === 1 ? 'Clockwise' : 'Counter-clockwise'}</span>
          {secondsLeft !== null && <span className="inline-flex items-center gap-1.5"><Timer size={16} aria-hidden="true" />{secondsLeft}s</span>}
          <Button variant="ghost" onClick={onLeave}>Leave game</Button>
        </div>
      </header>

      <ul aria-label="Players" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {pub.players.map((p) => (
          <li key={p.id} className={`flex items-center gap-2 rounded-lg border p-2 ${p.id === cur && !pub.winner ? 'border-card-yellow bg-ink-700' : 'border-line bg-ink-800'}`}>
            <Avatar id={avatarOf(p.id)} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.id === viewerId ? 'You' : nameOf(p.id)}</p>
              <p className="text-sm text-paper-dim">{p.cards} {p.cards === 1 ? 'card' : 'cards'}{p.id === cur && !pub.winner ? ', turn' : ''}</p>
            </div>
            {p.cards === 1 && <span className="rounded border border-card-yellow px-1.5 text-xs font-bold text-card-yellow">UNO</span>}
          </li>
        ))}
      </ul>

      <section aria-label="Table" className="flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-line bg-[#16302b] p-6">
        <button type="button" disabled={!priv?.canDraw} onClick={() => void go({ type: 'draw' })} className="flex flex-col items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60">
          <CardBack />
          <span className="text-sm font-semibold">{pub.pendingDraw > 0 ? `Draw ${pub.pendingDraw}` : `Draw (${pub.drawCount})`}</span>
        </button>
        <div className="flex flex-col items-center gap-2">
          <UnoCard card={pub.topCard} size="lg" />
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <span className={`inline-block h-5 w-5 rounded-full border-2 border-paper ${SWATCH[pub.activeColor]}`} aria-hidden="true" />
            {pub.activeColor[0]?.toUpperCase()}{pub.activeColor.slice(1)} in play
          </span>
        </div>
      </section>

      <div role="status" aria-live="polite" className="min-h-[3rem]">
        {turnLine && <p className="text-lg font-bold">{turnLine}</p>}
        {lines.length > 0 && <p className="text-paper-dim">{lines.join('. ')}</p>}
        {pub.pendingDraw > 0 && <p className="text-card-yellow">Draw {pub.pendingDraw}, or stack another draw card.</p>}
      </div>
      {notice && <p role="alert" className="text-card-yellow">{notice}</p>}

      {handArea ?? (priv && viewerId ? (
        <section aria-label="Your hand">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {priv.canPass && <Button variant="secondary" onClick={() => void go({ type: 'pass' })}>Pass and keep the card</Button>}
            {priv.hand.length === 1 && pub.unoVulnerable === viewerId && <Button onClick={() => void go({ type: 'call-uno' })}>UNO!</Button>}
            {priv.hand.length === 2 && priv.yourTurn && (
              <Button variant={armUno ? 'primary' : 'secondary'} aria-pressed={armUno} onClick={() => setArmUno((v) => !v)}>
                {armUno ? 'UNO is set for your next card' : 'Call UNO with your next card'}
              </Button>
            )}
            {pub.unoVulnerable && pub.unoVulnerable !== viewerId && (
              <Button variant="secondary" onClick={() => void go({ type: 'catch-uno', target: pub.unoVulnerable as PlayerId })}>
                Catch {nameOf(pub.unoVulnerable)} (no UNO)
              </Button>
            )}
          </div>
          <ul className="flex gap-1.5 overflow-x-auto px-1 pb-3 pt-4">
            {hand.map((card) => (
              <li key={card.id} className="shrink-0"><UnoCard card={card} playable={playable.has(card.id)} onClick={() => playCard(card)} /></li>
            ))}
          </ul>
        </section>
      ) : null)}

      {pending && pending.color === 'wild' && (
        <Modal title="Choose a colour" onClose={() => setPending(null)}>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {COLORS.map((c: Color, i) => (
              <button key={c} type="button" autoFocus={i === 0} onClick={() => void go({ type: 'play', cardId: pending.id, color: c, callUno: armUno })}
                className={`min-h-[56px] rounded-lg border-2 border-paper font-bold ${SWATCH[c]}`}>{c[0]?.toUpperCase()}{c.slice(1)}</button>
            ))}
          </div>
          <Button variant="ghost" className="mt-4 w-full" onClick={() => setPending(null)}>Cancel</Button>
        </Modal>
      )}
      {pending && pending.color !== 'wild' && (
        <Modal title="Swap hands with" onClose={() => setPending(null)}>
          <div className="mt-4 space-y-2">
            {pub.players.filter((p) => p.id !== viewerId).map((p, i) => (
              <Button key={p.id} variant="secondary" autoFocus={i === 0} className="w-full justify-between"
                onClick={() => void go({ type: 'play', cardId: pending.id, swapWith: p.id, callUno: armUno })}>
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
          <div className="mt-5 flex flex-wrap gap-3">{winnerActions}</div>
        </Modal>
      )}
    </div>
  );
}

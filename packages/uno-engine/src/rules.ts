import { fail, ok, type PlayerId, type Result, type Rng } from '@party/game-engine';
import { COLORS, type Card, type Color, type UnoAction, type UnoEvent, type UnoState } from './types';

export const currentPlayer = (s: UnoState): PlayerId => s.order[s.current] as PlayerId;
export const topCard = (s: UnoState): Card => s.discard[s.discard.length - 1] as Card;
const isColor = (c: unknown): c is Color => COLORS.includes(c as Color);

/** Can `card` be played from `hand` on the current state (ignoring whose turn it is)? */
export function isPlayable(s: UnoState, hand: readonly Card[], card: Card): boolean {
  if (s.pendingDraw > 0) return card.value === s.pendingKind; // only reachable with stackDraws
  if (card.value === 'wild') return true;
  // Wild Draw Four is only legal when you hold no card of the active colour.
  if (card.value === 'wild4') return !hand.some((c) => c.color === s.activeColor);
  return card.color === s.activeColor || card.value === topCard(s).value;
}

export function validate(s: UnoState, pid: PlayerId, a: UnoAction): Result<true> {
  if (s.winner) return fail('game_over', 'The game is over.');
  const hand = s.hands[pid];
  if (!hand) return fail('not_player', 'You are not in this game.');
  const myTurn = currentPlayer(s) === pid;

  switch (a.type) {
    case 'call-uno':
      return hand.length === 1 && s.unoPending === pid ? ok(true) : fail('nothing_to_call', 'You have nothing to call UNO on.');
    case 'catch-uno':
      if (a.target === pid) return fail('self_catch', 'You cannot catch yourself.');
      return s.unoPending === a.target ? ok(true) : fail('too_late', 'Too late. That player is no longer catchable.');
    case 'draw':
      if (!myTurn) return fail('not_your_turn', 'It is not your turn.');
      if (s.drewCardId !== null) return fail('already_drew', 'You already drew. Play that card or pass.');
      if (s.pendingDraw === 0 && hand.some((c) => isPlayable(s, hand, c))) return fail('has_play', 'You have a card you can play.');
      return ok(true);
    case 'pass':
      if (!myTurn) return fail('not_your_turn', 'It is not your turn.');
      return s.drewCardId === null ? fail('cannot_pass', 'Draw a card before passing.') : ok(true);
    case 'play': {
      const card = hand.find((c) => c.id === a.cardId);
      if (!card) return fail('no_such_card', 'You do not hold that card.');
      if (myTurn) {
        if (s.drewCardId !== null && card.id !== s.drewCardId) return fail('must_play_drawn', 'You can only play the card you just drew, or pass.');
        if (!isPlayable(s, hand, card)) return fail('illegal_card', 'That card does not match the colour or number.');
      } else {
        if (!s.config.jumpIn || s.pendingDraw > 0 || s.drewCardId !== null) return fail('not_your_turn', 'It is not your turn.');
        const t = topCard(s);
        if (card.color === 'wild' || card.color !== t.color || card.value !== t.value) return fail('illegal_jump', 'Jump in only with an identical card.');
      }
      if (card.color === 'wild' && !isColor(a.color)) return fail('color_required', 'Choose a colour for the Wild card.');
      if (card.value === 7 && s.config.sevenZero && (!a.swapWith || a.swapWith === pid || !s.hands[a.swapWith])) {
        return fail('swap_required', 'Choose a player to swap hands with.');
      }
      return ok(true);
    }
  }
}

/** Every action this player could legally take right now (wilds expand to 4 colours, sevens to each target). */
export function legalActions(s: UnoState, pid: PlayerId): UnoAction[] {
  const hand = s.hands[pid];
  if (!hand || s.winner) return [];
  const out: UnoAction[] = [];
  const consider = (a: UnoAction) => { if (validate(s, pid, a).ok) out.push(a); };
  for (const card of hand) {
    const colors: (Color | undefined)[] = card.color === 'wild' ? [...COLORS] : [undefined];
    const targets: (PlayerId | undefined)[] = card.value === 7 && s.config.sevenZero ? s.order.filter((p) => p !== pid) : [undefined];
    for (const color of colors) for (const swapWith of targets) {
      const a: UnionPlay = { type: 'play', cardId: card.id };
      if (color) a.color = color;
      if (swapWith) a.swapWith = swapWith;
      consider(a);
    }
  }
  consider({ type: 'draw' });
  consider({ type: 'pass' });
  return out;
}
type UnionPlay = Extract<UnoAction, { type: 'play' }>;

const wrap = (i: number, n: number) => ((i % n) + n) % n;

function drawCards(s: UnoState, n: number, rng: Rng): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0) {
      if (s.discard.length <= 1) break; // nothing left to reshuffle
      const keep = s.discard.pop() as Card;
      s.drawPile = rng.shuffle(s.discard);
      s.discard = [keep];
    }
    out.push(s.drawPile.pop() as Card);
  }
  return out;
}

/** Validates, then returns the next state. Never mutates the input. */
export function step(state: UnoState, pid: PlayerId, a: UnoAction, rng: Rng): Result<UnoState> {
  const v = validate(state, pid, a);
  if (!v.ok) return v;
  const s = structuredClone(state);
  const n = s.order.length;
  const ev = (e: UnoEvent) => s.events.push(e);
  const advance = (steps: number) => { s.current = wrap(s.current + s.direction * steps, n); };
  const peek = (steps: number) => s.order[wrap(s.current + s.direction * steps, n)] as PlayerId;
  const give = (to: PlayerId, count: number) => {
    const cards = drawCards(s, count, rng);
    (s.hands[to] as Card[]).push(...cards);
    return cards.length;
  };
  s.events = [];
  s.turnDeadline = null;

  if (a.type === 'call-uno') {
    s.unoPending = null;
    ev({ type: 'uno', by: pid });
    return ok(s);
  }
  if (a.type === 'catch-uno') {
    s.unoPending = null;
    ev({ type: 'caught', target: a.target, by: pid });
    const count = give(a.target, s.config.unoPenalty);
    ev({ type: 'penalty', player: a.target, count, reason: 'uno' });
    return ok(s);
  }

  // Any real move closes the window to catch someone else's missed UNO.
  if (s.unoPending && s.unoPending !== pid) s.unoPending = null;

  if (a.type === 'pass') {
    s.drewCardId = null;
    ev({ type: 'passed', by: pid });
    advance(1);
    return ok(s);
  }

  if (a.type === 'draw') {
    if (s.pendingDraw > 0) {
      const count = give(pid, s.pendingDraw);
      ev({ type: 'penalty', player: pid, count, reason: 'stack' });
      s.pendingDraw = 0;
      s.pendingKind = null;
      advance(1);
      return ok(s);
    }
    const [drawn] = drawCards(s, 1, rng);
    ev({ type: 'drew', by: pid, count: drawn ? 1 : 0 });
    if (!drawn) { advance(1); return ok(s); }
    const hand = s.hands[pid] as Card[];
    hand.push(drawn);
    if (isPlayable(s, hand, drawn)) s.drewCardId = drawn.id;
    else advance(1);
    return ok(s);
  }

  // --- play ---
  const hand = s.hands[pid] as Card[];
  const card = hand.splice(hand.findIndex((c) => c.id === a.cardId), 1)[0] as Card;
  if (currentPlayer(s) !== pid) s.current = s.order.indexOf(pid); // jump-in takes the turn
  s.drewCardId = null;
  s.discard.push(card);
  ev({ type: 'played', by: pid, card });
  if (card.color === 'wild') {
    s.activeColor = a.color as Color;
    ev({ type: 'color', color: a.color as Color });
  } else s.activeColor = card.color;

  if (hand.length === 0) {
    s.winner = pid;
    ev({ type: 'won', player: pid });
    return ok(s);
  }
  // UNO is never automatic: reaching one card opens a window where the player and
  // everyone else race to press UNO. First press wins (safe for the owner, penalty
  // if someone else is faster).
  if (hand.length === 1) s.unoPending = pid;

  const drawEffect = (count: number) => {
    if (s.config.stackDraws) {
      s.pendingDraw += count;
      s.pendingKind = card.value as 'draw2' | 'wild4';
      advance(1);
    } else {
      const victim = peek(1);
      const got = give(victim, count);
      ev({ type: 'penalty', player: victim, count: got, reason: 'draw-effect' });
      ev({ type: 'skipped', player: victim });
      advance(2);
    }
  };

  switch (card.value) {
    case 'skip':
      ev({ type: 'skipped', player: peek(1) });
      advance(2);
      break;
    case 'reverse':
      s.direction = (s.direction * -1) as 1 | -1;
      ev({ type: 'reversed' });
      if (n === 2) { ev({ type: 'skipped', player: peek(1) }); advance(2); } // acts like Skip with two players
      else advance(1);
      break;
    case 'draw2': drawEffect(2); break;
    case 'wild4': drawEffect(4); break;
    case 7:
      if (s.config.sevenZero) {
        const other = a.swapWith as PlayerId;
        const mine = s.hands[pid] as Card[];
        s.hands[pid] = s.hands[other] as Card[];
        s.hands[other] = mine;
        ev({ type: 'swapped', a: pid, b: other });
      }
      advance(1);
      break;
    case 0:
      if (s.config.sevenZero) {
        const old = s.hands;
        const next: Record<PlayerId, Card[]> = {};
        s.order.forEach((id, i) => { next[s.order[wrap(i + s.direction, n)] as PlayerId] = old[id] as Card[]; });
        s.hands = next;
        ev({ type: 'rotated' });
      }
      advance(1);
      break;
    default:
      advance(1);
  }
  return ok(s);
}

/** Owner (server or offline adapter) calls this after every transition to (re)start the turn clock. */
export function withClock(s: UnoState, now: number): UnoState {
  return { ...s, turnDeadline: s.config.turnTimer > 0 && !s.winner ? now + s.config.turnTimer * 1000 : null };
}

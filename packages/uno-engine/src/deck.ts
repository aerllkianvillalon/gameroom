import { COLORS, type Card, type CardValue } from './types';

const REPEATED: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'skip', 'reverse', 'draw2'];

/** 108 cards: per colour one 0 and two each of 1-9, Skip, Reverse, Draw Two; plus 4 Wild and 4 Wild Draw Four. */
export function buildDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (const color of COLORS) {
    cards.push({ id: id++, color, value: 0 });
    for (const value of REPEATED) for (let i = 0; i < 2; i++) cards.push({ id: id++, color, value });
  }
  for (let i = 0; i < 4; i++) cards.push({ id: id++, color: 'wild', value: 'wild' });
  for (let i = 0; i < 4; i++) cards.push({ id: id++, color: 'wild', value: 'wild4' });
  return cards;
}

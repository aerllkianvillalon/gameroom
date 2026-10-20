import type { PlayerId } from '@party/game-engine';
import type { Card, UnoEvent } from '@party/uno-engine';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function cardName(c: Card): string {
  const v = c.value === 'wild' ? 'Wild' : c.value === 'wild4' ? 'Wild Draw Four' : c.value === 'draw2' ? 'Draw Two' : typeof c.value === 'number' ? String(c.value) : cap(c.value);
  return c.color === 'wild' ? v : `${c.color} ${v}`;
}

/** Short, plain messages for the status line. `you` is whoever is looking at the screen. */
export function describeEvents(events: readonly UnoEvent[], nameOf: (id: PlayerId) => string, you: PlayerId | null): string[] {
  const who = (id: PlayerId) => (id === you ? 'You' : nameOf(id));
  const verb = (id: PlayerId, second: string, third: string) => `${who(id)} ${id === you ? second : third}`;
  return events.map((e) => {
    switch (e.type) {
      case 'played': return `${verb(e.by, 'played', 'played')} ${cardName(e.card)}`;
      case 'color': return `${cap(e.color)} selected`;
      case 'drew': return e.count ? `${verb(e.by, 'drew', 'drew')} a card` : 'No cards left to draw';
      case 'skipped': return `${who(e.player)} ${e.player === you ? 'were' : 'was'} skipped`;
      case 'reversed': return 'Direction reversed';
      case 'penalty': return `${verb(e.player, 'draw', 'draws')} ${e.count}`;
      case 'uno': return `${verb(e.by, 'called', 'called')} UNO!`;
      case 'caught': return `${verb(e.by, 'caught', 'caught')} ${who(e.target)} without UNO`;
      case 'swapped': return `${who(e.a)} swapped hands with ${who(e.b)}`;
      case 'rotated': return 'Every hand moved along';
      case 'passed': return `${verb(e.by, 'passed', 'passed')}`;
      case 'won': return `${who(e.player)} ${e.player === you ? 'win' : 'wins'}!`;
    }
  });
}

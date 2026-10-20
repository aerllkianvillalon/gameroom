import { describe, expect, it } from 'vitest';
import { cardName, describeEvents } from './messages';

const names: Record<string, string> = { a: 'Ana', b: 'Bo' };
const nameOf = (id: string) => names[id] ?? '?';

describe('uno messages', () => {
  it('names cards plainly', () => {
    expect(cardName({ id: 1, color: 'red', value: 'skip' })).toBe('red Skip');
    expect(cardName({ id: 2, color: 'wild', value: 'wild4' })).toBe('Wild Draw Four');
    expect(cardName({ id: 3, color: 'blue', value: 7 })).toBe('blue 7');
  });
  it('speaks to the viewer in second person', () => {
    const ev = [
      { type: 'played' as const, by: 'a', card: { id: 1, color: 'red' as const, value: 'skip' as const } },
      { type: 'skipped' as const, player: 'b' },
      { type: 'penalty' as const, player: 'a', count: 2, reason: 'uno' as const },
      { type: 'color' as const, color: 'green' as const },
    ];
    expect(describeEvents(ev, nameOf, 'a')).toEqual(['You played red Skip', 'Bo was skipped', 'You draw 2', 'Green selected']);
    expect(describeEvents(ev, nameOf, 'b')[0]).toBe('Ana played red Skip');
    expect(describeEvents(ev, nameOf, 'b')[1]).toBe('You were skipped');
  });
});

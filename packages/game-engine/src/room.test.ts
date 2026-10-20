import { describe, expect, it } from 'vitest';
import {
  addMember, setHost, canStart, createRoom, generateRoomCode, isValidRoomCode, normalizeRoomCode,
  removeMember, ROOM_CODE_ALPHABET, sanitizeName, setReady, setSettings, startRoom, validateName,
  type Room,
} from './room';
import { createRng } from './rng';
import type { PlayerRef } from './types';

const p = (id: string, name = id, isBot = false): PlayerRef => ({ id, name, avatar: 'cat', isBot });
const base = (mode: 'local' | 'online' = 'online', max = 3): Room =>
  createRoom({ code: 'ABCDE', gameId: 'uno', mode, host: p('h', 'Host'), minPlayers: 2, maxPlayers: max, settings: {}, now: 0 });
const must = <T,>(r: { ok: true; value: T } | { ok: false; message: string }): T => {
  if (!r.ok) throw new Error(r.message);
  return r.value;
};

describe('room codes', () => {
  it('generates valid, unique codes without ambiguous characters', () => {
    const rng = createRng(9);
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const c = generateRoomCode(rng, seen);
      expect(isValidRoomCode(c)).toBe(true);
      expect(seen.has(c)).toBe(false);
      seen.add(c);
    }
    expect(ROOM_CODE_ALPHABET).not.toMatch(/[ILO01]/);
  });
  it('normalizes pasted input', () => {
    expect(normalizeRoomCode(' ab-cd e ')).toBe('ABCDE');
  });
});

describe('names', () => {
  it('strips markup and control characters, collapses spaces, caps length', () => {
    expect(sanitizeName('  <b>Al</b>\u0000   ex ')).toBe('bAl/b ex');
    expect(sanitizeName('x'.repeat(40))).toHaveLength(16);
  });
  it('rejects empty names', () => {
    expect(validateName('  <> ').ok).toBe(false);
  });
});

describe('membership', () => {
  it('rejects a full room, duplicate names, and joins after start', () => {
    let r = base('local', 2);
    r = must(addMember(r, p('a', 'Amy')));
    expect(addMember(r, p('b', 'Bo')).ok).toBe(false); // full
    const open = base('local', 4);
    expect(addMember(open, p('x', 'host')).ok).toBe(false); // name clash, case-insensitive
    const started = must(startRoom(must(addMember(open, p('a', 'Amy'))), 'h'));
    expect(addMember(started, p('b', 'Bo')).ok).toBe(false);
  });
  it('passes host to the next human and empties a bots-only room', () => {
    let r = must(addMember(base(), p('a', 'Amy')));
    r = must(addMember(r, p('bot', 'Pepper', true)));
    r = must(removeMember(r, 'h'));
    expect(r.hostId).toBe('a');
    r = must(removeMember(r, 'a'));
    expect(r.members).toHaveLength(0);
  });
});

describe('starting', () => {
  it('local rooms need no ready check; online rooms do', () => {
    const local = must(addMember(base('local'), p('a', 'Amy')));
    expect(canStart(local).ok).toBe(true);
    const online = must(addMember(base('online'), p('a', 'Amy')));
    expect(canStart(online).ok).toBe(false);
    expect(canStart(must(setReady(online, 'a', true))).ok).toBe(true);
  });
  it('enforces the minimum player count and host-only actions', () => {
    expect(canStart(base()).ok).toBe(false);
    const r = must(addMember(base('local'), p('a', 'Amy')));
    expect(startRoom(r, 'a').ok).toBe(false);
    expect(setSettings(r, 'a', { x: 1 }).ok).toBe(false);
    expect(must(setSettings(r, 'h', { x: 1 })).settings.x).toBe(1);
  });
});

describe('host handover', () => {
  it('passes the host role to a human member only', () => {
    let r = must(addMember(base(), p('a', 'Amy')));
    r = must(addMember(r, p('bot', 'Pepper', true)));
    expect(must(setHost(r, 'a')).hostId).toBe('a');
    expect(setHost(r, 'bot').ok).toBe(false);
    expect(setHost(r, 'ghost').ok).toBe(false);
  });
});

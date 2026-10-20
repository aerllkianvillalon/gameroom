import { describe, expect, it } from 'vitest';
import { createRng } from '@party/game-engine';
import { OfflineAdapter } from './offline-adapter';

const args = { gameId: 'uno', minPlayers: 2, maxPlayers: 3, hostName: ' Sam ', hostAvatar: 'cat' as const, settings: {} };

describe('OfflineAdapter', () => {
  it('creates a local room with a sanitized host and notifies subscribers', () => {
    const a = new OfflineAdapter(createRng(1));
    let calls = 0;
    a.subscribe(() => calls++);
    expect(a.createRoom(args).ok).toBe(true);
    expect(a.getRoom()?.members[0]?.name).toBe('Sam');
    expect(a.getRoom()?.mode).toBe('local');
    expect(calls).toBe(1);
  });
  it('adds bots with unique names until the room is full', () => {
    const a = new OfflineAdapter(createRng(2));
    a.createRoom(args);
    expect(a.addBot().ok).toBe(true);
    expect(a.addBot().ok).toBe(true);
    expect(a.addBot().ok).toBe(false);
    expect(new Set(a.getRoom()!.members.map((m) => m.name)).size).toBe(3);
  });
  it('refuses to remove the host and errors when no room is open', () => {
    const a = new OfflineAdapter(createRng(3));
    expect(a.addBot().ok).toBe(false);
    a.createRoom(args);
    expect(a.removePlayer(a.getRoom()!.hostId).ok).toBe(false);
  });
  it('leave() clears the room', () => {
    const a = new OfflineAdapter(createRng(4));
    a.createRoom(args);
    a.leave();
    expect(a.getRoom()).toBe(null);
  });
  it('starts a room once it has enough players and can return to the lobby', () => {
    const a = new OfflineAdapter(createRng(5));
    a.createRoom(args);
    expect(a.start().ok).toBe(false); // needs 2 players
    a.addBot();
    expect(a.start().ok).toBe(true);
    expect(a.getRoom()?.phase).toBe('playing');
    expect(a.addBot().ok).toBe(false); // locked once started
    a.returnToLobby();
    expect(a.getRoom()?.phase).toBe('lobby');
  });
});

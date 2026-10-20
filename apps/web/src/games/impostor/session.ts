import { createRng, randomSeed, type PlayerId, type Result, type Room, type Rng } from '@party/game-engine';
import {
  configFromSettings, getCategory, impostorEngine, packToGroups, pickSecret, pushRecent, step, withClock,
  type ImpostorAction, type ImpostorConfig, type ImpostorState, type WordGroup, type WordPack,
} from '@party/impostor-engine';
import type { Scheduler } from '../uno/session';

const timeoutScheduler: Scheduler = (fn, ms) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

/** Pass and play: clues are spoken aloud, so typedClues is off. */
export const configFromRoom = (room: Room): ImpostorConfig => configFromSettings(room.settings, room.members.length, false);

/** Resolves the room's category setting ("animals" or "pack:<id>") to a word pool; unknown values fall back to objects. */
export function groupsForCategory(category: string, packs: readonly WordPack[]): WordGroup[] {
  if (category.startsWith('pack:')) {
    const pack = packs.find((p) => p.id === category.slice(5));
    if (pack) return packToGroups(pack);
  }
  return (getCategory(category) ?? getCategory('objects'))!.groups;
}

export interface ImpostorSessionOptions {
  rng?: Rng;
  now?: () => number;
  schedule?: Scheduler;
  recent?: string[];
  /** Called with the chosen word so the caller can persist the recent-words list. */
  onWord?: (recent: string[]) => void;
}

/** One ImpostorWho game on this device. All players are humans sharing the screen. */
export class ImpostorSession {
  private state!: ImpostorState;
  private listeners = new Set<() => void>();
  private rng: Rng;
  private now: () => number;
  private schedule: Scheduler;
  private recent: string[];
  private cancel: (() => void) | null = null;
  private disposed = false;

  constructor(readonly room: Room, private groups: WordGroup[], private opts: ImpostorSessionOptions = {}) {
    this.rng = opts.rng ?? createRng(randomSeed());
    this.now = opts.now ?? Date.now;
    this.schedule = opts.schedule ?? timeoutScheduler;
    this.recent = opts.recent ?? [];
    this.restart();
  }

  getState = () => this.state;
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  };
  nameOf = (id: PlayerId) => this.room.members.find((m) => m.id === id)?.name ?? 'Player';
  avatarOf = (id: PlayerId) => this.room.members.find((m) => m.id === id)?.avatar ?? 'cat';

  restart() {
    const secret = pickSecret(this.groups, this.rng, this.recent);
    this.recent = pushRecent(this.recent, secret.word);
    this.opts.onWord?.(this.recent);
    this.commit(impostorEngine.init({ ...configFromRoom(this.room), secret }, this.room.members, this.rng));
  }

  act(pid: PlayerId, action: ImpostorAction): Result<true> {
    const r = step(this.state, pid, action);
    if (r.ok) this.commit(r.value);
    return r.ok ? { ok: true, value: true } : r;
  }

  dispose() {
    this.disposed = true;
    this.cancel?.();
    this.listeners.clear();
  }

  private commit(next: ImpostorState) {
    this.state = withClock(next, this.now());
    this.listeners.forEach((l) => l());
    this.cancel?.();
    this.cancel = null;
    const deadline = this.state.discussionDeadline;
    if (!this.disposed && deadline !== null) this.cancel = this.schedule(() => this.tick(), Math.max(0, deadline - this.now()));
  }

  private tick() {
    if (this.disposed) return;
    const next = impostorEngine.onTimeout!(this.state, this.now(), this.rng);
    if (next !== this.state) this.commit(next);
    else this.cancel = this.schedule(() => this.tick(), 50); // fired a hair early
  }
}

let active: ImpostorSession | null = null;
export const getActiveSession = () => active;
export function setActiveSession(s: ImpostorSession | null) {
  active?.dispose();
  active = s;
}

import { fail, ok, createRng, randomSeed, type PlayerId, type Result, type Rng, type Room } from '@party/game-engine';
import {
  botLevelFromSettings, chooseBotAction, chooseBotUnoReaction, configFromSettings, currentPlayer, step, unoEngine, withClock,
  type BotLevel, type UnoAction, type UnoConfig, type UnoState,
} from '@party/uno-engine';

export type Cancel = () => void;
export type Scheduler = (fn: () => void, ms: number) => Cancel;
const timeoutScheduler: Scheduler = (fn, ms) => {
  const t = setTimeout(fn, ms);
  return () => clearTimeout(t);
};

/** How long a bot's move is held back while a UNO window is open, and how fast bots may react inside it. */
export const UNO_WINDOW_MS = 1800;
const UNO_REACT_MIN_MS = 500;
const UNO_REACT_MAX_MS = 1600;

export const configFromRoom = (room: Room): UnoConfig => configFromSettings(room.settings);
export const botLevelFromRoom = (room: Room): BotLevel => botLevelFromSettings(room.settings);

export interface SessionOptions {
  rng?: Rng;
  now?: () => number;
  schedule?: Scheduler;
  botDelayMs?: number;
}

/** Runs one UNO game on this device: humans act through act(), bots and the turn clock run themselves. */
export class UnoSession {
  readonly humans: PlayerId[];
  private readonly bots: Set<PlayerId>;
  private readonly level: BotLevel;
  private readonly rng: Rng;
  private readonly now: () => number;
  private readonly schedule: Scheduler;
  private readonly botDelay: number;
  private state!: UnoState;
  private seq = 0;
  private listeners = new Set<() => void>();
  private cancelBot: Cancel | null = null;
  private cancelClock: Cancel | null = null;
  private cancelUno: Cancel[] = [];
  private disposed = false;

  constructor(readonly room: Room, opts: SessionOptions = {}) {
    this.humans = room.members.filter((m) => !m.isBot).map((m) => m.id);
    this.bots = new Set(room.members.filter((m) => m.isBot).map((m) => m.id));
    this.level = botLevelFromRoom(room);
    this.rng = opts.rng ?? createRng(randomSeed());
    this.now = opts.now ?? Date.now;
    this.schedule = opts.schedule ?? timeoutScheduler;
    this.botDelay = opts.botDelayMs ?? 900;
    this.restart();
  }

  getState = () => this.state;
  /** Increments every time the turn passes to someone else; pass-and-play uses it to re-lock the hand. */
  getTurnSeq = () => this.seq;
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  };
  isHuman = (id: PlayerId) => !this.bots.has(id);
  nameOf = (id: PlayerId) => this.room.members.find((m) => m.id === id)?.name ?? 'Player';
  avatarOf = (id: PlayerId) => this.room.members.find((m) => m.id === id)?.avatar ?? 'cat';

  restart() {
    this.commit(unoEngine.init(configFromRoom(this.room), this.room.members, this.rng), true);
  }

  act(pid: PlayerId, action: UnoAction): Result<true> {
    if (this.bots.has(pid)) return fail('not_human', 'Bots play for themselves.');
    const r = step(this.state, pid, action, this.rng);
    if (!r.ok) return r;
    this.commit(r.value);
    return ok(true);
  }

  dispose() {
    this.disposed = true;
    this.cancelBot?.();
    this.cancelClock?.();
    this.clearUno();
    this.listeners.clear();
  }

  private commit(next: UnoState, fresh = false) {
    const turnChanged = fresh || (this.state && currentPlayer(next) !== currentPlayer(this.state));
    if (turnChanged) this.seq++;
    this.state = withClock(next, this.now());
    this.listeners.forEach((l) => l());
    this.plan();
  }

  private plan() {
    this.cancelBot?.();
    this.cancelClock?.();
    this.cancelBot = this.cancelClock = null;
    this.clearUno();
    if (this.disposed || this.state.winner) return;
    // While a UNO window is open, a bot's move waits so people get a fair race to press UNO.
    const unoOpen = this.state.unoPending !== null;
    if (this.bots.has(currentPlayer(this.state))) this.cancelBot = this.schedule(() => this.botMove(), this.botDelay + (unoOpen ? UNO_WINDOW_MS : 0));
    if (unoOpen) this.planUnoReactions();
    const deadline = this.state.turnDeadline;
    if (deadline !== null) this.cancelClock = this.schedule(() => this.timeout(), Math.max(0, deadline - this.now()));
  }

  private clearUno() {
    this.cancelUno.forEach((c) => c());
    this.cancelUno = [];
  }

  /** Each bot may press UNO after its own random reaction time, so it is a real race with the humans. */
  private planUnoReactions() {
    for (const bot of this.bots) {
      const wait = UNO_REACT_MIN_MS + this.rng.next() * (UNO_REACT_MAX_MS - UNO_REACT_MIN_MS);
      this.cancelUno.push(this.schedule(() => this.botUno(bot), wait));
    }
  }

  private botUno(bot: PlayerId) {
    if (this.disposed) return;
    const action = chooseBotUnoReaction(this.state, bot, this.level, this.rng);
    if (!action) return;
    const r = step(this.state, bot, action, this.rng);
    if (r.ok) this.commit(r.value);
  }

  private botMove() {
    const pid = currentPlayer(this.state);
    if (this.disposed || !this.bots.has(pid)) return;
    const r = step(this.state, pid, chooseBotAction(this.state, pid, this.level, this.rng), this.rng);
    if (r.ok) this.commit(r.value);
  }

  private timeout() {
    if (this.disposed) return;
    const next = unoEngine.onTimeout!(this.state, this.now(), this.rng);
    if (next !== this.state) this.commit(next);
    else this.cancelClock = this.schedule(() => this.timeout(), 50); // fired a hair early
  }
}

let active: UnoSession | null = null;
export const getActiveSession = () => active;
export function setActiveSession(s: UnoSession | null) {
  active?.dispose();
  active = s;
}

import { fail, ok, type PlayerId, type Result } from '@party/game-engine';
import type { Cancel, GameHost, HostCtx } from './types';

/** What a deadline-driven game gives the shared host. Rules stay in the engine; this only adapts it. */
export interface TimedGame<S, A> {
  gameId: string;
  actions: ReadonlySet<string>;
  step(s: S, pid: PlayerId, a: A): Result<S>;
  /** Returns the same object when nothing is due. */
  tick(s: S, now: number): S;
  /** Starts the next deadline exactly once. */
  clock(s: S, now: number): S;
  views(s: S, pid: PlayerId): { public: unknown; private: unknown };
  over(s: S): boolean;
  deadline(s: S): number | null;
  /** A disconnected player the game cannot move on without (and has no timer for). */
  awayWaiting?(s: S, isAway: (id: PlayerId) => boolean): PlayerId | undefined;
  /** A neutral action the server plays for that player. */
  autoAction?(s: S, who: PlayerId): A | null;
}

/** Runs one timed game inside a room: deadline timer, optional autoplay for absent players, push on change. */
export class TimedHost<S, A> implements GameHost {
  readonly gameId: string;
  private state: S;
  private cancelTimer: Cancel | null = null;
  private cancelAway: Cancel | null = null;
  private chain = false;
  private disposed = false;

  constructor(private ctx: HostCtx, private game: TimedGame<S, A>, initial: S) {
    this.gameId = game.gameId;
    this.state = game.clock(initial, ctx.now());
    this.plan();
  }

  act(pid: PlayerId, action: unknown): Result<true> {
    if (!this.game.actions.has((action as { type?: string } | null)?.type ?? '')) return fail('bad_action', 'That action does not belong to this game.');
    const r = this.game.step(this.state, pid, action as A);
    if (!r.ok) return r;
    this.chain = false;
    this.commit(r.value);
    return ok(true);
  }

  views = (pid: PlayerId) => this.game.views(this.state, pid);
  isOver = () => this.game.over(this.state);
  onPresence() { this.plan(); }

  dispose() {
    this.disposed = true;
    this.cancelTimer?.();
    this.cancelAway?.();
  }

  private commit(next: S) {
    this.state = this.game.clock(next, this.ctx.now());
    this.plan();
    this.ctx.notify();
  }

  private plan() {
    this.cancelTimer?.();
    this.cancelAway?.();
    this.cancelTimer = this.cancelAway = null;
    if (this.disposed || this.game.over(this.state)) return;
    const dl = this.game.deadline(this.state);
    if (dl !== null) this.cancelTimer = this.ctx.schedule(() => this.tick(), Math.max(0, dl - this.ctx.now()));
    if (this.game.awayWaiting?.(this.state, this.ctx.isAway)) {
      this.cancelAway = this.ctx.schedule(() => this.autoStep(), this.chain ? 1500 : this.ctx.timing.awayDelayMs);
    }
  }

  private tick() {
    if (this.disposed) return;
    const next = this.game.tick(this.state, this.ctx.now());
    if (next !== this.state) this.commit(next);
    else this.cancelTimer = this.ctx.schedule(() => this.tick(), 50); // fired a hair early
  }

  private autoStep() {
    if (this.disposed) return;
    const who = this.game.awayWaiting?.(this.state, this.ctx.isAway);
    const action = who ? this.game.autoAction?.(this.state, who) : null;
    if (!who || !action) return;
    const r = this.game.step(this.state, who, action);
    this.chain = true;
    if (r.ok) this.commit(r.value);
  }
}

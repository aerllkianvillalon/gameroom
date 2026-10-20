import { fail, ok, type PlayerId, type Result } from '@party/game-engine';
import {
  botLevelFromSettings, chooseBotAction, configFromSettings, currentPlayer, step, unoEngine, withClock,
  type UnoAction, type UnoState,
} from '@party/uno-engine';
import type { Cancel, GameHost, HostCtx } from './types';

const ACTIONS = new Set(['play', 'draw', 'pass', 'call-uno', 'catch-uno']);

export class UnoHost implements GameHost {
  readonly gameId = 'uno';
  private state: UnoState;
  private readonly bots: Set<PlayerId>;
  private readonly level;
  private cancelMove: Cancel | null = null;
  private cancelClock: Cancel | null = null;
  /** Away players the server has already played for once; their later turns go faster. */
  private chain = new Set<PlayerId>();
  private disposed = false;

  constructor(private ctx: HostCtx) {
    this.bots = new Set(ctx.room.members.filter((m) => m.isBot).map((m) => m.id));
    this.level = botLevelFromSettings(ctx.room.settings);
    this.state = withClock(unoEngine.init(configFromSettings(ctx.room.settings), ctx.room.members, ctx.rng), ctx.now());
    this.plan();
  }

  act(pid: PlayerId, action: unknown): Result<true> {
    if (!ACTIONS.has((action as { type?: string }).type ?? '')) return fail('bad_action', 'That action does not belong to this game.');
    if (this.bots.has(pid)) return fail('not_human', 'Bots play for themselves.');
    const r = step(this.state, pid, action as UnoAction, this.ctx.rng);
    if (!r.ok) return r;
    this.chain.delete(pid);
    this.commit(r.value);
    return ok(true);
  }

  views = (pid: PlayerId) => ({ public: unoEngine.publicView(this.state), private: unoEngine.privateView(this.state, pid) });
  isOver = () => this.state.winner !== null;

  onPresence() {
    for (const id of [...this.chain]) if (!this.ctx.isAway(id)) this.chain.delete(id);
    this.plan();
  }

  dispose() {
    this.disposed = true;
    this.cancelMove?.();
    this.cancelClock?.();
  }

  private commit(next: UnoState) {
    this.state = withClock(next, this.ctx.now());
    this.plan();
    this.ctx.notify();
  }

  private plan() {
    this.cancelMove?.();
    this.cancelClock?.();
    this.cancelMove = this.cancelClock = null;
    if (this.disposed || this.state.winner) return;
    const cur = currentPlayer(this.state);
    const t = this.ctx.timing;
    const delay = this.bots.has(cur) ? t.botDelayMs : this.ctx.isAway(cur) ? (this.chain.has(cur) ? 1500 : t.awayDelayMs) : null;
    if (delay !== null) this.cancelMove = this.ctx.schedule(() => this.autoMove(), delay);
    const dl = this.state.turnDeadline;
    if (dl !== null) this.cancelClock = this.ctx.schedule(() => this.timeout(), Math.max(0, dl - this.ctx.now()));
  }

  /** A bot's move, or a disconnected human's move (played carefully-but-simply, like an easy bot). */
  private autoMove() {
    if (this.disposed) return;
    const pid = currentPlayer(this.state);
    const isBot = this.bots.has(pid);
    if (!isBot && !this.ctx.isAway(pid)) return this.plan();
    const r = step(this.state, pid, chooseBotAction(this.state, pid, isBot ? this.level : 'easy', this.ctx.rng), this.ctx.rng);
    if (!isBot) this.chain.add(pid);
    if (r.ok) this.commit(r.value);
  }

  private timeout() {
    if (this.disposed) return;
    const next = unoEngine.onTimeout!(this.state, this.ctx.now(), this.ctx.rng);
    if (next !== this.state) this.commit(next);
    else this.cancelClock = this.ctx.schedule(() => this.timeout(), 50); // fired a hair early
  }
}

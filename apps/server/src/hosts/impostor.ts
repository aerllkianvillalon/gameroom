import { fail, ok, type PlayerId, type Result } from '@party/game-engine';
import {
  configFromSettings, getCategory, impostorEngine, packToGroups, parseWords, pickSecret, pushRecent, step, withClock,
  type ImpostorAction, type ImpostorState,
} from '@party/impostor-engine';
import type { Cancel, GameHost, HostCtx } from './types';

const ACTIONS = new Set(['ack-role', 'clue', 'skip-discussion', 'vote', 'guess']);

export class ImpostorHost implements GameHost {
  readonly gameId = 'impostor';
  private state: ImpostorState;
  private cancel: Cancel | null = null;
  private chain = false;
  private disposed = false;

  constructor(private ctx: HostCtx) {
    const s = ctx.room.settings;
    const groups = ctx.pack
      ? packToGroups({ id: 'custom', name: ctx.pack.name, words: parseWords(ctx.pack.words.join('\n')) })
      : (getCategory(String(s.category)) ?? getCategory('objects'))!.groups;
    const secret = pickSecret(groups, ctx.rng, ctx.recentWords);
    ctx.rememberWords(pushRecent(ctx.recentWords, secret.word));
    const config = configFromSettings(s, ctx.room.members.length, true); // online: clues are typed
    this.state = withClock(impostorEngine.init({ ...config, secret }, ctx.room.members, ctx.rng), ctx.now());
    this.plan();
  }

  act(pid: PlayerId, action: unknown): Result<true> {
    if (!ACTIONS.has((action as { type?: string }).type ?? '')) return fail('bad_action', 'That action does not belong to this game.');
    const r = step(this.state, pid, action as ImpostorAction);
    if (!r.ok) return r;
    this.chain = false;
    this.commit(r.value);
    return ok(true);
  }

  views = (pid: PlayerId) => ({ public: impostorEngine.publicView(this.state), private: impostorEngine.privateView(this.state, pid) });
  isOver = () => this.state.phase === 'results';
  onPresence() { this.plan(); }

  dispose() {
    this.disposed = true;
    this.cancel?.();
  }

  private commit(next: ImpostorState) {
    this.state = withClock(next, this.ctx.now());
    this.plan();
    this.ctx.notify();
  }

  private awayWaiting(): PlayerId | undefined {
    return this.state.order.find((id) => this.ctx.isAway(id) && impostorEngine.privateView(this.state, id).waitingOnYou);
  }

  private plan() {
    this.cancel?.();
    this.cancel = null;
    if (this.disposed || this.state.phase === 'results') return;
    const dl = this.state.discussionDeadline;
    if (dl !== null) this.cancel = this.ctx.schedule(() => this.tick(), Math.max(0, dl - this.ctx.now()));
    else if (this.awayWaiting()) this.cancel = this.ctx.schedule(() => this.autoStep(), this.chain ? 1500 : this.ctx.timing.awayDelayMs);
  }

  private tick() {
    if (this.disposed) return;
    const next = impostorEngine.onTimeout!(this.state, this.ctx.now(), this.ctx.rng);
    if (next !== this.state) this.commit(next);
    else this.cancel = this.ctx.schedule(() => this.tick(), 50);
  }

  /** A disconnected player never stalls the table: the server submits a neutral action for them. */
  private autoStep() {
    const who = this.awayWaiting();
    if (this.disposed || !who) return;
    const s = this.state;
    let action: ImpostorAction;
    if (s.phase === 'roles') action = { type: 'ack-role' };
    else if (s.phase === 'clues') action = { type: 'clue', text: '...' };
    else if (s.phase === 'guess') action = { type: 'guess', text: 'no guess' };
    else {
      const pool = (s.phase === 'tiebreak' ? (s.tiebreak?.candidates ?? []) : s.order).filter((id) => id !== who);
      action = { type: 'vote', target: this.ctx.rng.pick(pool) };
    }
    const r = step(s, who, action);
    this.chain = true;
    if (r.ok) this.commit(r.value);
  }
}

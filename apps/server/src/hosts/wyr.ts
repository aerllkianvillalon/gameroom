import { configFromSettings, step, tick, withClock, wyrEngine, type WyrAction, type WyrState } from '@party/wyr-engine';
import { TimedHost } from './timed';
import type { HostCtx } from './types';

const ACTIONS = new Set(['vote']);

/** Would You Rather. Each round has a vote timer, so absent players simply do not vote. */
export class WyrHost extends TimedHost<WyrState, WyrAction> {
  constructor(ctx: HostCtx) {
    super(ctx, {
      gameId: 'wyr', actions: ACTIONS, step, tick, clock: withClock,
      views: (s, pid) => ({ public: wyrEngine.publicView(s), private: wyrEngine.privateView(s, pid) }),
      over: (s) => s.phase === 'results', deadline: (s) => s.deadline,
    }, wyrEngine.init(configFromSettings(ctx.room.settings), ctx.room.members, ctx.rng));
  }
}

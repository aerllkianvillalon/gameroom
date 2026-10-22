import { configFromSettings, step, tick, werewolfEngine, withClock, type WerewolfAction, type WerewolfState } from '@party/werewolf-engine';
import { TimedHost } from './timed';
import type { HostCtx } from './types';

const ACTIONS = new Set(['ack-role', 'kill', 'inspect', 'protect', 'skip-discussion', 'vote']);

/**
 * Werewolf. Night, discussion and voting all have timers. Only the role reveal has none, so the server
 * confirms it for a disconnected player; it never makes a night choice or a vote for anyone.
 */
export class WerewolfHost extends TimedHost<WerewolfState, WerewolfAction> {
  constructor(ctx: HostCtx) {
    super(ctx, {
      gameId: 'werewolf', actions: ACTIONS, step, tick, clock: withClock,
      views: (s, pid) => ({ public: werewolfEngine.publicView(s), private: werewolfEngine.privateView(s, pid) }),
      over: (s) => s.phase === 'results', deadline: (s) => s.deadline,
      awayWaiting: (s, isAway) => (s.phase === 'roles' ? s.order.find((id) => !s.acked.includes(id) && isAway(id)) : undefined),
      autoAction: () => ({ type: 'ack-role' }),
    }, werewolfEngine.init(configFromSettings(ctx.room.settings), ctx.room.members, ctx.rng));
  }
}

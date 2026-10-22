import { configFromSettings, memoryEngine, step, tick, withClock, type MemoryAction, type MemoryState } from '@party/memory-engine';
import { TimedHost } from './timed';
import type { HostCtx } from './types';

const ACTIONS = new Set(['flip']);

/** Memory Match. The flip timer passes the turn on, so an absent player never stalls the table. */
export class MemoryHost extends TimedHost<MemoryState, MemoryAction> {
  constructor(ctx: HostCtx) {
    super(ctx, {
      gameId: 'memory', actions: ACTIONS, step, tick, clock: withClock,
      views: (s, pid) => ({ public: memoryEngine.publicView(s), private: memoryEngine.privateView(s, pid) }),
      over: (s) => s.phase === 'results', deadline: (s) => s.deadline,
    }, memoryEngine.init(configFromSettings(ctx.room.settings), ctx.room.members, ctx.rng));
  }
}

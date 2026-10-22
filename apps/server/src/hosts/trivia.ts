import { triviaEngine, configFromSettings, step, tick, withClock, type TriviaAction, type TriviaState } from '@party/trivia-engine';
import { TimedHost } from './timed';
import type { HostCtx } from './types';

const ACTIONS = new Set(['answer']);

/** Trivia Battle. Every question has its own timer, so absent players simply run out the clock. */
export class TriviaHost extends TimedHost<TriviaState, TriviaAction> {
  constructor(ctx: HostCtx) {
    super(ctx, {
      gameId: 'trivia', actions: ACTIONS, step, tick, clock: withClock,
      views: (s, pid) => ({ public: triviaEngine.publicView(s), private: triviaEngine.privateView(s, pid) }),
      over: (s) => s.phase === 'results', deadline: (s) => s.deadline,
    }, triviaEngine.init(configFromSettings(ctx.room.settings), ctx.room.members, ctx.rng));
  }
}

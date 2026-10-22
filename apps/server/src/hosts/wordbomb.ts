import {
  configFromSettings, step, tick, wordBombEngine, withClock, type WordBombAction, type WordBombState,
} from '@party/wordbomb-engine';
import { TimedHost } from './timed';
import type { HostCtx } from './types';

const ACTIONS = new Set(['word', 'challenge', 'judge']);

/** Word Bomb. The fuse is the only clock: an absent player's bomb simply explodes. */
export class WordBombHost extends TimedHost<WordBombState, WordBombAction> {
  constructor(ctx: HostCtx) {
    super(ctx, {
      gameId: 'wordbomb', actions: ACTIONS,
      step: (s, pid, a) => step(s, pid, a, ctx.rng),
      tick: (s, now) => tick(s, now, ctx.rng),
      clock: withClock,
      views: (s, pid) => ({ public: wordBombEngine.publicView(s), private: wordBombEngine.privateView(s, pid) }),
      over: (s) => s.phase === 'results', deadline: (s) => s.deadline,
    }, wordBombEngine.init(configFromSettings(ctx.room.settings), ctx.room.members, ctx.rng));
  }
}

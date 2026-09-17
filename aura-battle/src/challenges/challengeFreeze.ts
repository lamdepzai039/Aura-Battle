import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult } from '../game/types';
import { makeObjective } from '../scoring/objectiveScoring';
import { movementErrorPercent } from '../vision/movementAnalysis';

export const challengeFreeze: Challenge = {
  id: 'freeze',
  name: 'NPC FREEZE',
  shortLabel: 'FREEZE',
  description: 'Stand completely still. The less you move, the higher your score.',
  duration: 7,
  difficulty: 3,
  category: 'movement',
  trackingRequirements: ['body'],
  scoringType: 'stillness',
  weights: { objective: 0.9, subjective: 0.1 },
  auraBreakThreshold: 92,
  introLines: ['ROUND', 'NPC FREEZE', "DON'T MOVE A MUSCLE", 'GO!'],
  onFrame(ctx: ChallengeFrameContext): ChallengeFrameResult | void {
    const state = ctx.state as { frames?: number };
    state.frames = (state.frames ?? 0) + 1;
    return undefined;
  },
  computeObjective(ctx: ChallengeFinalContext) {
    const movementPct = movementErrorPercent(ctx.frames);
    const score = Math.max(0, 100 - movementPct * 14);
    return makeObjective(score, { movementPct });
  },
};

import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult } from '../game/types';
import { makeObjective } from '../scoring/objectiveScoring';
import { countPoseChanges, movementSmoothness } from '../vision/movementAnalysis';
import { fallbackSubjective } from '../scoring/subjectiveScoring';

export const challengeAuraFarming: Challenge = {
  id: 'aura_farming',
  name: 'AURA FARMING',
  shortLabel: 'AURA FARM',
  description: 'Freestyle. Pose, move, gesture, transition — bring the most aura you can in the time you get.',
  duration: 12,
  difficulty: 4,
  category: 'freeform',
  trackingRequirements: ['body', 'hands'],
  scoringType: 'pose_similarity',
  weights: { objective: 0.4, subjective: 0.6 },
  auraBreakThreshold: 88,
  introLines: ['ROUND', 'AURA FARMING', 'FREESTYLE — ANYTHING GOES', 'GO!'],
  onFrame(ctx: ChallengeFrameContext): ChallengeFrameResult | void {
    const state = ctx.state as { changes?: number };
    state.changes = state.changes ?? 0;
    return undefined;
  },
  computeObjective(ctx: ChallengeFinalContext) {
    const variety = countPoseChanges(ctx.frames);
    const smoothness = movementSmoothness(ctx.frames);
    const score = Math.min(100, variety * 12 * 0.6 + smoothness * 0.4);
    return makeObjective(score, { variety, smoothness });
  },
  computeSubjectiveFallback(ctx: ChallengeFinalContext) {
    return fallbackSubjective(ctx, 'AURA');
  },
};

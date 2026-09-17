import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult } from '../game/types';
import { makeObjective } from '../scoring/objectiveScoring';
import { countPoseChanges, movementSmoothness } from '../vision/movementAnalysis';
import { fallbackSubjective } from '../scoring/subjectiveScoring';

export function makeCustomAuraChallenge(prompt: string): Challenge {
  return {
    id: 'custom_aura',
    name: 'CUSTOM AURA',
    shortLabel: 'CUSTOM',
    description: prompt || 'Do the most impressive freestyle you can think of.',
    duration: 12,
    difficulty: 4,
    category: 'freeform',
    trackingRequirements: ['body', 'hands'],
    scoringType: 'pose_similarity',
    weights: { objective: 0.35, subjective: 0.65 },
    auraBreakThreshold: 88,
    introLines: ['FINAL ROUND', 'CUSTOM AURA', prompt || 'FREESTYLE', 'GO!'],
    onFrame(_ctx: ChallengeFrameContext): ChallengeFrameResult | void {
      return undefined;
    },
    computeObjective(ctx: ChallengeFinalContext) {
      const variety = countPoseChanges(ctx.frames);
      const smoothness = movementSmoothness(ctx.frames);
      const score = Math.min(100, variety * 10 * 0.5 + smoothness * 0.5);
      return makeObjective(score, { variety, smoothness });
    },
    computeSubjectiveFallback(ctx: ChallengeFinalContext) {
      return fallbackSubjective(ctx, 'AURA');
    },
  };
}

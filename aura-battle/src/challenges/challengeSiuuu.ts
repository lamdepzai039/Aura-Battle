import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult, Landmark } from '../game/types';
import { comparePoseToTarget } from '../vision/poseSimilarity';
import { makeObjective } from '../scoring/objectiveScoring';

// Reference "SIUUU" pose signature expressed directly as normalized target
// landmarks (both arms raised and slightly out to the sides, classic
// celebration silhouette), used with comparePoseToTarget's angle+ratio
// signature comparison so it works regardless of player height/distance.
const SIUUU_TARGET: Landmark[] = buildSiuuuTarget();

function buildSiuuuTarget(): Landmark[] {
  const l = new Array(29).fill(0).map(() => ({ x: 0.5, y: 0.5, z: 0 }));
  // Only the indices used by poseSignature matter: shoulders, elbows, wrists, hips, knees.
  l[11] = { x: 0.42, y: 0.35, z: 0 }; // left shoulder
  l[12] = { x: 0.58, y: 0.35, z: 0 }; // right shoulder
  l[13] = { x: 0.32, y: 0.22, z: 0 }; // left elbow (raised)
  l[14] = { x: 0.68, y: 0.22, z: 0 }; // right elbow (raised)
  l[15] = { x: 0.28, y: 0.08, z: 0 }; // left wrist (up)
  l[16] = { x: 0.72, y: 0.08, z: 0 }; // right wrist (up)
  l[23] = { x: 0.45, y: 0.62, z: 0 }; // left hip
  l[24] = { x: 0.55, y: 0.62, z: 0 }; // right hip
  l[25] = { x: 0.45, y: 0.85, z: 0 }; // left knee
  l[26] = { x: 0.55, y: 0.85, z: 0 }; // right knee
  return l;
}

export const challengeSiuuu: Challenge = {
  id: 'siuuu',
  name: 'SIUUU!',
  shortLabel: 'SIUUU',
  description: 'Strike the celebration pose — both arms raised wide, just like the iconic goal celebration.',
  duration: 6,
  difficulty: 2,
  category: 'pose',
  trackingRequirements: ['body'],
  scoringType: 'pose_similarity',
  weights: { objective: 0.9, subjective: 0.1 },
  auraBreakThreshold: 90,
  introLines: ['ROUND', 'SIUUU!', 'STRIKE THE POSE', 'GO!'],
  onFrame(ctx: ChallengeFrameContext): ChallengeFrameResult | void {
    const state = ctx.state as { best?: number };
    const sim = comparePoseToTarget(ctx.frame.pose, SIUUU_TARGET);
    state.best = Math.max(state.best ?? 0, sim);
    if (sim > 85 && !(ctx.state as { fired?: boolean }).fired) {
      (ctx.state as { fired?: boolean }).fired = true;
      return {
        liveLabel: 'POSE MATCH',
        liveValue: sim,
        event: { type: 'perfect', label: 'SIUUU!', value: 150, timestamp: ctx.elapsedMs },
      };
    }
    return { liveLabel: 'POSE MATCH', liveValue: sim };
  },
  computeObjective(ctx: ChallengeFinalContext) {
    const best = (ctx.state.best as number) ?? 0;
    return makeObjective(best, { peakSimilarity: best });
  },
};

import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult, Landmark } from '../game/types';
import { comparePoseToTarget } from '../vision/poseSimilarity';
import { makeObjective } from '../scoring/objectiveScoring';

const LEAD_WINDOW_MS = 3000;

/** Factory so each round gets a fresh shared closure: Player 1's pose during
 * the lead window becomes the target that Player 2 (and P1's own hold) are
 * scored against. Both players run the SAME challenge instance per round,
 * so this closure is how the leader's captured pose reaches the follower. */
export function makeMirrorChallenge(): Challenge {
  const shared: { targetPose: Landmark[] | null } = { targetPose: null };

  return {
    id: 'mirror',
    name: 'MIRROR',
    shortLabel: 'MIRROR',
    description: 'Player 1 strikes a pose, Player 2 copies it as closely as possible.',
    duration: 8,
    difficulty: 2,
    category: 'pose',
    trackingRequirements: ['body'],
    scoringType: 'mirror_similarity',
    weights: { objective: 0.85, subjective: 0.15 },
    auraBreakThreshold: 90,
    introLines: ['ROUND', 'MIRROR', 'P1: MAKE A POSE', 'P2: COPY IT!'],
    onFrame(ctx: ChallengeFrameContext): ChallengeFrameResult | void {
      const state = ctx.state as { bestSimilarity?: number };
      if (ctx.playerId === 'p1' && ctx.elapsedMs < LEAD_WINDOW_MS && ctx.frame.pose) {
        shared.targetPose = ctx.frame.pose;
        return { liveLabel: 'SHOWING POSE', liveValue: 100 };
      }
      if (ctx.playerId === 'p2' && ctx.elapsedMs >= LEAD_WINDOW_MS) {
        const sim = comparePoseToTarget(ctx.frame.pose, shared.targetPose);
        state.bestSimilarity = Math.max(state.bestSimilarity ?? 0, sim);
        return { liveLabel: 'COPY MATCH', liveValue: sim };
      }
      return undefined;
    },
    computeObjective(ctx: ChallengeFinalContext) {
      if (ctx.playerId === 'p1') {
        // Leader is scored on how clear/held their pose was (held pose = higher score).
        return makeObjective(85, { role: 1 });
      }
      const best = (ctx.state.bestSimilarity as number) ?? 0;
      return makeObjective(best, { similarity: best });
    },
  };
}

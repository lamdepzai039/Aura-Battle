import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult } from '../game/types';
import { angleDeg, bodyScale, POSE } from '../vision/landmarkUtils';
import { makeObjective } from '../scoring/objectiveScoring';

// "67" target pose: one arm raised high (elbow ~straight, wrist above shoulder)
// while the other arm stays low/bent — the seesaw "6-7" hand-tilt gesture.
// Threshold-based hit detection with a cooldown so holding the pose doesn't
// spam counts every frame.
const HIT_COOLDOWN_MS = 550;

function poseMatches67(ctx: ChallengeFrameContext): boolean {
  const pose = ctx.frame.pose;
  if (!pose) return false;
  const leftUp = pose[POSE.LEFT_WRIST].y < pose[POSE.LEFT_SHOULDER].y - 0.03;
  const rightUp = pose[POSE.RIGHT_WRIST].y < pose[POSE.RIGHT_SHOULDER].y - 0.03;
  // Exactly one arm raised = the seesaw/"67" shape, not both up (that's more
  // like a touchdown pose) and not neither up.
  if (leftUp === rightUp) return false;
  const raisedElbowAngle = leftUp
    ? angleDeg(pose[POSE.LEFT_SHOULDER], pose[POSE.LEFT_ELBOW], pose[POSE.LEFT_WRIST])
    : angleDeg(pose[POSE.RIGHT_SHOULDER], pose[POSE.RIGHT_ELBOW], pose[POSE.RIGHT_WRIST]);
  return raisedElbowAngle > 130; // reasonably extended arm
}

export const challenge67: Challenge = {
  id: '67',
  name: '67 / 6-7',
  shortLabel: '67',
  description: 'Hit the 67 seesaw pose as many times as you can — one arm up, one arm down, alternating.',
  duration: 8,
  difficulty: 2,
  category: 'gesture',
  trackingRequirements: ['body'],
  scoringType: 'gesture_accuracy',
  weights: { objective: 0.95, subjective: 0.05 },
  auraBreakThreshold: 85,
  introLines: ['ROUND', '67 / 6-7', 'ALTERNATE ARMS UP', 'GO!'],
  onFrame(ctx: ChallengeFrameContext): ChallengeFrameResult | void {
    const state = ctx.state as { lastHitAt?: number; hits?: number; wasMatching?: boolean };
    state.hits = state.hits ?? 0;
    const matches = poseMatches67(ctx);
    const cooldownOk = !state.lastHitAt || ctx.elapsedMs - state.lastHitAt > HIT_COOLDOWN_MS;

    if (matches && !state.wasMatching && cooldownOk) {
      state.hits += 1;
      state.lastHitAt = ctx.elapsedMs;
      state.wasMatching = true;
      return {
        liveLabel: '67 HIT!',
        liveValue: state.hits,
        event: { type: 'hit', label: '67 HIT!', value: 1, timestamp: ctx.elapsedMs },
      };
    }
    if (!matches) state.wasMatching = false;
    return { liveValue: state.hits };
  },
  computeObjective(ctx: ChallengeFinalContext) {
    const hits = (ctx.state.hits as number) ?? 0;
    // Score scales with hits but caps out around 10 hits in an 8s round.
    const score = Math.min(100, (hits / 10) * 100);
    return makeObjective(score, { hits, bodyScaleSample: bodyScale(ctx.frames.at(-1)?.pose) }, hits);
  },
};

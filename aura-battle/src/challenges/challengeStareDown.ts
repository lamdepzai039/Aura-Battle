import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult } from '../game/types';
import { makeObjective } from '../scoring/objectiveScoring';
import { stabilityScore } from '../vision/movementAnalysis';
import { headTiltDeg, headYawProxy } from '../vision/landmarkUtils';

export const challengeStareDown: Challenge = {
  id: 'stare_down',
  name: 'STARE DOWN',
  shortLabel: 'STARE',
  description: 'Lock eyes with the camera. Stay still, stay forward-facing, do not look away.',
  duration: 9,
  difficulty: 3,
  category: 'face',
  trackingRequirements: ['body', 'face'],
  scoringType: 'pose_hold',
  weights: { objective: 0.85, subjective: 0.15 },
  auraBreakThreshold: 90,
  introLines: ['ROUND', 'STARE DOWN', "DON'T LOOK AWAY", 'GO!'],
  onFrame(ctx: ChallengeFrameContext): ChallengeFrameResult | void {
    const yaw = headYawProxy(ctx.frame.face);
    const forward = !Number.isNaN(yaw) ? Math.max(0, 100 - Math.abs(yaw) * 5) : 50;
    return { liveLabel: 'LOCKED IN', liveValue: forward };
  },
  computeObjective(ctx: ChallengeFinalContext) {
    const stability = stabilityScore(ctx.frames);
    const yaws = ctx.frames.map((f) => headYawProxy(f.face)).filter((y) => !Number.isNaN(y));
    const tilts = ctx.frames.map((f) => headTiltDeg(f.face)).filter((t) => !Number.isNaN(t));
    const avgYaw = yaws.length ? yaws.reduce((a, b) => a + Math.abs(b), 0) / yaws.length : 20;
    const avgTilt = tilts.length ? tilts.reduce((a, b) => a + Math.abs(b), 0) / tilts.length : 20;
    const orientationScore = Math.max(0, 100 - avgYaw * 4 - avgTilt * 1.5);
    const score = stability * 0.5 + orientationScore * 0.5;
    return makeObjective(score, { stability, orientationScore });
  },
};

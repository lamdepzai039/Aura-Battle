import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult } from '../game/types';
import { headTiltDeg, headYawProxy } from '../vision/landmarkUtils';
import { makeObjective } from '../scoring/objectiveScoring';

// Target: chin level, head facing forward (low tilt, low yaw), held steady.
const TILT_TOLERANCE_DEG = 8;
const YAW_TOLERANCE = 6;

function poseLockPercent(tilt: number, yaw: number): number {
  if (Number.isNaN(tilt) || Number.isNaN(yaw)) return 0;
  const tiltScore = Math.max(0, 100 - (Math.abs(tilt) / TILT_TOLERANCE_DEG) * 60);
  const yawScore = Math.max(0, 100 - (Math.abs(yaw) / YAW_TOLERANCE) * 60);
  return Math.max(0, Math.min(100, tiltScore * 0.5 + yawScore * 0.5));
}

export const challengeMewing: Challenge = {
  id: 'mewing',
  name: 'MEWING',
  shortLabel: 'MEWING',
  description: 'Hold your head level and facing forward. Stability and timing only — not appearance.',
  duration: 10,
  difficulty: 3,
  category: 'face',
  trackingRequirements: ['face'],
  scoringType: 'pose_hold',
  weights: { objective: 1, subjective: 0 },
  auraBreakThreshold: 88,
  introLines: ['ROUND', 'MEWING', 'HOLD YOUR POSE', 'GO!'],
  onFrame(ctx: ChallengeFrameContext): ChallengeFrameResult | void {
    const state = ctx.state as { samples?: number[] };
    state.samples = state.samples ?? [];
    const tilt = headTiltDeg(ctx.frame.face);
    const yaw = headYawProxy(ctx.frame.face);
    const lock = poseLockPercent(tilt, yaw);
    state.samples.push(lock);
    return { liveLabel: 'POSE LOCK', liveValue: lock };
  },
  computeObjective(ctx: ChallengeFinalContext) {
    const samples = (ctx.state.samples as number[]) ?? [];
    const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
    return makeObjective(avg, { avgLock: avg, samples: samples.length });
  },
};

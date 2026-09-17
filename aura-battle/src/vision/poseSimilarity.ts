import type { Landmark, TrackingFrame } from '../game/types';
import { mean, poseSignature, signatureSimilarity } from './landmarkUtils';

/** Compares a follower's held pose against a captured leader pose (Mirror). */
export function comparePoseToTarget(current: Landmark[] | null | undefined, target: Landmark[] | null): number {
  const sigCurrent = poseSignature(current);
  const sigTarget = poseSignature(target);
  return signatureSimilarity(sigCurrent, sigTarget);
}

/** Compares the best-matching pose in a follower's frame window against a
 * single target pose, returning the peak similarity (players don't have to
 * hit the pose on the exact frame boundary). */
export function bestMatchInWindow(frames: TrackingFrame[], target: Landmark[] | null): number {
  if (!target) return 0;
  let best = 0;
  for (const f of frames) {
    const s = comparePoseToTarget(f.pose, target);
    if (s > best) best = s;
  }
  return best;
}

/** Average similarity across a window (used when the pose must be *held*
 * rather than merely reached once). */
export function averageSimilarityInWindow(frames: TrackingFrame[], target: Landmark[] | null): number {
  if (!target) return 0;
  const scores = frames.map((f) => comparePoseToTarget(f.pose, target));
  return mean(scores) || 0;
}

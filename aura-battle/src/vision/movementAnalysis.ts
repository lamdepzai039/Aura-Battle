import type { Landmark, TrackingFrame } from '../game/types';
import { bodyScale, dist, mean, stddev } from './landmarkUtils';

/** Average per-landmark displacement between consecutive frames, normalized
 * by body scale, expressed as a percentage of body size moved per frame. */
export function movementErrorPercent(frames: TrackingFrame[]): number {
  const poses = frames.map((f) => f.pose).filter(Boolean) as Landmark[][];
  if (poses.length < 2) return 0;
  const perFrame: number[] = [];
  for (let i = 1; i < poses.length; i++) {
    const prev = poses[i - 1];
    const curr = poses[i];
    const scale = bodyScale(curr) || bodyScale(prev) || 0.25;
    const displacements: number[] = [];
    for (let j = 0; j < Math.min(prev.length, curr.length); j++) {
      const d = dist(prev[j], curr[j]);
      if (!Number.isNaN(d)) displacements.push(d / scale);
    }
    if (displacements.length) perFrame.push(mean(displacements));
  }
  return clampPct(mean(perFrame) * 100);
}

function clampPct(v: number): number {
  if (Number.isNaN(v)) return 100;
  return Math.max(0, Math.min(100, v));
}

/** Smoothness: lower variance in frame-to-frame movement = smoother motion.
 * Returns 0-100 where 100 = perfectly smooth/consistent movement speed. */
export function movementSmoothness(frames: TrackingFrame[]): number {
  const poses = frames.map((f) => f.pose).filter(Boolean) as Landmark[][];
  if (poses.length < 3) return 50;
  const speeds: number[] = [];
  for (let i = 1; i < poses.length; i++) {
    const scale = bodyScale(poses[i]) || 0.25;
    const wristAvg = mean(
      [15, 16].map((idx) => dist(poses[i - 1][idx], poses[i][idx])).filter((x) => !Number.isNaN(x)),
    );
    if (!Number.isNaN(wristAvg)) speeds.push(wristAvg / scale);
  }
  if (speeds.length < 2) return 50;
  const variance = stddev(speeds);
  return Math.max(0, Math.min(100, 100 - variance * 400));
}

/** Counts distinct "pose changes" across a sequence, used for Aura Farming /
 * Sigma Pose variety scoring. A change is counted when normalized wrist/hip
 * movement crosses a threshold between samples, debounced to avoid frame
 * jitter double-counting. */
export function countPoseChanges(frames: TrackingFrame[], thresholdRatio = 0.18): number {
  const poses = frames.map((f) => f.pose).filter(Boolean) as Landmark[][];
  if (poses.length < 2) return 0;
  let changes = 0;
  let cooldown = 0;
  for (let i = 1; i < poses.length; i++) {
    if (cooldown > 0) {
      cooldown--;
      continue;
    }
    const scale = bodyScale(poses[i]) || 0.25;
    const keyIdx = [11, 12, 15, 16, 23, 24];
    const movement = mean(keyIdx.map((idx) => dist(poses[i - 1][idx], poses[i][idx]) / scale));
    if (!Number.isNaN(movement) && movement > thresholdRatio) {
      changes++;
      cooldown = 3; // debounce ~3 frames
    }
  }
  return changes;
}

/** Head/torso stability score over a window: how little the nose + shoulder
 * midpoint drifted, normalized by body scale. Used for Stare Down / Freeze. */
export function stabilityScore(frames: TrackingFrame[]): number {
  const poses = frames.map((f) => f.pose).filter(Boolean) as Landmark[][];
  if (poses.length < 2) return 0;
  const scale = bodyScale(poses[poses.length - 1]) || 0.25;
  const noseXs = poses.map((p) => p[0]?.x).filter((x) => x !== undefined) as number[];
  const noseYs = poses.map((p) => p[0]?.y).filter((y) => y !== undefined) as number[];
  const jitter = (stddev(noseXs) + stddev(noseYs)) / scale;
  return Math.max(0, Math.min(100, 100 - jitter * 260));
}

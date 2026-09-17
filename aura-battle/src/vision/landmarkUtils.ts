import type { Landmark } from '../game/types';

// MediaPipe Pose Landmarker indices (33-point model)
export const POSE = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// MediaPipe Hand Landmarker indices (21-point model)
export const HAND = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_TIP: 20,
} as const;

export function dist(a?: Landmark | null, b?: Landmark | null): number {
  if (!a || !b) return NaN;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dist3(a?: Landmark | null, b?: Landmark | null): number {
  if (!a || !b) return NaN;
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

/** Angle at point b, formed by rays b->a and b->c, in degrees (0-180). */
export function angleDeg(a: Landmark, b: Landmark, c: Landmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return NaN;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Body scale reference (shoulder width) used to normalize distances across
 * players standing at different distances from the camera. Falls back to
 * torso length if shoulders aren't visible. */
export function bodyScale(pose: Landmark[] | null | undefined): number {
  if (!pose) return NaN;
  const ls = pose[POSE.LEFT_SHOULDER];
  const rs = pose[POSE.RIGHT_SHOULDER];
  const shoulderWidth = dist(ls, rs);
  if (shoulderWidth && !Number.isNaN(shoulderWidth) && shoulderWidth > 0.01) {
    return shoulderWidth;
  }
  const lh = pose[POSE.LEFT_HIP];
  const torso = dist(ls, lh);
  return torso && !Number.isNaN(torso) ? torso : 0.25; // sane fallback in normalized coords
}

/** Normalizes a landmark distance by body scale so tall/short/near/far
 * players are compared fairly. Returns a unitless ratio. */
export function normalizedDist(a: Landmark, b: Landmark, scale: number): number {
  const d = dist(a, b);
  if (!scale || Number.isNaN(scale)) return d;
  return d / scale;
}

export function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/** Maps an error value (0 = perfect) to a 0-100 score using an exponential
 * falloff so small errors barely matter and large errors crater the score. */
export function errorToScore(error: number, tolerance: number): number {
  if (Number.isNaN(error)) return 0;
  const ratio = error / tolerance;
  return clamp(100 * Math.exp(-1.4 * ratio * ratio));
}

export function mean(values: number[]): number {
  const v = values.filter((x) => !Number.isNaN(x));
  if (v.length === 0) return NaN;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

export function stddev(values: number[]): number {
  const v = values.filter((x) => !Number.isNaN(x));
  if (v.length < 2) return 0;
  const m = mean(v);
  return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
}

/** Extracts a compact "pose signature" of joint angles + normalized limb
 * vectors, used for similarity comparisons (mirror, siuuu, meme pose, etc.)
 * Scale/position invariant. */
export function poseSignature(pose: Landmark[] | null | undefined): number[] | null {
  if (!pose || pose.length < 29) return null;
  const scale = bodyScale(pose);
  if (!scale) return null;
  const angles = [
    angleDeg(pose[POSE.LEFT_SHOULDER], pose[POSE.LEFT_ELBOW], pose[POSE.LEFT_WRIST]),
    angleDeg(pose[POSE.RIGHT_SHOULDER], pose[POSE.RIGHT_ELBOW], pose[POSE.RIGHT_WRIST]),
    angleDeg(pose[POSE.LEFT_HIP], pose[POSE.LEFT_SHOULDER], pose[POSE.LEFT_ELBOW]),
    angleDeg(pose[POSE.RIGHT_HIP], pose[POSE.RIGHT_SHOULDER], pose[POSE.RIGHT_ELBOW]),
    angleDeg(pose[POSE.LEFT_SHOULDER], pose[POSE.LEFT_HIP], pose[POSE.LEFT_KNEE]),
    angleDeg(pose[POSE.RIGHT_SHOULDER], pose[POSE.RIGHT_HIP], pose[POSE.RIGHT_KNEE]),
  ];
  const wristsRel = [
    normalizedDist(pose[POSE.LEFT_WRIST], pose[POSE.LEFT_SHOULDER], scale),
    normalizedDist(pose[POSE.RIGHT_WRIST], pose[POSE.RIGHT_SHOULDER], scale),
    (pose[POSE.LEFT_WRIST].y - pose[POSE.LEFT_SHOULDER].y) / scale,
    (pose[POSE.RIGHT_WRIST].y - pose[POSE.RIGHT_SHOULDER].y) / scale,
  ];
  return [...angles.map((a) => (Number.isNaN(a) ? 0 : a)), ...wristsRel.map((d) => (Number.isNaN(d) ? 0 : d))];
}

/** Cosine-ish similarity between two pose signatures -> 0..100. */
export function signatureSimilarity(a: number[] | null, b: number[] | null): number {
  if (!a || !b || a.length !== b.length) return 0;
  // Angles (deg, first 6) compared by absolute difference; ratios (rest) by relative diff.
  const angleErrors = a.slice(0, 6).map((v, i) => Math.abs(v - b[i]) / 180);
  const ratioErrors = a.slice(6).map((v, i) => Math.abs(v - b[i + 6]));
  const avgError = mean([...angleErrors, ...ratioErrors]);
  return errorToScore(avgError, 0.35);
}

/** Head orientation estimate (yaw/tilt proxy) from face landmarks, using
 * eye-line tilt and nose offset relative to eye midpoint. Returns degrees. */
export function headTiltDeg(face: Landmark[] | null | undefined): number {
  if (!face || face.length < 300) return NaN;
  const leftEye = face[33];
  const rightEye = face[263];
  if (!leftEye || !rightEye) return NaN;
  const dy = rightEye.y - leftEye.y;
  const dx = rightEye.x - leftEye.x;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function headYawProxy(face: Landmark[] | null | undefined): number {
  if (!face || face.length < 300) return NaN;
  const nose = face[1];
  const leftEye = face[33];
  const rightEye = face[263];
  if (!nose || !leftEye || !rightEye) return NaN;
  const midX = (leftEye.x + rightEye.x) / 2;
  const eyeDist = dist(leftEye, rightEye) || 0.001;
  return ((nose.x - midX) / eyeDist) * 100;
}

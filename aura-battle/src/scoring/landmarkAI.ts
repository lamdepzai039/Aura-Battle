import type { Challenge, Landmark, TrackingFrame } from '../game/types';
import { clamp } from '../vision/landmarkUtils';

export type LandmarkFrameScore = {
  score: number;
  confidence: number;
  landmarkCount: number;
  action: string;
};

function valid(landmarks?: Landmark[] | null): Landmark[] {
  return (landmarks || []).filter((landmark) => Number.isFinite(landmark.x) && Number.isFinite(landmark.y) && (landmark.visibility ?? 1) > 0.35);
}

export function scoreLandmarkFrame(challenge: Challenge, frame: TrackingFrame): LandmarkFrameScore {
  const required = challenge.trackingRequirements.flatMap((requirement) => requirement === 'body' ? [valid(frame.pose)] : requirement === 'hands' ? [valid(frame.leftHand), valid(frame.rightHand)] : [valid(frame.face)]);
  const landmarkCount = required.reduce((sum, landmarks) => sum + landmarks.length, 0);
  const expected = Math.max(required.length, 1) * 4;
  const confidence = clamp(landmarkCount / expected);
  const action = challenge.category === 'gesture' ? 'GESTURE' : challenge.category === 'pose' ? 'POSE' : challenge.category === 'face' ? 'FACE' : 'MOTION';
  const challengeSignal = challenge.onFrame ? 0.7 : 0.5;
  return { score: clamp(confidence * 100 * challengeSignal + confidence * 100 * (1 - challengeSignal)), confidence, landmarkCount, action };
}

export function summarizeLandmarkScores(scores: LandmarkFrameScore[]) {
  if (!scores.length) return { average: 0, peak: 0, frames: 0, actions: {} as Record<string, number> };
  const total = scores.reduce((sum, score) => sum + score.score, 0);
  const actions = scores.reduce<Record<string, number>>((result, score) => { result[score.action] = (result[score.action] || 0) + 1; return result; }, {});
  return { average: Math.round(total / scores.length), peak: Math.round(Math.max(...scores.map((score) => score.score))), frames: scores.length, actions };
}

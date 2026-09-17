import type { Landmark } from '../game/types';
import { dist } from './landmarkUtils';

export type GestureName = 'thumbs_up' | 'peace' | 'open_palm' | 'fist' | 'pointing' | 'unknown';

const TIPS = [4, 8, 12, 16, 20];
const PIPS = [3, 6, 10, 14, 18];
const MCPS = [2, 5, 9, 13, 17];

/** Returns, for each of the 5 fingers [thumb, index, middle, ring, pinky],
 * whether that finger is extended, using tip-to-wrist distance vs pip-to-wrist
 * distance (scale-invariant, works regardless of hand size/distance). */
function extendedFingers(hand: Landmark[]): boolean[] {
  const wrist = hand[0];
  return TIPS.map((tipIdx, i) => {
    const tip = hand[tipIdx];
    const pip = hand[PIPS[i]];
    const mcp = hand[MCPS[i]];
    if (!tip || !pip || !mcp || !wrist) return false;
    const tipToWrist = dist(tip, wrist);
    const pipToWrist = dist(pip, wrist);
    // Thumb needs a slightly different ratio since it folds sideways, not up.
    const margin = i === 0 ? 1.05 : 1.15;
    return tipToWrist > pipToWrist * margin;
  });
}

export function classifyGesture(hand: Landmark[] | null | undefined): { gesture: GestureName; confidence: number } {
  if (!hand || hand.length < 21) return { gesture: 'unknown', confidence: 0 };
  const [thumb, index, middle, ring, pinky] = extendedFingers(hand);
  const extendedCount = [thumb, index, middle, ring, pinky].filter(Boolean).length;

  if (thumb && !index && !middle && !ring && !pinky) {
    return { gesture: 'thumbs_up', confidence: 0.9 };
  }
  if (!thumb && index && middle && !ring && !pinky) {
    return { gesture: 'peace', confidence: 0.9 };
  }
  if (extendedCount >= 4) {
    return { gesture: 'open_palm', confidence: 0.85 };
  }
  if (extendedCount === 0) {
    return { gesture: 'fist', confidence: 0.85 };
  }
  if (!thumb && index && !middle && !ring && !pinky) {
    return { gesture: 'pointing', confidence: 0.85 };
  }
  return { gesture: 'unknown', confidence: 0.3 };
}

export function gestureMatchScore(target: GestureName, hand: Landmark[] | null | undefined): number {
  const { gesture, confidence } = classifyGesture(hand);
  if (gesture === target) return confidence * 100;
  return 0;
}

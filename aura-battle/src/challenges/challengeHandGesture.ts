import type { Challenge, ChallengeFinalContext, ChallengeFrameContext, ChallengeFrameResult } from '../game/types';
import { classifyGesture, type GestureName } from '../vision/gestureDetection';
import { makeObjective } from '../scoring/objectiveScoring';

const GESTURES: GestureName[] = ['thumbs_up', 'peace', 'open_palm', 'fist', 'pointing'];
const GESTURE_LABELS: Record<GestureName, string> = {
  thumbs_up: '👍 THUMBS UP',
  peace: '✌️ PEACE',
  open_palm: '🖐️ OPEN PALM',
  fist: '✊ FIST',
  pointing: '👉 POINT',
  unknown: '?',
};

export function pickRandomGesture(random = Math.random): GestureName {
  return GESTURES[Math.floor(random() * GESTURES.length)];
}

export function gestureLabel(g: GestureName): string {
  return GESTURE_LABELS[g];
}

export function makeHandGestureChallenge(target: GestureName): Challenge {
  return {
    id: 'hand_gesture',
    name: 'HAND GESTURE',
    shortLabel: 'GESTURE',
    description: `Show the ${GESTURE_LABELS[target]} gesture as fast as you can.`,
    duration: 6,
    difficulty: 1,
    category: 'gesture',
    trackingRequirements: ['hands'],
    scoringType: 'gesture_accuracy',
    weights: { objective: 1, subjective: 0 },
    auraBreakThreshold: 95,
    introLines: ['ROUND', 'HAND GESTURE', 'SHOW:', GESTURE_LABELS[target]],
    onFrame(ctx: ChallengeFrameContext): ChallengeFrameResult | void {
      const state = ctx.state as { matchedAtMs?: number; bestConfidence?: number };
      if (state.matchedAtMs) return undefined; // already locked in
      const left = classifyGesture(ctx.frame.leftHand);
      const right = classifyGesture(ctx.frame.rightHand);
      const best = left.gesture === target ? left : right.gesture === target ? right : null;
      if (best) {
        state.bestConfidence = Math.max(state.bestConfidence ?? 0, best.confidence);
        if (best.confidence > 0.7) {
          state.matchedAtMs = ctx.elapsedMs;
          return {
            liveLabel: 'MATCH!',
            liveValue: 100,
            event: { type: 'perfect', label: 'GESTURE MATCH!', value: 100, timestamp: ctx.elapsedMs },
          };
        }
      }
      return undefined;
    },
    computeObjective(ctx: ChallengeFinalContext) {
      const matchedAtMs = ctx.state.matchedAtMs as number | undefined;
      if (!matchedAtMs) {
        return makeObjective(0, { matched: 0, reactionMs: ctx.durationMs });
      }
      // Faster reaction = higher score; full points if matched within 1.5s.
      const reactionScore = Math.max(0, 100 - Math.max(0, matchedAtMs - 1500) / 40);
      return makeObjective(reactionScore, { matched: 1, reactionMs: matchedAtMs });
    },
  };
}

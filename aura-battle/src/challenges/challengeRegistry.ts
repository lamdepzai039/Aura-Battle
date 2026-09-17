import type { Challenge } from '../game/types';
import { challenge67 } from './challenge67';
import { challengeFreeze } from './challengeFreeze';
import { makeHandGestureChallenge, pickRandomGesture } from './challengeHandGesture';
import { makeMirrorChallenge } from './challengeMirror';
import { challengeMewing } from './challengeMewing';
import { challengeSiuuu } from './challengeSiuuu';
import { challengeStareDown } from './challengeStareDown';
import { challengeAuraFarming } from './challengeAuraFarming';
import { makeCustomAuraChallenge } from './challengeCustomAura';

/** Static (stateless) challenges can be reused as-is. Dynamic challenges
 * (random gesture, mirror's shared closure) need a factory called fresh
 * each time they're queued, so both live in one lookup keyed by id. */
export type ChallengeFactory = () => Challenge;

export const STATIC_CHALLENGES: Challenge[] = [
  challenge67,
  challengeFreeze,
  challengeMewing,
  challengeSiuuu,
  challengeStareDown,
  challengeAuraFarming,
];

export const DYNAMIC_CHALLENGE_FACTORIES: ChallengeFactory[] = [
  () => makeHandGestureChallenge(pickRandomGesture()),
  () => makeMirrorChallenge(),
];

/** Builds the default MVP round order (spec §41 Phase 3-4 set), ending on
 * Custom Aura. `customPrompt` is whatever the player typed for the final
 * freeform round. */
export function buildDefaultQueue(customPrompt?: string): Challenge[] {
  const challenges: Challenge[] = [
    challenge67,
    makeHandGestureChallenge(pickRandomGesture()),
    makeMirrorChallenge(),
    challengeFreeze,
    challengeMewing,
    challengeSiuuu,
    challengeStareDown,
    challengeAuraFarming,
  ];
  for (let index = challenges.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [challenges[index], challenges[swapIndex]] = [challenges[swapIndex], challenges[index]];
  }
  return [...challenges, makeCustomAuraChallenge(customPrompt ?? 'Do the most impressive freestyle you can think of.')];
}

/** Builds a short 4-round practice/MVP queue (spec §41 Phase 3 MVP set). */
export function buildMvpQueue(): Challenge[] {
  const queue = [challenge67, challengeFreeze, makeHandGestureChallenge(pickRandomGesture()), makeMirrorChallenge()];
  return queue.sort(() => Math.random() - 0.5);
}

export function allTrackingRequirements(queue: Challenge[]) {
  const set = new Set<'body' | 'hands' | 'face'>();
  queue.forEach((c) => c.trackingRequirements.forEach((r) => set.add(r)));
  return Array.from(set);
}

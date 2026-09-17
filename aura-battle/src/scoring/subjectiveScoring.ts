import type { ChallengeFinalContext, SubjectiveResult } from '../game/types';
import { clamp } from '../vision/landmarkUtils';
import { countPoseChanges, movementSmoothness, stabilityScore } from '../vision/movementAnalysis';

/**
 * Algorithmic stand-in for the AI Judge, used whenever the AI API isn't
 * configured (spec §42: the game must stay playable without it). Derives
 * "creativity / style / confidence" proxies purely from motion features —
 * never from appearance. This is intentionally a game-score heuristic, not
 * a claim of measuring anything real about the player.
 */
export function fallbackSubjective(ctx: ChallengeFinalContext, label = 'AURA'): SubjectiveResult {
  const variety = countPoseChanges(ctx.frames);
  const smoothness = movementSmoothness(ctx.frames);
  const stability = stabilityScore(ctx.frames);

  const creativity = clamp(40 + variety * 9);
  const style = clamp(smoothness * 0.6 + stability * 0.2 + 20);
  const confidence = clamp(stability * 0.5 + smoothness * 0.3 + 25);

  const score = clamp(creativity * 0.4 + style * 0.35 + confidence * 0.25);

  return {
    score,
    criteria: { creativity, style, confidence },
    comment: pickComment(score, label),
    source: 'fallback',
  };
}

function pickComment(score: number, label: string): string {
  if (score >= 90) return `Unreal ${label.toLowerCase()}. Certified legendary.`;
  if (score >= 75) return 'Clean. Bro cooked.';
  if (score >= 55) return 'Solid effort, decent aura.';
  if (score >= 35) return 'A bit stiff — commit harder next time.';
  return 'NPC energy detected.';
}

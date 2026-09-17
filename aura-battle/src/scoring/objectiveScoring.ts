import type { ObjectiveResult } from '../game/types';
import { clamp } from '../vision/landmarkUtils';

export function makeObjective(score: number, details: Record<string, number>, hits = 0): ObjectiveResult {
  return { score: clamp(score), details, hits };
}

/** Weighted-average combinator for objective sub-scores. */
export function combineWeighted(parts: Array<{ score: number; weight: number }>): number {
  const totalWeight = parts.reduce((a, p) => a + p.weight, 0) || 1;
  const sum = parts.reduce((a, p) => a + p.score * p.weight, 0);
  return clamp(sum / totalWeight);
}

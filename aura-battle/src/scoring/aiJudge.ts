import type { SubjectiveResult } from '../game/types';

/**
 * AI Judge is optional (spec §42/§24). We do NOT call a third-party LLM API
 * directly from the browser with an embedded key — that would leak
 * credentials to every player. Instead this reads an optional backend
 * endpoint URL from an env var; if it isn't configured (or the request
 * fails), callers should fall back to `fallbackSubjective`.
 *
 * Expected backend contract (you own this endpoint):
 *   POST { challengeId, prompt, features } -> structured JSON:
 *   { "score": number, "criteria": Record<string, number>, "comment": string }
 */

const AI_JUDGE_URL = import.meta.env.VITE_AI_JUDGE_URL as string | undefined;

export interface AiJudgeRequest {
  challengeId: string;
  prompt: string;
  features: Record<string, number>;
}

export function isAiJudgeConfigured(): boolean {
  return Boolean(AI_JUDGE_URL);
}

export async function requestAiJudge(req: AiJudgeRequest): Promise<SubjectiveResult | null> {
  if (!AI_JUDGE_URL) return null;
  try {
    const res = await fetch(AI_JUDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      score: number;
      criteria: Record<string, number>;
      comment?: string;
    };
    if (typeof data.score !== 'number' || typeof data.criteria !== 'object') return null;
    return { score: data.score, criteria: data.criteria, comment: data.comment, source: 'ai' };
  } catch {
    return null;
  }
}

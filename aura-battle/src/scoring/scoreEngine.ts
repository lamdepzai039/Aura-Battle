import type { Challenge, ChallengeFinalContext, PlayerId, RoundScore, ScoreEvent } from '../game/types';
import { clamp } from '../vision/landmarkUtils';
import { fallbackSubjective } from './subjectiveScoring';
import { isAiJudgeConfigured, requestAiJudge } from './aiJudge';
import { summarizeLandmarkScores, type LandmarkFrameScore } from './landmarkAI';

export async function scoreRound(
  challenge: Challenge,
  playerId: PlayerId,
  ctx: ChallengeFinalContext,
  events: ScoreEvent[],
): Promise<RoundScore> {
  const objective = challenge.computeObjective(ctx);
  const landmarkScores = Array.isArray(ctx.state.landmarkScores) ? ctx.state.landmarkScores as LandmarkFrameScore[] : [];
  const landmarkSummary = summarizeLandmarkScores(landmarkScores);
  const objectiveWithLandmarks = landmarkScores.length
    ? {
        ...objective,
        score: clamp(objective.score * 0.7 + landmarkSummary.average * 0.3),
        details: { ...objective.details, landmarkAverage: landmarkSummary.average, landmarkPeak: landmarkSummary.peak, trackedFrames: landmarkSummary.frames },
      }
    : objective;

  let subjective = null as RoundScore['subjective'];
  if (challenge.weights.subjective > 0) {
    if (isAiJudgeConfigured()) {
      subjective = await requestAiJudge({
        challengeId: challenge.id,
        prompt: challenge.description,
        features: objectiveWithLandmarks.details,
      });
    }
    if (!subjective) {
      subjective =
        challenge.computeSubjectiveFallback?.(ctx) ?? fallbackSubjective(ctx, challenge.shortLabel);
    }
  }

  const total = clamp(
    objectiveWithLandmarks.score * challenge.weights.objective + (subjective?.score ?? 0) * challenge.weights.subjective,
  );

  const hits = events.filter((e) => e.type === 'hit').length;

  return { playerId, objective: objectiveWithLandmarks, subjective, total, hits, events };
}

export function decideWinner(a: RoundScore, b: RoundScore): PlayerId | 'tie' {
  if (Math.abs(a.total - b.total) < 0.5) return 'tie';
  return a.total > b.total ? a.playerId : b.playerId;
}

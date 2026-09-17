import type { Challenge, ChallengeFinalContext, PlayerId, RoundRecord, ScoreEvent, TrackingFrame } from './types';
import { scoreRound, decideWinner } from '../scoring/scoreEngine';

export interface PlayerRoundCapture {
  frames: TrackingFrame[];
  state: Record<string, unknown>;
  events: ScoreEvent[];
}

export async function finalizeRound(
  challenge: Challenge,
  captures: Record<PlayerId, PlayerRoundCapture>,
  durationMs: number,
  botOverrides?: Partial<Record<PlayerId, number>>,
): Promise<RoundRecord> {
  const scores = {} as RoundRecord['scores'];

  for (const playerId of ['p1', 'p2'] as PlayerId[]) {
    const override = botOverrides?.[playerId];
    if (override !== undefined) {
      scores[playerId] = {
        playerId,
        objective: { score: override, details: { bot: 1 } },
        subjective: null,
        total: override,
        hits: 0,
        events: [],
      };
      continue;
    }
    const capture = captures[playerId];
    const ctx: ChallengeFinalContext = {
      playerId,
      frames: capture.frames,
      state: capture.state,
      durationMs,
    };
    scores[playerId] = await scoreRound(challenge, playerId, ctx, capture.events);
  }

  return {
    challengeId: challenge.id,
    scores,
    winner: decideWinner(scores.p1, scores.p2),
  };
}

/** Generates a believable AI-bot performance for Mode 2 (spec §7 Mode 2:
 * "predefined performance / generated score", so the game is testable
 * solo). Difficulty scales the bot's average score band. */
export function generateBotRoundCapture(challenge: Challenge, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): {
  scoreOverride: number;
} {
  const band = { easy: [35, 60], medium: [55, 80], hard: [75, 96] }[difficulty];
  const base = band[0] + Math.random() * (band[1] - band[0]);
  // Slight per-challenge variance so the bot doesn't feel identical every round.
  const jitter = (Math.random() - 0.5) * 10 - challenge.difficulty * 1.5;
  return { scoreOverride: Math.max(5, Math.min(99, base + jitter)) };
}

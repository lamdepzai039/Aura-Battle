// Core shared types for Aura Battle

export type PlayerId = 'p1' | 'p2';

export type TrackingRequirement = 'body' | 'hands' | 'face';

export type ScoringType =
  | 'gesture_accuracy'
  | 'pose_hold'
  | 'pose_similarity'
  | 'stillness'
  | 'mirror_similarity'
  | 'freeform_judged';

export interface ScoreWeights {
  objective: number; // 0..1
  subjective: number; // 0..1
}

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface TrackingFrame {
  timestamp: number;
  pose?: Landmark[] | null;
  leftHand?: Landmark[] | null;
  rightHand?: Landmark[] | null;
  face?: Landmark[] | null;
}

export interface PlayerFrame {
  playerId: PlayerId;
  frame: TrackingFrame;
}

export interface ObjectiveResult {
  score: number; // 0..100
  details: Record<string, number>;
  hits?: number;
}

export interface SubjectiveResult {
  score: number; // 0..100
  criteria: Record<string, number>;
  comment?: string;
  source: 'ai' | 'fallback';
}

export interface RoundScore {
  playerId: PlayerId;
  objective: ObjectiveResult;
  subjective: SubjectiveResult | null;
  total: number; // 0..100, weighted
  hits: number;
  events: ScoreEvent[];
}

export interface ScoreEvent {
  type: 'hit' | 'perfect' | 'combo' | 'aura_break' | 'miss';
  label: string;
  value: number;
  timestamp: number;
}

export interface Challenge {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  duration: number; // seconds
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: 'gesture' | 'pose' | 'face' | 'movement' | 'freeform' | 'memory';
  scoringType: ScoringType;
  trackingRequirements: TrackingRequirement[];
  weights: ScoreWeights;
  introLines: string[];
  auraBreakThreshold: number; // objective+subjective total needed to trigger AURA BREAK
  // Runs each tracking frame for a player during the CHALLENGE phase and returns
  // incremental info used for live UI feedback (hit pulses, live percentage, etc).
  onFrame?: (ctx: ChallengeFrameContext) => ChallengeFrameResult | void;
  // Called once when the challenge window ends to compute the final objective score.
  computeObjective: (ctx: ChallengeFinalContext) => ObjectiveResult;
  // Optional local (non-AI) subjective scoring fallback.
  computeSubjectiveFallback?: (ctx: ChallengeFinalContext) => SubjectiveResult;
}

export interface ChallengeFrameContext {
  playerId: PlayerId;
  frame: TrackingFrame;
  elapsedMs: number;
  state: Record<string, unknown>; // mutable per-player scratch state, persisted across frames
}

export interface ChallengeFrameResult {
  liveLabel?: string;
  liveValue?: number; // 0..100, e.g. pose lock %
  event?: ScoreEvent;
}

export interface ChallengeFinalContext {
  playerId: PlayerId;
  frames: TrackingFrame[];
  state: Record<string, unknown>;
  durationMs: number;
}

export type GameMode = 'local' | 'ai' | 'online' | 'mutation' | 'duo' | 'crew' | 'ranked';

export type MutationArchetype = 'mobility' | 'stability' | 'volatility';

export interface MutationOption {
  id: string;
  name: string;
  archetype: MutationArchetype;
  description: string;
  effect: string;
}

export interface TrendPack {
  id: string;
  title: string;
  theme: string;
  rules: string[];
  rewardType: string;
  version: number;
}

export interface MutationLoadout {
  archetype: MutationArchetype;
  mutationId: string;
  trendPack: TrendPack;
}

export type Screen =
  | 'home'
  | 'camera_check'
  | 'player_setup'
  | 'round_intro'
  | 'countdown'
  | 'challenge'
  | 'round_result'
  | 'final_result';

export interface RoundRecord {
  challengeId: string;
  scores: Record<PlayerId, RoundScore>;
  winner: PlayerId | 'tie';
}

export interface MatchState {
  mode: GameMode;
  players: Record<PlayerId, { name: string; aura: number }>;
  roundIndex: number;
  challengeQueue: Challenge[];
  history: RoundRecord[];
  screen: Screen;
  mutation?: MutationLoadout;
}

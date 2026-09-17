import type { MutationArchetype, MutationOption, TrendPack } from './types';

export const MUTATION_OPTIONS: MutationOption[] = [
  { id: 'dash', name: 'DASH', archetype: 'mobility', description: 'Turn clean movement into momentum.', effect: 'Movement highlights gain extra mutation energy.' },
  { id: 'phase-step', name: 'PHASE STEP', archetype: 'mobility', description: 'Stay elusive when the round gets tense.', effect: 'Clean dodge moments are featured in your snapshot.' },
  { id: 'barrier', name: 'BARRIER', archetype: 'stability', description: 'Hold your ground and protect your advantage.', effect: 'Consistent pose holds improve your stability read.' },
  { id: 'anchor', name: 'ANCHOR', archetype: 'stability', description: 'Control the space around your Aura Core.', effect: 'Steady positioning is tracked across the round.' },
  { id: 'overcharge', name: 'OVERCHARGE', archetype: 'volatility', description: 'Take measured risks for a bigger payoff.', effect: 'High-variance moments become mutation highlights.' },
  { id: 'risk-boost', name: 'RISK BOOST', archetype: 'volatility', description: 'Push the edge without surrendering control.', effect: 'Risky choices are recorded for the final snapshot.' },
];

export const TREND_PACKS: TrendPack[] = [
  {
    id: 'lock-in',
    title: 'LOCK IN',
    theme: 'FOCUS WINDOW',
    rules: ['A short focus window is announced before the round.', 'Complete the visible objective precisely for the best result.'],
    rewardType: 'Focus Tokens',
    version: 1,
  },
  {
    id: 'chaos',
    title: 'CHAOS',
    theme: 'ADAPTIVE ARENA',
    rules: ['Arena changes are announced before they happen.', 'Adapt to each change without making the outcome random.'],
    rewardType: 'Adaptation XP',
    version: 1,
  },
  {
    id: 'w-l',
    title: 'W / L',
    theme: 'ROUND RECAP',
    rules: ['Each round has one clearly announced objective.', 'W and L labels describe recorded moments, not the player.'],
    rewardType: 'Snapshot Badges',
    version: 1,
  },
];

export const DEFAULT_MUTATION_ARCHETYPE: MutationArchetype = 'mobility';
export const DEFAULT_MUTATION_ID = 'dash';
export const DEFAULT_TREND_PACK = TREND_PACKS[0];

export function mutationsForArchetype(archetype: MutationArchetype): MutationOption[] {
  return MUTATION_OPTIONS.filter((mutation) => mutation.archetype === archetype);
}

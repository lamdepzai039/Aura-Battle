export type MutationArchetype = 'mobility' | 'stability' | 'volatility';

export interface MutationDefinition {
  id: string;
  name: string;
  archetype: MutationArchetype;
  description: string;
  cooldown: number;
  cost: number;
  duration: number;
  targetType: 'self' | 'field' | 'burst';
  effectType: 'dash' | 'shield' | 'overcharge';
  counterplay: string;
  enabled: boolean;
  rarity: 'common' | 'rare' | 'epic';
  version: string;
  balanceConfig: {
    risk: 'low' | 'medium' | 'high';
    power: number;
    mobility: number;
    control: number;
  };
}

export interface TrendPackDefinition {
  id: string;
  title: string;
  theme: string;
  description: string;
  version: string;
  status: 'draft' | 'internal_test' | 'approved' | 'active';
  startAt?: string;
  endAt?: string;
  rules: string[];
  modifiers: {
    objectiveBonus: number;
    energyDrain: number;
    warningLabel: string;
  };
  visualLabel: string;
}

export interface MutationEvent {
  type: 'mutation_selected' | 'mutation_activated' | 'energy_spent' | 'trend_event' | 'round_state';
  label: string;
  detail: string;
  timestamp: number;
}

export interface MutationMatchState {
  matchId: string;
  round: number;
  totalRounds: number;
  maxEnergy: number;
  energy: number;
  archetype: MutationArchetype;
  selectedMutationId: string | null;
  trendPack: TrendPackDefinition;
  eventLog: MutationEvent[];
}

export const mutationCatalog: MutationDefinition[] = [
  {
    id: 'momentum-dash',
    name: 'Momentum Dash',
    archetype: 'mobility',
    description: 'Explode forward with a short burst of movement and reposition off the objective line.',
    cooldown: 7,
    cost: 20,
    duration: 1.4,
    targetType: 'self',
    effectType: 'dash',
    counterplay: 'Predict the exit angle and punish the end of the dash with a contest or hold.',
    enabled: true,
    rarity: 'rare',
    version: '1.0.0',
    balanceConfig: { risk: 'medium', power: 76, mobility: 92, control: 52 },
  },
  {
    id: 'phase-step',
    name: 'Phase Step',
    archetype: 'mobility',
    description: 'Create a short, low-visibility reposition window used to dodge or reset positioning.',
    cooldown: 9,
    cost: 18,
    duration: 1.1,
    targetType: 'self',
    effectType: 'dash',
    counterplay: 'The burst is strongest immediately after activation, so punish the opening window.',
    enabled: true,
    rarity: 'common',
    version: '1.0.0',
    balanceConfig: { risk: 'low', power: 58, mobility: 86, control: 63 },
  },
  {
    id: 'reactive-barrier',
    name: 'Reactive Barrier',
    archetype: 'stability',
    description: 'Anchor a short-lived shield that absorbs pressure and stabilizes objective control.',
    cooldown: 8,
    cost: 24,
    duration: 2.5,
    targetType: 'field',
    effectType: 'shield',
    counterplay: 'The field is strongest while it holds; a burst or rotated angle can break the hold.',
    enabled: true,
    rarity: 'rare',
    version: '1.0.0',
    balanceConfig: { risk: 'medium', power: 71, mobility: 26, control: 92 },
  },
  {
    id: 'anchor-field',
    name: 'Anchor Field',
    archetype: 'stability',
    description: 'Hold a control zone and slow enemy approach while your team secures the objective.',
    cooldown: 10,
    cost: 22,
    duration: 3.2,
    targetType: 'field',
    effectType: 'shield',
    counterplay: 'The denial radius is visible; stepping around it is safer than forcing contact.',
    enabled: true,
    rarity: 'rare',
    version: '1.0.0',
    balanceConfig: { risk: 'medium', power: 64, mobility: 18, control: 94 },
  },
  {
    id: 'overcharge',
    name: 'Overcharge',
    archetype: 'volatility',
    description: 'Channel unstable energy to increase effectiveness at the cost of a clear drawback.',
    cooldown: 9,
    cost: 28,
    duration: 2.1,
    targetType: 'self',
    effectType: 'overcharge',
    counterplay: 'Overcharge rewards timing. The best answer is to deny the setup before the burst arrives.',
    enabled: true,
    rarity: 'epic',
    version: '1.0.0',
    balanceConfig: { risk: 'high', power: 90, mobility: 50, control: 44 },
  },
  {
    id: 'unstable-burst',
    name: 'Unstable Burst',
    archetype: 'volatility',
    description: 'Release a short radiated burst that can swing a fight if timed around a contest or steal.',
    cooldown: 11,
    cost: 30,
    duration: 1.6,
    targetType: 'burst',
    effectType: 'overcharge',
    counterplay: 'The burst is telegraphed. Dodge or rotate out before the area fully resolves.',
    enabled: true,
    rarity: 'epic',
    version: '1.0.0',
    balanceConfig: { risk: 'high', power: 94, mobility: 58, control: 51 },
  },
];

export const trendPacks: TrendPackDefinition[] = [
  {
    id: 'lock-in',
    title: 'LOCK IN',
    theme: 'Focus',
    description: 'A round focused on objective discipline, favored during decisive swings and clutch moments.',
    version: '1.0.0',
    status: 'active',
    rules: ['Objective score is boosted by 12%.', 'Energy gain scales by clean objective control.', 'Only decisive actions earn priority feedback.'],
    modifiers: { objectiveBonus: 0.12, energyDrain: 0.04, warningLabel: 'LOCK IN' },
    visualLabel: 'LOCK IN',
  },
  {
    id: 'chaos',
    title: 'CHAOS',
    theme: 'Instability',
    description: 'Predictable danger zones appear in the arena, rewarding adaptation over static defense.',
    version: '1.0.0',
    status: 'approved',
    rules: ['Hazard zones rotate across safe lanes.', 'Persistent defense is reduced by 10%.', 'Short-form adaptation is favored.'],
    modifiers: { objectiveBonus: 0.06, energyDrain: 0.08, warningLabel: 'CHAOS' },
    visualLabel: 'CHAOS',
  },
  {
    id: 'w-l',
    title: 'W / L',
    theme: 'Counterplay',
    description: 'The current meta rewards clean counters and fails when players overcommit without reading the lane.',
    version: '1.0.0',
    status: 'internal_test',
    rules: ['Counterplay is scored higher than raw aggression.', 'Successful blocks grant a strong energy lift.', 'The trend is used for highlight tracking only.'],
    modifiers: { objectiveBonus: 0.08, energyDrain: 0.02, warningLabel: 'W / L' },
    visualLabel: 'W / L',
  },
];

export function getMutationById(id: string) {
  return mutationCatalog.find((mutation) => mutation.id === id) ?? null;
}

export function getArchetypeMutations(archetype: MutationArchetype) {
  return mutationCatalog.filter((mutation) => mutation.archetype === archetype);
}

export function createMutationMatchState(): MutationMatchState {
  return {
    matchId: `mutation-${Date.now()}`,
    round: 1,
    totalRounds: 4,
    maxEnergy: 100,
    energy: 68,
    archetype: 'mobility',
    selectedMutationId: 'momentum-dash',
    trendPack: trendPacks[0],
    eventLog: [
      {
        type: 'round_state',
        label: 'MODE READY',
        detail: 'AURA MUTATION prototype is initialized and awaiting a valid mutation activation.',
        timestamp: Date.now(),
      },
    ],
  };
}

export function validateMutationAction(
  state: MutationMatchState,
  mutationId: string,
): { valid: boolean; reason?: string; mutation?: MutationDefinition } {
  const mutation = getMutationById(mutationId);
  if (!mutation) {
    return { valid: false, reason: 'Mutation not found in the approved catalog.' };
  }
  if (!mutation.enabled) {
    return { valid: false, reason: 'This mutation is not enabled for the active mode.' };
  }
  if (state.energy < mutation.cost) {
    return { valid: false, reason: 'Not enough Aura Energy for this mutation.' };
  }
  return { valid: true, mutation };
}

export function applyMutation(state: MutationMatchState, mutationId: string): MutationMatchState {
  const mutation = getMutationById(mutationId);
  if (!mutation) {
    return state;
  }

  const validation = validateMutationAction(state, mutationId);
  if (!validation.valid || !validation.mutation) {
    return state;
  }

  const nextEnergy = Math.max(0, state.energy - mutation.cost);
  const eventLog: MutationEvent[] = [
    {
      type: 'mutation_activated',
      label: mutation.name.toUpperCase(),
      detail: `${mutation.description} Cost: ${mutation.cost} | Cooldown: ${mutation.cooldown}s`,
      timestamp: Date.now(),
    },
    ...state.eventLog,
  ].slice(0, 8) as MutationEvent[];

  const nextState: MutationMatchState = {
    ...state,
    energy: nextEnergy,
    selectedMutationId: mutation.id,
    archetype: mutation.archetype,
    eventLog,
  };

  return nextState;
}

export function cycleTrendPack(state: MutationMatchState): MutationMatchState {
  const currentIndex = trendPacks.findIndex((pack) => pack.id === state.trendPack.id);
  const nextPack = trendPacks[(currentIndex + 1) % trendPacks.length];

  const eventLog: MutationEvent[] = [
    {
      type: 'trend_event',
      label: nextPack.title,
      detail: `${nextPack.description} ${nextPack.rules[0]}`,
      timestamp: Date.now(),
    },
    ...state.eventLog,
  ].slice(0, 8) as MutationEvent[];

  return {
    ...state,
    trendPack: nextPack,
    eventLog,
  };
}

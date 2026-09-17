import { describe, expect, it } from 'vitest';
import { applyMutation, createMutationMatchState, validateMutationAction } from './auraMutation';

describe('Aura Mutation rules', () => {
  it('rejects actions that exceed the current energy pool', () => {
    const state = { ...createMutationMatchState(), energy: 20 };
    const result = validateMutationAction(state, 'unstable-burst');

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Not enough Aura Energy');
  });

  it('does not apply a mutation when the action is invalid', () => {
    const state = createMutationMatchState();
    const next = applyMutation({ ...state, energy: 10 }, 'reactive-barrier');

    expect(next.energy).toBe(10);
    expect(next.selectedMutationId).toBe('momentum-dash');
  });

  it('keeps the current selection stable when a rule violation blocks activation', () => {
    const state = createMutationMatchState();
    const next = applyMutation({ ...state, energy: 5 }, 'overcharge');

    expect(next.selectedMutationId).toBe('momentum-dash');
    expect(next.energy).toBe(5);
  });
});

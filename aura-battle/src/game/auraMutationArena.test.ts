import { describe, expect, it } from 'vitest';
import { createMutationArenaState, stepMutationArena } from './auraMutationArena';

describe('Aura Mutation arena', () => {
  it('spawns a playable arena with energy nodes and a central objective', () => {
    const state = createMutationArenaState({ playerName: 'Player 1', rivalName: 'Mutant Opponent' });

    expect(state.players.player.x).toBeGreaterThan(0);
    expect(state.players.rival.x).toBeGreaterThan(0);
    expect(state.pickups.length).toBeGreaterThan(0);
    expect(state.objective.x).toBeGreaterThan(0);
    expect(state.roundSeconds).toBeGreaterThan(0);
  });

  it('moves the player without leaving the arena bounds', () => {
    const state = createMutationArenaState({ playerName: 'Player 1', rivalName: 'Mutant Opponent' });
    const next = stepMutationArena(state, {
      playerMoveX: 1,
      playerMoveY: -1,
      isDashing: true,
      useMutation: false,
      dt: 0.1,
    });

    expect(next.players.player.x).toBeGreaterThanOrEqual(0);
    expect(next.players.player.x).toBeLessThanOrEqual(state.bounds.width);
    expect(next.players.player.y).toBeGreaterThanOrEqual(0);
    expect(next.players.player.y).toBeLessThanOrEqual(state.bounds.height);
  });
});

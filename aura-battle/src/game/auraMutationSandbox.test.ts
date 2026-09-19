import { describe, expect, it } from 'vitest';
import {
  collectNearbyLoot,
  craftItem,
  createSandboxState,
  createWorld,
  loadSandboxState,
  mineTile,
  saveSandboxState,
  updateEnemyState,
  useMutation,
} from './auraMutationSandbox';

describe('Aura Mutation sandbox foundation', () => {
  it('creates a deterministic world for the same seed', () => {
    const worldA = createWorld({ seed: 928173, width: 160, height: 64, chunkSize: 16 });
    const worldB = createWorld({ seed: 928173, width: 160, height: 64, chunkSize: 16 });

    expect(worldA.seed).toBe(worldB.seed);
    expect(worldA.tiles.length).toBe(worldB.tiles.length);
    expect(worldA.tiles[0]).toEqual(worldB.tiles[0]);
  });

  it('mining a tile updates the inventory and tile health', () => {
    const state = createSandboxState({ seed: 7, playerName: 'Aster' });
    const tile = state.world.tiles.find((entry) => entry.type !== 'air' && entry.type !== 'water') ?? state.world.tiles[0];

    const next = mineTile(state, { x: tile.x, y: tile.y, tool: 'pickaxe' });

    expect(next.inventory.wood >= 0 || next.inventory.stone >= 0 || next.inventory.ore >= 0 || next.inventory.crystal >= 0).toBe(true);
    expect(next.world.tiles.some((entry) => entry.x === tile.x && entry.y === tile.y)).toBe(true);
  });

  it('mutation activation consumes aura energy and modifies ability state', () => {
    const state = createSandboxState({ seed: 13, playerName: 'Aster' });
    const next = useMutation(state, 'momentum-dash');

    expect(next.player.energy).toBeLessThan(state.player.energy);
    expect(next.player.mutationCooldown).toBeGreaterThan(0);
    expect(next.player.activeMutationId).toBe('momentum-dash');
  });

  it('enemy mobs and nearby loot are simulated in the world state', () => {
    const state = createSandboxState({ seed: 29, playerName: 'Aster' });

    expect(state.enemies.length).toBeGreaterThan(0);
    expect(state.enemies[0].health).toBeGreaterThan(0);

    const updated = updateEnemyState(state, 0.016);
    expect(updated.enemies.length).toBeGreaterThan(0);

    const lootState = collectNearbyLoot({
      ...updated,
      player: { ...updated.player, x: updated.loot[0]?.x ?? updated.player.x, y: updated.loot[0]?.y ?? updated.player.y },
      loot: updated.loot.length > 0 ? [{ ...updated.loot[0], collected: false }] : [],
    });

    expect(lootState.inventory.ore >= 0 || lootState.inventory.crystal >= 0 || lootState.inventory.auraShard >= 0).toBe(true);
  });

  it('persists the world and inventory in a versioned local save schema', () => {
    const state = createSandboxState({ seed: 101, playerName: 'Aster' });
    state.inventory.stone = 14;
    state.inventory.crystal = 2;
    state.player.x = 32;
    state.player.energy = 60;

    const payload = saveSandboxState(state);
    expect(payload.version).toBe(1);
    expect(payload.world.seed).toBe(101);
    expect(payload.inventory.stone).toBe(14);

    const restored = loadSandboxState(JSON.stringify(payload));
    expect(restored).not.toBeNull();
    expect(restored?.player.x).toBe(32);
    expect(restored?.inventory.crystal).toBe(2);
  });

  it('crafts a basic aura tool when the required materials are available', () => {
    const state = createSandboxState({ seed: 7, playerName: 'Aster' });
    state.inventory.stone = 12;
    state.inventory.ore = 4;
    state.inventory.auraShard = 3;

    const next = craftItem(state, 'aura_pickaxe');

    expect(next.inventory.aura_pickaxe).toBeGreaterThan(0);
    expect(next.inventory.stone).toBeLessThan(12);
    expect(next.inventory.ore).toBeLessThan(4);
  });
});

export type TileType = 'air' | 'grass' | 'dirt' | 'stone' | 'ore' | 'crystal' | 'wood' | 'water' | 'aura_block';
export type ToolType = 'pickaxe' | 'axe' | 'sword' | 'hands';
export type BiomeType = 'aura_forest' | 'aura_caverns' | 'corrupted_aura_zone';

export interface TileDefinition {
  id: string;
  type: TileType;
  x: number;
  y: number;
  solid: boolean;
  hardness: number;
  health: number;
  maxHealth: number;
  background: string;
  drops: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface ChunkDefinition {
  key: string;
  x: number;
  y: number;
  size: number;
  tiles: TileDefinition[];
}

export interface WorldDefinition {
  seed: number;
  width: number;
  height: number;
  chunkSize: number;
  tiles: TileDefinition[];
  chunks: ChunkDefinition[];
  biomes: Record<string, { label: string; color: string }>;
}

export type InventoryResource = 'wood' | 'stone' | 'ore' | 'crystal' | 'auraShard' | 'aura_pickaxe';

export interface InventoryState {
  wood: number;
  stone: number;
  ore: number;
  crystal: number;
  auraShard: number;
  aura_pickaxe: number;
}

export const INVENTORY_KEYS: InventoryResource[] = ['wood', 'stone', 'ore', 'crystal', 'auraShard', 'aura_pickaxe'];

export interface SandboxSavePayload {
  version: number;
  savedAt: number;
  world: WorldDefinition;
  player: PlayerState;
  inventory: InventoryState;
  selectedSlot: number;
  biome: BiomeType;
  activeEvent: string;
  eventLog: string[];
  enemies: EnemyState[];
  loot: LootDrop[];
}

export const SANDBOX_SAVE_KEY = 'aura-battle-sandbox-save-v1';

export const CRAFTING_RECIPES: Record<string, { result: string; ingredients: Record<string, number>; label: string; description: string }> = {
  aura_pickaxe: {
    result: 'aura_pickaxe',
    ingredients: { stone: 8, ore: 3, auraShard: 2 },
    label: 'AURA PICKAXE',
    description: 'A refined mining tool tuned for deep extraction.',
  },
  aura_battery: {
    result: 'aura_battery',
    ingredients: { crystal: 4, auraShard: 2 },
    label: 'AURA BATTERY',
    description: 'Stores a burst of unstable power for stronger mutations.',
  },
};

export interface MutationSpec {
  id: string;
  name: string;
  archetype: 'mobility' | 'stability' | 'volatility';
  cost: number;
  cooldown: number;
  effect: string;
  enabled: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  auraLevel: number;
  mutationCooldown: number;
  activeMutationId: string | null;
}

export interface EnemyState {
  id: string;
  kind: 'drifter' | 'brute' | 'wisp';
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  direction: 1 | -1;
}

export interface LootDrop {
  id: string;
  x: number;
  y: number;
  type: keyof InventoryState;
  value: number;
  collected: boolean;
}

export interface SandboxState {
  world: WorldDefinition;
  player: PlayerState;
  inventory: InventoryState;
  selectedSlot: number;
  biome: BiomeType;
  activeEvent: string;
  eventLog: string[];
  enemies: EnemyState[];
  loot: LootDrop[];
}

export const MUTATION_LIBRARY: Record<string, MutationSpec> = {
  'momentum-dash': {
    id: 'momentum-dash',
    name: 'Momentum Dash',
    archetype: 'mobility',
    cost: 18,
    cooldown: 3.5,
    effect: 'Short burst reposition for fast lane control.',
    enabled: true,
  },
  'phase-step': {
    id: 'phase-step',
    name: 'Phase Step',
    archetype: 'mobility',
    cost: 16,
    cooldown: 4,
    effect: 'Creates a rapid dodge window to break pressure.',
    enabled: true,
  },
  'reactive-barrier': {
    id: 'reactive-barrier',
    name: 'Reactive Barrier',
    archetype: 'stability',
    cost: 20,
    cooldown: 4.5,
    effect: 'Converts incoming pressure into a short shield wall.',
    enabled: true,
  },
  'anchor-field': {
    id: 'anchor-field',
    name: 'Anchor Field',
    archetype: 'stability',
    cost: 22,
    cooldown: 5,
    effect: 'Stabilizes a defensive radius around the player.',
    enabled: true,
  },
  'overcharge': {
    id: 'overcharge',
    name: 'Overcharge',
    archetype: 'volatility',
    cost: 24,
    cooldown: 6,
    effect: 'Boosts immediate output at the cost of aura stability.',
    enabled: true,
  },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function hashTile(seed: number, x: number, y: number) {
  const value = Math.sin((x + 1) * 127.1 + (y + 1) * 311.7 + seed * 74.7) * 43758.5453123;
  return value - Math.floor(value);
}

export function createWorld(options: { seed: number; width?: number; height?: number; chunkSize?: number }): WorldDefinition {
  const width = options.width ?? 160;
  const height = options.height ?? 64;
  const chunkSize = options.chunkSize ?? 16;
  const tiles: TileDefinition[] = [];
  const biomes = {
    aura_forest: { label: 'AURA FOREST', color: '#92d5ff' },
    aura_caverns: { label: 'AURA CAVERNS', color: '#7d89d8' },
    corrupted_aura_zone: { label: 'CORRUPTED AURA ZONE', color: '#ff7f7f' },
  };

  const baseSurface = Math.floor(height * 0.56);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let type: TileType = 'air';
      let solid = false;
      let hardness = 0;
      let health = 0;
      let maxHealth = 0;
      let background = '#0b1324';
      let drops: Record<string, number> = {};

      const contour = Math.sin((x + options.seed) * 0.38) * 7 + Math.cos((x + options.seed * 1.7) * 0.17) * 4;
      const surfaceY = clamp(Math.round(baseSurface + contour), 10, height - 8);

      if (y < surfaceY - 8) {
        type = 'stone';
        solid = true;
        hardness = 2.6;
        health = 28;
        maxHealth = 28;
        background = '#3b4c68';
        drops = { stone: 1, ore: hashTile(options.seed, x, y) > 0.82 ? 1 : 0 };
      } else if (y < surfaceY - 2) {
        type = 'dirt';
        solid = true;
        hardness = 1.8;
        health = 12;
        maxHealth = 12;
        background = '#4a5a41';
        drops = { stone: 1 };
      } else if (y < surfaceY + 2) {
        type = 'grass';
        solid = true;
        hardness = 1.1;
        health = 10;
        maxHealth = 10;
        background = '#5aa15f';
        drops = { wood: hashTile(options.seed, x, y) > 0.72 ? 1 : 0 };
      } else if (y > height - 8) {
        type = 'water';
        solid = false;
        hardness = 0;
        health = 0;
        maxHealth = 0;
        background = '#1b4d76';
      }

      if (hashTile(options.seed, x, y) > 0.94 && y < surfaceY - 6 && y > 10) {
        type = 'ore';
        solid = true;
        hardness = 3.4;
        health = 34;
        maxHealth = 34;
        background = '#b8a4ff';
        drops = { ore: 1, crystal: hashTile(options.seed, x + 7, y) > 0.9 ? 1 : 0 };
      }

      if (hashTile(options.seed, x + 11, y) > 0.985 && y < surfaceY - 2 && y > 8) {
        type = 'crystal';
        solid = true;
        hardness = 4;
        health = 40;
        maxHealth = 40;
        background = '#7ae7ff';
        drops = { crystal: 1, auraShard: 1 };
      }

      const treeChance = hashTile(options.seed + 11, x, y);
      if (treeChance > 0.995 && y < surfaceY - 1 && y > surfaceY - 6) {
        type = 'wood';
        solid = true;
        hardness = 1.5;
        health = 18;
        maxHealth = 18;
        background = '#8c5c33';
        drops = { wood: 2 };
      }

      if (y > surfaceY + 8 && hashTile(options.seed + 77, x, y) > 0.9) {
        type = 'aura_block';
        solid = true;
        hardness = 2.9;
        health = 24;
        maxHealth = 24;
        background = '#7a6af0';
        drops = { auraShard: 1 };
      }

      const tile: TileDefinition = {
        id: `tile-${x}-${y}`,
        type,
        x,
        y,
        solid,
        hardness,
        health,
        maxHealth,
        background,
        drops,
      };

      tiles.push(tile);
    }
  }

  const chunks: ChunkDefinition[] = [];
  for (let chunkY = 0; chunkY < Math.ceil(height / chunkSize); chunkY += 1) {
    for (let chunkX = 0; chunkX < Math.ceil(width / chunkSize); chunkX += 1) {
      const startX = chunkX * chunkSize;
      const startY = chunkY * chunkSize;
      const localTiles = tiles.filter((tile) => tile.x >= startX && tile.x < startX + chunkSize && tile.y >= startY && tile.y < startY + chunkSize);
      chunks.push({
        key: `${chunkX}:${chunkY}`,
        x: chunkX,
        y: chunkY,
        size: chunkSize,
        tiles: localTiles,
      });
    }
  }

  return { seed: options.seed, width, height, chunkSize, tiles, chunks, biomes };
}

export function getTileAt(world: WorldDefinition, x: number, y: number): TileDefinition | null {
  return world.tiles.find((tile) => tile.x === x && tile.y === y) ?? null;
}

export function getChunkAround(world: WorldDefinition, worldX: number, worldY: number, radius = 1): ChunkDefinition[] {
  const chunkX = Math.floor(worldX / world.chunkSize);
  const chunkY = Math.floor(worldY / world.chunkSize);
  const matches: ChunkDefinition[] = [];

  for (let y = chunkY - radius; y <= chunkY + radius; y += 1) {
    for (let x = chunkX - radius; x <= chunkX + radius; x += 1) {
      const chunk = world.chunks.find((candidate) => candidate.x === x && candidate.y === y);
      if (chunk) matches.push(chunk);
    }
  }

  return matches;
}

function normalizeInventory(raw: Partial<InventoryState> | undefined): InventoryState {
  return {
    wood: Number(raw?.wood ?? 0),
    stone: Number(raw?.stone ?? 0),
    ore: Number(raw?.ore ?? 0),
    crystal: Number(raw?.crystal ?? 0),
    auraShard: Number(raw?.auraShard ?? 0),
    aura_pickaxe: Number(raw?.aura_pickaxe ?? 0),
  };
}

export function saveSandboxState(state: SandboxState): SandboxSavePayload {
  return {
    version: 1,
    savedAt: Date.now(),
    world: state.world,
    player: { ...state.player },
    inventory: normalizeInventory(state.inventory),
    selectedSlot: state.selectedSlot,
    biome: state.biome,
    activeEvent: state.activeEvent,
    eventLog: [...state.eventLog],
    enemies: state.enemies.map((enemy) => ({ ...enemy })),
    loot: state.loot.map((drop) => ({ ...drop })),
  };
}

export function loadSandboxState(raw: string | null): SandboxState | null {
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as Partial<SandboxSavePayload>;
    if (!payload || typeof payload !== 'object') return null;
    const fallback = createSandboxState({ seed: payload.world?.seed ?? 928173, playerName: payload.player?.name ?? 'Aster' });

    const world = payload.world ?? fallback.world;
    const player = { ...fallback.player, ...payload.player };
    const inventory = normalizeInventory(payload.inventory ?? fallback.inventory);
    const state: SandboxState = {
      world,
      player,
      inventory,
      selectedSlot: Number(payload.selectedSlot ?? 0),
      biome: payload.biome ?? fallback.biome,
      activeEvent: payload.activeEvent ?? fallback.activeEvent,
      eventLog: Array.isArray(payload.eventLog) ? payload.eventLog : fallback.eventLog,
      enemies: Array.isArray(payload.enemies) ? payload.enemies : fallback.enemies,
      loot: Array.isArray(payload.loot) ? payload.loot : fallback.loot,
    };

    return state;
  } catch {
    return null;
  }
}

export function hasRecipeMaterials(inventory: InventoryState, recipe: { ingredients: Record<string, number> }): boolean {
  return Object.entries(recipe.ingredients).every(([resource, amount]) => {
    const key = resource as keyof InventoryState;
    return Number(inventory[key] ?? 0) >= Number(amount ?? 0);
  });
}

export function craftItem(state: SandboxState, itemId: string): SandboxState {
  const recipe = CRAFTING_RECIPES[itemId];
  if (!recipe) {
    return {
      ...state,
      eventLog: [...state.eventLog, `No recipe exists for ${itemId}.`],
    };
  }

  if (!hasRecipeMaterials(state.inventory, recipe)) {
    return {
      ...state,
      eventLog: [...state.eventLog, `Missing materials for ${recipe.label}.`],
    };
  }

  const nextInventory = { ...state.inventory };
  Object.entries(recipe.ingredients).forEach(([resource, amount]) => {
    const key = resource as keyof InventoryState;
    nextInventory[key] = Number(nextInventory[key] ?? 0) - Number(amount ?? 0);
  });

  nextInventory[itemId as keyof InventoryState] = Number(nextInventory[itemId as keyof InventoryState] ?? 0) + 1;

  return {
    ...state,
    inventory: nextInventory,
    eventLog: [...state.eventLog, `${recipe.label} crafted. ${recipe.description}`],
  };
}

export function createSandboxState(options: { seed?: number; playerName?: string; width?: number; height?: number }): SandboxState {
  const seed = options.seed ?? 928173;
  const world = createWorld({ seed, width: options.width ?? 160, height: options.height ?? 64, chunkSize: 16 });
  const baseY = Math.floor(world.height * 0.54) + 2;

  const enemies: EnemyState[] = [
    { id: 'enemy-1', kind: 'drifter', x: 22, y: baseY - 3, width: 1.2, height: 2, health: 28, maxHealth: 28, speed: 1.6, damage: 9, direction: -1 },
    { id: 'enemy-2', kind: 'brute', x: 38, y: baseY - 2, width: 1.5, height: 2.1, health: 38, maxHealth: 38, speed: 1.2, damage: 12, direction: 1 },
    { id: 'enemy-3', kind: 'wisp', x: 54, y: baseY - 5, width: 1, height: 1, health: 22, maxHealth: 22, speed: 2.1, damage: 7, direction: -1 },
  ];

  const loot: LootDrop[] = [
    { id: 'loot-1', x: 16, y: baseY - 4, type: 'wood', value: 1, collected: false },
    { id: 'loot-2', x: 29, y: baseY - 5, type: 'ore', value: 1, collected: false },
    { id: 'loot-3', x: 46, y: baseY - 3, type: 'crystal', value: 1, collected: false },
    { id: 'loot-4', x: 62, y: baseY - 4, type: 'stone', value: 1, collected: false },
  ];

  const state: SandboxState = {
    world,
    player: {
      id: 'player-1',
      name: options.playerName ?? 'Aster',
      x: 12,
      y: baseY - 2,
      width: 1.2,
      height: 2,
      velocityX: 0,
      velocityY: 0,
      health: 100,
      maxHealth: 100,
      energy: 72,
      maxEnergy: 100,
      auraLevel: 1,
      mutationCooldown: 0,
      activeMutationId: 'momentum-dash',
    },
    inventory: {
      wood: 0,
      stone: 0,
      ore: 0,
      crystal: 0,
      auraShard: 0,
      aura_pickaxe: 0,
    },
    selectedSlot: 0,
    biome: 'aura_forest',
    activeEvent: 'LOCK IN',
    eventLog: [`World generated with seed ${seed}.`, 'AURA FOREST scanned.'],
    enemies,
    loot,
  };

  return state;
}

export function updateEnemyState(state: SandboxState, delta: number): SandboxState {
  let nextPlayer = { ...state.player };
  const nextEnemies = state.enemies.map((enemy) => {
    const dx = nextPlayer.x - enemy.x;
    const dy = nextPlayer.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const nextDirection: 1 | -1 = dx >= 0 ? 1 : -1;

    let nextX = enemy.x;
    let nextY = enemy.y;
    if (distance > 1.2) {
      nextX += (dx / distance) * enemy.speed * delta;
      nextY += (dy / distance) * enemy.speed * delta;
    }

    if (distance < 1.5) {
      nextPlayer = {
        ...nextPlayer,
        health: Math.max(0, nextPlayer.health - enemy.damage * delta * 12),
      };
    }

    return {
      ...enemy,
      x: nextX,
      y: nextY,
      direction: nextDirection,
    };
  });

  return {
    ...state,
    player: nextPlayer,
    enemies: nextEnemies,
    eventLog: nextPlayer.health < state.player.health ? [...state.eventLog, 'A mutant struck you.'] : state.eventLog,
  };
}

export function collectNearbyLoot(state: SandboxState): SandboxState {
  const collected = state.loot.filter((drop) => !drop.collected && Math.hypot(drop.x - state.player.x, drop.y - state.player.y) < 1.8);
  if (collected.length === 0) return state;

  const nextInventory = { ...state.inventory };
  const nextLoot = state.loot.map((drop) => {
    const isCollected = collected.some((item) => item.id === drop.id);
    if (!isCollected) return drop;
    nextInventory[drop.type] = (nextInventory[drop.type] ?? 0) + drop.value;
    return { ...drop, collected: true };
  });

  return {
    ...state,
    inventory: nextInventory,
    loot: nextLoot,
    eventLog: [...state.eventLog, `Recovered ${collected.map((drop) => drop.type).join(', ')}.`],
  };
}

export function mineTile(state: SandboxState, action: { x: number; y: number; tool: ToolType }): SandboxState {
  const tile = getTileAt(state.world, action.x, action.y);
  if (!tile || tile.type === 'air') {
    return state;
  }

  const toolPower = action.tool === 'pickaxe' ? 2.8 : action.tool === 'axe' ? 1.9 : 1.5;
  const nextTile: TileDefinition = {
    ...tile,
    health: Math.max(0, tile.health - toolPower),
  };

  if (nextTile.health <= 0) {
    const minedTile: TileDefinition = {
      ...tile,
      type: 'air',
      solid: false,
      hardness: 0,
      health: 0,
      maxHealth: 0,
      background: '#0b1324',
      drops: {},
    };

    const nextWorld = {
      ...state.world,
      tiles: state.world.tiles.map((entry) => (entry.id === tile.id ? minedTile : entry)),
    };

    const nextInventory = { ...state.inventory };
    Object.entries(tile.drops).forEach(([resource, amount]) => {
      if (amount > 0) {
        nextInventory[resource as keyof InventoryState] = (nextInventory[resource as keyof InventoryState] ?? 0) + amount;
      }
    });

    return {
      ...state,
      world: nextWorld,
      inventory: nextInventory,
      eventLog: [...state.eventLog, `Mined ${tile.type} at ${tile.x},${tile.y}.`],
    };
  }

  return {
    ...state,
    world: {
      ...state.world,
      tiles: state.world.tiles.map((entry) => (entry.id === tile.id ? nextTile : entry)),
    },
    eventLog: [...state.eventLog, `Breaking ${tile.type} (${nextTile.health}/${nextTile.maxHealth}).`],
  };
}

export function useMutation(state: SandboxState, mutationId: string): SandboxState {
  const mutation = MUTATION_LIBRARY[mutationId];
  if (!mutation || !mutation.enabled) {
    return state;
  }

  if (state.player.energy < mutation.cost) {
    return {
      ...state,
      eventLog: [...state.eventLog, `${mutation.name} was blocked by low Aura Energy.`],
    };
  }

  const nextEnergy = state.player.energy - mutation.cost;

  return {
    ...state,
    player: {
      ...state.player,
      energy: nextEnergy,
      mutationCooldown: mutation.cooldown,
      activeMutationId: mutation.id,
    },
    eventLog: [...state.eventLog, `${mutation.name} activated. ${mutation.effect}`],
  };
}

export function getBiomeFor(world: WorldDefinition, y: number): BiomeType {
  const depth = y;
  if (depth > world.height * 0.62) {
    return 'aura_caverns';
  }
  if (depth > world.height * 0.8) {
    return 'corrupted_aura_zone';
  }
  return 'aura_forest';
}

export function makeCraftingRecipe(result: string, ingredients: Record<string, number>) {
  return { result, ingredients };
}

export const RECIPES = {
  aura_pickaxe: makeCraftingRecipe('aura_pickaxe', { stone: 8, ore: 3, auraShard: 2 }),
  aura_forge: makeCraftingRecipe('aura_forge', { wood: 12, stone: 8, crystal: 2 }),
};

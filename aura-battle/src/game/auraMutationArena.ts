export type ArenaPlayerId = 'player' | 'rival';
export type ArenaPickupKind = 'aura' | 'pack';
export type ArenaObjectiveOwner = 'neutral' | 'player' | 'rival';

export interface ArenaPlayerState {
  id: ArenaPlayerId;
  name: string;
  x: number;
  y: number;
  radius: number;
  speed: number;
  aura: number;
  score: number;
  dashTimer: number;
  shieldTimer: number;
  mutationCooldown: number;
  mutationLabel: string;
}

export interface ArenaPickupState {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: ArenaPickupKind;
  value: number;
  active: boolean;
}

export interface ArenaObjectiveState {
  x: number;
  y: number;
  radius: number;
  progress: number;
  owner: ArenaObjectiveOwner;
}

export interface MutationArenaState {
  bounds: { width: number; height: number };
  players: { player: ArenaPlayerState; rival: ArenaPlayerState };
  pickups: ArenaPickupState[];
  objective: ArenaObjectiveState;
  roundSeconds: number;
  message: string;
  trend: string;
}

export interface MutationArenaInput {
  playerMoveX: number;
  playerMoveY: number;
  isDashing: boolean;
  useMutation: boolean;
  dt: number;
}

export type ArenaLoadoutInput = {
  mutationId?: string;
  archetype?: string;
  trendPack?: { title?: string };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function distance(aX: number, aY: number, bX: number, bY: number) {
  return Math.hypot(aX - bX, aY - bY);
}

export function createMutationArenaState({ playerName, rivalName, loadout }: { playerName: string; rivalName: string; loadout?: ArenaLoadoutInput }): MutationArenaState {
  const bounds = { width: 960, height: 640 };
  const pickups: ArenaPickupState[] = [
    { id: 'aura-1', x: 180, y: 150, radius: 15, kind: 'aura', value: 12, active: true },
    { id: 'aura-2', x: 320, y: 440, radius: 15, kind: 'aura', value: 12, active: true },
    { id: 'aura-3', x: 640, y: 188, radius: 15, kind: 'aura', value: 12, active: true },
    { id: 'aura-4', x: 780, y: 480, radius: 15, kind: 'aura', value: 12, active: true },
    { id: 'pack-1', x: 460, y: 128, radius: 20, kind: 'pack', value: 25, active: true },
    { id: 'pack-2', x: 770, y: 300, radius: 20, kind: 'pack', value: 25, active: true },
    { id: 'pack-3', x: 200, y: 520, radius: 20, kind: 'pack', value: 25, active: true },
  ];

  const playerMutation = (loadout?.mutationId ?? 'dash').toUpperCase().replace(/-/g, ' ');
  const playerArchetype = (loadout?.archetype ?? 'mobility').toUpperCase();
  const trend = loadout?.trendPack?.title ?? 'LOCK IN';

  return {
    bounds,
    players: {
      player: {
        id: 'player',
        name: playerName,
        x: 160,
        y: 320,
        radius: 18,
        speed: 220,
        aura: 42,
        score: 0,
        dashTimer: 0,
        shieldTimer: 0,
        mutationCooldown: 0,
        mutationLabel: playerMutation || playerArchetype,
      },
      rival: {
        id: 'rival',
        name: rivalName,
        x: 800,
        y: 300,
        radius: 18,
        speed: 200,
        aura: 40,
        score: 0,
        dashTimer: 0,
        shieldTimer: 0,
        mutationCooldown: 0,
        mutationLabel: 'STABILITY',
      },
    },
    pickups,
    objective: {
      x: bounds.width / 2,
      y: bounds.height / 2,
      radius: 96,
      progress: 50,
      owner: 'neutral',
    },
    roundSeconds: 45,
    message: 'Arena live. Control the core and secure energy.',
    trend,
  };
}

export function stepMutationArena(state: MutationArenaState, input: MutationArenaInput): MutationArenaState {
  if (state.roundSeconds <= 0) {
    return {
      ...state,
      message: state.players.player.score >= state.players.rival.score ? `${state.players.player.name} wins the match.` : `${state.players.rival.name} wins the match.`,
    };
  }

  const dt = clamp(input.dt || 0.016, 0.016, 0.05);
  const next = {
    ...state,
    players: {
      player: { ...state.players.player },
      rival: { ...state.players.rival },
    },
    pickups: state.pickups.map((pickup) => ({ ...pickup })),
    objective: { ...state.objective },
  };

  const player = next.players.player;
  const rival = next.players.rival;

  player.mutationCooldown = Math.max(0, player.mutationCooldown - dt);
  rival.mutationCooldown = Math.max(0, rival.mutationCooldown - dt);
  player.dashTimer = Math.max(0, player.dashTimer - dt);
  rival.dashTimer = Math.max(0, rival.dashTimer - dt);
  player.shieldTimer = Math.max(0, player.shieldTimer - dt);
  rival.shieldTimer = Math.max(0, rival.shieldTimer - dt);

  const xAxis = clamp(input.playerMoveX, -1, 1);
  const yAxis = clamp(input.playerMoveY, -1, 1);
  const moveScale = input.isDashing ? 1.6 : 1;

  const moveX = xAxis * player.speed * moveScale * dt;
  const moveY = yAxis * player.speed * moveScale * dt;
  player.x = clamp(player.x + moveX, player.radius, next.bounds.width - player.radius);
  player.y = clamp(player.y + moveY, player.radius, next.bounds.height - player.radius);

  if (input.useMutation && player.mutationCooldown <= 0) {
    player.dashTimer = 0.42;
    player.mutationCooldown = 2.6;
    player.aura = Math.max(0, player.aura - 8);
    next.message = `${player.name} used a mutation burst.`;
  }

  const neuralAimX = next.objective.x - rival.x;
  const neuralAimY = next.objective.y - rival.y;
  const rivalLength = Math.hypot(neuralAimX, neuralAimY) || 1;
  const rivalMoveX = (neuralAimX / rivalLength) * rival.speed * dt * 0.8;
  const rivalMoveY = (neuralAimY / rivalLength) * rival.speed * dt * 0.8;

  rival.x = clamp(rival.x + rivalMoveX, rival.radius, next.bounds.width - rival.radius);
  rival.y = clamp(rival.y + rivalMoveY, rival.radius, next.bounds.height - rival.radius);

  next.pickups = next.pickups.map((pickup) => {
    if (!pickup.active) return pickup;
    const playerTouch = distance(player.x, player.y, pickup.x, pickup.y) <= player.radius + pickup.radius;
    const rivalTouch = distance(rival.x, rival.y, pickup.x, pickup.y) <= rival.radius + pickup.radius;

    if (playerTouch) {
      player.aura += pickup.value;
      player.score += pickup.value * 3;
      pickup.active = false;
      next.message = `${player.name} secured ${pickup.kind === 'pack' ? 'a pack' : 'energy'}.`;
    } else if (rivalTouch) {
      rival.aura += pickup.value;
      rival.score += pickup.value * 3;
      pickup.active = false;
      next.message = `${rival.name} secured ${pickup.kind === 'pack' ? 'a pack' : 'energy'}.`;
    }

    return pickup;
  });

  const playerInObjective = distance(player.x, player.y, next.objective.x, next.objective.y) <= next.objective.radius + player.radius;
  const rivalInObjective = distance(rival.x, rival.y, next.objective.x, next.objective.y) <= next.objective.radius + rival.radius;

  if (playerInObjective && !rivalInObjective) {
    next.objective.progress = clamp(next.objective.progress + 24 * dt, 0, 100);
    next.objective.owner = 'player';
    player.score += 12 * dt;
    next.message = `${player.name} is taking control of the core.`;
  } else if (rivalInObjective && !playerInObjective) {
    next.objective.progress = clamp(next.objective.progress - 24 * dt, 0, 100);
    next.objective.owner = 'rival';
    rival.score += 12 * dt;
    next.message = `${rival.name} is contesting the core.`;
  } else if (playerInObjective && rivalInObjective) {
    next.objective.progress = clamp(next.objective.progress + (player.score > rival.score ? 4 : -4) * dt, 0, 100);
    next.objective.owner = next.objective.progress >= 50 ? 'player' : 'rival';
    next.message = 'The objective is contested.';
  }

  if (next.objective.progress >= 100) {
    next.objective.owner = 'player';
    next.objective.progress = 100;
    player.score += 30;
    next.message = `${player.name} has secured the objective.`;
  } else if (next.objective.progress <= 0) {
    next.objective.owner = 'rival';
    next.objective.progress = 0;
    rival.score += 30;
    next.message = `${rival.name} has forced the objective.`;
  }

  next.objective.progress = clamp(next.objective.progress, 0, 100);
  const remainingSeconds = Math.max(0, state.roundSeconds - dt);
  next.roundSeconds = remainingSeconds;

  if (remainingSeconds <= 0) {
    next.message = player.score >= rival.score ? `${player.name} wins by objective control.` : `${rival.name} wins by objective control.`;
  }

  return next;
}

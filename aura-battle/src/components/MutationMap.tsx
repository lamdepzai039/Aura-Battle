import { useEffect, useRef, useState } from 'react';
import { createMutationArenaState, stepMutationArena } from '../game/auraMutationArena';
import { CRAFTING_RECIPES, INVENTORY_KEYS, SANDBOX_SAVE_KEY, collectNearbyLoot, craftItem, createSandboxState, getBiomeFor, hasRecipeMaterials, loadSandboxState, mineTile, saveSandboxState, updateEnemyState } from '../game/auraMutationSandbox';
import type { MutationLoadout } from '../game/types';

const TILE_SIZE = 20;
const VIEWPORT_WIDTH = 760;
const VIEWPORT_HEIGHT = 430;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type MutationMapProps = {
  playerName: string;
  rivalName: string;
  loadout: MutationLoadout;
  skinId?: 'skin-1' | 'skin-2' | 'skin-3';
  onHome: () => void;
};

export function MutationMap({ playerName, rivalName, loadout, skinId = 'skin-1', onHome }: MutationMapProps) {
  const [arena, setArena] = useState(() => createMutationArenaState({
    playerName,
    rivalName,
    loadout: {
      mutationId: loadout.mutationId,
      archetype: loadout.archetype,
      trendPack: loadout.trendPack,
    },
  }));
  const [sandboxState, setSandboxState] = useState(() => {
    if (typeof window === 'undefined') {
      return createSandboxState({ seed: 928173, playerName });
    }

    const saved = loadSandboxState(window.localStorage.getItem(SANDBOX_SAVE_KEY));
    return saved ?? createSandboxState({ seed: 928173, playerName });
  });
  const pressedKeys = useRef(new Set<string>());
  const triggerMutationRef = useRef(false);
  const mineRequestRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SANDBOX_SAVE_KEY, JSON.stringify(saveSandboxState(sandboxState)));
    }
  }, [sandboxState]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' ', 'shift', 'x', 'z', 'e', 'f'].includes(key)) event.preventDefault();
      pressedKeys.current.add(key);
      if (event.code === 'Space' || key === ' ') {
        triggerMutationRef.current = true;
      }
      if (key === 'e' || key === 'f') {
        mineRequestRef.current = true;
      }
      if (/^[1-5]$/.test(key)) {
        setSandboxState((current) => ({ ...current, selectedSlot: Number(key) - 1 }));
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      pressedKeys.current.delete(event.key.toLowerCase());
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastTime = performance.now();

    function loop(now: number) {
      const delta = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      setArena((current) => {
        const keyboardX = (pressedKeys.current.has('d') || pressedKeys.current.has('arrowright') ? 1 : 0) - (pressedKeys.current.has('a') || pressedKeys.current.has('arrowleft') ? 1 : 0);
        const keyboardY = (pressedKeys.current.has('s') || pressedKeys.current.has('arrowdown') ? 1 : 0) - (pressedKeys.current.has('w') || pressedKeys.current.has('arrowup') ? 1 : 0);
        const useMutation = triggerMutationRef.current;
        triggerMutationRef.current = false;
        return stepMutationArena(current, {
          playerMoveX: keyboardX,
          playerMoveY: keyboardY,
          isDashing: pressedKeys.current.has('shift') || pressedKeys.current.has('x') || pressedKeys.current.has('z'),
          useMutation,
          dt: delta,
        });
      });

      setSandboxState((current) => {
        let nextPlayer = { ...current.player };
        const moveDirection = ((pressedKeys.current.has('d') || pressedKeys.current.has('arrowright')) ? 1 : 0) - ((pressedKeys.current.has('a') || pressedKeys.current.has('arrowleft')) ? 1 : 0);
        const jumpPressed = pressedKeys.current.has('w') || pressedKeys.current.has('arrowup') || pressedKeys.current.has(' ');

        const collidesAt = (x: number, y: number) => {
          const left = Math.floor(x - nextPlayer.width / 2);
          const right = Math.floor(x + nextPlayer.width / 2);
          const top = Math.floor(y - nextPlayer.height / 2);
          const bottom = Math.floor(y + nextPlayer.height / 2);
          for (const tile of current.world.tiles) {
            if (!tile.solid || tile.type === 'air') continue;
            const insideX = tile.x >= left && tile.x <= right;
            const insideY = tile.y >= top && tile.y <= bottom;
            if (insideX && insideY) return true;
          }
          return false;
        };

        const targetVelocityX = moveDirection * 7.5;
        nextPlayer.velocityX = nextPlayer.velocityX * 0.72 + targetVelocityX * 0.28;
        if (Math.abs(nextPlayer.velocityX) < 0.1) nextPlayer.velocityX = 0;

        if (jumpPressed && nextPlayer.velocityY === 0 && !collidesAt(nextPlayer.x, nextPlayer.y + 0.18)) {
          nextPlayer.velocityY = -11.5;
        }

        nextPlayer.velocityY += 25 * delta;

        const nextX = nextPlayer.x + nextPlayer.velocityX * delta;
        if (!collidesAt(nextX, nextPlayer.y)) {
          nextPlayer.x = nextX;
        } else {
          nextPlayer.velocityX = 0;
        }

        const nextY = nextPlayer.y + nextPlayer.velocityY * delta;
        if (!collidesAt(nextPlayer.x, nextY)) {
          nextPlayer.y = nextY;
        } else {
          if (nextPlayer.velocityY > 0) {
            nextPlayer.velocityY = 0;
          }
        }

        nextPlayer.x = clamp(nextPlayer.x, 2, current.world.width - 2);
        nextPlayer.y = clamp(nextPlayer.y, 2, current.world.height - 2);

        if (mineRequestRef.current) {
          const tx = Math.round(nextPlayer.x + (moveDirection || 1) * 1.5);
          const ty = Math.round(nextPlayer.y);
          const minedState = mineTile({ ...current, player: nextPlayer }, { x: tx, y: ty, tool: 'pickaxe' });
          nextPlayer = minedState.player;
          current = minedState;
          mineRequestRef.current = false;
        }

        const enemyState = updateEnemyState({ ...current, player: nextPlayer }, delta);
        const lootState = collectNearbyLoot(enemyState);
        nextPlayer = lootState.player;
        current = lootState;

        return {
          ...current,
          player: {
            ...nextPlayer,
            velocityX: nextPlayer.velocityX,
            velocityY: nextPlayer.velocityY,
            mutationCooldown: Math.max(0, nextPlayer.mutationCooldown - delta),
          },
          biome: getBiomeFor(current.world, Math.round(nextPlayer.y)),
        };
      });

      frame = window.requestAnimationFrame(loop);
    }

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function setControl(key: string, active: boolean) {
    if (active) pressedKeys.current.add(key);
    else pressedKeys.current.delete(key);
  }

  function handleMine() {
    mineRequestRef.current = true;
  }

  function selectHotbar(slot: number) {
    setSandboxState((current) => ({ ...current, selectedSlot: slot }));
  }

  function handleCraftPickaxe() {
    setSandboxState((current) => craftItem(current, 'aura_pickaxe'));
  }

  const progress = Math.min(100, Math.max(0, Math.round(arena.objective.progress)));
  const hotbarKeys = ['stone', 'ore', 'crystal', 'auraShard', 'aura_pickaxe'];
  const hotbarRecipe = CRAFTING_RECIPES.aura_pickaxe;
  const canCraftPickaxe = hasRecipeMaterials(sandboxState.inventory, hotbarRecipe);
  const mutationLabel = loadout.mutationId.toUpperCase().replace(/-/g, ' ');
  const archetypeClass = loadout.archetype.toLowerCase();
  const objectiveText = arena.objective.owner === 'player' ? 'YOU HOLD THE CORE' : arena.objective.owner === 'rival' ? 'RIVAL HOLDS THE CORE' : 'CORE CONTESTED';
  const winnerLabel = arena.players.player.score >= arena.players.rival.score ? 'YOU WIN' : 'RIVAL WINS';
  const finished = arena.roundSeconds <= 0;
  const playerMoving = pressedKeys.current.has('w') || pressedKeys.current.has('a') || pressedKeys.current.has('s') || pressedKeys.current.has('d') || pressedKeys.current.has('arrowup') || pressedKeys.current.has('arrowdown') || pressedKeys.current.has('arrowleft') || pressedKeys.current.has('arrowright');
  const playerDashing = pressedKeys.current.has('shift') || pressedKeys.current.has('x') || pressedKeys.current.has('z');
  const biomeLabel = getBiomeFor(sandboxState.world, Math.round(sandboxState.player.y)).toUpperCase().replace(/_/g, ' ');
  const cameraX = clamp(sandboxState.player.x * TILE_SIZE - VIEWPORT_WIDTH / 2, 0, Math.max(0, sandboxState.world.width * TILE_SIZE - VIEWPORT_WIDTH));
  const cameraY = clamp(sandboxState.player.y * TILE_SIZE - VIEWPORT_HEIGHT / 2, 0, Math.max(0, sandboxState.world.height * TILE_SIZE - VIEWPORT_HEIGHT));
  const visibleTiles = sandboxState.world.tiles.filter((tile) => {
    if (tile.type === 'air') return false;
    const left = tile.x * TILE_SIZE - cameraX;
    const top = tile.y * TILE_SIZE - cameraY;
    return left >= -TILE_SIZE && left <= VIEWPORT_WIDTH + TILE_SIZE && top >= -TILE_SIZE && top <= VIEWPORT_HEIGHT + TILE_SIZE;
  });

  return (
    <main className="mutation-arena-shell">
      <header className="mutation-arena-header">
        <div className="mutation-arena-brand">
          <span className="eyebrow">AURA MUTATION · 2D ARENA</span>
          <h1>{arena.trend} <span>RUN</span></h1>
          <p>{loadout.trendPack.theme} · {mutationLabel} · {loadout.archetype.toUpperCase()}</p>
          <div className="mutation-world-summary" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9abcdd' }}>
            <span>SEED {sandboxState.world.seed}</span>
            <span>BIOME {biomeLabel}</span>
            <span>CHUNKS {sandboxState.world.chunks.length}</span>
          </div>
        </div>
        <button className="mutation-exit-button" onClick={onHome}>EXIT MAP</button>
      </header>

      <section className="mutation-top-hud" aria-label="Arena status">
        <div className="arena-player-card glow-blue">
          <div className="arena-avatar">A</div>
          <div className="arena-player-copy">
            <strong>{playerName}</strong>
            <span>{arena.players.player.mutationLabel}</span>
          </div>
          <div className="arena-health"><i style={{ width: `${Math.min(100, Math.max(0, arena.players.player.aura))}%` }} /></div>
        </div>
        <div className="arena-player-card glow-indigo">
          <div className="arena-avatar">M</div>
          <div className="arena-player-copy">
            <strong>{rivalName}</strong>
            <span>{arena.players.rival.mutationLabel}</span>
          </div>
          <div className="arena-health"><i style={{ width: `${Math.min(100, Math.max(0, arena.players.rival.aura))}%` }} /></div>
        </div>
        <div className="arena-player-card glow-gold">
          <div className="arena-avatar">R</div>
          <div className="arena-player-copy">
            <strong>CORE</strong>
            <span>{objectiveText}</span>
          </div>
          <div className="arena-health"><i style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="arena-player-card glow-green">
          <div className="arena-avatar">T</div>
          <div className="arena-player-copy">
            <strong>TIMER</strong>
            <span>{Math.ceil(arena.roundSeconds)}s</span>
          </div>
          <div className="arena-health"><i style={{ width: `${(arena.roundSeconds / 45) * 100}%` }} /></div>
        </div>
      </section>

      <section className="mutation-arena-layout">
        <div className="mutation-board-wrap">
          <div className="mutation-board" aria-label="2D Aura Mutation map">
            <div className="map-grid-lines" aria-hidden="true" />
            <div className="arena-hills hill-left" aria-hidden="true" />
            <div className="arena-hills hill-right" aria-hidden="true" />
            <div className="arena-structure left-ruin" aria-hidden="true" />
            <div className="arena-structure right-ruin" aria-hidden="true" />
            <div className="pixel-tree tree-left" aria-hidden="true" />
            <div className="pixel-tree tree-right" aria-hidden="true" />
            <div className="pixel-ground" aria-hidden="true" />

            {visibleTiles.map((tile) => (
              <div
                key={tile.id}
                className="terrain-tile"
                style={{
                  left: `${tile.x * TILE_SIZE - cameraX}px`,
                  top: `${tile.y * TILE_SIZE - cameraY}px`,
                  width: `${TILE_SIZE}px`,
                  height: `${TILE_SIZE}px`,
                  background: tile.background,
                  opacity: tile.type === 'air' ? 0 : 1,
                  border: tile.type === 'air' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                }}
              />
            ))}

            <div className="objective-zone" style={{ left: `${(arena.objective.x / arena.bounds.width) * 100}%`, top: `${(arena.objective.y / arena.bounds.height) * 100}%` }}><span>OBJECTIVE</span><strong>{progress}%</strong></div>
            {arena.pickups.filter((item) => item.active).map((item) => (
              <div key={item.id} className={`map-item map-item-${item.kind}`} style={{ left: `${(item.x / arena.bounds.width) * 100}%`, top: `${(item.y / arena.bounds.height) * 100}%` }}>
                <span>{item.kind === 'pack' ? '▣' : '✦'}</span>
                <small>{item.kind === 'pack' ? 'PACK' : 'AURA'}</small>
              </div>
            ))}
            {sandboxState.loot.filter((drop) => !drop.collected).map((drop) => (
              <div key={drop.id} className="map-item map-item-pack" style={{ left: `${(drop.x * TILE_SIZE) - cameraX}px`, top: `${(drop.y * TILE_SIZE) - cameraY}px` }}>
                <span>{drop.type === 'crystal' ? '✦' : drop.type === 'ore' ? '⬢' : drop.type === 'stone' ? '◼' : '▣'}</span>
                <small>{drop.type.toUpperCase()}</small>
              </div>
            ))}
            {sandboxState.enemies.map((enemy) => (
              <div key={enemy.id} className="sprite-character rival-sprite is-moving" style={{ left: `${enemy.x * TILE_SIZE - cameraX}px`, top: `${enemy.y * TILE_SIZE - cameraY}px` }}>
                <div className="sprite-shadow" />
                <div className="sprite-head" />
                <div className="sprite-body" />
                <div className="sprite-arm left" />
                <div className="sprite-arm right" />
                <div className="sprite-leg left" />
                <div className="sprite-leg right" />
                <small>{enemy.kind.toUpperCase()}</small>
              </div>
            ))}
            <div className={`sprite-character rival-sprite ${playerMoving ? 'is-moving' : 'is-idle'}`} style={{ left: `${(arena.players.rival.x / arena.bounds.width) * 100}%`, top: `${(arena.players.rival.y / arena.bounds.height) * 100}%` }}>
              <div className="sprite-shadow" />
              <div className="sprite-head" />
              <div className="sprite-body" />
              <div className="sprite-arm left" />
              <div className="sprite-arm right" />
              <div className="sprite-leg left" />
              <div className="sprite-leg right" />
              <small>{rivalName}</small>
            </div>
            <div className={`sprite-character player-sprite ${skinId} ${playerMoving ? 'is-moving' : 'is-idle'} ${playerDashing ? 'is-dashing' : ''}`} style={{ left: `${sandboxState.player.x * TILE_SIZE - cameraX}px`, top: `${sandboxState.player.y * TILE_SIZE - cameraY}px` }}>
              <div className="sprite-shadow" />
              <div className="sprite-ring" />
              <div className="sprite-cape" />
              <div className="sprite-head">
                <span className="visor" />
                <span className="aura-core" />
              </div>
              <div className="sprite-body">
                <span className="body-core" />
                <span className="body-line line-left" />
                <span className="body-line line-right" />
              </div>
              <div className="sprite-arm left" />
              <div className="sprite-arm right" />
              <div className="sprite-leg left" />
              <div className="sprite-leg right" />
              <small>{playerName}</small>
            </div>
            {finished && <div className="mutation-finished-overlay"><span className="eyebrow">RUN COMPLETE</span><h2>{winnerLabel}</h2><p>{arena.message}</p><button onClick={onHome}>RETURN HOME</button></div>}
          </div>

          <div className="arena-capsule-bar" aria-label="Combat action bar">
            <button className={archetypeClass === 'mobility' ? 'active' : ''}>MOBILITY</button>
            <button className={archetypeClass === 'stability' ? 'active' : ''}>STABILITY</button>
            <button className={archetypeClass === 'volatility' ? 'active' : ''}>VOLATILITY</button>
            <button className="hud-value" onClick={handleMine}>{sandboxState.inventory.stone + sandboxState.inventory.ore + sandboxState.inventory.crystal} ORE</button>
            <button className="hud-value">{Math.ceil(arena.roundSeconds)}s</button>
          </div>

          <div className="mutation-touch-controls" aria-label="Touch movement controls">
            <button onPointerDown={() => setControl('w', true)} onPointerUp={() => setControl('w', false)} onPointerLeave={() => setControl('w', false)}>▲</button>
            <div><button onPointerDown={() => setControl('a', true)} onPointerUp={() => setControl('a', false)} onPointerLeave={() => setControl('a', false)}>◀</button><button onPointerDown={() => setControl('s', true)} onPointerUp={() => setControl('s', false)} onPointerLeave={() => setControl('s', false)}>▼</button><button onPointerDown={() => setControl('d', true)} onPointerUp={() => setControl('d', false)} onPointerLeave={() => setControl('d', false)}>▶</button></div>
          </div>
        </div>

        <aside className="mutation-side-panel">
          <div className="mutation-objective">
            <span className="eyebrow">CURRENT OBJECTIVE</span>
            <h2>{objectiveText}</h2>
            <div className="mutation-objective-bar"><i style={{ width: `${progress}%` }} /></div>
            <strong>{progress}% CONTROL</strong>
          </div>

          <div className="mutation-rule-card">
            <span className="eyebrow">TREND RULES</span>
            {loadout.trendPack.rules.map((rule) => <p key={rule}>• {rule}</p>)}
          </div>

          <div className="mutation-note-panel" style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(126, 201, 255, 0.08)', border: '1px solid rgba(126, 201, 255, 0.2)', color: '#d9ebff' }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8ab4df' }}>WORLD STATE</div>
            <div style={{ marginTop: '6px', fontSize: '11px' }}>{biomeLabel}</div>
            <div style={{ marginTop: '4px', fontSize: '10px', color: '#a7daf8' }}>INV: {sandboxState.inventory.wood} wood / {sandboxState.inventory.stone} stone / {sandboxState.inventory.ore} ore</div>
          </div>

          <div className="mutation-note-panel" style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(20, 30, 48, 0.78)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8ab4df' }}>INVENTORY</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {hotbarKeys.map((itemKey, index) => (
                <button key={itemKey} type="button" onClick={() => selectHotbar(index)} style={{
                  minWidth: '56px',
                  borderRadius: '8px',
                  border: index === sandboxState.selectedSlot ? '1px solid rgba(110, 231, 183, 0.8)' : '1px solid rgba(255,255,255,0.1)',
                  background: index === sandboxState.selectedSlot ? 'rgba(16, 185, 129, 0.18)' : 'rgba(15, 23, 42, 0.72)',
                  color: '#ebf7ff',
                  padding: '6px 8px',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  <div>{itemKey === 'aura_pickaxe' ? 'PICK' : itemKey === 'auraShard' ? 'AURA' : itemKey.toUpperCase()}</div>
                  <strong style={{ display: 'block', marginTop: '4px', fontSize: '10px' }}>{sandboxState.inventory[itemKey as keyof typeof sandboxState.inventory] ?? 0}</strong>
                </button>
              ))}
            </div>
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {INVENTORY_KEYS.map((itemKey) => (
                <div key={itemKey} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', borderRadius: '7px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px 8px', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#d9ebff' }}>
                  <span>{itemKey === 'aura_pickaxe' ? 'pickaxe' : itemKey === 'auraShard' ? 'aura' : itemKey}</span>
                  <strong>{sandboxState.inventory[itemKey] ?? 0}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="mutation-note-panel" style={{ marginTop: '12px', padding: '12px', borderRadius: '10px', background: 'rgba(14, 28, 41, 0.8)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <div style={{ fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8ab4df' }}>CRAFTING</div>
            <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: '#ebf7ff' }}>{hotbarRecipe.label}</div>
            <div style={{ marginTop: '4px', fontSize: '9px', color: '#bfdbfe' }}>{hotbarRecipe.description}</div>
            <div style={{ marginTop: '8px', fontSize: '9px', color: '#d9ebff' }}>
              {Object.entries(hotbarRecipe.ingredients).map(([resource, amount]) => (
                <div key={resource} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>{resource === 'auraShard' ? 'aura' : resource}</span>
                  <strong>{amount}</strong>
                </div>
              ))}
            </div>
            <button type="button" onClick={handleCraftPickaxe} disabled={!canCraftPickaxe} style={{ marginTop: '10px', width: '100%', borderRadius: '999px', border: '1px solid rgba(96, 165, 250, 0.7)', background: canCraftPickaxe ? 'rgba(59, 130, 246, 0.22)' : 'rgba(15, 23, 42, 0.4)', color: canCraftPickaxe ? '#e0f2fe' : '#7dd3fc', padding: '8px 10px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {canCraftPickaxe ? 'Craft Aura Pickaxe' : 'Need Materials'}
            </button>
          </div>

          <div className="mutation-notice" role="status">{arena.message}</div>
          <p className="mutation-controls-hint">MOVE WITH WASD OR ARROW KEYS. PRESS SPACE FOR MUTATION BURST. HOLD SHIFT/X/Z TO DASH. PRESS E/F TO MINE. USE 1-5 TO SELECT HOTBAR.</p>
        </aside>
      </section>
    </main>
  );
}

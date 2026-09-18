import { useEffect, useRef, useState } from 'react';
import type { MutationLoadout } from '../game/types';

type MapItem = {
  id: string;
  x: number;
  y: number;
  type: 'aura' | 'pack';
  value: number;
};

type MutationMapProps = {
  playerName: string;
  rivalName: string;
  loadout: MutationLoadout;
  onHome: () => void;
};

const MAP_ITEMS: MapItem[] = [
  { id: 'aura-1', x: 14, y: 24, type: 'aura', value: 1 },
  { id: 'aura-2', x: 30, y: 72, type: 'aura', value: 1 },
  { id: 'aura-3', x: 51, y: 28, type: 'aura', value: 1 },
  { id: 'aura-4', x: 69, y: 76, type: 'aura', value: 1 },
  { id: 'aura-5', x: 87, y: 35, type: 'aura', value: 1 },
  { id: 'pack-1', x: 22, y: 48, type: 'pack', value: 3 },
  { id: 'pack-2', x: 76, y: 22, type: 'pack', value: 3 },
  { id: 'pack-3', x: 55, y: 82, type: 'pack', value: 3 },
];

const ROUND_SECONDS = 60;
const PLAYER_RADIUS = 5;
const MOVE_SPEED = 22;

export function MutationMap({ playerName, rivalName, loadout, onHome }: MutationMapProps) {
  const [position, setPosition] = useState({ x: 10, y: 50 });
  const [collected, setCollected] = useState<string[]>([]);
  const [aura, setAura] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [finished, setFinished] = useState(false);
  const [notice, setNotice] = useState('Explore the map and collect every Aura item.');
  const positionRef = useRef(position);
  const pressedKeys = useRef(new Set<string>());
  const collectedRef = useRef(new Set<string>());
  const startedAt = useRef(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) event.preventDefault();
      pressedKeys.current.add(event.key.toLowerCase());
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
    if (startedAt.current === 0) startedAt.current = performance.now();
    let animationFrame = 0;
    let lastTime = performance.now();
    function loop(now: number) {
      if (!finished) {
        const delta = Math.min(.05, (now - lastTime) / 1000);
        lastTime = now;
        const keys = pressedKeys.current;
        let x = positionRef.current.x;
        let y = positionRef.current.y;
        if (keys.has('arrowleft') || keys.has('a')) x -= MOVE_SPEED * delta;
        if (keys.has('arrowright') || keys.has('d')) x += MOVE_SPEED * delta;
        if (keys.has('arrowup') || keys.has('w')) y -= MOVE_SPEED * delta;
        if (keys.has('arrowdown') || keys.has('s')) y += MOVE_SPEED * delta;
        const next = { x: Math.max(PLAYER_RADIUS, Math.min(100 - PLAYER_RADIUS, x)), y: Math.max(PLAYER_RADIUS, Math.min(100 - PLAYER_RADIUS, y)) };
        positionRef.current = next;
        setPosition(next);

        const nextCollected = new Set(collectedRef.current);
        let gained = 0;
        MAP_ITEMS.forEach((item) => {
          if (!nextCollected.has(item.id) && Math.hypot(next.x - item.x, next.y - item.y) < PLAYER_RADIUS + 3) {
            nextCollected.add(item.id);
            gained += item.value;
            setNotice(item.type === 'pack' ? `Mutation Pack collected: +${item.value} Aura.` : '+1 Aura Core collected.');
          }
        });
        if (gained > 0) {
          collectedRef.current = nextCollected;
          setCollected(Array.from(nextCollected));
          setAura((value) => value + gained);
        }
        const remaining = Math.max(0, ROUND_SECONDS - Math.floor((now - startedAt.current) / 1000));
        setSecondsLeft(remaining);
        if (remaining === 0 || nextCollected.size === MAP_ITEMS.length) setFinished(true);
      }
      animationFrame = window.requestAnimationFrame(loop);
    }
    animationFrame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [finished]);

  function setControl(key: string, active: boolean) {
    if (active) pressedKeys.current.add(key);
    else pressedKeys.current.delete(key);
  }

  const progress = Math.round((collected.length / MAP_ITEMS.length) * 100);
  const archetypeClass = loadout.archetype.toLowerCase();
  const mutationLabel = loadout.mutationId.toUpperCase().replace(/-/g, ' ');

  return (
    <main className="mutation-arena-shell">
      <header className="mutation-arena-header">
        <div className="mutation-arena-brand">
          <span className="eyebrow">AURA MUTATION · 2D ARENA</span>
          <h1>{loadout.trendPack.title} <span>RUN</span></h1>
          <p>{loadout.trendPack.theme} · {mutationLabel} · {loadout.archetype.toUpperCase()}</p>
        </div>
        <button className="mutation-exit-button" onClick={onHome}>EXIT MAP</button>
      </header>

      <section className="mutation-top-hud" aria-label="Arena status">
        <div className="arena-player-card glow-blue">
          <div className="arena-avatar">A</div>
          <div className="arena-player-copy">
            <strong>{playerName}</strong>
            <span>80%</span>
          </div>
          <div className="arena-health"><i style={{ width: '80%' }} /></div>
        </div>
        <div className="arena-player-card glow-indigo">
          <div className="arena-avatar">M</div>
          <div className="arena-player-copy">
            <strong>{rivalName}</strong>
            <span>70%</span>
          </div>
          <div className="arena-health"><i style={{ width: '70%' }} /></div>
        </div>
        <div className="arena-player-card glow-gold">
          <div className="arena-avatar">R</div>
          <div className="arena-player-copy">
            <strong>ROGUE</strong>
            <span>40%</span>
          </div>
          <div className="arena-health"><i style={{ width: '40%' }} /></div>
        </div>
        <div className="arena-player-card glow-green">
          <div className="arena-avatar">R</div>
          <div className="arena-player-copy">
            <strong>RANGER</strong>
            <span>90%</span>
          </div>
          <div className="arena-health"><i style={{ width: '90%' }} /></div>
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
            <div className="objective-zone"><span>OBJECTIVE</span><strong>ENERGY CORE</strong></div>
            {MAP_ITEMS.map((item) => !collected.includes(item.id) && <div key={item.id} className={`map-item map-item-${item.type}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}><span>{item.type === 'pack' ? '▣' : '✦'}</span><small>{item.type === 'pack' ? 'PACK' : 'AURA'}</small></div>)}
            <div className="map-rival" style={{ left: '82%', top: '67%' }}><span>◆</span><small>{rivalName}</small></div>
            <div className="map-player" style={{ left: `${position.x}%`, top: `${position.y}%` }}><span>✦</span><small>{playerName}</small></div>
            {finished && <div className="mutation-finished-overlay"><span className="eyebrow">RUN COMPLETE</span><h2>{aura} AURA</h2><p>{collected.length === MAP_ITEMS.length ? 'Every item collected.' : 'Time is up. Your snapshot is ready.'}</p><button onClick={onHome}>RETURN HOME</button></div>}
          </div>

          <div className="arena-capsule-bar" aria-label="Combat action bar">
            <button className={archetypeClass === 'mobility' ? 'active' : ''}>MOBILITY</button>
            <button className={archetypeClass === 'stability' ? 'active' : ''}>STABILITY</button>
            <button className={archetypeClass === 'volatility' ? 'active' : ''}>VOLATILITY</button>
            <button className="hud-value">{aura} AURA</button>
            <button className="hud-value">{secondsLeft}s</button>
          </div>

          <div className="mutation-touch-controls" aria-label="Touch movement controls">
            <button onPointerDown={() => setControl('arrowup', true)} onPointerUp={() => setControl('arrowup', false)} onPointerLeave={() => setControl('arrowup', false)}>▲</button>
            <div><button onPointerDown={() => setControl('arrowleft', true)} onPointerUp={() => setControl('arrowleft', false)} onPointerLeave={() => setControl('arrowleft', false)}>◀</button><button onPointerDown={() => setControl('arrowdown', true)} onPointerUp={() => setControl('arrowdown', false)} onPointerLeave={() => setControl('arrowdown', false)}>▼</button><button onPointerDown={() => setControl('arrowright', true)} onPointerUp={() => setControl('arrowright', false)} onPointerLeave={() => setControl('arrowright', false)}>▶</button></div>
          </div>
        </div>

        <aside className="mutation-side-panel">
          <div className="mutation-objective">
            <span className="eyebrow">CURRENT OBJECTIVE</span>
            <h2>COLLECT THE FIELD</h2>
            <div className="mutation-objective-bar"><i style={{ width: `${progress}%` }} /></div>
            <strong>{progress}% COMPLETE</strong>
          </div>

          <div className="mutation-rule-card">
            <span className="eyebrow">TREND RULES</span>
            {loadout.trendPack.rules.map((rule) => <p key={rule}>• {rule}</p>)}
          </div>

          <div className="mutation-notice" role="status">{notice}</div>
          <p className="mutation-controls-hint">MOVE WITH WASD OR ARROW KEYS. TOUCH CONTROLS ARE AVAILABLE ON MOBILE.</p>
        </aside>
      </section>
    </main>
  );
}

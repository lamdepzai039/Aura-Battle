import { useState } from 'react';
import type { GameMode } from '../game/types';
import { createLocalRoom, getLocalRoom, joinLocalRoom } from '../utils/roomStore';

type QueueMode = '1V1' | 'AURA MUTATION' | '2V2' | '3V3' | 'RANKED' | 'ROOM';

export function PlayMode({ onSelect, onBack }: { onSelect: (mode: GameMode) => void; onBack: () => void }) {
  const [mode, setMode] = useState<QueueMode>('1V1');
  const [roomCode, setRoomCode] = useState('');
  const [notice, setNotice] = useState('');
  const [room, setRoom] = useState(() => getLocalRoom());
  const modes: Array<{ id: QueueMode; title: string; description: string; available: boolean; gameMode?: GameMode }> = [
    { id: '1V1', title: '1V1 DUEL', description: 'One camera. Two players. Pure aura.', available: true, gameMode: 'local' },
    { id: 'AURA MUTATION', title: 'AURA MUTATION', description: 'Your playstyle changes your current, then the arena responds in real time.', available: true, gameMode: 'mutation' },
    { id: '2V2', title: '2V2 SQUAD', description: 'Team matchmaking requires the multiplayer service.', available: false },
    { id: '3V3', title: '3V3 CREW', description: 'Crew matchmaking requires the multiplayer service.', available: false },
    { id: 'RANKED', title: 'RANKED', description: 'Competitive rating requires an authoritative server.', available: false },
    { id: 'ROOM', title: 'PRIVATE ROOM', description: 'Create or join with a room code.', available: true },
  ];
  function selectMode(next: typeof modes[number]) { setMode(next.id); setNotice(next.available ? '' : 'This mode needs the multiplayer backend. No fake queue was started.'); }
  function createRoom() { const next = createLocalRoom('LOCAL PLAYER'); setRoom(next); setRoomCode(next.code); setNotice('Room created locally. Share the code with a player on this device.'); }
  function joinRoom() { const joined = joinLocalRoom(roomCode); setRoom(joined); setNotice(joined ? 'Room code accepted locally. Remote room service is not connected.' : 'Room not found in this browser.'); }
  async function copyRoomCode() { if (!room) return; await navigator.clipboard?.writeText(room.code); setNotice('Room code copied.'); }
  const selectedMode = modes.find((item) => item.id === mode);
  const canEnterMutation = selectedMode?.gameMode === 'mutation';
  return <div className="play-mode-shell"><div className="play-mode-grid" aria-hidden="true" /><header className="play-mode-header"><button onClick={onBack}>← BACK</button><div><span className="eyebrow">MATCH CONFIGURATION</span><h1>⚔ PLAY MODE</h1><p>Choose how you want to enter the arena.</p></div></header><main className="play-mode-main"><div className="mode-rail">{modes.map((item) => <button key={item.id} className={mode === item.id ? 'active' : ''} onClick={() => selectMode(item)}><span>{item.id === 'RANKED' ? '♜' : item.id === 'ROOM' ? '⌘' : item.id === 'AURA MUTATION' ? '✦' : '⚔'}</span><strong>{item.title}</strong><small>{item.available ? 'READY' : 'BACKEND REQUIRED'}</small></button>)}</div><section className="mode-detail"><span className="eyebrow">SELECTED MODE</span><h2>{selectedMode?.title}</h2><p>{selectedMode?.description}</p>{mode === 'ROOM' && <div className="room-fields"><label>ROOM CODE<input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6))} placeholder="6-DIGIT CODE" maxLength={6} /></label><div className="room-actions"><button type="button" onClick={joinRoom} disabled={roomCode.length !== 6}>JOIN ROOM</button><button type="button" onClick={createRoom}>CREATE ROOM</button></div>{room && <div className="room-created"><strong>ROOM {room.code}</strong><span>WAITING FOR PLAYER · LOCAL ROOM</span><button type="button" onClick={copyRoomCode}>COPY CODE</button></div>}</div>}{mode === '1V1' && <div className="mode-ready"><strong>LOCAL CAMERA READY</strong><span>Landmark AI scoring enabled per frame.</span><button onClick={() => onSelect('local')}>ENTER 1V1 <span>↗</span></button></div>}{mode === 'AURA MUTATION' && <div className="mode-ready"><strong>AURA MUTATION READY</strong><span>Mutations are selected from your archetype and the trend pack rotates per round.</span><button onClick={() => onSelect('mutation')}>ENTER MUTATION <span>↗</span></button></div>}{mode !== '1V1' && mode !== 'AURA MUTATION' && mode !== 'ROOM' && <div className="mode-unavailable">{notice || 'CONNECT A MULTIPLAYER SERVER TO ENABLE THIS MODE.'}</div>}{notice && mode === 'ROOM' && <div className="mode-unavailable">{notice}</div>}{canEnterMutation && notice && mode === 'AURA MUTATION' && <div className="mode-unavailable">{notice}</div>}</section></main></div>;
}

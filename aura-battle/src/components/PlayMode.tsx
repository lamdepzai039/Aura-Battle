import { useEffect, useRef, useState } from 'react';
import type { GameMode } from '../game/types';
import { getLocalRoom } from '../utils/roomStore';
import { resolveLobbyUrl, sanitizeRoomCode, type OnlineRoomState } from '../utils/onlineRoom';

type QueueMode = '1V1' | 'AURA MUTATION' | '2V2' | '3V3' | 'RANKED' | 'ROOM';

type OnlineBattleContext = {
  roomCode: string;
  host: string;
  guest: string | null;
  isHost: boolean;
  phase: OnlineRoomState['phase'];
};

export function PlayMode({ username, onSelect, onBack }: { username?: string; onSelect: (mode: GameMode, onlineContext?: OnlineBattleContext) => void; onBack: () => void }) {
  const [mode, setMode] = useState<QueueMode>('1V1');
  const [roomCode, setRoomCode] = useState('');
  const [notice, setNotice] = useState('');
  const [room] = useState(() => getLocalRoom());
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomState | null>(null);
  const [socketStatus, setSocketStatus] = useState<'offline' | 'connecting' | 'ready'>('offline');
  const [isHost, setIsHost] = useState(false);
  const [selfReady, setSelfReady] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const playerName = username || 'PLAYER';

  useEffect(() => {
    if (mode !== 'ROOM') return undefined;

    const nextSocket = new WebSocket(resolveLobbyUrl(window.location.href));
    socketRef.current = nextSocket;
    setSocketStatus('connecting');
    setNotice('Connecting to the online lobby...');

    nextSocket.onopen = () => {
      setSocketStatus('ready');
      setNotice('Lobby connected. Create or join a room.');
    };

    nextSocket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string; room?: OnlineRoomState; message?: string; you?: 'host' | 'guest' };
        if (payload.type === 'room_state' && payload.room) {
          setOnlineRoom(payload.room);
          setRoomCode(payload.room.code);
          const isCurrentHost = payload.room.host === playerName || payload.you === 'host';
          const isCurrentGuest = payload.room.guest === playerName || payload.you === 'guest';
          setIsHost(isCurrentHost);
          setSelfReady(isCurrentHost ? payload.room.hostReady : isCurrentGuest ? payload.room.guestReady : false);

          if (payload.room.phase === 'playing') {
            setNotice(`Battle live in room ${payload.room.code}.`);
            onSelect('online', {
              roomCode: payload.room.code,
              host: payload.room.host,
              guest: payload.room.guest,
              isHost: isCurrentHost,
              phase: payload.room.phase,
            });
            return;
          }

          setNotice(payload.room.guest ? `${payload.room.host} vs ${payload.room.guest}` : `Room ${payload.room.code} is waiting for a challenger.`);
          return;
        }

        if (payload.type === 'match_start' && payload.room) {
          setOnlineRoom(payload.room);
          setRoomCode(payload.room.code);
          const currentPlayerIsHost = payload.room.host === playerName;
          setIsHost(currentPlayerIsHost);
          setSelfReady(currentPlayerIsHost ? payload.room.hostReady : payload.room.guestReady);
          setNotice(`${payload.room.host} vs ${payload.room.guest ?? 'rival'} · battle started.`);
          onSelect('online', {
            roomCode: payload.room.code,
            host: payload.room.host,
            guest: payload.room.guest,
            isHost: currentPlayerIsHost,
            phase: payload.room.phase,
          });
          return;
        }

        if (payload.type === 'error' && payload.message) {
          setNotice(payload.message);
        }
      } catch {
        setNotice('Unexpected response from the lobby server.');
      }
    };

    nextSocket.onerror = () => {
      setSocketStatus('offline');
      setNotice('Lobby server is offline. Start the backend with npm run server.');
    };

    nextSocket.onclose = () => {
      setSocketStatus('offline');
    };

    return () => {
      nextSocket.close();
      socketRef.current = null;
    };
  }, [mode]);

  const modes: Array<{ id: QueueMode; title: string; description: string; available: boolean; gameMode?: GameMode }> = [
    { id: '1V1', title: '1V1 DUEL', description: 'One camera. Two players. Pure aura.', available: true, gameMode: 'local' },
    { id: 'AURA MUTATION', title: 'AURA MUTATION', description: 'Your playstyle changes your current, then the arena responds in real time.', available: true, gameMode: 'mutation' },
    { id: '2V2', title: '2V2 SQUAD', description: 'Team matchmaking requires the multiplayer service.', available: false },
    { id: '3V3', title: '3V3 CREW', description: 'Crew matchmaking requires the multiplayer service.', available: false },
    { id: 'RANKED', title: 'RANKED', description: 'Competitive rating requires an authoritative server.', available: false },
    { id: 'ROOM', title: 'PRIVATE ROOM', description: 'Create or join with a room code.', available: true },
  ];

  function selectMode(next: typeof modes[number]) {
    setMode(next.id);
    setNotice(next.available ? '' : 'This mode needs the multiplayer backend. No fake queue was started.');
  }

  function createRoom() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setNotice('Lobby server is not connected yet.');
      return;
    }
    setIsHost(true);
    setSelfReady(false);
    socket.send(JSON.stringify({ type: 'create_room', username: playerName }));
    setNotice('Creating room...');
  }

  function joinRoom() {
    const code = sanitizeRoomCode(roomCode);
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setNotice('Lobby server is not connected yet.');
      return;
    }

    if (code.length !== 6) {
      setNotice('Enter a valid 6-character room code.');
      return;
    }

    setIsHost(false);
    setSelfReady(false);
    socket.send(JSON.stringify({ type: 'join_room', code, username: playerName }));
    setNotice(`Joining room ${code}...`);
  }

  function toggleReady() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setNotice('Lobby server is not connected yet.');
      return;
    }
    const nextReady = !selfReady;
    setSelfReady(nextReady);
    socket.send(JSON.stringify({ type: 'set_ready', ready: nextReady }));
    setNotice(nextReady ? 'You are ready to battle.' : 'You left the ready state.');
  }

  function startOnlineBattle() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setNotice('Lobby server is not connected yet.');
      return;
    }
    if (!onlineRoom?.guest) {
      setNotice('You need a challenger before starting the match.');
      return;
    }
    socket.send(JSON.stringify({ type: 'start_battle' }));
    setNotice('Starting battle...');
  }

  async function copyRoomCode() {
    const target = onlineRoom?.code || room?.code;
    if (!target) return;
    await navigator.clipboard?.writeText(target);
    setNotice('Room code copied.');
  }

  const selectedMode = modes.find((item) => item.id === mode);
  const roomLabel = onlineRoom?.code || room?.code || roomCode;
  const lobbyStatus = socketStatus === 'ready' ? 'ONLINE' : socketStatus === 'connecting' ? 'CONNECTING' : 'OFFLINE';

  return (
    <div className="play-mode-shell">
      <div className="play-mode-grid" aria-hidden="true" />
      <header className="play-mode-header">
        <button onClick={onBack}>← BACK</button>
        <div>
          <span className="eyebrow">MATCH CONFIGURATION</span>
          <h1>⚔ PLAY MODE</h1>
          <p>Choose how you want to enter the arena.</p>
        </div>
      </header>
      <main className="play-mode-main">
        <div className="mode-rail">
          {modes.map((item) => (
            <button key={item.id} className={mode === item.id ? 'active' : ''} onClick={() => selectMode(item)}>
              <span>{item.id === 'RANKED' ? '♜' : item.id === 'ROOM' ? '⌘' : item.id === 'AURA MUTATION' ? '✦' : '⚔'}</span>
              <strong>{item.title}</strong>
              <small>{item.available ? 'READY' : 'BACKEND REQUIRED'}</small>
            </button>
          ))}
        </div>

        <section className="mode-detail">
          <span className="eyebrow">SELECTED MODE</span>
          <h2>{selectedMode?.title}</h2>
          <p>{selectedMode?.description}</p>

          {mode === 'ROOM' && (
            <div className="room-fields">
              <div className="flex items-center justify-between text-[10px] font-display tracking-[0.22em] text-white/60">
                <span>LOBBY STATUS</span>
                <span className={socketStatus === 'ready' ? 'text-cyan-300' : 'text-yellow-300'}>{lobbyStatus}</span>
              </div>

              <label>
                ROOM CODE
                <input
                  value={roomCode}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6))}
                  placeholder="6-DIGIT CODE"
                  maxLength={6}
                />
              </label>

              <div className="room-actions">
                <button type="button" onClick={joinRoom} disabled={roomCode.length !== 6}>JOIN ROOM</button>
                <button type="button" onClick={createRoom}>CREATE ROOM</button>
              </div>

              {(onlineRoom || room) && (
                <div className="room-created">
                  <strong>ROOM {roomLabel}</strong>
                  <span>{onlineRoom ? (onlineRoom.phase === 'playing' ? `MATCH LIVE · ${onlineRoom.host} vs ${onlineRoom.guest ?? 'RIVAL'}` : onlineRoom.guest ? `${onlineRoom.host} vs ${onlineRoom.guest}` : 'WAITING FOR PLAYER') : 'WAITING FOR PLAYER · LOCAL ROOM'}</span>
                  <div className="room-actions compact">
                    <button type="button" onClick={copyRoomCode}>COPY CODE</button>
                    {onlineRoom && onlineRoom.phase !== 'playing' && (
                      <button type="button" onClick={toggleReady}>{selfReady ? 'UNREADY' : 'READY UP'}</button>
                    )}
                    {onlineRoom && isHost && onlineRoom.guest && onlineRoom.phase !== 'playing' && (
                      <button type="button" onClick={startOnlineBattle}>START BATTLE</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === '1V1' && (
            <div className="mode-ready">
              <strong>LOCAL CAMERA READY</strong>
              <span>Landmark AI scoring enabled per frame.</span>
              <button onClick={() => onSelect('local')}>ENTER 1V1 <span>↗</span></button>
            </div>
          )}

          {mode === 'AURA MUTATION' && (
            <div className="mode-ready">
              <strong>AURA MUTATION READY</strong>
              <span>Mutations are selected from your archetype and the trend pack rotates per round.</span>
              <button onClick={() => onSelect('mutation')}>ENTER MUTATION <span>↗</span></button>
            </div>
          )}

          {mode !== '1V1' && mode !== 'ROOM' && mode !== 'AURA MUTATION' && (
            <div className="mode-ready">
              <strong>BACKEND REQUIRED</strong>
              <span>{selectedMode?.available ? 'This queue is ready to connect to the lobby server.' : 'This flow still needs a live server implementation.'}</span>
              <button onClick={() => setNotice('The backend for this queue is not live yet. Start the lobby server and connect a second client.')}>CHECK BACKEND <span>↗</span></button>
            </div>
          )}

          {mode === 'ROOM' && (
            <div className="mode-ready">
              <strong>ONLINE LOBBY READY</strong>
              <span>{notice || 'Connect via the room code server to find a rival.'}</span>
              <button onClick={() => onSelect('online', onlineRoom ? {
                roomCode: onlineRoom.code,
                host: onlineRoom.host,
                guest: onlineRoom.guest,
                isHost,
                phase: onlineRoom.phase,
              } : undefined)}>OPEN ONLINE BATTLE <span>↗</span></button>
            </div>
          )}

          {notice && <div className="mode-notice">{notice}</div>}
        </section>
      </main>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { GameMode } from '../game/types';
import { LOCAL_ROOM_KEY, clearLocalRoom, clearStaleLocalRoom, createLocalRoom, getLocalRoom, joinLocalRoom, updateLocalRoom } from '../utils/roomStore';
import { createFallbackRoomState, resolveLobbyUrl, sanitizeRoomCode, type OnlineRoomState } from '../utils/onlineRoom';

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
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('room')?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) ?? '';
  });
  const [notice, setNotice] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [room] = useState(() => getLocalRoom());
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomState | null>(null);
  const [socketStatus, setSocketStatus] = useState<'offline' | 'connecting' | 'ready'>('offline');
  const [isHost, setIsHost] = useState(false);
  const [selfReady, setSelfReady] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const playerName = username || 'PLAYER';

  function showNotice(message: string) {
    setNotice(message);
    setToastVisible(Boolean(message));
  }

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setToastVisible(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (mode !== 'ROOM') {
      clearStaleLocalRoom();
      return undefined;
    }

    const syncLocalRoom = () => {
      const saved = getLocalRoom();
      if (!saved) return;

      const staleAgeMs = Date.now() - new Date(saved.createdAt).getTime();
      if (staleAgeMs > 30 * 60 * 1000) {
        clearLocalRoom();
        setOnlineRoom(null);
        setRoomCode('');
        showNotice('Room expired. Create a fresh room code.');
        return;
      }

      const roomState = createFallbackRoomState(saved.host, saved.guest ?? null, saved.code);
      roomState.phase = saved.phase ?? 'waiting';
      roomState.status = saved.status === 'playing' ? 'ready' : (saved.status ?? 'waiting');
      roomState.hostReady = saved.hostReady ?? false;
      roomState.guestReady = saved.guestReady ?? false;
      roomState.startedAt = saved.startedAt ?? null;
      roomState.matchSeed = saved.matchSeed ?? null;
      // The lobby state is synchronized from browser storage, so this update is intentionally tied to the external room snapshot.
      // oxlint-disable-next-line react/set-state-in-effect
      setOnlineRoom(roomState);
      // oxlint-disable-next-line react/set-state-in-effect
      setRoomCode(saved.code);
      // oxlint-disable-next-line react/set-state-in-effect
      setIsHost(saved.host === playerName);
      // oxlint-disable-next-line react/set-state-in-effect
      setSelfReady(saved.hostReady ?? false);
    };

    syncLocalRoom();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_ROOM_KEY) {
        syncLocalRoom();
      }
    };
    window.addEventListener('storage', handleStorage);

    const nextSocket = new WebSocket(resolveLobbyUrl(window.location.href));
    socketRef.current = nextSocket;
    // This effect is intentionally tied to browser socket lifecycle updates from the external lobby connection.
    // oxlint-disable-next-line react/set-state-in-effect
    setSocketStatus('connecting');
    // oxlint-disable-next-line react/set-state-in-effect
    setNotice('Connecting to the online lobby...');

    nextSocket.onopen = () => {
      setSocketStatus('ready');
      showNotice('Lobby connected. Create or join a room.');
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
            showNotice(`Battle live in room ${payload.room.code}.`);
            onSelect('online', {
              roomCode: payload.room.code,
              host: payload.room.host,
              guest: payload.room.guest,
              isHost: isCurrentHost,
              phase: payload.room.phase,
            });
            return;
          }

          showNotice(payload.room.guest ? `${payload.room.host} vs ${payload.room.guest}` : `Room ${payload.room.code} is waiting for a challenger.`);
          return;
        }

        if (payload.type === 'match_start' && payload.room) {
          setOnlineRoom(payload.room);
          setRoomCode(payload.room.code);
          const currentPlayerIsHost = payload.room.host === playerName;
          setIsHost(currentPlayerIsHost);
          setSelfReady(currentPlayerIsHost ? payload.room.hostReady : payload.room.guestReady);
          showNotice(`${payload.room.host} vs ${payload.room.guest ?? 'rival'} · battle started.`);
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
          showNotice(payload.message);
        }
      } catch {
        showNotice('Unexpected response from the lobby server.');
      }
    };

    nextSocket.onerror = () => {
      setSocketStatus('offline');
      showNotice('Lobby server is offline. Start the backend with npm run server.');
    };

    nextSocket.onclose = () => {
      setSocketStatus('offline');
    };

    return () => {
      window.removeEventListener('storage', handleStorage);
      nextSocket.close();
      socketRef.current = null;
    };
  }, [mode, onSelect, playerName]);

  useEffect(() => {
    if (mode !== 'ROOM') return;
    const params = new URLSearchParams(window.location.search);
    if (roomCode) {
      params.set('room', roomCode);
    } else {
      params.delete('room');
    }
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState({}, '', nextUrl);
  }, [mode, roomCode]);

  useEffect(() => {
    if (mode !== 'ROOM' || !roomCode || onlineRoom) return;

    const localRoom = getLocalRoom();
    if (!localRoom || localRoom.code !== roomCode) return;

    const fallbackRoom = createFallbackRoomState(localRoom.host, localRoom.guest ?? null, localRoom.code);
    fallbackRoom.phase = localRoom.phase ?? 'waiting';
    fallbackRoom.status = localRoom.status === 'playing' ? 'ready' : (localRoom.status ?? 'waiting');
    fallbackRoom.hostReady = localRoom.hostReady ?? false;
    fallbackRoom.guestReady = localRoom.guestReady ?? false;
    fallbackRoom.startedAt = localRoom.startedAt ?? null;
    fallbackRoom.matchSeed = localRoom.matchSeed ?? null;
    // oxlint-disable-next-line react/set-state-in-effect
    setOnlineRoom(fallbackRoom);
    // oxlint-disable-next-line react/set-state-in-effect
    setIsHost(localRoom.host === playerName);
    // oxlint-disable-next-line react/set-state-in-effect
    setSelfReady(localRoom.hostReady ?? false);
    // oxlint-disable-next-line react/set-state-in-effect
    setNotice(localRoom.guest ? `${localRoom.host} vs ${localRoom.guest}` : `Room ${localRoom.code} is waiting for a challenger.`);
  }, [mode, onlineRoom, playerName, roomCode]);

  const modes: Array<{ id: QueueMode; title: string; description: string; available: boolean; gameMode?: GameMode }> = [
    { id: '1V1', title: '1V1 DUEL', description: 'One camera. Two players. Pure aura.', available: true, gameMode: 'local' },
    { id: 'AURA MUTATION', title: 'AURA MUTATION', description: 'Your playstyle changes your current, then the arena responds in real time.', available: true, gameMode: 'mutation' },
    { id: '2V2', title: '2V2 SQUAD', description: 'Local squad queue fallback with a ready-to-play team duel.', available: true, gameMode: 'duo' },
    { id: '3V3', title: '3V3 CREW', description: 'Local crew queue fallback for quick 3v3-style testing.', available: true, gameMode: 'crew' },
    { id: 'RANKED', title: 'RANKED', description: 'Competitive bracket flow enabled with local fallback for now.', available: true, gameMode: 'ranked' },
    { id: 'ROOM', title: 'PRIVATE ROOM', description: 'Create or join with a room code.', available: true },
  ];

  function selectMode(next: typeof modes[number]) {
    setMode(next.id);
    showNotice(next.available ? '' : 'This mode needs the multiplayer backend. No fake queue was started.');
  }

  function createRoom() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const fallbackRoom = createFallbackRoomState(playerName);
      createLocalRoom(playerName, fallbackRoom.code);
      updateLocalRoom({
        ...fallbackRoom,
        host: playerName,
        guest: null,
        status: 'waiting',
        phase: 'waiting',
        hostReady: false,
        guestReady: false,
      });
      setOnlineRoom(fallbackRoom);
      setRoomCode(fallbackRoom.code);
      setIsHost(true);
      setSelfReady(false);
      const roomLink = new URL(window.location.href);
      roomLink.searchParams.set('room', fallbackRoom.code);
      if (navigator.clipboard) {
        void navigator.clipboard.writeText(roomLink.toString());
      }
      showNotice('Room created. Share link copied automatically.');
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
      const joined = joinLocalRoom(code, playerName);
      if (!joined) {
        showNotice('Offline room not found. Create the room first or enter a valid 6-character code.');
        return;
      }

      const fallbackRoom = createFallbackRoomState(joined.host, playerName, code);
      fallbackRoom.status = 'ready';
      fallbackRoom.phase = 'ready';
      fallbackRoom.guestReady = true;
      setOnlineRoom(fallbackRoom);
      setRoomCode(code);
      setIsHost(false);
      setSelfReady(false);
      showNotice(`Joined offline room ${code}.`);
      return;
    }

    if (code.length !== 6) {
      showNotice('Enter a valid 6-character room code.');
      return;
    }

    setIsHost(false);
    setSelfReady(false);
    socket.send(JSON.stringify({ type: 'join_room', code, username: playerName }));
    showNotice(`Joining room ${code}...`);
  }

  function toggleReady() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      if (!onlineRoom) {
        showNotice('Create a room before toggling ready state.');
        return;
      }
      const nextReady = !selfReady;
      const nextRoom: OnlineRoomState = {
        ...onlineRoom,
        hostReady: isHost ? nextReady : onlineRoom.hostReady,
        guestReady: !isHost ? nextReady : onlineRoom.guestReady,
        status: onlineRoom.guest || nextReady ? 'ready' : 'waiting',
        phase: 'ready',
      };
      setSelfReady(nextReady);
      setOnlineRoom(nextRoom);
      updateLocalRoom({
        code: nextRoom.code,
        createdAt: nextRoom.createdAt,
        host: nextRoom.host,
        guest: nextRoom.guest,
        status: nextRoom.status,
        phase: nextRoom.phase,
        hostReady: nextRoom.hostReady,
        guestReady: nextRoom.guestReady,
        startedAt: nextRoom.startedAt,
        matchSeed: nextRoom.matchSeed,
      });
      showNotice(nextReady ? 'You are ready to battle.' : 'You left the ready state.');
      return;
    }
    const nextReady = !selfReady;
    setSelfReady(nextReady);
    socket.send(JSON.stringify({ type: 'set_ready', ready: nextReady }));
    showNotice(nextReady ? 'You are ready to battle.' : 'You left the ready state.');
  }

  function startOnlineBattle() {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      const room = onlineRoom ?? createFallbackRoomState(playerName, null, roomCode || undefined);
      const startRoom: OnlineRoomState = {
        ...room,
        hostReady: true,
        guestReady: room.guest ? true : false,
        status: room.guest ? 'ready' : 'waiting',
        phase: 'playing',
        startedAt: new Date().toISOString(),
        matchSeed: Date.now(),
      };
      setOnlineRoom(startRoom);
      setRoomCode(startRoom.code);
      updateLocalRoom({
        code: startRoom.code,
        createdAt: startRoom.createdAt,
        host: startRoom.host,
        guest: startRoom.guest,
        status: startRoom.status,
        phase: startRoom.phase,
        hostReady: true,
        guestReady: startRoom.guest ? true : false,
        startedAt: startRoom.startedAt,
        matchSeed: startRoom.matchSeed,
      });
      showNotice('Offline battle ready to start.');
      onSelect('online', {
        roomCode: startRoom.code,
        host: startRoom.host,
        guest: startRoom.guest,
        isHost: true,
        phase: startRoom.phase,
      });
      return;
    }
    if (!onlineRoom?.guest) {
      showNotice('You need a challenger before starting the match.');
      return;
    }
    socket.send(JSON.stringify({ type: 'start_battle' }));
    showNotice('Starting battle...');
  }

  async function copyRoomCode() {
    const target = onlineRoom?.code || room?.code;
    if (!target) return;
    await navigator.clipboard?.writeText(target);
    showNotice('Room code copied.');
  }

  async function copyRoomLink() {
    const target = onlineRoom?.code || room?.code || roomCode;
    if (!target) return;
    const url = new URL(window.location.href);
    url.searchParams.set('room', target);
    await navigator.clipboard?.writeText(url.toString());
    showNotice('Room link copied.');
  }

  const selectedMode = modes.find((item) => item.id === mode);
  const roomLabel = onlineRoom?.code || room?.code || roomCode;
  const lobbyStatus = socketStatus === 'ready' ? 'ONLINE' : socketStatus === 'connecting' ? 'CONNECTING' : onlineRoom || room ? 'LOCAL' : 'OFFLINE';

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
                    <button type="button" className="min-w-[120px]" onClick={copyRoomCode}>COPY CODE</button>
                    <button type="button" className="min-w-[120px]" onClick={copyRoomLink}>SHARE ROOM</button>
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

          {(mode === '2V2' || mode === '3V3' || mode === 'RANKED') && (
            <div className="mode-ready">
              <strong>{mode === '2V2' ? 'SQUAD QUEUE READY' : mode === '3V3' ? 'CREW QUEUE READY' : 'RANKED READY'}</strong>
              <span>
                {mode === '2V2'
                  ? 'This queue is enabled with the local fallback flow so you can test team match entry immediately.'
                  : mode === '3V3'
                  ? 'This crew queue is enabled with the local fallback flow for quick skirmishes.'
                  : 'This ranked flow is enabled with the local fallback flow so the bracket can be tested without the backend.'}
              </span>
              <button onClick={() => onSelect(selectedMode?.gameMode ?? 'local')}>{mode === '2V2' ? 'ENTER 2V2' : mode === '3V3' ? 'ENTER 3V3' : 'ENTER RANKED'} <span>↗</span></button>
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

          {toastVisible && notice && (
            <div className="mode-notice fixed right-4 top-4 z-50 max-w-sm rounded-full border border-cyan-400/60 bg-slate-950/85 px-4 py-2 text-xs font-display tracking-[0.22em] text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.2)]">
              {notice}
            </div>
          )}
          {notice && <div className="mode-notice">{notice}</div>}
        </section>
      </main>
    </div>
  );
}

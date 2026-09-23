export type OnlineRoomPhase = 'waiting' | 'ready' | 'playing';
export type RoomFormat = '1v1' | '2v2' | '3v3';

export type RoomPlayer = {
  id: string;
  name: string;
  team: 'A' | 'B';
  ready: boolean;
  connected: boolean;
};

export type OnlineRoomState = {
  code: string;
  host: string;
  guest: string | null;
  status: 'waiting' | 'ready';
  phase: OnlineRoomPhase;
  createdAt: string;
  hostReady: boolean;
  guestReady: boolean;
  startedAt: string | null;
  matchSeed: number | null;
  format: RoomFormat;
  maxPlayers: 2 | 4 | 6;
  players: RoomPlayer[];
};

export type LobbyMessage =
  | { type: 'room_state'; room: OnlineRoomState; you?: 'host' | 'guest' }
  | { type: 'match_start'; room: OnlineRoomState; seed: number | null; startedAt: string | null }
  | { type: 'pong' }
  | { type: 'error'; message: string }
  | { type: 'create_room'; username?: string }
  | { type: 'join_room'; code: string; username?: string }
  | { type: 'set_ready'; ready: boolean }
  | { type: 'start_battle' }
  | { type: 'rejoin_room'; code: string; username?: string }
  | { type: 'ping' };

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createFallbackRoomState(host: string, guest: string | null = null, codeOverride?: string, format: RoomFormat = '1v1'): OnlineRoomState {
  const code = sanitizeRoomCode(codeOverride ?? generateRoomCode());
  const maxPlayers = format === '3v3' ? 6 : format === '2v2' ? 4 : 2;
  const players: RoomPlayer[] = [{ id: 'p1', name: host.trim() || 'PLAYER', team: 'A', ready: false, connected: true }];
  if (guest) players.push({ id: 'p2', name: guest, team: 'B', ready: false, connected: true });
  const room: OnlineRoomState = {
    code,
    host: host.trim() || 'PLAYER',
    guest,
    status: guest ? 'ready' : 'waiting',
    phase: 'waiting',
    createdAt: new Date().toISOString(),
    hostReady: false,
    guestReady: false,
    startedAt: null,
    matchSeed: null,
    format,
    maxPlayers,
    players,
  };

  if (typeof localStorage !== 'undefined') {
    const localRoom = {
      code: room.code,
      createdAt: room.createdAt,
      host: room.host,
      guest: room.guest,
      status: room.status,
    };
    localStorage.setItem('aura-battle-private-room', JSON.stringify(localRoom));
  }

  return room;
}

export function sanitizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function resolveLobbyUrl(baseUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173') {
  if (!baseUrl) return 'ws://localhost:3001';

  if (baseUrl.startsWith('ws://') || baseUrl.startsWith('wss://')) {
    return baseUrl;
  }

  try {
    const url = new URL(baseUrl);
    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
    if (isLocal) {
      return 'ws://localhost:3001';
    }

    const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${url.hostname}${url.port ? `:${url.port}` : ''}`;
  } catch {
    if (baseUrl.startsWith('https://')) {
      const host = baseUrl.replace(/^https?:\/\//, '').split('/')[0];
      return `wss://${host}`;
    }
    if (baseUrl.startsWith('http://')) {
      const host = baseUrl.replace(/^http:\/\//, '').split('/')[0];
      return `ws://${host}`;
    }
    return 'ws://localhost:3001';
  }
}

export function isRoomJoinPayload(value: unknown): value is { code: string; username: string } {
  return !!value && typeof value === 'object' && 'code' in value && 'username' in value;
}

export function isRoomState(value: unknown): value is OnlineRoomState {
  return !!value && typeof value === 'object' && 'code' in value && 'host' in value && 'status' in value && 'phase' in value;
}

export function isMatchStartMessage(value: unknown): value is Extract<LobbyMessage, { type: 'match_start' }> {
  return !!value && typeof value === 'object' && 'type' in value && value.type === 'match_start' && 'room' in value;
}

export function openLobbySocket(
  onMessage: (message: LobbyMessage) => void,
  baseUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173',
) {
  const socket = new WebSocket(resolveLobbyUrl(baseUrl));
  socket.addEventListener('message', (event) => {
    const payload = JSON.parse(event.data) as LobbyMessage;
    onMessage(payload);
  });
  return socket;
}

export type OnlineRoomState = {
  code: string;
  host: string;
  guest: string | null;
  status: 'waiting' | 'ready';
  createdAt: string;
};

export type LobbyMessage =
  | { type: 'room_state'; room: OnlineRoomState }
  | { type: 'pong' }
  | { type: 'error'; message: string }
  | { type: 'create_room'; username?: string }
  | { type: 'join_room'; code: string; username?: string }
  | { type: 'ping' };

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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
  return !!value && typeof value === 'object' && 'code' in value && 'host' in value && 'status' in value;
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

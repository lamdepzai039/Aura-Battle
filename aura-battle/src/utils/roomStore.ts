import { generateRoomCode } from './onlineRoom';

export const LOCAL_ROOM_KEY = 'aura-battle-private-room';

export type LocalRoom = {
  code: string;
  createdAt: string;
  host: string;
  guest?: string | null;
  status: 'waiting' | 'ready' | 'playing';
  phase?: 'waiting' | 'ready' | 'playing';
  hostReady?: boolean;
  guestReady?: boolean;
  startedAt?: string | null;
  matchSeed?: number | null;
};

function normalizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function readRoom(): LocalRoom | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_ROOM_KEY) || 'null') as Partial<LocalRoom> | null;
    if (!saved || typeof saved !== 'object') return null;
    const code = normalizeRoomCode(String(saved.code ?? ''));
    if (!code) return null;

    return {
      code,
      createdAt: String(saved.createdAt ?? new Date().toISOString()),
      host: String(saved.host ?? 'PLAYER'),
      guest: saved.guest == null ? null : String(saved.guest),
      status: saved.status === 'ready' || saved.status === 'playing' ? saved.status : 'waiting',
      phase: saved.phase === 'ready' || saved.phase === 'playing' ? saved.phase : 'waiting',
      hostReady: Boolean(saved.hostReady),
      guestReady: Boolean(saved.guestReady),
      startedAt: saved.startedAt ?? null,
      matchSeed: saved.matchSeed ?? null,
    } satisfies LocalRoom;
  } catch {
    return null;
  }
}

export function createLocalRoom(host: string, codeOverride?: string): LocalRoom {
  const code = normalizeRoomCode(codeOverride ?? generateRoomCode());
  const room: LocalRoom = {
    code,
    createdAt: new Date().toISOString(),
    host: host.trim() || 'PLAYER',
    guest: null,
    status: 'waiting',
    phase: 'waiting',
    hostReady: false,
    guestReady: false,
    startedAt: null,
    matchSeed: null,
  };
  localStorage.setItem(LOCAL_ROOM_KEY, JSON.stringify(room));
  return room;
}

export function getLocalRoom() { return readRoom(); }

export function updateLocalRoom(room: LocalRoom | null) {
  if (!room) {
    clearLocalRoom();
    return null;
  }
  localStorage.setItem(LOCAL_ROOM_KEY, JSON.stringify(room));
  return readRoom();
}

export function joinLocalRoom(code: string, guest?: string): LocalRoom | null {
  const room = readRoom();
  const normalizedCode = normalizeRoomCode(code);
  if (!room || room.code !== normalizedCode) return null;

  const nextRoom: LocalRoom = {
    ...room,
    guest: guest && guest.trim() ? guest.trim() : room.guest ?? null,
    status: guest && guest.trim() ? 'ready' : room.status,
    phase: guest && guest.trim() ? 'ready' : room.phase ?? 'waiting',
    guestReady: guest && guest.trim() ? true : room.guestReady ?? false,
  };

  localStorage.setItem(LOCAL_ROOM_KEY, JSON.stringify(nextRoom));
  return nextRoom;
}

export function clearLocalRoom() { localStorage.removeItem(LOCAL_ROOM_KEY); }

export function clearStaleLocalRoom(maxAgeMinutes = 30) {
  const room = readRoom();
  if (!room) return;

  const ageMs = Date.now() - new Date(room.createdAt).getTime();
  if (ageMs > maxAgeMinutes * 60 * 1000) {
    clearLocalRoom();
  }
}

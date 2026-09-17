const ROOM_KEY = 'aura-battle-private-room';

type LocalRoom = { code: string; createdAt: string; host: string; status: 'waiting' };

function readRoom(): LocalRoom | null {
  try { return JSON.parse(localStorage.getItem(ROOM_KEY) || 'null') as LocalRoom | null; } catch { return null; }
}

export function createLocalRoom(host: string): LocalRoom {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const room = { code, createdAt: new Date().toISOString(), host, status: 'waiting' as const };
  localStorage.setItem(ROOM_KEY, JSON.stringify(room));
  return room;
}

export function getLocalRoom() { return readRoom(); }
export function joinLocalRoom(code: string) { const room = readRoom(); return room?.code === code.trim() ? room : null; }
export function clearLocalRoom() { localStorage.removeItem(ROOM_KEY); }

import { describe, expect, it } from 'vitest';
import { buildDefaultQueue } from '../challenges/challengeRegistry';
import { createLocalRoom, getLocalRoom, joinLocalRoom } from './roomStore';
import { createFallbackRoomState, generateRoomCode, isMatchStartMessage, isRoomState, resolveLobbyUrl, sanitizeRoomCode } from './onlineRoom';

if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    },
    configurable: true,
  });
}

describe('online room helpers', () => {
  it('generates a 6-character uppercase room code', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('sanitizes room codes before joining', () => {
    expect(sanitizeRoomCode('  ab-12  ')).toBe('AB12');
  });

  it('resolves the lobby websocket url from the backend config', () => {
    expect(resolveLobbyUrl('http://localhost:5173')).toBe('ws://localhost:3001');
    expect(resolveLobbyUrl('https://demo.example.com')).toBe('wss://demo.example.com');
  });

  it('creates a local waiting room even when the backend is offline', () => {
    const legacyRoom = createLocalRoom('LAM');
    const room = createFallbackRoomState('LAM');

    expect(legacyRoom.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(room.host).toBe('LAM');
    expect(room.guest).toBeNull();
    expect(room.status).toBe('waiting');
    expect(room.phase).toBe('waiting');
    expect(getLocalRoom()).toEqual({ code: room.code, createdAt: expect.any(String), host: 'LAM', guest: null, status: 'waiting', phase: 'waiting', hostReady: false, guestReady: false, startedAt: null, matchSeed: null });
    expect(joinLocalRoom(room.code, 'JUNE')).toEqual({ code: room.code, createdAt: expect.any(String), host: 'LAM', guest: 'JUNE', status: 'ready', phase: 'ready', hostReady: false, guestReady: true, startedAt: null, matchSeed: null });
  });

  it('recognizes room state and match start payloads', () => {
    const roomState = {
      code: 'AB12CD',
      host: 'LAM',
      guest: 'JUNE',
      status: 'ready',
      phase: 'ready',
      createdAt: '2025-01-01T00:00:00.000Z',
      hostReady: true,
      guestReady: true,
      startedAt: null,
      matchSeed: null,
    } as const;
    const matchStart = {
      type: 'match_start',
      room: roomState,
      seed: 123,
      startedAt: '2025-01-01T00:01:00.000Z',
    } as const;

    expect(isRoomState(roomState)).toBe(true);
    expect(isMatchStartMessage(matchStart)).toBe(true);
  });

  it('keeps online challenge queues synchronized with the same room seed', () => {
    const first = buildDefaultQueue('Final flourish', 12345);
    const second = buildDefaultQueue('Final flourish', 12345);
    const different = buildDefaultQueue('Final flourish', 67890);

    expect(first.map((challenge) => challenge.id)).toEqual(second.map((challenge) => challenge.id));
    expect(first.map((challenge) => challenge.id)).not.toEqual(different.map((challenge) => challenge.id));
  });
});

import { describe, expect, it } from 'vitest';
import { buildDefaultQueue } from '../challenges/challengeRegistry';
import { generateRoomCode, isMatchStartMessage, isRoomState, resolveLobbyUrl, sanitizeRoomCode } from './onlineRoom';

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

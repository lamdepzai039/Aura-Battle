import { describe, expect, it } from 'vitest';
import { generateRoomCode, resolveLobbyUrl, sanitizeRoomCode } from './onlineRoom';

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
});

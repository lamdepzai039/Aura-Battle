import { describe, expect, it } from 'vitest';
import { resolveBattleSeatNames } from './battleSeats';

describe('resolveBattleSeatNames', () => {
  it('keeps the local host on the left and guest on the right', () => {
    const seats = resolveBattleSeatNames({
      currentPlayer: 'Host Player',
      host: 'Host Player',
      guest: 'Guest Player',
      isHost: true,
    });

    expect(seats.p1).toBe('Host Player');
    expect(seats.p2).toBe('Guest Player');
  });

  it('keeps the local guest on the right side when joining a room', () => {
    const seats = resolveBattleSeatNames({
      currentPlayer: 'Guest Player',
      host: 'Host Player',
      guest: 'Guest Player',
      isHost: false,
    });

    expect(seats.p1).toBe('Host Player');
    expect(seats.p2).toBe('Guest Player');
  });
});

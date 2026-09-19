import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_STARTING_RATING, applyMatchResult, getLeaderboard, getRankProfile } from './rankStore';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (storage.has(key) ? storage.get(key) ?? null : null),
      setItem: (key: string, value: string) => {
        storage.set(key, String(value));
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
  });
});

describe('rankStore', () => {
  it('creates a new rank profile with a default rating', () => {
    const profile = getRankProfile('Alpha');

    expect(profile.name).toBe('Alpha');
    expect(profile.rating).toBe(DEFAULT_STARTING_RATING);
    expect(profile.wins).toBe(0);
    expect(profile.losses).toBe(0);
  });

  it('applies a result and updates both players MMR', () => {
    const leaderboard = applyMatchResult('Alpha', 'Bravo', 'win', 'ranked');
    const alpha = leaderboard.find((entry) => entry.name === 'Alpha');
    const bravo = leaderboard.find((entry) => entry.name === 'Bravo');

    expect(alpha?.wins).toBe(1);
    expect(alpha?.rating).toBeGreaterThan(DEFAULT_STARTING_RATING);
    expect(bravo?.losses).toBe(1);
    expect(bravo?.rating).toBeLessThan(DEFAULT_STARTING_RATING);
  });

  it('orders leaderboard by rating descending', () => {
    applyMatchResult('Alpha', 'Bravo', 'win', 'ranked');
    applyMatchResult('Bravo', 'Charlie', 'win', 'ranked');

    const leaderboard = getLeaderboard();
    expect(leaderboard[0].rating).toBeGreaterThanOrEqual(leaderboard[1].rating);
    expect(leaderboard[1].rating).toBeGreaterThanOrEqual(leaderboard[2].rating);
  });
});

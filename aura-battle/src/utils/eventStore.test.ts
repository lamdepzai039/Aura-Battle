import { beforeEach, describe, expect, it } from 'vitest';
import { RANDOM_QUEST_POOL, getActiveEvent } from './eventStore';

const makeStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

describe('quest board generation', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: makeStorage(),
      configurable: true,
    });
  });

  it('keeps a pool of 30 quests and assigns 5 unique random quests to each player', () => {
    expect(RANDOM_QUEST_POOL).toHaveLength(30);

    const alice = getActiveEvent('alice');
    const bob = getActiveEvent('bob');

    expect(alice.tasks).toHaveLength(5);
    expect(bob.tasks).toHaveLength(5);
    expect(new Set(alice.tasks.map((task) => task.id)).size).toBe(5);
    expect(new Set(bob.tasks.map((task) => task.id)).size).toBe(5);
    expect(alice.tasks.some((task) => bob.tasks.some((other) => other.id === task.id))).toBe(false);
  });
});

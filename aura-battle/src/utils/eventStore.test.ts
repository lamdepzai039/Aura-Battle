import { beforeEach, describe, expect, it } from 'vitest';
import { RANDOM_QUEST_POOL, getActiveEvent, getEventCatalog } from './eventStore';

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

  it('exposes a full event catalog with daily, weekly, rush, and mutation events', () => {
    const catalog = getEventCatalog('alice');

    expect(catalog.map((event) => event.kind)).toEqual(['daily', 'weekly', 'rush', 'mutation']);
    expect(catalog.every((event) => event.tasks.length >= 3)).toBe(true);
    expect(catalog.some((event) => event.title.toLowerCase().includes('rush'))).toBe(true);
    expect(catalog.some((event) => event.title.toLowerCase().includes('mutation'))).toBe(true);
  });
});

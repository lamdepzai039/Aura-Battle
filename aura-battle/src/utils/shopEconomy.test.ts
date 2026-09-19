import { beforeEach, describe, expect, it } from 'vitest';
import { awardRewardText, getWallet, resetShopEconomy } from './shopEconomy';

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
  resetShopEconomy();
});

describe('shopEconomy', () => {
  it('awards gold and diamonds from reward strings', () => {
    const walletBefore = getWallet();
    awardRewardText('120 Coins');
    awardRewardText('AURA Token');

    expect(getWallet()).toEqual({
      gold: walletBefore.gold + 120,
      diamonds: walletBefore.diamonds + 10,
    });
  });

  it('ignores unknown reward text without changing the wallet', () => {
    const walletBefore = getWallet();
    awardRewardText('mystery reward');
    expect(getWallet()).toEqual(walletBefore);
  });
});

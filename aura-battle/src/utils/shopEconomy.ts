const WALLET_KEY = 'aura-battle-wallet';
const INVENTORY_KEY = 'aura-battle-shop-inventory';
const DAILY_KEY = 'aura-battle-daily-spin';

export type Currency = 'gold' | 'diamonds';
export type Wallet = { gold: number; diamonds: number };
export type OwnedCosmetic = { id: string; acquiredAt: string; equipped?: boolean };

const defaultWallet: Wallet = { gold: 2400, diamonds: 120 };

function read<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T; } catch { return fallback; }
}
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } }

function getStorageSafe() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function getWallet(isAdmin = false): Wallet { return isAdmin ? { gold: Infinity, diamonds: Infinity } : read(WALLET_KEY, defaultWallet); }
export function addWallet(delta: Partial<Wallet>): Wallet {
  const wallet = getWallet();
  const next = {
    gold: Math.max(0, wallet.gold + (delta.gold ?? 0)),
    diamonds: Math.max(0, wallet.diamonds + (delta.diamonds ?? 0)),
  };
  write(WALLET_KEY, next);
  return next;
}

export function awardRewardText(reward: string): Wallet {
  const normalized = reward.toLowerCase();
  const amountMatch = reward.match(/\d+/);
  const amount = amountMatch ? Number(amountMatch[0]) : 0;

  if (normalized.includes('coin')) {
    return addWallet({ gold: amount || 50 });
  }

  if (normalized.includes('xp')) {
    return addWallet({ gold: amount || 60 });
  }

  if (normalized.includes('diamond')) {
    return addWallet({ diamonds: amount || 10 });
  }

  if (
    normalized.includes('aura') ||
    normalized.includes('token') ||
    normalized.includes('pack') ||
    normalized.includes('bundle') ||
    normalized.includes('crown') ||
    normalized.includes('elite') ||
    normalized.includes('trail') ||
    normalized.includes('glow') ||
    normalized.includes('badge') ||
    normalized.includes('premium') ||
    normalized.includes('special')
  ) {
    return addWallet({ diamonds: amount ? Math.max(1, Math.ceil(amount / 10)) : 10 });
  }

  return getWallet();
}

export function awardMatchOutcome(outcome: 'win' | 'loss' | 'tie', mode: string = 'local'): Wallet {
  const baseGold = mode === 'ranked' ? 140 : mode === 'online' ? 110 : 90;
  const baseDiamonds = mode === 'ranked' ? 6 : mode === 'online' ? 4 : 2;

  if (outcome === 'win') {
    return addWallet({ gold: baseGold, diamonds: baseDiamonds });
  }

  if (outcome === 'tie') {
    return addWallet({ gold: Math.round(baseGold * 0.7), diamonds: Math.max(1, Math.round(baseDiamonds * 0.5)) });
  }

  return addWallet({ gold: Math.round(baseGold * 0.45), diamonds: 1 });
}

export function getInventory(): OwnedCosmetic[] { return read(INVENTORY_KEY, []); }
export function hasOwned(id: string) { return getInventory().some((item) => item.id === id); }
export function addToInventory(id: string) { const inventory = getInventory(); if (!inventory.some((item) => item.id === id)) write(INVENTORY_KEY, [...inventory, { id, acquiredAt: new Date().toISOString() }]); }
export function equipItem(id: string) { const inventory = getInventory(); write(INVENTORY_KEY, inventory.map((item) => ({ ...item, equipped: item.id === id }))); }
export function spend(currency: Currency, amount: number, isAdmin = false): boolean { if (isAdmin) return true; const wallet = getWallet(); if (wallet[currency] < amount) return false; write(WALLET_KEY, { ...wallet, [currency]: wallet[currency] - amount }); return true; }
export function canDailySpin() { return read<string | null>(DAILY_KEY, null) !== new Date().toISOString().slice(0, 10); }
export function claimDailySpin() { write(DAILY_KEY, new Date().toISOString().slice(0, 10)); }
export function resetShopEconomy() {
  const storage = getStorageSafe();
  storage?.removeItem(WALLET_KEY);
  storage?.removeItem(INVENTORY_KEY);
  storage?.removeItem(DAILY_KEY);
}

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

export function getWallet(isAdmin = false): Wallet { return isAdmin ? { gold: Infinity, diamonds: Infinity } : read(WALLET_KEY, defaultWallet); }
export function getInventory(): OwnedCosmetic[] { return read(INVENTORY_KEY, []); }
export function hasOwned(id: string) { return getInventory().some((item) => item.id === id); }
export function addToInventory(id: string) { const inventory = getInventory(); if (!inventory.some((item) => item.id === id)) write(INVENTORY_KEY, [...inventory, { id, acquiredAt: new Date().toISOString() }]); }
export function equipItem(id: string) { const inventory = getInventory(); write(INVENTORY_KEY, inventory.map((item) => ({ ...item, equipped: item.id === id }))); }
export function spend(currency: Currency, amount: number, isAdmin = false): boolean { if (isAdmin) return true; const wallet = getWallet(); if (wallet[currency] < amount) return false; write(WALLET_KEY, { ...wallet, [currency]: wallet[currency] - amount }); return true; }
export function canDailySpin() { return read<string | null>(DAILY_KEY, null) !== new Date().toISOString().slice(0, 10); }
export function claimDailySpin() { write(DAILY_KEY, new Date().toISOString().slice(0, 10)); }
export function resetShopEconomy() { localStorage.removeItem(WALLET_KEY); localStorage.removeItem(INVENTORY_KEY); localStorage.removeItem(DAILY_KEY); }

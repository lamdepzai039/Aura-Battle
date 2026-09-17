export interface LeaderboardEntry {
  name: string;
  aura: number;
  date: string; // ISO
  rank: string;
}

const KEY = 'aura-battle:leaderboard';

export const RANK_TIERS: Array<{ min: number; name: string }> = [
  { min: 0, name: 'NPC' },
  { min: 200, name: 'NORMAL' },
  { min: 400, name: 'COOL' },
  { min: 600, name: 'AURA' },
  { min: 750, name: 'SIGMA' },
  { min: 900, name: 'LEGENDARY' },
  { min: 1050, name: 'MYTHIC' },
];

export function rankForAura(aura: number): string {
  let rank = RANK_TIERS[0].name;
  for (const tier of RANK_TIERS) {
    if (aura >= tier.min) rank = tier.name;
  }
  return rank;
}

export function readLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export function recordResult(name: string, aura: number) {
  try {
    const entries = readLeaderboard();
    entries.push({ name, aura, date: new Date().toISOString(), rank: rankForAura(aura) });
    entries.sort((a, b) => b.aura - a.aura);
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, 50)));
  } catch {
    // localStorage unavailable (private mode, etc) — leaderboard just won't persist.
  }
}

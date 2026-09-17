export interface LeaderboardEntry {
  name: string;
  aura: number;
  date: string; // ISO
  rank: string;
}

const KEY = 'aura-battle:leaderboard';

export const RANK_TIERS: Array<{ min: number; name: string }> = [
  { min: 0, name: 'BRONZE I' },
  { min: 100, name: 'BRONZE II' },
  { min: 200, name: 'BRONZE III' },
  { min: 300, name: 'SILVER I' },
  { min: 450, name: 'SILVER II' },
  { min: 600, name: 'SILVER III' },
  { min: 750, name: 'GOLD I' },
  { min: 950, name: 'GOLD II' },
  { min: 1150, name: 'GOLD III' },
  { min: 1350, name: 'PLATINUM I' },
  { min: 1600, name: 'PLATINUM II' },
  { min: 1850, name: 'PLATINUM III' },
  { min: 2150, name: 'DIAMOND I' },
  { min: 2500, name: 'DIAMOND II' },
  { min: 2850, name: 'DIAMOND III' },
  { min: 3250, name: 'MASTER I' },
  { min: 3700, name: 'MASTER II' },
  { min: 4200, name: 'MASTER III' },
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

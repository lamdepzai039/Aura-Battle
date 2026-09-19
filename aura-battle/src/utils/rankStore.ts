import type { GameMode } from '../game/types';

export const DEFAULT_STARTING_RATING = 1200;
const STORAGE_KEY = 'aura-battle-rank-store-v1';
const K_FACTOR = 24;

export type RankOutcome = 'win' | 'loss' | 'tie';

export type RankProfile = {
  name: string;
  rating: number;
  wins: number;
  losses: number;
  ties: number;
  tier: string;
  lastUpdated: string;
};

function normalizeName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  return trimmed || 'PLAYER';
}

function getRankMap(): Record<string, RankProfile> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RankProfile>;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

function persistRankMap(map: Record<string, RankProfile>) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore quota/security restrictions in browser privacy modes.
  }
}

export function getTierName(rating: number): string {
  if (rating >= 1800) return 'LEGEND';
  if (rating >= 1650) return 'PLATINUM';
  if (rating >= 1500) return 'GOLD';
  if (rating >= 1350) return 'SILVER';
  if (rating >= 1200) return 'BRONZE';
  return 'IRON';
}

export function getTierEmoji(rating: number): string {
  if (rating >= 1800) return '👑';
  if (rating >= 1650) return '💎';
  if (rating >= 1500) return '🟡';
  if (rating >= 1350) return '⚪';
  if (rating >= 1200) return '🟫';
  return '⚙️';
}

export function getRankProfile(name: string | null | undefined): RankProfile {
  const cleanName = normalizeName(name);
  const map = getRankMap();
  const profile = map[cleanName] ?? {
    name: cleanName,
    rating: DEFAULT_STARTING_RATING,
    wins: 0,
    losses: 0,
    ties: 0,
    tier: getTierName(DEFAULT_STARTING_RATING),
    lastUpdated: new Date().toISOString(),
  };

  const normalized: RankProfile = {
    ...profile,
    name: cleanName,
    rating: Number.isFinite(profile.rating) ? Math.max(0, Math.round(profile.rating)) : DEFAULT_STARTING_RATING,
    wins: Number.isFinite(profile.wins) ? Math.max(0, Number(profile.wins)) : 0,
    losses: Number.isFinite(profile.losses) ? Math.max(0, Number(profile.losses)) : 0,
    ties: Number.isFinite(profile.ties) ? Math.max(0, Number(profile.ties)) : 0,
    tier: getTierName(Number.isFinite(profile.rating) ? Math.max(0, Math.round(profile.rating)) : DEFAULT_STARTING_RATING),
    lastUpdated: profile.lastUpdated ?? new Date().toISOString(),
  };

  map[cleanName] = normalized;
  persistRankMap(map);
  return normalized;
}

function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function applyMatchResult(
  playerA: string | null | undefined,
  playerB: string | null | undefined,
  outcome: RankOutcome,
  _mode?: GameMode,
): RankProfile[] {
  const nameA = normalizeName(playerA);
  const nameB = normalizeName(playerB);
  const profileA = getRankProfile(nameA);
  const profileB = getRankProfile(nameB);

  const scoreA = expectedScore(profileA.rating, profileB.rating);
  const scoreB = expectedScore(profileB.rating, profileA.rating);

  const nextA = { ...profileA };
  const nextB = { ...profileB };

  if (outcome === 'win') {
    nextA.rating = Math.round(profileA.rating + K_FACTOR * (1 - scoreA));
    nextA.wins += 1;
    nextB.rating = Math.round(profileB.rating + K_FACTOR * (0 - scoreB));
    nextB.losses += 1;
  } else if (outcome === 'loss') {
    nextA.rating = Math.round(profileA.rating + K_FACTOR * (0 - scoreA));
    nextA.losses += 1;
    nextB.rating = Math.round(profileB.rating + K_FACTOR * (1 - scoreB));
    nextB.wins += 1;
  } else {
    nextA.rating = Math.round(profileA.rating + K_FACTOR * (0.5 - scoreA));
    nextA.ties += 1;
    nextB.rating = Math.round(profileB.rating + K_FACTOR * (0.5 - scoreB));
    nextB.ties += 1;
  }

  nextA.tier = getTierName(nextA.rating);
  nextB.tier = getTierName(nextB.rating);
  nextA.lastUpdated = new Date().toISOString();
  nextB.lastUpdated = new Date().toISOString();

  const map = getRankMap();
  map[nameA] = nextA;
  map[nameB] = nextB;
  persistRankMap(map);

  return [nextA, nextB].sort((left, right) => right.rating - left.rating);
}

export function getLeaderboard(): RankProfile[] {
  return Object.values(getRankMap())
    .map((profile) => ({
      ...profile,
      rating: Number.isFinite(profile.rating) ? Math.max(0, Math.round(profile.rating)) : DEFAULT_STARTING_RATING,
      wins: Number.isFinite(profile.wins) ? Math.max(0, Number(profile.wins)) : 0,
      losses: Number.isFinite(profile.losses) ? Math.max(0, Number(profile.losses)) : 0,
      ties: Number.isFinite(profile.ties) ? Math.max(0, Number(profile.ties)) : 0,
      tier: getTierName(Number.isFinite(profile.rating) ? Math.max(0, Math.round(profile.rating)) : DEFAULT_STARTING_RATING),
    }))
    .sort((left, right) => right.rating - left.rating);
}

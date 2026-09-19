import { getRankProfile, getTierEmoji, getTierName } from './rankStore';

export type PlayerProfile = {
  level: number;
  rank: string;
  rankEmoji: string;
  rating: number;
  isAdmin: boolean;
};

const ADMIN_EMAIL = 'hoanglamnguyen03092014@gmail.com';

export function isAdminAccount(username: string | null | undefined, email?: string | null): boolean {
  return username?.trim().toLowerCase() === 'admin' || email?.trim().toLowerCase() === ADMIN_EMAIL;
}

export function getPlayerProfile(username: string | null | undefined, email?: string | null): PlayerProfile {
  const isAdmin = isAdminAccount(username, email);
  if (isAdmin) {
    return { level: 99, rank: 'MASTER III', rankEmoji: '👑', rating: 99999, isAdmin };
  }

  const profile = getRankProfile(username ?? 'PLAYER');
  return {
    level: Math.min(99, 1 + Math.floor(profile.rating / 200)),
    rank: getTierName(profile.rating),
    rankEmoji: getTierEmoji(profile.rating),
    rating: profile.rating,
    isAdmin,
  };
}

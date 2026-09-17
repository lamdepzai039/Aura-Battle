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
  return isAdmin
    ? { level: 99, rank: 'MASTER III', rankEmoji: '👑', rating: 99999, isAdmin }
    : { level: 1, rank: 'BRONZE I', rankEmoji: '🟫', rating: 0, isAdmin };
}

export type GuildSearchResult = {
  id: string;
  name: string;
  tag: string;
  description?: string;
  emblem?: string;
  level?: number;
  memberCount?: number;
  maxMembers?: number;
  privacy: 'PUBLIC' | 'INVITE ONLY' | 'PRIVATE';
};

const API_URL = import.meta.env.VITE_GUILD_API_URL as string | undefined;

export function isGuildApiConfigured() {
  return Boolean(API_URL);
}

export async function searchGuilds(query: string): Promise<GuildSearchResult[]> {
  if (!API_URL) return [];
  const response = await fetch(`${API_URL.replace(/\/$/, '')}/guilds?search=${encodeURIComponent(query.trim())}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error('Unable to load Guilds.');
  const data = await response.json() as { items?: GuildSearchResult[] } | GuildSearchResult[];
  return Array.isArray(data) ? data : data.items || [];
}

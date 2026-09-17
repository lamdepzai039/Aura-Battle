const GUILD_KEY = 'aura-battle-guild';

export type GuildPrivacy = 'PUBLIC' | 'INVITE ONLY' | 'PRIVATE';
export type GuildRole = 'OWNER' | 'LEADER' | 'OFFICER' | 'MEMBER' | 'RECRUIT';
export type Guild = {
  id: string;
  name: string;
  tag: string;
  description: string;
  emblem: string;
  privacy: GuildPrivacy;
  ownerId: string;
  createdAt: string;
};

export type GuildMember = {
  userId: string;
  username: string;
  role: GuildRole;
  joinedAt: string;
};

export type GuildActivity = {
  id: string;
  text: string;
  createdAt: string;
};

export type GuildState = {
  guild: Guild;
  members: GuildMember[];
  activity: GuildActivity[];
};

function readState(): GuildState | null {
  try { return JSON.parse(localStorage.getItem(GUILD_KEY) || 'null') as GuildState | null; } catch { return null; }
}
function writeState(state: GuildState) { localStorage.setItem(GUILD_KEY, JSON.stringify(state)); }

export function getGuildState(): GuildState | null { return readState(); }

export function createGuild(input: { name: string; tag: string; description: string; privacy: GuildPrivacy; ownerId: string; username: string }): GuildState {
  const guild: Guild = { id: `local-${crypto.randomUUID()}`, name: input.name.trim(), tag: input.tag.trim().toUpperCase(), description: input.description.trim(), emblem: 'shield', privacy: input.privacy, ownerId: input.ownerId, createdAt: new Date().toISOString() };
  const state: GuildState = { guild, members: [{ userId: input.ownerId, username: input.username, role: 'OWNER', joinedAt: guild.createdAt }], activity: [{ id: crypto.randomUUID(), text: `${input.username} created the Guild`, createdAt: guild.createdAt }] };
  writeState(state);
  return state;
}

export function leaveGuild() { localStorage.removeItem(GUILD_KEY); }
export function appendActivity(state: GuildState, text: string): GuildState { const next = { ...state, activity: [{ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() }, ...state.activity] }; writeState(next); return next; }

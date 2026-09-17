const CHAT_KEY = 'aura-battle-chat';
export type ChatChannel = 'GLOBAL' | 'GUILD' | 'PARTY';
export type ChatMessage = { id: string; channel: ChatChannel; username: string; content: string; createdAt: string; reactions: Record<string, number> };

function read(): ChatMessage[] { try { return JSON.parse(localStorage.getItem(CHAT_KEY) || '[]') as ChatMessage[]; } catch { return []; } }
function write(messages: ChatMessage[]) { try { localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-100))); } catch { /* private mode */ } }
export function getMessages(channel: ChatChannel): ChatMessage[] { return read().filter((message) => message.channel === channel); }
export function addMessage(channel: ChatChannel, username: string, content: string): ChatMessage { const message: ChatMessage = { id: crypto.randomUUID(), channel, username, content: content.trim().slice(0, 80), createdAt: new Date().toISOString(), reactions: {} }; write([...read(), message]); return message; }
export function reactToMessage(id: string, reaction: string) { write(read().map((message) => message.id === id ? { ...message, reactions: { ...message.reactions, [reaction]: (message.reactions[reaction] || 0) + 1 } } : message)); }

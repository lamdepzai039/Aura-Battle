const ACCOUNTS_KEY = 'aura-battle-accounts';
const SESSION_KEY = 'aura-battle-session';
const SESSION_EMAIL_KEY = 'aura-battle-session-email';

type StoredAccount = {
  username: string;
  email: string;
  passwordHash: string;
};

function readAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') as StoredAccount[];
  } catch {
    return [];
  }
}

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function registerAccount(username: string, email: string, password: string): Promise<{ ok: boolean; username?: string; message?: string }> {
  const accounts = readAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  if (accounts.some((account) => account.email === normalizedEmail)) return { ok: false, message: 'An account with this email already exists.' };
  if (accounts.some((account) => account.username.toLowerCase() === username.trim().toLowerCase())) return { ok: false, message: 'That username is already taken.' };
  accounts.push({ username: username.trim(), email: normalizedEmail, passwordHash: await hashPassword(password) });
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  localStorage.setItem(SESSION_KEY, username.trim());
  localStorage.setItem(SESSION_EMAIL_KEY, normalizedEmail);
  return { ok: true, username: username.trim() };
}

export async function signIn(email: string, password: string): Promise<{ ok: boolean; username?: string; message?: string }> {
  const account = readAccounts().find((item) => item.email === email.trim().toLowerCase());
  if (!account || account.passwordHash !== await hashPassword(password)) return { ok: false, message: 'Email or password is incorrect.' };
  localStorage.setItem(SESSION_KEY, account.username);
  localStorage.setItem(SESSION_EMAIL_KEY, account.email);
  return { ok: true, username: account.username };
}

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function getSessionEmail(): string | null {
  const sessionEmail = localStorage.getItem(SESSION_EMAIL_KEY);
  if (sessionEmail) return sessionEmail;
  const username = getSession();
  if (!username) return null;
  return readAccounts().find((account) => account.username === username)?.email || null;
}

export function startExternalSession(username: string, email: string) {
  localStorage.setItem(SESSION_KEY, username);
  localStorage.setItem(SESSION_EMAIL_KEY, email.trim().toLowerCase());
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_EMAIL_KEY);
}

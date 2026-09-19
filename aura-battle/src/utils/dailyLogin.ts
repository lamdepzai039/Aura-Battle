import { awardRewardText } from './shopEconomy';

export type DailyReward = {
  day: number;
  label: string;
  amount: string;
  type: 'coins' | 'xp' | 'aura' | 'badge' | 'cosmetic';
  icon: string;
};

export type DailyLoginState = {
  claimedDays: number[];
  lastClaimedDate: string | null;
  lastClaimedDay: number;
};

const LOGIN_KEY = 'aura-battle-daily-login';
const DAY_MS = 24 * 60 * 60 * 1000;
const START_DATE = new Date('2026-01-01T00:00:00.000Z').getTime();

export const DAILY_LOGIN_REWARDS: DailyReward[] = [
  { day: 1, label: 'Coins', amount: '100', type: 'coins', icon: '◈' },
  { day: 2, label: 'XP', amount: '120', type: 'xp', icon: '✦' },
  { day: 3, label: 'Aura', amount: '20', type: 'aura', icon: '⚡' },
  { day: 4, label: 'Coins', amount: '180', type: 'coins', icon: '◎' },
  { day: 5, label: 'XP', amount: '180', type: 'xp', icon: '✧' },
  { day: 6, label: 'Badge', amount: 'Bronze', type: 'badge', icon: '★' },
  { day: 7, label: 'Premium Pack', amount: 'Mini', type: 'cosmetic', icon: '▣' },
  { day: 8, label: 'Coins', amount: '250', type: 'coins', icon: '◉' },
  { day: 9, label: 'XP', amount: '220', type: 'xp', icon: '✦' },
  { day: 10, label: 'Aura', amount: '30', type: 'aura', icon: '⚡' },
  { day: 11, label: 'Coins', amount: '260', type: 'coins', icon: '◎' },
  { day: 12, label: 'XP', amount: '260', type: 'xp', icon: '✧' },
  { day: 13, label: 'Badge', amount: 'Silver', type: 'badge', icon: '★' },
  { day: 14, label: 'Special Pack', amount: 'Trail', type: 'cosmetic', icon: '▤' },
  { day: 15, label: 'Coins', amount: '320', type: 'coins', icon: '◈' },
  { day: 16, label: 'XP', amount: '300', type: 'xp', icon: '✦' },
  { day: 17, label: 'Aura', amount: '35', type: 'aura', icon: '⚡' },
  { day: 18, label: 'Coins', amount: '340', type: 'coins', icon: '◎' },
  { day: 19, label: 'XP', amount: '320', type: 'xp', icon: '✧' },
  { day: 20, label: 'Badge', amount: 'Gold', type: 'badge', icon: '★' },
  { day: 21, label: 'Elite Bundle', amount: 'Rare', type: 'cosmetic', icon: '▣' },
  { day: 22, label: 'Coins', amount: '420', type: 'coins', icon: '◉' },
  { day: 23, label: 'XP', amount: '390', type: 'xp', icon: '✦' },
  { day: 24, label: 'Aura', amount: '45', type: 'aura', icon: '⚡' },
  { day: 25, label: 'Coins', amount: '480', type: 'coins', icon: '◎' },
  { day: 26, label: 'XP', amount: '450', type: 'xp', icon: '✧' },
  { day: 27, label: 'Badge', amount: 'Legend', type: 'badge', icon: '★' },
  { day: 28, label: 'Cosmetic', amount: 'Glow', type: 'cosmetic', icon: '▤' },
  { day: 29, label: 'Coins', amount: '600', type: 'coins', icon: '◈' },
  { day: 30, label: 'Final Reward', amount: 'Aura Crown', type: 'cosmetic', icon: '✪' },
];

function readState(): DailyLoginState {
  try {
    const raw = localStorage.getItem(LOGIN_KEY);
    if (!raw) {
      return { claimedDays: [], lastClaimedDate: null, lastClaimedDay: 0 };
    }
    return JSON.parse(raw) as DailyLoginState;
  } catch {
    return { claimedDays: [], lastClaimedDate: null, lastClaimedDay: 0 };
  }
}

function writeState(state: DailyLoginState) {
  try {
    localStorage.setItem(LOGIN_KEY, JSON.stringify(state));
  } catch {
    // ignore unsupported storage
  }
}

export function getLoginDayIndex(): number {
  const diff = Math.floor((Date.now() - START_DATE) / DAY_MS);
  return Math.min(30, Math.max(1, diff + 1));
}

export function getDailyLoginState(): DailyLoginState {
  return readState();
}

export function getCurrentDailyReward(): DailyReward | undefined {
  return DAILY_LOGIN_REWARDS.find((reward) => reward.day === getLoginDayIndex());
}

export function canClaimDailyReward(): boolean {
  const state = readState();
  const today = getLoginDayIndex();
  const hasClaimedToday = state.claimedDays.includes(today);
  return !hasClaimedToday && today > state.lastClaimedDay;
}

export function claimDailyReward(): { success: boolean; day?: number; state: DailyLoginState; message: string } {
  const state = readState();
  const today = getLoginDayIndex();
  const alreadyClaimed = state.claimedDays.includes(today);

  if (alreadyClaimed || today <= state.lastClaimedDay) {
    return { success: false, state, message: 'Reward already claimed for today.' };
  }

  const reward = DAILY_LOGIN_REWARDS.find((entry) => entry.day === today);
  const nextState: DailyLoginState = {
    claimedDays: [...new Set([...state.claimedDays, today])],
    lastClaimedDate: new Date().toISOString(),
    lastClaimedDay: Math.max(state.lastClaimedDay, today),
  };

  writeState(nextState);

  if (reward) {
    awardRewardText(`${reward.amount} ${reward.label}`);
  }

  return { success: true, day: today, state: nextState, message: `Day ${today} reward claimed.` };
}

import { awardRewardText } from './shopEconomy';

export type EventTask = {
  id: string;
  title: string;
  goal: number;
  progress: number;
  reward: string;
};

export type EventKind = 'daily' | 'weekly' | 'rush' | 'mutation';

export type EventState = {
  id: string;
  kind: EventKind;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  tasks: EventTask[];
  claimed: boolean;
  totalRewards: string[];
};

const EVENT_KEY = 'aura-battle-event-catalog-v2';
const EVENT_CODE_KEY = 'aura-battle-event-codes-v1';
const QUEST_COUNT = 30;
const QUEST_PICK_COUNT = 5;

const EVENT_CODE_REWARDS: Record<string, { code: string; reward: string }> = {
  WELCOME: { code: 'WELCOME', reward: '200 Coins' },
};

export const RANDOM_QUEST_POOL: EventTask[] = [
  { id: 'q-01', title: 'Win 1 match', goal: 1, progress: 0, reward: '100 Coins' },
  { id: 'q-02', title: 'Complete 3 rounds', goal: 3, progress: 0, reward: '120 Coins' },
  { id: 'q-03', title: 'Use Aura Break twice', goal: 2, progress: 0, reward: '150 XP' },
  { id: 'q-04', title: 'Score 250 aura in total', goal: 250, progress: 0, reward: '200 Coins' },
  { id: 'q-05', title: 'Play 2 local battles', goal: 2, progress: 0, reward: '80 XP' },
  { id: 'q-06', title: 'Finish 1 challenge streak', goal: 1, progress: 0, reward: 'AURA Token' },
  { id: 'q-07', title: 'Trigger 3 freeze effects', goal: 3, progress: 0, reward: '90 Coins' },
  { id: 'q-08', title: 'Clear 2 mirror rounds', goal: 2, progress: 0, reward: '110 XP' },
  { id: 'q-09', title: 'Reach 500 total aura', goal: 500, progress: 0, reward: '150 Coins' },
  { id: 'q-10', title: 'Win 2 ranked battles', goal: 2, progress: 0, reward: '300 XP' },
  { id: 'q-11', title: 'Complete 5 rounds in one session', goal: 5, progress: 0, reward: '180 Coins' },
  { id: 'q-12', title: 'Use 4 aura mutations', goal: 4, progress: 0, reward: '220 XP' },
  { id: 'q-13', title: 'Trigger 2 stare-down wins', goal: 2, progress: 0, reward: '140 Coins' },
  { id: 'q-14', title: 'Earn 3 aura break combos', goal: 3, progress: 0, reward: '170 XP' },
  { id: 'q-15', title: 'Hit 1000 total score', goal: 1000, progress: 0, reward: '250 Coins' },
  { id: 'q-16', title: 'Finish 4 challenge rounds', goal: 4, progress: 0, reward: '160 XP' },
  { id: 'q-17', title: 'Play 3 practice matches', goal: 3, progress: 0, reward: '90 Coins' },
  { id: 'q-18', title: 'Score 600 aura in one match', goal: 600, progress: 0, reward: '200 XP' },
  { id: 'q-19', title: 'Perform 2 mewing actions', goal: 2, progress: 0, reward: '110 Coins' },
  { id: 'q-20', title: 'Clear 1 hand-gesture challenge', goal: 1, progress: 0, reward: '130 XP' },
  { id: 'q-21', title: 'Win 3 consecutive battles', goal: 3, progress: 0, reward: '280 Coins' },
  { id: 'q-22', title: 'Collect 2 sticker packs', goal: 2, progress: 0, reward: 'AURA Token' },
  { id: 'q-23', title: 'Reach 750 aura total', goal: 750, progress: 0, reward: '210 XP' },
  { id: 'q-24', title: 'Finish 6 rounds total', goal: 6, progress: 0, reward: '170 Coins' },
  { id: 'q-25', title: 'Land 3 perfect counters', goal: 3, progress: 0, reward: '190 XP' },
  { id: 'q-26', title: 'Use 5 different moves', goal: 5, progress: 0, reward: '260 Coins' },
  { id: 'q-27', title: 'Trigger 1 custom aura round', goal: 1, progress: 0, reward: 'AURA Token' },
  { id: 'q-28', title: 'Complete 2 special events', goal: 2, progress: 0, reward: '140 XP' },
  { id: 'q-29', title: 'Earn 800 total aura', goal: 800, progress: 0, reward: '240 Coins' },
  { id: 'q-30', title: 'Win 4 matches', goal: 4, progress: 0, reward: '320 XP' },
];

function getQuestSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const clone = [...items];
  let nextSeed = seed;
  for (let index = clone.length - 1; index > 0; index -= 1) {
    nextSeed = (nextSeed * 1664525 + 1013904223) >>> 0;
    const swapIndex = nextSeed % (index + 1);
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function resolvePlayerKey(playerId = 'guest') {
  return (playerId || 'guest').trim() || 'guest';
}

function stateKey(playerId: string, eventId: string) {
  return `${EVENT_KEY}-${resolvePlayerKey(playerId)}-${eventId}`;
}

function buildDailyEvent(playerId: string): EventState {
  return {
    id: `daily-streak-${resolvePlayerKey(playerId)}`,
    kind: 'daily',
    title: 'DAILY STREAK',
    description: 'Claim rewards each day and stack a streak so your season gains keep growing.',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      { id: 'daily-login-3', title: 'Claim 3 daily rewards', goal: 3, progress: 0, reward: '120 XP' },
      { id: 'daily-login-5', title: 'Keep a 5-day streak', goal: 5, progress: 0, reward: '200 Coins' },
      { id: 'daily-login-7', title: 'Reach a 7-day streak', goal: 7, progress: 0, reward: 'AURA Token' },
    ],
    claimed: false,
    totalRewards: ['120 XP', '200 Coins', 'AURA Token'],
  };
}

function buildWeeklyEvent(playerId: string): EventState {
  return {
    id: `weekly-aura-event-${resolvePlayerKey(playerId)}`,
    kind: 'weekly',
    title: 'WEEKLY AURA EVENT',
    description: 'Complete your challenge board, survive the pressure, and stack event points to unlock the weekly reward drop.',
    startDate: '2026-09-17T00:00:00.000Z',
    endDate: '2026-09-24T23:59:59.000Z',
    tasks: getRandomQuestSetForPlayer(playerId),
    claimed: false,
    totalRewards: ['150 Coins', '250 XP', 'AURA Token', 'Sticker Pack'],
  };
}

function buildRushEvent(playerId: string): EventState {
  return {
    id: `aura-rush-${resolvePlayerKey(playerId)}`,
    kind: 'rush',
    title: 'AURA RUSH',
    description: 'Push your tempo, stack aura, and finish the rush board before the event ends.',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      { id: 'rush-win', title: 'Win 3 battles', goal: 3, progress: 0, reward: '150 Coins' },
      { id: 'rush-aura', title: 'Reach 600 aura', goal: 600, progress: 0, reward: '180 XP' },
      { id: 'rush-break', title: 'Trigger 2 aura breaks', goal: 2, progress: 0, reward: 'AURA Token' },
      { id: 'rush-session', title: 'Play 4 matches', goal: 4, progress: 0, reward: '200 Coins' },
    ],
    claimed: false,
    totalRewards: ['150 Coins', '180 XP', 'AURA Token'],
  };
}

function buildMutationEvent(playerId: string): EventState {
  return {
    id: `mutation-trial-${resolvePlayerKey(playerId)}`,
    kind: 'mutation',
    title: 'MUTATION TRIAL',
    description: 'Test your builds across shifting mutation rounds and survive the pressure with style.',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      { id: 'mut-use', title: 'Use mutation mode 2 times', goal: 2, progress: 0, reward: '140 XP' },
      { id: 'mut-win', title: 'Win 2 mutation matches', goal: 2, progress: 0, reward: '200 Coins' },
      { id: 'mut-round', title: 'Finish 4 mutation rounds', goal: 4, progress: 0, reward: 'AURA Token' },
    ],
    claimed: false,
    totalRewards: ['140 XP', '200 Coins', 'AURA Token'],
  };
}

function getRandomQuestSetForPlayer(playerId: string): EventTask[] {
  if (RANDOM_QUEST_POOL.length !== QUEST_COUNT) {
    throw new Error(`Quest pool must contain ${QUEST_COUNT} items.`);
  }

  const seededPool = shuffle(RANDOM_QUEST_POOL, getQuestSeed(playerId || 'guest'));
  return seededPool.slice(0, QUEST_PICK_COUNT).map((quest, index) => ({
    ...quest,
    id: `${quest.id}-${resolvePlayerKey(playerId)}-${index}`,
    progress: 0,
  }));
}

function readStoredEvent(playerId: string, fallback: EventState): EventState {
  try {
    const raw = localStorage.getItem(stateKey(playerId, fallback.id));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<EventState>;
    return { ...fallback, ...parsed, tasks: parsed.tasks?.length ? parsed.tasks : fallback.tasks };
  } catch {
    return fallback;
  }
}

export function getEventCatalog(playerId = 'guest'): EventState[] {
  const player = resolvePlayerKey(playerId);
  const events = [
    readStoredEvent(player, buildDailyEvent(player)),
    readStoredEvent(player, buildWeeklyEvent(player)),
    readStoredEvent(player, buildRushEvent(player)),
    readStoredEvent(player, buildMutationEvent(player)),
  ];

  return events.filter((event) => event && event.title);
}

export function getActiveEvent(playerId = 'guest'): EventState {
  return getEventCatalog(playerId).find((event) => event.kind === 'weekly') ?? getEventCatalog(playerId)[0];
}

function writeEventState(playerId: string, state: EventState) {
  try {
    localStorage.setItem(stateKey(playerId, state.id), JSON.stringify(state));
  } catch {
    // ignore unsupported storage access in restricted contexts
  }
}

function readRedeemedEventCodes(playerId: string): string[] {
  try {
    const raw = localStorage.getItem(`${EVENT_CODE_KEY}-${resolvePlayerKey(playerId)}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.map((code) => String(code).toUpperCase()) : [];
  } catch {
    return [];
  }
}

function writeRedeemedEventCodes(playerId: string, codes: string[]) {
  try {
    localStorage.setItem(`${EVENT_CODE_KEY}-${resolvePlayerKey(playerId)}`, JSON.stringify(codes));
  } catch {
    // ignore unsupported storage access in restricted contexts
  }
}

export function redeemEventCode(playerId = 'guest', code = ''): { success: boolean; reward?: string; message: string } {
  const normalizedCode = String(code ?? '').trim().toUpperCase();
  if (!normalizedCode) {
    return { success: false, message: 'Enter an event code to redeem.' };
  }

  const rewardConfig = EVENT_CODE_REWARDS[normalizedCode];
  if (!rewardConfig) {
    return { success: false, message: 'This code is invalid or expired.' };
  }

  const redeemed = readRedeemedEventCodes(playerId);
  if (redeemed.includes(normalizedCode)) {
    return { success: false, message: `Code ${normalizedCode} already redeemed.` };
  }

  awardRewardText(rewardConfig.reward);
  const nextRedeemed = [...redeemed, normalizedCode];
  writeRedeemedEventCodes(playerId, nextRedeemed);

  return {
    success: true,
    reward: rewardConfig.reward,
    message: `Code ${normalizedCode} activated! Reward: ${rewardConfig.reward}`,
  };
}

function getEventById(playerId: string, eventId?: string): EventState {
  const catalog = getEventCatalog(playerId);
  if (!eventId) return catalog.find((event) => event.kind === 'weekly') ?? catalog[0];
  return catalog.find((event) => event.id === eventId) ?? catalog[0];
}

function getTaskProgressValue(taskId: string, summary: Partial<MatchProgressSummary>): number {
  switch (taskId) {
    case 'daily-login-3': return summary.localMatches ? Math.min(3, summary.localMatches) : 0;
    case 'daily-login-5': return summary.wins ? Math.min(5, summary.wins) : 0;
    case 'daily-login-7': return summary.wins ? Math.min(7, summary.wins) : 0;
    case 'rush-win': return summary.wins ? Math.min(3, summary.wins) : 0;
    case 'rush-aura': return summary.aura ? Math.min(600, Math.round(summary.aura)) : 0;
    case 'rush-break': return summary.auraBreaks ? Math.min(2, summary.auraBreaks) : 0;
    case 'rush-session': return summary.localMatches ? Math.min(4, summary.localMatches) : 0;
    case 'mut-use': return summary.mode === 'mutation' ? 1 : 0;
    case 'mut-win': return summary.mode === 'mutation' && summary.wins ? Math.min(2, summary.wins) : 0;
    case 'mut-round': return summary.mode === 'mutation' && summary.rounds ? Math.min(4, summary.rounds) : 0;
    default: {
      const id = taskId.split('-')[1];
      switch (id) {
        case '01': return summary.wins ? Math.min(1, summary.wins) : 0;
        case '02': return summary.rounds ? Math.min(3, summary.rounds) : 0;
        case '03': return summary.auraBreaks ? Math.min(2, summary.auraBreaks) : 0;
        case '04': return summary.aura ? Math.min(250, Math.round(summary.aura)) : 0;
        case '05': return summary.localMatches ? Math.min(2, summary.localMatches) : 0;
        case '06': return summary.challengeRounds ? Math.min(1, summary.challengeRounds) : 0;
        case '07': return summary.auraBreaks ? Math.min(3, summary.auraBreaks) : 0;
        case '08': return summary.rounds ? Math.min(2, summary.rounds) : 0;
        case '09': return summary.aura ? Math.min(500, Math.round(summary.aura)) : 0;
        case '10': return summary.wins ? Math.min(2, summary.wins) : 0;
        case '11': return summary.challengeRounds ? Math.min(5, summary.challengeRounds) : 0;
        case '12': return summary.mode === 'mutation' ? 1 : 0;
        case '13': return summary.wins ? Math.min(2, summary.wins) : 0;
        case '14': return summary.auraBreaks ? Math.min(3, summary.auraBreaks) : 0;
        case '15': return summary.aura ? Math.min(1000, Math.round(summary.aura)) : 0;
        case '16': return summary.challengeRounds ? Math.min(4, summary.challengeRounds) : 0;
        case '17': return summary.localMatches ? Math.min(3, summary.localMatches) : 0;
        case '18': return summary.aura ? Math.min(600, Math.round(summary.aura)) : 0;
        case '19': return summary.auraBreaks ? Math.min(2, summary.auraBreaks) : 0;
        case '20': return summary.challengeRounds ? Math.min(1, summary.challengeRounds) : 0;
        case '21': return summary.wins ? Math.min(3, summary.wins) : 0;
        case '22': return summary.localMatches ? Math.min(2, summary.localMatches) : 0;
        case '23': return summary.aura ? Math.min(750, Math.round(summary.aura)) : 0;
        case '24': return summary.rounds ? Math.min(6, summary.rounds) : 0;
        case '25': return summary.perfectCounters ? Math.min(3, summary.perfectCounters) : 0;
        case '26': return summary.mode ? 1 : 0;
        case '27': return summary.mode === 'mutation' ? 1 : 0;
        case '28': return summary.rounds ? Math.min(2, summary.rounds) : 0;
        case '29': return summary.aura ? Math.min(800, Math.round(summary.aura)) : 0;
        case '30': return summary.wins ? Math.min(4, summary.wins) : 0;
        default: return 0;
      }
    }
  }
}

export function claimEventReward(playerId = 'guest', eventId?: string): EventState {
  const event = getEventById(playerId, eventId);
  const totalProgress = event.tasks.reduce((sum, task) => sum + Math.min(task.progress, task.goal), 0);
  const totalGoal = event.tasks.reduce((sum, task) => sum + task.goal, 0);

  if (event.claimed || totalProgress < totalGoal) {
    return event;
  }

  const next = { ...event, claimed: true };
  event.totalRewards.forEach((reward) => awardRewardText(reward));
  writeEventState(playerId, next);
  return next;
}

export function getEventProgressById(playerId = 'guest', eventId?: string): number {
  const event = getEventById(playerId, eventId);
  const goal = event.tasks.reduce((sum, task) => sum + task.goal, 0);
  const progress = event.tasks.reduce((sum, task) => sum + Math.min(task.progress, task.goal), 0);
  return Math.min(100, Math.round((progress / Math.max(goal, 1)) * 100));
}

export function getEventProgress(playerId = 'guest', eventId?: string): number {
  return getEventProgressById(playerId, eventId);
}

export function getQuestBoardForPlayer(playerId: string): EventTask[] {
  return getActiveEvent(playerId).tasks;
}

export type MatchProgressSummary = {
  wins: number;
  rounds: number;
  aura: number;
  auraBreaks: number;
  localMatches: number;
  challengeRounds: number;
  perfectCounters: number;
  mode?: string;
};

export function addEventProgress(playerId = 'guest', summary: Partial<MatchProgressSummary> = {}): EventState {
  const catalog = getEventCatalog(playerId);

  const nextCatalog = catalog.map((event) => {
    const tasks = event.tasks.map((task) => {
      const delta = getTaskProgressValue(task.id, summary);
      if (delta <= 0) return task;
      return { ...task, progress: Math.min(task.goal, task.progress + delta) };
    });
    return { ...event, tasks };
  });

  nextCatalog.forEach((event) => {
    writeEventState(playerId, event);
  });

  return nextCatalog.find((event) => event.kind === 'weekly') ?? nextCatalog[0];
}

export const ACTIVE_EVENT = buildWeeklyEvent('guest');

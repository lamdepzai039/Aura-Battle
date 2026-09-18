export type EventTask = {
  id: string;
  title: string;
  goal: number;
  progress: number;
  reward: string;
};

export type EventState = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  tasks: EventTask[];
  claimed: boolean;
  totalRewards: string[];
};

const EVENT_KEY = 'aura-battle-active-event-v2';
const QUEST_COUNT = 30;
const QUEST_PICK_COUNT = 5;

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

function getRandomQuestSetForPlayer(playerId: string): EventTask[] {
  if (RANDOM_QUEST_POOL.length !== QUEST_COUNT) {
    throw new Error(`Quest pool must contain ${QUEST_COUNT} items.`);
  }

  const seededPool = shuffle(RANDOM_QUEST_POOL, getQuestSeed(playerId || 'guest'));
  return seededPool.slice(0, QUEST_PICK_COUNT).map((quest, index) => ({
    ...quest,
    id: `${quest.id}-${playerId || 'guest'}-${index}`,
    progress: 0,
  }));
}

function createDefaultEvent(playerId: string): EventState {
  return {
    id: `weekly-aura-event-${playerId || 'guest'}`,
    title: 'WEEKLY AURA EVENT',
    description: 'Complete your daily challenge board, survive the pressure, and stack event points to unlock the weekly reward drop.',
    startDate: '2026-09-17T00:00:00.000Z',
    endDate: '2026-09-24T23:59:59.000Z',
    tasks: getRandomQuestSetForPlayer(playerId),
    claimed: false,
    totalRewards: ['150 Coins', '250 XP', 'AURA Token', 'Sticker Pack'],
  };
}

function readEventState(playerId = 'guest'): EventState {
  try {
    const raw = localStorage.getItem(`${EVENT_KEY}-${playerId}`);
    if (!raw) return createDefaultEvent(playerId);
    const parsed = JSON.parse(raw) as Partial<EventState>;
    const fallback = createDefaultEvent(playerId);
    return { ...fallback, ...parsed, tasks: parsed.tasks?.length ? parsed.tasks : fallback.tasks };
  } catch {
    return createDefaultEvent(playerId);
  }
}

function writeEventState(state: EventState) {
  try {
    localStorage.setItem(`${EVENT_KEY}-${state.id.replace('weekly-aura-event-', '')}`, JSON.stringify(state));
  } catch {
    // ignore unsupported storage access in restricted contexts
  }
}

export function getActiveEvent(playerId = 'guest'): EventState {
  return readEventState(playerId);
}

export function claimEventReward(playerId = 'guest'): EventState {
  const current = readEventState(playerId);
  const totalProgress = current.tasks.reduce((sum, task) => sum + Math.min(task.progress, task.goal), 0);
  const totalGoal = current.tasks.reduce((sum, task) => sum + task.goal, 0);

  if (current.claimed || totalProgress < totalGoal) {
    return current;
  }

  const next = { ...current, claimed: true };
  writeEventState(next);
  return next;
}

export function getEventProgress(playerId = 'guest'): number {
  const event = getActiveEvent(playerId);
  const goal = event.tasks.reduce((sum, task) => sum + task.goal, 0);
  const progress = event.tasks.reduce((sum, task) => sum + Math.min(task.progress, task.goal), 0);
  return Math.min(100, Math.round((progress / Math.max(goal, 1)) * 100));
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
  const event = readEventState(playerId);
  const nextTasks = event.tasks.map((task) => {
    const delta = (() => {
      switch (task.id.split('-')[1]) {
        case '01': return summary.wins ? Math.min(task.goal, summary.wins) : 0;
        case '02': return summary.rounds ? Math.min(task.goal, summary.rounds) : 0;
        case '03': return summary.auraBreaks ? Math.min(task.goal, summary.auraBreaks) : 0;
        case '04': return summary.aura ? Math.min(task.goal, Math.round(summary.aura)) : 0;
        case '05': return summary.localMatches ? Math.min(task.goal, summary.localMatches) : 0;
        case '06': return summary.challengeRounds ? Math.min(task.goal, summary.challengeRounds) : 0;
        case '07': return summary.auraBreaks ? Math.min(task.goal, summary.auraBreaks) : 0;
        case '08': return summary.rounds ? Math.min(task.goal, summary.rounds) : 0;
        case '09': return summary.aura ? Math.min(task.goal, Math.round(summary.aura)) : 0;
        case '10': return summary.wins ? Math.min(task.goal, summary.wins) : 0;
        case '11': return summary.challengeRounds ? Math.min(task.goal, summary.challengeRounds) : 0;
        case '12': return summary.mode === 'mutation' ? 1 : 0;
        case '13': return summary.wins ? Math.min(task.goal, summary.wins) : 0;
        case '14': return summary.auraBreaks ? Math.min(task.goal, summary.auraBreaks) : 0;
        case '15': return summary.aura ? Math.min(task.goal, Math.round(summary.aura)) : 0;
        case '16': return summary.challengeRounds ? Math.min(task.goal, summary.challengeRounds) : 0;
        case '17': return summary.localMatches ? Math.min(task.goal, summary.localMatches) : 0;
        case '18': return summary.aura ? Math.min(task.goal, Math.round(summary.aura)) : 0;
        case '19': return summary.auraBreaks ? Math.min(task.goal, summary.auraBreaks) : 0;
        case '20': return summary.challengeRounds ? Math.min(task.goal, summary.challengeRounds) : 0;
        case '21': return summary.wins ? Math.min(task.goal, summary.wins) : 0;
        case '22': return summary.mode === 'online' ? 1 : 0;
        case '23': return summary.aura ? Math.min(task.goal, Math.round(summary.aura)) : 0;
        case '24': return summary.rounds ? Math.min(task.goal, summary.rounds) : 0;
        case '25': return summary.perfectCounters ? Math.min(task.goal, summary.perfectCounters) : 0;
        case '26': return summary.mode ? 1 : 0;
        case '27': return summary.mode === 'mutation' ? 1 : 0;
        case '28': return summary.rounds ? Math.min(task.goal, summary.rounds) : 0;
        case '29': return summary.aura ? Math.min(task.goal, Math.round(summary.aura)) : 0;
        case '30': return summary.wins ? Math.min(task.goal, summary.wins) : 0;
        default:
          return 0;
      }
    })();

    if (delta <= 0) return task;
    const nextProgress = Math.min(task.goal, task.progress + delta);
    return { ...task, progress: nextProgress };
  });

  const updated = { ...event, tasks: nextTasks };
  writeEventState(updated);
  return updated;
}

export const ACTIVE_EVENT = createDefaultEvent('guest');

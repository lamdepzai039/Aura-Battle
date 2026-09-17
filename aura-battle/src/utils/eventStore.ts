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

export const ACTIVE_EVENT: EventState = {
  id: 'weekly-aura-event',
  title: 'WEEKLY AURA EVENT',
  description: 'Complete matches, survive the pressure, and stack event points to unlock the weekly reward drop.',
  startDate: '2026-09-17T00:00:00.000Z',
  endDate: '2026-09-24T23:59:59.000Z',
  tasks: [
    { id: 'rounds', title: 'Complete 3 rounds', goal: 3, progress: 0, reward: '150 Coins' },
    { id: 'streak', title: 'Win 2 matches', goal: 2, progress: 0, reward: '250 XP' },
    { id: 'challenge', title: 'Trigger 2 aura breaks', goal: 2, progress: 0, reward: 'AURA Token' },
  ],
  claimed: false,
  totalRewards: ['150 Coins', '250 XP', 'AURA Token', 'Sticker Pack'],
};

function readEventState(): EventState {
  try {
    const raw = localStorage.getItem(EVENT_KEY);
    if (!raw) return ACTIVE_EVENT;
    const parsed = JSON.parse(raw) as Partial<EventState>;
    return { ...ACTIVE_EVENT, ...parsed, tasks: parsed.tasks?.length ? parsed.tasks : ACTIVE_EVENT.tasks };
  } catch {
    return ACTIVE_EVENT;
  }
}

function writeEventState(state: EventState) {
  try {
    localStorage.setItem(EVENT_KEY, JSON.stringify(state));
  } catch {
    // ignore unsupported storage access in restricted contexts
  }
}

export function getActiveEvent(): EventState {
  return readEventState();
}

export function claimEventReward(): EventState {
  const current = readEventState();
  const totalProgress = current.tasks.reduce((sum, task) => sum + Math.min(task.progress, task.goal), 0);
  const totalGoal = current.tasks.reduce((sum, task) => sum + task.goal, 0);

  if (current.claimed || totalProgress < totalGoal) {
    return current;
  }

  const next = { ...current, claimed: true };
  writeEventState(next);
  return next;
}

export function getEventProgress(): number {
  const event = getActiveEvent();
  const goal = event.tasks.reduce((sum, task) => sum + task.goal, 0);
  const progress = event.tasks.reduce((sum, task) => sum + Math.min(task.progress, task.goal), 0);
  return Math.min(100, Math.round((progress / Math.max(goal, 1)) * 100));
}

import type { Challenge, GameMode, MatchState, PlayerId, RoundRecord, Screen } from './types';

export function createInitialMatch(mode: GameMode, queue: Challenge[]): MatchState {
  return {
    mode,
    players: {
      p1: { name: 'PLAYER 1', aura: 0 },
      p2: { name: mode === 'ai' ? 'AI BOT' : 'PLAYER 2', aura: 0 },
    },
    roundIndex: 0,
    challengeQueue: queue,
    history: [],
    screen: 'round_intro',
  };
}

export type MatchAction =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'APPLY_ROUND_RESULT'; record: RoundRecord }
  | { type: 'NEXT_ROUND' }
  | { type: 'SET_PLAYER_NAME'; playerId: PlayerId; name: string }
  | { type: 'RESET'; mode: GameMode; queue: Challenge[] };

export function matchReducer(state: MatchState, action: MatchAction): MatchState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen };
    case 'APPLY_ROUND_RESULT': {
      const { record } = action;
      const p1Gain = Math.round(record.scores.p1.total * 8);
      const p2Gain = Math.round(record.scores.p2.total * 8);
      return {
        ...state,
        history: [...state.history, record],
        players: {
          p1: { ...state.players.p1, aura: state.players.p1.aura + p1Gain },
          p2: { ...state.players.p2, aura: state.players.p2.aura + p2Gain },
        },
        screen: 'round_result',
      };
    }
    case 'NEXT_ROUND': {
      const nextIndex = state.roundIndex + 1;
      if (nextIndex >= state.challengeQueue.length) {
        return { ...state, screen: 'final_result' };
      }
      return { ...state, roundIndex: nextIndex, screen: 'round_intro' };
    }
    case 'SET_PLAYER_NAME':
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: { ...state.players[action.playerId], name: action.name },
        },
      };
    case 'RESET':
      return createInitialMatch(action.mode, action.queue);
    default:
      return state;
  }
}

export function currentChallenge(state: MatchState): Challenge | null {
  return state.challengeQueue[state.roundIndex] ?? null;
}

export function overallWinner(state: MatchState): PlayerId | 'tie' {
  const { p1, p2 } = state.players;
  if (Math.abs(p1.aura - p2.aura) < 1) return 'tie';
  return p1.aura > p2.aura ? 'p1' : 'p2';
}

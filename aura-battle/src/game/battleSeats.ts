export type BattleSeatNames = {
  p1: string;
  p2: string;
};

export function resolveBattleSeatNames({
  currentPlayer,
  host,
  guest,
  isHost,
}: {
  currentPlayer?: string | null;
  host?: string | null;
  guest?: string | null;
  isHost?: boolean;
}): BattleSeatNames {
  const safeHost = (host || currentPlayer || 'PLAYER 1').trim() || 'PLAYER 1';
  const safeGuest = (guest || 'RIVAL').trim() || 'RIVAL';

  if (isHost) {
    return {
      p1: safeHost,
      p2: safeGuest,
    };
  }

  return {
    p1: safeHost,
    p2: currentPlayer?.trim() || safeGuest,
  };
}

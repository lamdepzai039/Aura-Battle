export type SignalTarget = 'host' | 'guest';

export function resolveSignalTarget({ isHost }: { isHost: boolean }): SignalTarget {
  return isHost ? 'guest' : 'host';
}

export function normalizeSignalType(value: string | undefined): 'offer' | 'answer' | 'ice-candidate' | null {
  if (!value) return null;
  if (value === 'offer' || value === 'answer' || value === 'ice-candidate') return value;
  return null;
}

import { describe, expect, it } from 'vitest';
import { resolveSignalTarget } from './webrtcSignal';

describe('resolveSignalTarget', () => {
  it('sends host signals to guest', () => {
    expect(resolveSignalTarget({ isHost: true })).toBe('guest');
  });

  it('sends guest signals to host', () => {
    expect(resolveSignalTarget({ isHost: false })).toBe('host');
  });
});

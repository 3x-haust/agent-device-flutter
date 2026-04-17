import { describe, expect, it } from 'vitest';
import { requireVmServiceUri } from '../src/flutter/runtime.js';
import { VmServiceError } from '../src/flutter/vm-client.js';
import type { SessionState } from '../src/contracts.js';

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    id: 'test-session',
    device: { platform: 'ios', kind: 'simulator', id: 'abc', name: 'Test' },
    openedAt: 0,
    ...overrides,
  };
}

describe('requireVmServiceUri', () => {
  it('returns the configured URI when present', () => {
    const uri = 'ws://127.0.0.1:61234/abc/ws';
    const session = makeSession({ vmServiceUri: uri });
    expect(requireVmServiceUri(session)).toBe(uri);
  });

  it('throws VmServiceError when the session was never attached', () => {
    const session = makeSession();
    expect(() => requireVmServiceUri(session)).toThrow(VmServiceError);
    expect(() => requireVmServiceUri(session)).toThrow(/VM service URI/);
  });
});

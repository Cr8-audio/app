import { describe, it, expect, vi } from 'vitest';

vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useAction: vi.fn(),
}));

import { getDiscogsConnectionState } from '@/lib/hooks/useDiscogsConnection';

describe('getDiscogsConnectionState', () => {
  it('is loading while the query has not resolved', () => {
    expect(getDiscogsConnectionState(undefined)).toBe('loading');
  });

  it('is not connected when signed out or without a connection', () => {
    expect(getDiscogsConnectionState(null)).toBe('not_connected');
    expect(getDiscogsConnectionState({ connected: false })).toBe(
      'not_connected',
    );
  });

  it('needs reconnection when the stored connection cannot sign requests', () => {
    expect(
      getDiscogsConnectionState({ connected: true, needsReconnection: true }),
    ).toBe('needs_reconnection');
  });

  it('is connected otherwise', () => {
    expect(
      getDiscogsConnectionState({ connected: true, needsReconnection: false }),
    ).toBe('connected');
  });
});

import { describe, it, expect } from 'vitest';
import {
  OAUTH_REQUEST_TTL_MS,
  discogsCallbackUrl,
  isAllowedAppOrigin,
  isRequestExpired,
  pickCollectionOwnerKey,
  releasesToRemove,
  toCollectionRelease,
  hashNonce,
  suggestUsername,
} from '@/convex/lib/discogsOAuth';

describe('isAllowedAppOrigin', () => {
  it.each([
    'https://cr8.audio',
    'https://www.cr8.audio',
    'http://localhost:1995',
    'https://crate-app.someaccount.workers.dev',
    'https://crate-app-pr-144.someaccount.workers.dev',
    'https://pr-155.cr8.audio',
  ])('allows %s', (origin) => {
    expect(isAllowedAppOrigin(origin)).toBe(true);
  });

  it.each([
    'https://crate.audio', // no longer ours
    'https://staging.crate.audio',
    'http://cr8.audio',
    'https://cr8.audio.evil.com',
    'https://evil-crate-app.someaccount.workers.dev',
    'https://crate-app-pr-1.someaccount.workers.dev.evil.com',
    'http://pr-155.cr8.audio',
    'https://pr-155.cr8.audio.evil.com',
    'https://evil-pr-155.cr8.audio',
    'https://pr-abc.cr8.audio',
    'http://localhost:3000',
  ])('rejects %s', (origin) => {
    expect(isAllowedAppOrigin(origin)).toBe(false);
  });
});

describe('discogsCallbackUrl', () => {
  it('points at the client callback route', () => {
    expect(discogsCallbackUrl('https://cr8.audio')).toBe(
      'https://cr8.audio/connect/discogs/callback',
    );
  });
});

describe('isRequestExpired', () => {
  it('is valid inside the TTL and expired after it', () => {
    expect(isRequestExpired(0, OAUTH_REQUEST_TTL_MS)).toBe(false);
    expect(isRequestExpired(0, OAUTH_REQUEST_TTL_MS + 1)).toBe(true);
  });
});

describe('pickCollectionOwnerKey', () => {
  it('reuses the first key that already has releases', () => {
    expect(
      pickCollectionOwnerKey(
        [
          { key: 'supabase-id', hasRows: false },
          { key: 'dj@example.com', hasRows: true },
          { key: 'convex-id', hasRows: true },
        ],
        'convex-id',
      ),
    ).toBe('dj@example.com');
  });

  it('falls back to the Convex id for a new collection', () => {
    expect(
      pickCollectionOwnerKey(
        [{ key: 'dj@example.com', hasRows: false }],
        'convex-id',
      ),
    ).toBe('convex-id');
  });
});

describe('releasesToRemove', () => {
  it('returns stored ids missing from Discogs, comparing numbers and strings', () => {
    expect(releasesToRemove([1, '2', '3'], ['1', 3])).toEqual(['2']);
  });

  it('removes nothing when everything is still in the collection', () => {
    expect(releasesToRemove(['1'], ['1', '2'])).toEqual([]);
  });
});

describe('toCollectionRelease', () => {
  it('keeps a synced collection item and uses the stored id', () => {
    const item = { id: 1, date_added: 'x', basic_information: { title: 'A' } };
    expect(toCollectionRelease('42', item)).toEqual({
      ...item,
      id: 42,
      basic_information: { title: 'A' },
    });
  });

  it('wraps a bare release object from migrated rows', () => {
    expect(toCollectionRelease(7, { title: 'B', year: 1999 })).toEqual({
      id: 7,
      basic_information: { title: 'B', year: 1999 },
    });
  });

  it('drops rows without usable data', () => {
    expect(toCollectionRelease(1, null)).toBeNull();
    expect(toCollectionRelease(1, { foo: 'bar' })).toBeNull();
  });
});

describe('hashNonce', () => {
  it('is a stable SHA-256 hex digest', async () => {
    expect(await hashNonce('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('differs for different nonces', async () => {
    expect(await hashNonce('a')).not.toBe(await hashNonce('b'));
  });
});

describe('suggestUsername', () => {
  it('lowercases and keeps allowed characters', () => {
    expect(suggestUsername('DJ_Paprika-f')).toBe('dj_paprika-f');
  });

  it('replaces other characters with hyphens', () => {
    expect(suggestUsername('ahmed.felfel')).toBe('ahmed-felfel');
    expect(suggestUsername('..ab..c..')).toBe('ab-c');
  });

  it('caps length at 30', () => {
    expect(suggestUsername('a'.repeat(40))).toHaveLength(30);
  });

  it('returns null when fewer than 3 usable characters remain', () => {
    expect(suggestUsername('a.')).toBeNull();
  });
});

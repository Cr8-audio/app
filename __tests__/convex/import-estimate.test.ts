import { describe, expect, it } from 'vitest';
import {
  RECORDS_PER_MINUTE,
  formatImportTime,
  importMinutesLeft,
} from '@/convex/lib/importEstimate';

describe('import time estimates', () => {
  it('rounds records left up to whole minutes', () => {
    expect(importMinutesLeft(0)).toBe(0);
    expect(importMinutesLeft(1)).toBe(1);
    expect(importMinutesLeft(RECORDS_PER_MINUTE + 1)).toBe(2);
    // The 1,000-record collection in the product copy: about half an hour.
    expect(importMinutesLeft(1000)).toBe(34);
  });

  it.each([
    [0, 'about a minute'],
    [1, 'about a minute'],
    [12, 'about 12 minutes'],
    [60, 'about 1 hour'],
    [77, 'about 1 hour 15 minutes'],
    [130, 'about 2 hours 10 minutes'],
  ])('reads %i minutes as "%s"', (minutes, text) => {
    expect(formatImportTime(minutes)).toBe(text);
  });
});

import { render, screen } from '@testing-library/react';
import { useQuery } from 'convex/react';
import { describe, expect, it, vi } from 'vitest';
import { ImportStatus } from '@/lib/components/library/ImportStatus';

vi.mock('convex/react', () => ({ useQuery: vi.fn() }));

function showProgress(progress: unknown) {
  vi.mocked(useQuery).mockReturnValue(progress);
  return render(<ImportStatus />);
}

describe('ImportStatus', () => {
  it('shows nothing for someone without a Discogs collection', () => {
    const { container } = showProgress({
      total: 0,
      ready: 0,
      minutesLeft: 0,
      syncing: false,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('says the collection is being read before any records arrive', () => {
    showProgress({ total: 0, ready: 0, minutesLeft: 0, syncing: true });
    expect(screen.getByText('Reading your Discogs collection')).toBeVisible();
  });

  it('explains the rate limit and estimates the time left', () => {
    showProgress({ total: 1000, ready: 100, minutesLeft: 30, syncing: false });
    expect(screen.getByText('Importing 1,000 records')).toBeVisible();
    expect(
      screen.getByText(/60 times a minute.*about 30 minutes for the rest/),
    ).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    expect(screen.getByText('100 of 1,000 records ready')).toBeVisible();
  });

  it('notes that more records are coming while the collection loads', () => {
    showProgress({ total: 200, ready: 0, minutesLeft: 7, syncing: true });
    expect(screen.getByText('Importing 200 records so far')).toBeVisible();
    expect(screen.getByText(/more as your collection loads/)).toBeVisible();
  });

  it('confirms when every record has its tracks', () => {
    showProgress({ total: 354, ready: 354, minutesLeft: 0, syncing: false });
    expect(screen.getByText('354 records ready')).toBeVisible();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

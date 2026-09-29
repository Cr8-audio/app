/**
 * Search, sort and page a user's tracks on the server, so the library sends
 * one page instead of the whole collection. Pure, so it can be unit-tested.
 */

export type LibrarySortField = 'title' | 'artist';

export interface LibraryTrackFields {
  title: string;
  artist: string;
  genres?: string | null;
  styles?: string | null;
}

export const MAX_PAGE_SIZE = 100;

/** Case-insensitive match on title, artist, genres or styles. */
export function matchesSearch(track: LibraryTrackFields, search: string) {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return [track.title, track.artist, track.genres, track.styles].some((field) =>
    field?.toLowerCase().includes(needle),
  );
}

export function libraryPage<T extends LibraryTrackFields>(
  tracks: T[],
  {
    search = '',
    sortBy,
    sortDesc = false,
    pageIndex,
    pageSize,
  }: {
    search?: string;
    sortBy?: LibrarySortField;
    sortDesc?: boolean;
    pageIndex: number;
    pageSize: number;
  },
) {
  const filtered = tracks.filter((track) => matchesSearch(track, search));
  if (sortBy) {
    const direction = sortDesc ? -1 : 1;
    // Array.prototype.sort is stable, so ties keep collection order.
    filtered.sort(
      (a, b) =>
        a[sortBy].localeCompare(b[sortBy], undefined, {
          sensitivity: 'base',
          numeric: true,
        }) * direction,
    );
  }

  const size = Math.min(Math.max(Math.floor(pageSize), 1), MAX_PAGE_SIZE);
  const pageCount = Math.max(Math.ceil(filtered.length / size), 1);
  const index = Math.min(Math.max(Math.floor(pageIndex), 0), pageCount - 1);
  return {
    total: tracks.length,
    filteredTotal: filtered.length,
    pageIndex: index,
    pageCount,
    tracks: filtered.slice(index * size, (index + 1) * size),
  };
}

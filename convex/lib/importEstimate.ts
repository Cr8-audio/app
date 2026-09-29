/**
 * How long importing tracklists takes, for telling people up front. Pure, so
 * the app and Convex share it and it can be unit-tested.
 *
 * Discogs allows an app 60 signed requests a minute. The importer
 * (releaseTracks.ts) fetches 25 records, then waits 30 seconds, which comes
 * to about 30 records a minute.
 */
export const RECORDS_PER_MINUTE = 30;

export function importMinutesLeft(recordsLeft: number): number {
  return recordsLeft > 0 ? Math.ceil(recordsLeft / RECORDS_PER_MINUTE) : 0;
}

/** "about 12 minutes", "about 1 hour 15 minutes" (to the nearest 5). */
export function formatImportTime(minutes: number): string {
  if (minutes <= 1) return 'about a minute';
  if (minutes < 60) return `about ${minutes} minutes`;
  const rounded = Math.round(minutes / 5) * 5;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  const hourText = `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return rest ? `about ${hourText} ${rest} minutes` : `about ${hourText}`;
}

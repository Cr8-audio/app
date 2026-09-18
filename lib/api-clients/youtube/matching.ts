export interface TrackIdentity {
  artist: string;
  title: string;
}

export interface YouTubeCandidate {
  title: string;
  channelTitle?: string;
  description?: string;
  categoryId?: string;
}

export interface YouTubeMatchResult {
  matches: boolean;
  score: number;
  reason:
    | 'match'
    | 'not-music'
    | 'unsafe-context'
    | 'title-mismatch'
    | 'artist-mismatch';
}

const GENERIC_ARTISTS = new Set([
  'unknown artist',
  'various',
  'various artists',
  'anonymous',
]);

const TITLE_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

const ARTIST_STOP_WORDS = new Set([
  ...TITLE_STOP_WORDS,
  'dj',
  'feat',
  'featuring',
  'ft',
  'me',
]);

const NON_MUSIC_TERMS = [
  'canning',
  'cook',
  'cooking',
  'food',
  'garden',
  'how to make',
  'kitchen',
  'pickle recipe',
  'recipe',
  'tutorial',
];

const MUSIC_SIGNALS = [
  'audio',
  'full album',
  'lyrics',
  'music',
  'official',
  'records',
  'topic',
  'vinyl',
];

export function normalizeYouTubeText(value: string): string {
  return value
    .replace(/&amp;/gi, ' and ')
    .replace(/&#39;|&apos;/gi, "'")
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+\(\d+\)(?=,|$)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function meaningfulTokens(value: string, stopWords: Set<string>) {
  return [
    ...new Set(
      normalizeYouTubeText(value)
        .split(' ')
        .filter((token) => token.length > 1 && !stopWords.has(token)),
    ),
  ];
}

function tokenCoverage(tokens: string[], haystack: Set<string>) {
  if (tokens.length === 0) return 1;
  return tokens.filter((token) => haystack.has(token)).length / tokens.length;
}

function containsPhrase(haystack: string, phrase: string) {
  return ` ${haystack} `.includes(` ${normalizeYouTubeText(phrase)} `);
}

/**
 * YouTube relevance alone is not a safe music matcher. This deliberately
 * requires title evidence and, whenever Discogs gave us a useful artist,
 * artist evidence too. The category and negative-context checks catch generic
 * titles such as "Pickled Beets" before a recipe can reach the player.
 */
export function evaluateYouTubeCandidate(
  track: TrackIdentity,
  candidate: YouTubeCandidate,
): YouTubeMatchResult {
  if (candidate.categoryId && candidate.categoryId !== '10') {
    return { matches: false, score: 0, reason: 'not-music' };
  }

  const normalizedTitle = normalizeYouTubeText(track.title);
  const normalizedArtist = normalizeYouTubeText(track.artist);
  const candidateTitle = normalizeYouTubeText(candidate.title);
  const candidateContext = normalizeYouTubeText(
    [candidate.title, candidate.channelTitle, candidate.description]
      .filter(Boolean)
      .join(' '),
  );

  const hasUnsafeContext = NON_MUSIC_TERMS.some(
    (term) =>
      containsPhrase(candidateContext, term) &&
      !containsPhrase(`${normalizedTitle} ${normalizedArtist}`, term),
  );
  if (hasUnsafeContext) {
    return { matches: false, score: 0, reason: 'unsafe-context' };
  }

  const candidateTokens = new Set(candidateContext.split(' ').filter(Boolean));
  const titleTokens = meaningfulTokens(track.title, TITLE_STOP_WORDS);
  const titleCoverage = tokenCoverage(titleTokens, candidateTokens);
  const hasExactTitle =
    normalizedTitle.length > 2 && candidateTitle.includes(normalizedTitle);
  const minimumTitleCoverage = titleTokens.length <= 2 ? 1 : 0.67;

  if (!hasExactTitle && titleCoverage < minimumTitleCoverage) {
    return { matches: false, score: 0, reason: 'title-mismatch' };
  }

  const artistTokens = meaningfulTokens(track.artist, ARTIST_STOP_WORDS);
  const artistIsGeneric = GENERIC_ARTISTS.has(normalizedArtist);
  const artistCoverage = tokenCoverage(artistTokens, candidateTokens);
  const artistParts = track.artist
    .split(/\s*,\s*|\s+and\s+|\s+feat(?:uring)?\.?\s+/i)
    .map((part) => normalizeYouTubeText(part))
    .filter((part) => part.length > 2);
  const hasArtistPhrase = artistParts.some((part) =>
    candidateContext.includes(part),
  );
  const hasArtistEvidence =
    artistIsGeneric ||
    artistTokens.length === 0 ||
    hasArtistPhrase ||
    artistCoverage >= (artistTokens.length <= 2 ? 0.5 : 0.3);

  if (!hasArtistEvidence) {
    return { matches: false, score: 0, reason: 'artist-mismatch' };
  }

  const musicSignalCount = MUSIC_SIGNALS.filter((signal) =>
    candidateContext.includes(signal),
  ).length;
  const score =
    titleCoverage * 45 +
    artistCoverage * 35 +
    (hasExactTitle ? 12 : 0) +
    (hasArtistPhrase ? 10 : 0) +
    Math.min(musicSignalCount, 2) * 4;

  return { matches: true, score, reason: 'match' };
}

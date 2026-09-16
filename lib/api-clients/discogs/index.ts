import { Release } from '@/lib/types';
import { DiscogsSDK } from '@crate.ai/discogs-sdk';
import { rateLimiter } from '@/lib/utils/rateLimiter';

const discogs = new DiscogsSDK({
  DiscogsConsumerKey: import.meta.env.VITE_DISCOGS_CONSUMER_KEY || '',
  DiscogsConsumerSecret: import.meta.env.VITE_DISCOGS_CONSUMER_SECRET || '',
});

export const fetchUserDetails = async (username: string) => {
  const resourceUrl = `https://api.discogs.com/users/${username}`;
  const response = await fetch(resourceUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch user details for ${username}`);
  }

  return response.json();
};

export const fetchUserCollection = async (
  username: string,
  perPage = 50,
  folderId = 0,
) => {
  const collection = await discogs.collection.getCollection({
    username,
    page: 1, // Fetch the first page for now
    perPage,
    folderId,
  });

  return collection;
};

export const fetchMasterRelease = async (masterUrl: string) => {
  const response = await fetch(masterUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch master release: ${masterUrl}`);
  }

  return response.json();
};

export async function getGenres(
  username: string,
): Promise<{ [genre: string]: number }> {
  const collection = await fetchUserCollection(username);

  const genreCounts: { [genre: string]: number } = {};
  collection.releases.forEach((release) => {
    release.basic_information.genres.forEach((genre) => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
  });

  return genreCounts;
}

export const getDiscogsRelease = async (
  accessToken: string,
  accessTokenSecret: string,
  ip: string,
  releaseId: string,
) => {
  const identifier = `discogs:${accessToken ? accessToken : ip}`;

  // Check rate limit first
  const { isLimited, remaining, reset } = rateLimiter.check(identifier);

  if (isLimited) {
    return { isLimited, remaining, reset };
  }

  const discogsUrl = `https://api.discogs.com/releases/${releaseId}`;

  const response = await fetch(discogsUrl, {
    headers: {
      Authorization: `OAuth oauth_token=${accessToken}, oauth_token_secret=${accessTokenSecret}`,
      'User-Agent': 'CrateApp/1.0 +https://crate.ai',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Discogs API error: ${response.status}`);
  }

  const release: Release = await response.json();

  return { release, remaining, reset, isLimited };
};

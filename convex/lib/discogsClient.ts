/**
 * Discogs SDK setup and the OAuth token exchange, shared by the connect flow
 * (`convex/discogs.ts`) and sign-in (`convex/discogsAuth.ts`).
 */
import { DiscogsSDK } from '@cr8.audio/discogs-sdk';

const USER_AGENT = 'CrateApp/1.0 +https://cr8.audio';

export function createDiscogsSdk(callbackUrl?: string) {
  const key = process.env.DISCOGS_CONSUMER_KEY;
  const secret = process.env.DISCOGS_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error(
      'DISCOGS_CONSUMER_KEY and DISCOGS_CONSUMER_SECRET must be set on the Convex deployment',
    );
  }
  return new DiscogsSDK({
    DiscogsConsumerKey: key,
    DiscogsConsumerSecret: secret,
    callbackUrl,
    userAgent: USER_AGENT,
  });
}

export interface DiscogsAuthorization {
  accessToken: string;
  accessTokenSecret: string;
  discogsUserId: string;
  username: string;
}

/**
 * Trade the verifier Discogs sent to the callback for access tokens, and
 * read who approved it. This is the proof of identity for sign-in.
 */
export async function exchangeDiscogsVerifier(
  request: { requestToken: string; requestTokenSecret: string },
  oauthVerifier: string,
): Promise<DiscogsAuthorization> {
  const sdk = createDiscogsSdk();
  const tokenManager = sdk.auth.base.getTokenManager();
  await tokenManager.setRequestToken(request.requestToken);
  await tokenManager.setRequestTokenSecret(request.requestTokenSecret);

  const tokens = await sdk.auth.handleCallback({
    oauthToken: request.requestToken,
    oauthVerifier,
  });
  const identity = await sdk.auth.getUserIdentity();

  return {
    accessToken: tokens.token,
    accessTokenSecret: tokens.secret,
    discogsUserId: String(identity.id),
    username: identity.username,
  };
}

/** Public avatar for a Discogs user; best effort. */
export async function fetchDiscogsAvatar(
  username: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://api.discogs.com/users/${encodeURIComponent(username)}`,
      { headers: { 'User-Agent': USER_AGENT } },
    );
    if (!res.ok) return undefined;
    const profile = (await res.json()) as { avatar_url?: string };
    return profile.avatar_url || undefined;
  } catch {
    return undefined;
  }
}

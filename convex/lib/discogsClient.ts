/**
 * Discogs SDK setup and the OAuth token exchange, shared by the connect flow
 * (`convex/discogs.ts`) and sign-in (`convex/discogsAuth.ts`).
 */
import { DiscogsSDK } from '@cr8.audio/discogs-sdk';
import type { DiscogsReleaseDetail } from './discogsTracklist';

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

/**
 * The email on the Discogs account, lowercased. Discogs only shows it to the
 * account itself, so the request is signed with the user's tokens, and it's
 * only returned for an activated account: Discogs activates an account by
 * confirming its email. Best effort; sign-in works without it.
 */
export async function fetchDiscogsVerifiedEmail(
  credentials: { accessToken: string; accessTokenSecret: string },
  username: string,
): Promise<string | undefined> {
  const base = createDiscogsSdk().auth.base;
  try {
    const profile = await base.requestPublic<{
      email?: string;
      activated?: boolean;
    }>(`users/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        Authorization: base.generateOAuthHeaderPublic(
          credentials.accessToken,
          credentials.accessTokenSecret,
        ),
      },
    });
    const email = profile.email?.trim().toLowerCase();
    return profile.activated === true && email ? email : undefined;
  } catch {
    return undefined;
  }
}

/**
 * GET /releases/{id}, signed with the user's tokens (60 requests a minute).
 * The SDK has no release endpoint yet, so this goes through its signed
 * request helper, which also retries 429s. Returns null when Discogs no
 * longer has the release.
 */
export async function fetchDiscogsRelease(
  credentials: { accessToken: string; accessTokenSecret: string },
  releaseId: string,
): Promise<DiscogsReleaseDetail | null> {
  const base = createDiscogsSdk().auth.base;
  try {
    return await base.requestPublic<DiscogsReleaseDetail>(
      `releases/${encodeURIComponent(releaseId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: base.generateOAuthHeaderPublic(
            credentials.accessToken,
            credentials.accessTokenSecret,
          ),
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('HTTP error 404')) {
      return null;
    }
    throw error;
  }
}

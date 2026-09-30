/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as discogs from "../discogs.js";
import type * as discogsAuth from "../discogsAuth.js";
import type * as discogsCollection from "../discogsCollection.js";
import type * as favorites from "../favorites.js";
import type * as http from "../http.js";
import type * as lib_discogsClient from "../lib/discogsClient.js";
import type * as lib_discogsOAuth from "../lib/discogsOAuth.js";
import type * as lib_discogsSearch from "../lib/discogsSearch.js";
import type * as lib_discogsTracklist from "../lib/discogsTracklist.js";
import type * as lib_importEstimate from "../lib/importEstimate.js";
import type * as lib_libraryPage from "../lib/libraryPage.js";
import type * as lib_playlistSharing from "../lib/playlistSharing.js";
import type * as lib_username from "../lib/username.js";
import type * as lib_youtubeApi from "../lib/youtubeApi.js";
import type * as lib_youtubeMatching from "../lib/youtubeMatching.js";
import type * as migrations from "../migrations.js";
import type * as musicConnections from "../musicConnections.js";
import type * as playlistAudio from "../playlistAudio.js";
import type * as playlists from "../playlists.js";
import type * as releaseTracks from "../releaseTracks.js";
import type * as trackAudio from "../trackAudio.js";
import type * as tracks from "../tracks.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  discogs: typeof discogs;
  discogsAuth: typeof discogsAuth;
  discogsCollection: typeof discogsCollection;
  favorites: typeof favorites;
  http: typeof http;
  "lib/discogsClient": typeof lib_discogsClient;
  "lib/discogsOAuth": typeof lib_discogsOAuth;
  "lib/discogsSearch": typeof lib_discogsSearch;
  "lib/discogsTracklist": typeof lib_discogsTracklist;
  "lib/importEstimate": typeof lib_importEstimate;
  "lib/libraryPage": typeof lib_libraryPage;
  "lib/playlistSharing": typeof lib_playlistSharing;
  "lib/username": typeof lib_username;
  "lib/youtubeApi": typeof lib_youtubeApi;
  "lib/youtubeMatching": typeof lib_youtubeMatching;
  migrations: typeof migrations;
  musicConnections: typeof musicConnections;
  playlistAudio: typeof playlistAudio;
  playlists: typeof playlists;
  releaseTracks: typeof releaseTracks;
  trackAudio: typeof trackAudio;
  tracks: typeof tracks;
  users: typeof users;
  waitlist: typeof waitlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};

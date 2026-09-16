// convex/migrations.ts
import { Migrations } from '@convex-dev/migrations';
import { components } from './_generated/api.js';
import { DataModel } from './_generated/dataModel.js';
import { QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

// Helper functions
async function getPlaylistById(ctx: QueryCtx, id: string | Id<'playlists'>) {
  const convexId = ctx.db.normalizeId('playlists', id);
  if (convexId !== null) {
    return ctx.db.get(convexId);
  } else {
    return ctx.db
      .query('playlists')
      .withIndex('by_old_id', (q) => q.eq('id', id))
      .unique();
  }
}

async function getTrackById(ctx: QueryCtx, id: string | Id<'tracks'>) {
  const convexId = ctx.db.normalizeId('tracks', id);
  if (convexId !== null) {
    return ctx.db.get(convexId);
  } else {
    return ctx.db
      .query('tracks')
      .withIndex('by_old_id', (q) => q.eq('id', id))
      .unique();
  }
}

// Data cleanup migrations
export const convertBooleans = migrations.define({
  table: 'playlists',
  migrateOne: (_, doc) => {
    const updates: any = {};
    if (typeof doc.is_public === 'string') {
      updates.is_public = doc.is_public === 't' || doc.is_public === 'true';
    }
    if (typeof doc.is_favorites === 'string') {
      updates.is_favorites =
        doc.is_favorites === 't' || doc.is_favorites === 'true';
    }
    if (Object.keys(updates).length > 0) {
      return updates;
    }
  },
});

export const convertDiscogsIds = migrations.define({
  table: 'discogs_releases',
  migrateOne: (_, doc) => {
    if (typeof doc.discogs_release_id === 'number') {
      return { discogs_release_id: doc.discogs_release_id.toString() };
    }
  },
});

export const convertTracksDiscogsIds = migrations.define({
  table: 'tracks',
  migrateOne: (_, doc) => {
    if (typeof doc.discogs_release_id === 'number') {
      return { discogs_release_id: doc.discogs_release_id.toString() };
    }
  },
});

export const convertUserReleasesDiscogsIds = migrations.define({
  table: 'user_releases',
  migrateOne: (_, doc) => {
    if (typeof doc.discogs_release_id === 'number') {
      return { discogs_release_id: doc.discogs_release_id.toString() };
    }
  },
});

// Foreign key migrations
export const migratePlaylistTracks = migrations.define({
  table: 'playlist_tracks',
  migrateOne: async (ctx, doc) => {
    const updates: any = {};

    // Update playlist_id if it's a string
    if (typeof doc.playlist_id === 'string') {
      const playlist = await getPlaylistById(ctx, doc.playlist_id);
      if (!playlist) throw new Error(`Playlist not found: ${doc.playlist_id}`);
      if (playlist._id !== doc.playlist_id) {
        updates.playlist_id = playlist._id;
      }
    }

    // Update track_id if it's a string
    if (typeof doc.track_id === 'string') {
      const track = await getTrackById(ctx, doc.track_id);
      if (!track) throw new Error(`Track not found: ${doc.track_id}`);
      if (track._id !== doc.track_id) {
        updates.track_id = track._id;
      }
    }

    if (Object.keys(updates).length > 0) {
      return updates;
    }
  },
});

export const migrateTrackAnalysis = migrations.define({
  table: 'track_analysis',
  migrateOne: async (ctx, doc) => {
    if (typeof doc.track_id === 'string') {
      const track = await getTrackById(ctx, doc.track_id);
      if (!track) throw new Error(`Track not found: ${doc.track_id}`);
      if (track._id !== doc.track_id) {
        return { track_id: track._id };
      }
    }
  },
});

// Run all migrations in order
export const runAll = migrations.runner([
  'migrations:convertBooleans' as any,
  'migrations:convertDiscogsIds' as any,
  'migrations:convertTracksDiscogsIds' as any,
  'migrations:convertUserReleasesDiscogsIds' as any,
  'migrations:migratePlaylistTracks' as any,
  'migrations:migrateTrackAnalysis' as any,
]);

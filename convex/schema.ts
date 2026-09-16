import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,

  // Extend the users table from authTables with custom fields
  users: defineTable({
    // Email fields from Convex Auth
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    // Custom fields for Crate
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    // Onboarding tracking
    onboardingComplete: v.optional(v.boolean()),
    onboardingStep: v.optional(
      v.union(
        v.literal('username'),
        v.literal('connections'),
        v.literal('complete'),
      ),
    ),
    // Legacy Supabase user ID - used to link to migrated data
    supabaseUserId: v.optional(v.string()),
  })
    .index('by_username', ['username'])
    .index('by_email', ['email'])
    .index('by_supabase_id', ['supabaseUserId']),

  // Music service connections (for Discogs, Spotify, etc.)
  user_music_connections: defineTable({
    userId: v.id('users'),
    provider: v.string(), // 'discogs' | 'spotify' etc
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    providerUserId: v.string(),
    providerUsername: v.optional(v.string()),
    providerData: v.optional(v.any()), // Store additional provider-specific data
  })
    .index('by_user', ['userId'])
    .index('by_user_provider', ['userId', 'provider']),

  discogs_releases: defineTable({
    discogs_release_id: v.union(v.string(), v.number()), // Can be either
    discogs_release_data: v.optional(v.any()),
    basic_release_data: v.optional(v.any()),
    uploaded_at: v.optional(v.string()),
  }).index('by_discogs_id', ['discogs_release_id']),

  playlists: defineTable({
    id: v.string(),
    user_id: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    cover_image_url: v.optional(v.string()),
    created_at: v.optional(v.string()),
    updated_at: v.optional(v.string()),
    is_public: v.optional(v.union(v.boolean(), v.string())), // Handle "t"/"f" strings
    is_favorites: v.optional(v.union(v.boolean(), v.string())), // Handle "t"/"f" strings
  })
    .index('by_old_id', ['id'])
    .index('by_user', ['user_id']),

  tracks: defineTable({
    id: v.string(),
    discogs_release_id: v.union(v.string(), v.number()), // Can be either
    youtube_video_id: v.optional(v.string()),
    title: v.string(),
    artist: v.string(),
    extra_artists: v.optional(v.string()),
    position: v.string(),
    duration: v.string(),
    genres: v.optional(v.string()),
    styles: v.optional(v.string()),
    artwork: v.optional(v.string()),
    created_at: v.optional(v.string()),
  })
    .index('by_old_id', ['id'])
    .index('by_discogs_release', ['discogs_release_id'])
    .index('by_discogs_and_position', ['discogs_release_id', 'position']),

  playlist_tracks: defineTable({
    id: v.string(), // Keep old UUID for reference
    playlist_id: v.id('playlists'), // Points to playlist's _id
    track_id: v.id('tracks'), // Points to track's _id
    position: v.number(),
    created_at: v.optional(v.string()),
  }),

  track_analysis: defineTable({
    id: v.string(),
    track_id: v.id('tracks'), // Points to track's _id
    analysis: v.any(),
    bpm: v.optional(v.number()),
    created_at: v.optional(v.string()),
  }),

  user_discogs_profile: defineTable({
    username: v.string(),
    user_id: v.string(),
  })
    .index('by_username', ['username'])
    .index('by_user', ['user_id']),

  user_releases: defineTable({
    user_id: v.string(),
    discogs_release_id: v.union(v.string(), v.number()), // Can be either
  })
    .index('by_user', ['user_id'])
    .index('by_discogs_release', ['discogs_release_id'])
    .index('by_user_and_release', ['user_id', 'discogs_release_id']),

  waitlist: defineTable({
    email: v.string(),
    user_type: v.string(),
  }).index('by_email', ['email']),
});

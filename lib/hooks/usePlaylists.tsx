/**
 * Custom hook to manage playlists using Convex
 * This hook replaces the old Zustand store that used REST APIs
 */

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Id } from '@/convex/_generated/dataModel';

export function usePlaylists() {
  // Get playlists from Convex
  const playlistsData = useQuery(api.playlists.getUserPlaylists);

  // Mutations
  const createPlaylistMutation = useMutation(api.playlists.createPlaylist);
  const deletePlaylistMutation = useMutation(api.playlists.deletePlaylist);
  const updatePlaylistMutation = useMutation(api.playlists.updatePlaylist);
  const addTrackMutation = useMutation(api.playlists.addTrackToPlaylist);
  const removeTrackMutation = useMutation(
    api.playlists.removeTrackFromPlaylist,
  );
  const reorderTracksMutation = useMutation(
    api.playlists.reorderPlaylistTracks,
  );

  const isLoading = playlistsData === undefined;
  type PlaylistForUi = Exclude<typeof playlistsData, undefined>[number] & {
    name?: string;
  };
  const playlists = useMemo(
    () => (playlistsData || []) as PlaylistForUi[],
    [playlistsData],
  );

  const createPlaylist = useCallback(
    async (title: string, description?: string) => {
      try {
        const { playlistId } = await createPlaylistMutation({
          title,
          description,
        });
        toast.success(`Created playlist "${title}"`);
        return playlistId;
      } catch (error) {
        console.error('Error creating playlist:', error);
        toast.error('Failed to create playlist');
        throw error;
      }
    },
    [createPlaylistMutation],
  );

  const deletePlaylist = useCallback(
    async (playlistId: Id<'playlists'>) => {
      try {
        await deletePlaylistMutation({ playlistId });
        toast.success('Playlist deleted');
      } catch (error) {
        console.error('Error deleting playlist:', error);
        toast.error('Failed to delete playlist');
        throw error;
      }
    },
    [deletePlaylistMutation],
  );

  const updatePlaylist = useCallback(
    async (
      playlistId: Id<'playlists'> | string,
      updates: { title?: string; description?: string; is_public?: boolean },
    ) => {
      try {
        await updatePlaylistMutation({
          playlistId: playlistId as Id<'playlists'>,
          ...updates,
        });
        toast.success('Playlist updated');
      } catch (error) {
        console.error('Error updating playlist:', error);
        toast.error('Failed to update playlist');
        throw error;
      }
    },
    [updatePlaylistMutation],
  );

  const addTrackToPlaylist = useCallback(
    async (
      playlistId: Id<'playlists'> | string,
      trackId: Id<'tracks'> | string,
    ) => {
      try {
        // Cast to the correct types - Convex will handle validation
        await addTrackMutation({
          playlistId: playlistId as Id<'playlists'>,
          trackId: trackId as Id<'tracks'>,
        });
        toast.success('Track added to playlist');
      } catch (error) {
        console.error('Error adding track to playlist:', error);
        toast.error('Failed to add track');
        throw error;
      }
    },
    [addTrackMutation],
  );

  const removeTrackFromPlaylist = useCallback(
    async (
      playlistId: Id<'playlists'> | string,
      trackId: Id<'tracks'> | string,
    ) => {
      try {
        await removeTrackMutation({
          playlistId: playlistId as Id<'playlists'>,
          trackId: trackId as Id<'tracks'>,
        });
        toast.success('Track removed from playlist');
      } catch (error) {
        console.error('Error removing track:', error);
        toast.error('Failed to remove track');
        throw error;
      }
    },
    [removeTrackMutation],
  );

  const reorderPlaylistTracks = useCallback(
    async (playlistId: Id<'playlists'>, trackIds: Id<'tracks'>[]) => {
      try {
        await reorderTracksMutation({ playlistId, trackIds });
        toast.success('Playlist order updated');
      } catch (error) {
        console.error('Error reordering playlist:', error);
        toast.error('Failed to reorder playlist');
        throw error;
      }
    },
    [reorderTracksMutation],
  );

  // For backward compatibility - returns empty array without showing error
  const fetchPlaylists = useCallback(async () => {
    // No-op - Convex handles this reactively
    return playlists;
  }, [playlists]);

  return {
    playlists,
    isLoading,
    fetchPlaylists,
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    reorderPlaylistTracks,
  };
}

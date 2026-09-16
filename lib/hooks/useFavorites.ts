/**
 * Custom hook to manage favorites using Convex
 * This hook provides a bridge between Convex queries/mutations and components
 */

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useCallback, useMemo } from 'react';
import { CrateTrack } from '@/lib/types';

export function useFavorites() {
  // Get favorites from Convex
  const favoritesData = useQuery(api.favorites.getFavorites);

  // Mutations
  const addFavoriteMutation = useMutation(api.favorites.addFavorite);
  const removeFavoriteMutation = useMutation(api.favorites.removeFavorite);

  const isLoading = favoritesData === undefined;

  const favoriteTrackIds = useMemo(() => {
    if (!favoritesData?.favoriteTrackIds) return new Set<string>();
    return new Set(favoritesData.favoriteTrackIds);
  }, [favoritesData]);

  const isFavorite = useCallback(
    (trackId: string) => {
      return favoriteTrackIds.has(trackId);
    },
    [favoriteTrackIds],
  );

  const addToFavorites = useCallback(
    async (trackId: string) => {
      try {
        await addFavoriteMutation({ trackId });
        return { success: true };
      } catch (error) {
        console.error('Error adding favorite:', error);
        throw error;
      }
    },
    [addFavoriteMutation],
  );

  const removeFromFavorites = useCallback(
    async (trackId: string) => {
      try {
        await removeFavoriteMutation({ trackId });
        return { success: true };
      } catch (error) {
        console.error('Error removing favorite:', error);
        throw error;
      }
    },
    [removeFavoriteMutation],
  );

  const toggleFavorite = useCallback(
    async (trackId: string) => {
      if (isFavorite(trackId)) {
        return removeFromFavorites(trackId);
      } else {
        return addToFavorites(trackId);
      }
    },
    [isFavorite, addToFavorites, removeFromFavorites],
  );

  const getFavoriteTracksFromAllTracks = useCallback(
    (allTracks: CrateTrack[]) => {
      return allTracks.filter((track) => favoriteTrackIds.has(track.id));
    },
    [favoriteTrackIds],
  );

  return {
    favoriteTrackIds,
    favorites: favoritesData?.favorites || [],
    isLoading,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    getFavoriteTracksFromAllTracks,
  };
}

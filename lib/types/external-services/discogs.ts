export interface DiscogsSearchResult {
  id: number;
  type: string;
  user_data?: {
    in_wantlist: boolean;
    in_collection: boolean;
  };
  master_id?: number;
  master_url?: string;
  uri: string;
  title: string;
  thumb: string;
  cover_image: string;
  resource_url: string;
  country?: string;
  year?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
  style?: string[];
  date_added?: string;
}

// Component Props Interfaces
export interface TrackDisplayProps {
  result: DiscogsSearchResult;
  isPlaying: boolean;
  isLoading?: boolean;
  onPlayToggle: () => void;
  viewMode: 'grid' | 'list';
  dateAdded: string;
}

export interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export interface SearchBarProps {
  query: string;
  isLoading: boolean;
  onQueryChange: (value: string) => void;
}

export interface CrateExplorerProps {
  initialReleases?: DiscogsSearchResult[];
}

// SearchParams / SearchResult / SearchResponse used to be redeclared here
// because @crate.ai/discogs-sdk 2.x (the SDK's old name) mistyped
// getSearchResults() as returning a bare array. 3.0.0 returns the real
// `{ pagination, results }` payload, so the
// SDK's own types are the source of truth — import them from
// '@cr8.audio/discogs-sdk'.

export interface CollectionRelease {
  id: number;
  basic_information: {
    id: number;
    title: string;
    year: number;
    thumb: string;
    cover_image: string;
    artists: Array<{ name: string; id: number }>;
    labels: Array<{ name: string; id: number }>;
    formats: Array<{
      name: string;
      qty: string;
      descriptions: string[];
    }>;
    genres: string[];
    styles: string[];
  };
  date_added: string;
  instance_id: number;
}

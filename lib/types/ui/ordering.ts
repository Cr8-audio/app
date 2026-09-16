export type OrderingConfig = {
  orderBy:
    | 'title'
    | 'artist'
    | 'bpm'
    | 'genre'
    | 'manual'
    | 'suggested'
    | 'style'
    | 'duration';
  direction: 'asc' | 'desc';
};

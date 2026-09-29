import { useRef } from 'react';

/**
 * The latest value that wasn't undefined. Convex's useQuery returns
 * undefined while new arguments load; holding the previous result keeps a
 * page on screen instead of flashing a skeleton between pages.
 */
export function useLastDefined<T>(value: T | undefined): T | undefined {
  const last = useRef(value);
  if (value !== undefined) last.current = value;
  return last.current;
}

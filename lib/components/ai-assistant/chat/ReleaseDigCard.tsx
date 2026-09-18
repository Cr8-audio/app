'use client';

import { Play, Plus, Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils/tailwind';

export interface ReleaseDigCardData {
  title: string;
  artist: string;
  year?: number | string;
  sleeveUrl?: string | null;
  discogsUrl?: string;
  discogsId?: string | number;
  catalogNumber?: string;
  bpm?: number | string;
}

interface ReleaseDigCardProps {
  release: ReleaseDigCardData;
  onPlay?: () => void;
  onOpenFocus?: () => void;
  className?: string;
}

export default function ReleaseDigCard({
  release,
  onPlay,
  onOpenFocus,
  className,
}: ReleaseDigCardProps) {
  const {
    title,
    artist,
    year,
    sleeveUrl,
    discogsUrl,
    discogsId,
    catalogNumber,
    bpm,
  } = release;

  return (
    <article
      className={cn(
        'crate-dig-card w-full rounded-[1.15rem] border border-border/70 bg-card p-3 shadow-soft sm:p-4',
        'animate-[crate-dig-enter_220ms_ease-out]',
        className,
      )}
    >
      <div className="flex items-center gap-3.5 sm:gap-4">
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-[0.8rem] bg-muted sm:h-16 sm:w-16">
          {sleeveUrl ? (
            <img
              src={sleeveUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Disc3 className="h-5 w-5" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {artist}
            {year != null && year !== '' ? <span> · {year}</span> : null}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {discogsUrl || discogsId != null ? (
              <a
                href={
                  discogsUrl || `https://www.discogs.com/release/${discogsId}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                Discogs
                {discogsId != null ? (
                  <span className="font-mono opacity-90">
                    {String(discogsId)}
                  </span>
                ) : null}
              </a>
            ) : (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[0.62rem] font-medium text-muted-foreground">
                Discogs
              </span>
            )}
            {bpm != null && bpm !== '' ? (
              <span className="font-mono text-[0.62rem] text-muted-foreground">
                {bpm} BPM
              </span>
            ) : null}
            {catalogNumber ? (
              <span className="font-mono text-[0.62rem] text-muted-foreground">
                {catalogNumber}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Play ${title}`}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              'bg-foreground text-background',
              'transition-transform duration-150 ease-out active:scale-[0.96]',
              'hover:scale-105',
            )}
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onOpenFocus}
            aria-label={`Add ${title} to a playlist`}
            className={cn(
              'flex h-9 items-center gap-1 rounded-[0.7rem] border border-border',
              'bg-card px-2.5 text-[0.68rem] font-semibold text-muted-foreground',
              'transition-colors duration-150 ease-out',
              'hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Plus className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">Save</span>
          </button>
        </div>
      </div>
    </article>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- stub lives in releaseDigStub.ts
export { STUB_RELEASE_DIG } from './releaseDigStub';

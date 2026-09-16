'use client';

import { Play, ExternalLink, Disc3 } from 'lucide-react';
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

/**
 * Presentational release dig card stub — #140 readiness.
 * Sleeve, title, artist, year, Discogs source chip, play, open-focus.
 * Mono for BPM / catalog / ids.
 */
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
        'crate-dig-card w-full rounded-[var(--radius-card)] border border-[var(--crate-rule)] bg-[var(--crate-panel-raised)] p-[12px_14px]',
        'animate-[crate-dig-enter_220ms_ease-out]',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-[var(--crate-panel)] border border-[var(--crate-rule)]">
          {sleeveUrl ? (
            <img
              src={sleeveUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[var(--crate-ink-muted)]">
              <Disc3 className="h-5 w-5" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-[var(--crate-ink)]">
            {title}
          </h3>
          <p className="truncate text-xs text-[var(--crate-ink-muted)]">
            {artist}
            {year != null && year !== '' ? (
              <span className="text-[var(--crate-ink-muted)]"> · {year}</span>
            ) : null}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {discogsUrl || discogsId != null ? (
              <a
                href={
                  discogsUrl ||
                  `https://www.discogs.com/release/${discogsId}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-[var(--radius-chip)] px-2 py-0.5 text-[10px] font-medium text-[var(--crate-ink)]"
                style={{ backgroundColor: 'var(--crate-source)' }}
                onClick={(e) => e.stopPropagation()}
              >
                Discogs
                {discogsId != null ? (
                  <span className="font-mono opacity-90">{String(discogsId)}</span>
                ) : null}
              </a>
            ) : (
              <span
                className="inline-flex items-center rounded-[var(--radius-chip)] px-2 py-0.5 text-[10px] font-medium text-[var(--crate-ink)]"
                style={{ backgroundColor: 'var(--crate-source)' }}
              >
                Discogs
              </span>
            )}
            {bpm != null && bpm !== '' ? (
              <span className="font-mono text-[10px] text-[var(--crate-ink-muted)]">
                {bpm} BPM
              </span>
            ) : null}
            {catalogNumber ? (
              <span className="font-mono text-[10px] text-[var(--crate-ink-muted)]">
                {catalogNumber}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onPlay}
            aria-label={`Play ${title}`}
            className={cn(
              'crate-play-affordance flex h-8 w-8 items-center justify-center rounded-full',
              'bg-[var(--crate-accent)] text-[var(--crate-void)]',
              'transition-transform duration-150 ease-out active:scale-[0.96]',
              'hover:brightness-110',
            )}
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onOpenFocus}
            aria-label={`Open focus for ${title}`}
            className={cn(
              'flex h-8 items-center gap-1 rounded-[var(--radius-chip)] border border-[var(--crate-rule)]',
              'bg-[var(--crate-panel)] px-2.5 text-[10px] font-medium text-[var(--crate-ink-muted)]',
              'transition-colors duration-150 ease-out',
              'hover:bg-[var(--crate-accent-soft)] hover:text-[var(--crate-ink)]',
            )}
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Focus
          </button>
        </div>
      </div>
    </article>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- stub lives in releaseDigStub.ts
export { STUB_RELEASE_DIG } from './releaseDigStub';

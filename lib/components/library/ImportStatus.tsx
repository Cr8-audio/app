import { Check, Loader2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { formatImportTime } from '@/convex/lib/importEstimate';
import { cn } from '@/lib/utils/tailwind';

/**
 * Where importing the user's Discogs collection stands, with an honest
 * estimate: Discogs lets an app read about 60 times a minute, so a big
 * collection takes a while. Renders nothing for someone without Discogs.
 */
export function ImportStatus({ className }: { className?: string }) {
  const progress = useQuery(api.releaseTracks.getTracklistProgress);
  if (!progress || (progress.total === 0 && !progress.syncing)) return null;

  const { total, ready, minutesLeft, syncing } = progress;
  const isDone = !syncing && ready >= total;
  const percent = total > 0 ? Math.round((ready / total) * 100) : 0;

  const title = isDone
    ? `${total.toLocaleString()} ${total === 1 ? 'record' : 'records'} ready`
    : total === 0
      ? 'Reading your Discogs collection'
      : `Importing ${total.toLocaleString()} ${syncing ? 'records so far' : 'records'}`;
  const detail = isDone
    ? 'Every record has its tracks.'
    : total === 0
      ? 'Crate is listing your records. Their tracklists come next.'
      : `Discogs lets an app read about 60 times a minute, so Crate brings tracklists in gradually: ${formatImportTime(minutesLeft)} for the rest${syncing ? ', and more as your collection loads' : ''}. You can start browsing now; tracks appear as they arrive.`;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 shadow-sm',
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          {isDone ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {detail}
          </p>
          {!isDone && total > 0 && (
            <div className="mt-3">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="Records with tracks"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={ready}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                {ready.toLocaleString()} of {total.toLocaleString()} records
                ready
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Disc3 } from 'lucide-react';
import { cn } from '@/lib/utils/tailwind';

interface PublicArtworkMosaicProps {
  artworkUrls: Array<string | null | undefined>;
  coverImageUrl?: string | null;
  className?: string;
}

function normalizeArtwork(value?: string | null) {
  if (!value) return null;
  const unquoted = value.replace(/^"(.*)"$/, '$1');
  try {
    return decodeURIComponent(unquoted);
  } catch {
    return unquoted;
  }
}

export function PublicArtworkMosaic({
  artworkUrls,
  coverImageUrl,
  className,
}: PublicArtworkMosaicProps) {
  const cover = normalizeArtwork(coverImageUrl);
  const artworks = [
    ...new Set(
      artworkUrls
        .map((artwork) => normalizeArtwork(artwork))
        .filter((artwork): artwork is string => Boolean(artwork)),
    ),
  ].slice(0, 4);

  if (cover) {
    return (
      <div className={cn('overflow-hidden bg-black/5', className)}>
        <img src={cover} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (artworks.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.32),transparent_35%),linear-gradient(145deg,#242624,#111210)] text-white',
          className,
        )}
      >
        <Disc3 className="h-[28%] w-[28%] opacity-80" strokeWidth={1.25} />
      </div>
    );
  }

  if (artworks.length === 1) {
    return (
      <div className={cn('overflow-hidden bg-black/5', className)}>
        <img
          src={artworks[0]}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 grid-rows-2 gap-px overflow-hidden bg-black/10',
        className,
      )}
    >
      {Array.from({ length: 4 }).map((_, index) =>
        artworks[index] ? (
          <img
            key={artworks[index]}
            src={artworks[index]}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div key={index} className="bg-black/[0.035]" />
        ),
      )}
    </div>
  );
}

import { Globe, Link2, Lock, type LucideIcon } from 'lucide-react';
import type { PlaylistVisibility } from '@/convex/lib/playlistSharing';

export const VISIBILITY_OPTIONS: Record<
  PlaylistVisibility,
  { label: string; description: string; icon: LucideIcon }
> = {
  private: {
    label: 'Private',
    description: 'Only you can see and play it.',
    icon: Lock,
  },
  unlisted: {
    label: 'Unlisted',
    description:
      'Anyone with the link or embed can listen. Not shown on your profile.',
    icon: Link2,
  },
  public: {
    label: 'Public',
    description: 'Anyone can listen, and it appears on your profile.',
    icon: Globe,
  },
};

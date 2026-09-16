'use client';

import { useState } from 'react';
import { Button } from '@/lib/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/lib/components/ui/card';
import {
  Zap,
  TrendingUp,
  Music,
  Clock,
  Shuffle,
  Target,
  Waves,
  Volume2,
} from 'lucide-react';
import { CrateTrack } from '@/lib/types';

interface QuickActionsProps {
  tracks: CrateTrack[];
  onActionSelect: (prompt: string) => void;
  className?: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  category: 'tempo' | 'energy' | 'genre' | 'mixing';
}

const QUICK_ACTIONS: QuickAction[] = [
  // Tempo-based actions
  {
    id: 'bpm-match',
    title: 'BPM Matching',
    description: 'Find tracks with similar tempo',
    icon: Clock,
    prompt: 'Show me tracks around 128 BPM that mix well together',
    category: 'tempo',
  },
  {
    id: 'tempo-progression',
    title: 'Tempo Building',
    description: 'Build energy with increasing BPM',
    icon: TrendingUp,
    prompt:
      'Help me build a set starting at 120 BPM and gradually increasing to 130+ BPM',
    category: 'tempo',
  },

  // Energy-based actions
  {
    id: 'peak-time',
    title: 'Peak Time Tracks',
    description: 'High-energy tracks for the dance floor',
    icon: Zap,
    prompt: 'What are my best peak time tracks with high energy?',
    category: 'energy',
  },
  {
    id: 'warm-up',
    title: 'Warm-up Set',
    description: 'Chill tracks to start the night',
    icon: Waves,
    prompt: 'Suggest tracks for a warm-up set to get the crowd moving',
    category: 'energy',
  },

  // Genre-based actions
  {
    id: 'house-selection',
    title: 'House Vibes',
    description: 'Deep house and tech house tracks',
    icon: Music,
    prompt: 'Show me house tracks that create a groovy, deep vibe',
    category: 'genre',
  },
  {
    id: 'techno-power',
    title: 'Techno Power',
    description: 'Hard-hitting techno tracks',
    icon: Volume2,
    prompt: 'Find powerful techno tracks for an underground club set',
    category: 'genre',
  },

  // Mixing-focused actions
  {
    id: 'mix-suggestions',
    title: 'Mix Ideas',
    description: 'Get track pairing suggestions',
    icon: Target,
    prompt:
      'Suggest 3 tracks that would mix perfectly together and explain why',
    category: 'mixing',
  },
  {
    id: 'random-discovery',
    title: 'Surprise Me',
    description: 'Discover hidden gems',
    icon: Shuffle,
    prompt:
      'Surprise me with some hidden gems from my collection that I might have overlooked',
    category: 'mixing',
  },
];

const CATEGORY_COLORS = {
  tempo: 'bg-blue-500/10 text-blue-700 border-blue-200',
  energy: 'bg-red-500/10 text-red-700 border-red-200',
  genre: 'bg-green-500/10 text-green-700 border-green-200',
  mixing: 'bg-purple-500/10 text-purple-700 border-purple-200',
};

export default function QuickActions({
  tracks,
  onActionSelect,
  className,
}: QuickActionsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(
    new Set(QUICK_ACTIONS.map((action) => action.category)),
  );
  const filteredActions = selectedCategory
    ? QUICK_ACTIONS.filter((action) => action.category === selectedCategory)
    : QUICK_ACTIONS;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Get instant help with common DJ tasks
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="h-7 text-xs"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="h-7 text-xs capitalize"
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 gap-2">
          {filteredActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="ghost"
                onClick={() => onActionSelect(action.prompt)}
                className="h-auto p-3 justify-start text-left"
              >
                <div className="flex items-start space-x-3 w-full">
                  <div
                    className={`p-2 rounded-lg ${CATEGORY_COLORS[action.category]}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Collection Stats */}
        <div className="pt-3 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Tracks loaded: {tracks.length}</div>
            {tracks.length > 0 && (
              <>
                <div>
                  BPM range:{' '}
                  {Math.min(...tracks.filter((t) => t.bpm).map((t) => t.bpm!))}{' '}
                  -{' '}
                  {Math.max(...tracks.filter((t) => t.bpm).map((t) => t.bpm!))}{' '}
                  BPM
                </div>
                <div>
                  Genres: {new Set(tracks.flatMap((t) => t.genres || [])).size}{' '}
                  unique
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

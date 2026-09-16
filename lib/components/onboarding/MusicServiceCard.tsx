import { Button } from '@/lib/components/ui/button';
import { Card } from '@/lib/components/ui/card';
import { Music, LucideIcon } from 'lucide-react';

interface MusicServiceCardProps {
  name: string;
  description: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
}

export function MusicServiceCard({
  name,
  description,
  icon: Icon = Music,
  comingSoon = true,
}: MusicServiceCardProps) {
  return (
    <Card className={`p-6 ${comingSoon ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <Icon className="w-6 h-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-semibold">{name}</h3>
              {comingSoon && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                  Coming Soon
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <Button disabled={comingSoon} variant="outline" className="ml-4">
          Connect {name}
        </Button>
      </div>
    </Card>
  );
}

export default MusicServiceCard;

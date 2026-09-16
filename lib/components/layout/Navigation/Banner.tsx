import { Link } from '@tanstack/react-router';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/lib/components/ui/avatar';

interface BannerProps {
  username: string;
  avatarUrl: string;
  authElement: React.ReactNode;
}

export default function Banner({
  username,
  avatarUrl,
  authElement,
}: BannerProps) {
  return (
    <header className="text-black p-6 flex justify-between items-center">
      <div className="flex items-center">
        <Link to="/">
          <img
            src="/logo.svg"
            alt="Crate Logo"
            width={48}
            height={48}
            className="w-12 h-12"
          />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {username === 'Guest' ? (
          authElement
        ) : (
          <>
            <Avatar>
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{username.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{username}</span>
          </>
        )}
      </div>
    </header>
  );
}

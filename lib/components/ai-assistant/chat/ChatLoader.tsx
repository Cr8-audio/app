import { Loader2 } from 'lucide-react';

export function ChatLoader() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm">DJ Assistant is mixing up a response...</p>
      </div>
    </div>
  );
}

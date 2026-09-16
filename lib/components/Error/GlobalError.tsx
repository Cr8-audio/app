'use client';

import { Button } from '@/lib/components/ui/button';

const GlobalError = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Sorry, something went wrong!</h1>
      <p className="text-muted-foreground mb-4">
        Please try refreshing the page or contact support if the problem
        persists.
      </p>
      <Button onClick={() => window.location.reload()}>Refresh Page</Button>
    </div>
  );
};

export default GlobalError;

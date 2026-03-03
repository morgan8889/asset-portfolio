'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-center">
        An unexpected error occurred. Your data is safe in your browser&apos;s local storage.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-2 max-w-lg overflow-auto rounded bg-muted p-4 text-sm">
          {error.message}
        </pre>
      )}
      <div className="flex gap-2">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Go Home
        </Button>
      </div>
    </div>
  );
}

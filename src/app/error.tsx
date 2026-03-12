'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Something went wrong</h2>
      <p className="text-gray-500 mb-6 max-w-sm">
        An unexpected error occurred. Please try again, or contact support if the problem persists.
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}

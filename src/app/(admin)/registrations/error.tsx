'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegistrationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Registrations Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Failed to load registrations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            An error occurred while loading the registrations data. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-2">
              Error ID: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={reset}>Try again</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

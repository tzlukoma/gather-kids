'use client';

import { isDemo } from '@/lib/authGuards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthDebugProps {
  user: any;
}

export function AuthDebug({ user }: AuthDebugProps) {
  // Hide in demo mode
  if (isDemo()) {
    return null;
  }

  return (
    <Card className="mt-4 border-dashed">
      <CardHeader>
        <CardTitle className="text-sm font-mono">Auth Debug (QA)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">User Info</h4>
          <div className="font-mono text-xs space-y-1">
            <div><strong>ID:</strong> {user?.id}</div>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Email Confirmed:</strong> {user?.email_confirmed_at ? 'Yes' : 'No'}</div>
            <div><strong>Created:</strong> {user?.created_at}</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Identities</h4>
          <pre className="font-mono text-xs bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(user?.identities || [], null, 2)}
          </pre>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">User Metadata</h4>
          <pre className="font-mono text-xs bg-muted p-2 rounded overflow-x-auto">
            {JSON.stringify(user?.user_metadata || {}, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type VersionResponse = {
  app: string;
  gitSha: string;
  gitRef: string;
  deployEnv: string;
  builtAt: string | null;
  supabaseProjectRef: string | null;
  db: {
    latestMigration: string | null;
    appliedCount: number;
  };
};

export function AppVersionBadge() {
  const [version, setVersion] = useState<VersionResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/version', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VersionResponse | null) => {
        if (!cancelled && data) setVersion(data);
      })
      .catch(() => {
        // Badge is informational only
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!version) {
    return (
      <span className="text-xs text-muted-foreground" aria-hidden="true">
        v…
      </span>
    );
  }

  const label = `v${version.app} · ${version.deployEnv}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Application version ${version.app}, environment ${version.deployEnv}`}>
            {label}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm text-xs space-y-1">
          <p>
            <span className="font-medium">App:</span> v{version.app}
          </p>
          <p>
            <span className="font-medium">Git:</span> {version.gitSha} ({version.gitRef})
          </p>
          <p>
            <span className="font-medium">Env:</span> {version.deployEnv}
          </p>
          {version.supabaseProjectRef && (
            <p>
              <span className="font-medium">Supabase:</span>{' '}
              {version.supabaseProjectRef}
            </p>
          )}
          <p>
            <span className="font-medium">DB migration:</span>{' '}
            {version.db.latestMigration ?? 'unknown'} ({version.db.appliedCount}{' '}
            applied)
          </p>
          {version.builtAt && (
            <p>
              <span className="font-medium">Built:</span> {version.builtAt}
            </p>
          )}
          <p className="pt-1">
            <Link href="/help" className="underline underline-offset-2">
              User guide
            </Link>
            {' · '}
            <Link href="/help/releases" className="underline underline-offset-2">
              Release notes
            </Link>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

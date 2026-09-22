'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type VersionResponse = {
  app: string;
  gitSha: string;
  gitShaShort?: string;
  gitRef: string;
  deployEnv: string;
  builtAt: string | null;
  supabaseProjectRef: string | null;
  db: {
    expectedMigration: string | null;
    appliedMigration: string | null;
    appliedCount: number | null;
    inSync: boolean;
  };
};

function schemaStatusLabel(db: VersionResponse['db']): string {
  if (db.inSync) return 'in sync with this build';
  if (db.appliedMigration === null) return 'status unavailable';
  if (db.expectedMigration === null) return 'expected version unknown';
  try {
    if (BigInt(db.appliedMigration) < BigInt(db.expectedMigration)) {
      return 'behind this build — run the DB deploy workflow';
    }
    return 'ahead of this build';
  } catch {
    return 'does not match this build';
  }
}

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
  const appliedCountLabel =
    version.db.appliedCount === null ? 'unknown' : String(version.db.appliedCount);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Application version ${version.app}, environment ${version.deployEnv}`}>
            {label}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm text-xs space-y-1">
          <p>
            <span className="font-medium">App:</span> v{version.app}
          </p>
          <p>
            <span className="font-medium">Git:</span> {version.gitShaShort || version.gitSha} ({version.gitRef})
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
            <span className="font-medium">DB expected:</span>{' '}
            {version.db.expectedMigration ?? 'unknown'}
          </p>
          <p>
            <span className="font-medium">DB applied:</span>{' '}
            {version.db.appliedMigration ?? 'unknown'} ({appliedCountLabel}{' '}
            applied)
          </p>
          <p>
            <span className="font-medium">Schema:</span> {schemaStatusLabel(version.db)}
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

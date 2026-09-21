import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildInfo, parseSupabaseProjectRef } from '@/lib/build-info';
import { migrationsAreInSync } from '@/lib/schema-migration-version';

export type DbVersionInfo = {
  expectedMigration: string | null;
  appliedMigration: string | null;
  appliedCount: number | null;
  inSync: boolean;
};

type StatusRow = {
  applied_migration?: string | null;
  applied_count?: number | null;
};

function unavailableStatus(expectedMigration: string | null): DbVersionInfo {
  return {
    expectedMigration,
    appliedMigration: null,
    appliedCount: null,
    inSync: false,
  };
}

function hasUsableServiceRole(
  supabaseUrl: string | undefined,
  serviceKey: string | undefined
): boolean {
  if (!supabaseUrl || !serviceKey) return false;
  if (supabaseUrl.includes('dummy.supabase.co')) return false;
  if (serviceKey === 'dummy-service-role-key') return false;
  return true;
}

export function dbStatusFromRpcRow(
  expectedMigration: string | null,
  row: StatusRow | null | undefined
): DbVersionInfo {
  const appliedMigration = row?.applied_migration ?? null;
  const appliedCount =
    typeof row?.applied_count === 'number' ? row.applied_count : null;

  return {
    expectedMigration,
    appliedMigration,
    appliedCount,
    inSync: migrationsAreInSync(expectedMigration, appliedMigration),
  };
}

export async function fetchDbVersionInfo(): Promise<DbVersionInfo> {
  const expectedMigration = buildInfo.expectedMigration;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!hasUsableServiceRole(supabaseUrl, serviceKey) || !supabaseUrl || !serviceKey) {
    return unavailableStatus(expectedMigration);
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc('fn_schema_migration_status');

    if (error) {
      return unavailableStatus(expectedMigration);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return unavailableStatus(expectedMigration);
    }

    return dbStatusFromRpcRow(expectedMigration, row);
  } catch {
    return unavailableStatus(expectedMigration);
  }
}

export async function GET() {
  const db = await fetchDbVersionInfo();

  return NextResponse.json(
    {
      app: buildInfo.appVersion,
      gitSha: buildInfo.gitSha,
      gitRef: buildInfo.gitRef,
      deployEnv: buildInfo.deployEnv,
      builtAt: buildInfo.builtAt || null,
      supabaseProjectRef: parseSupabaseProjectRef(
        process.env.NEXT_PUBLIC_SUPABASE_URL
      ),
      db,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

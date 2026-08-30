import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildInfo, parseSupabaseProjectRef } from '@/lib/build-info';

type DbVersionInfo = {
  latestMigration: string | null;
  appliedCount: number;
};

async function fetchDbVersionInfo(): Promise<DbVersionInfo> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { latestMigration: null, appliedCount: 0 };
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: latestRows, error: latestError } = await supabase
      .from('schema_migration_ledger')
      .select('filename')
      .order('applied_at', { ascending: false })
      .limit(1);

    if (latestError) {
      return { latestMigration: null, appliedCount: 0 };
    }

    const { count, error: countError } = await supabase
      .from('schema_migration_ledger')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return {
        latestMigration: latestRows?.[0]?.filename ?? null,
        appliedCount: 0,
      };
    }

    return {
      latestMigration: latestRows?.[0]?.filename ?? null,
      appliedCount: count ?? 0,
    };
  } catch {
    return { latestMigration: null, appliedCount: 0 };
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

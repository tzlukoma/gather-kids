/**
 * @jest-environment node
 */

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/build-info', () => ({
  buildInfo: {
    appVersion: '1.18.0',
    gitSha: 'abc1234',
    gitRef: 'main',
    deployEnv: 'test',
    builtAt: '2026-09-21T00:00:00.000Z',
    expectedMigration: '20260921200000',
  },
  parseSupabaseProjectRef: (url?: string) => {
    if (!url) return null;
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match?.[1] ?? null;
  },
}));

import { createClient } from '@supabase/supabase-js';
import { GET, dbStatusFromRpcRow } from '@/app/api/version/route';

const mockCreateClient = createClient as jest.Mock;
const mockRpc = jest.fn();

describe('GET /api/version database status', () => {
  const originalEnv = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  beforeEach(() => {
    mockRpc.mockReset();
    mockCreateClient.mockReset();
    mockCreateClient.mockReturnValue({ rpc: mockRpc });
  });

  afterEach(() => {
    if (originalEnv.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.url;
    if (originalEnv.key === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.key;
  });

  it('maps an RPC row onto expected/applied/inSync without leaking SQL', () => {
    expect(
      dbStatusFromRpcRow('20260921200000', {
        applied_migration: '20260921200000',
        applied_count: 72,
      })
    ).toEqual({
      expectedMigration: '20260921200000',
      appliedMigration: '20260921200000',
      appliedCount: 72,
      inSync: true,
    });
  });

  it('reports inSync false when the remote version is older', () => {
    expect(
      dbStatusFromRpcRow('20260921200000', {
        applied_migration: '20260920190000',
        applied_count: 71,
      }).inSync
    ).toBe(false);
  });

  it('reports inSync false when the remote version is newer', () => {
    expect(
      dbStatusFromRpcRow('20260920190000', {
        applied_migration: '20260921200000',
        applied_count: 72,
      }).inSync
    ).toBe(false);
  });

  it('reports inSync false when the RPC row is missing', () => {
    expect(dbStatusFromRpcRow('20260921200000', null).inSync).toBe(false);
    expect(dbStatusFromRpcRow('20260921200000', null).appliedMigration).toBeNull();
    expect(dbStatusFromRpcRow('20260921200000', null).appliedCount).toBeNull();
  });

  it('returns inSync true when the service-role RPC matches the stamped version', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcd1234.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-service-role';
    mockRpc.mockResolvedValue({
      data: [{ applied_migration: '20260921200000', applied_count: 72 }],
      error: null,
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://abcd1234.supabase.co',
      'super-secret-service-role',
      expect.anything()
    );
    expect(mockRpc).toHaveBeenCalledWith('fn_schema_migration_status');
    expect(body.db).toEqual({
      expectedMigration: '20260921200000',
      appliedMigration: '20260921200000',
      appliedCount: 72,
      inSync: true,
    });
    expect(JSON.stringify(body)).not.toContain('super-secret-service-role');
    expect(body.db).not.toHaveProperty('statements');
    expect(body.db).not.toHaveProperty('latestMigration');
  });

  it('returns inSync false when the status RPC fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://abcd1234.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'super-secret-service-role';
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'function does not exist' },
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.db).toEqual({
      expectedMigration: '20260921200000',
      appliedMigration: null,
      appliedCount: null,
      inSync: false,
    });
  });

  it('does not call supabase when the service-role key is a dummy CI value', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key';

    const res = await GET();
    const body = await res.json();

    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(body.db.inSync).toBe(false);
    expect(body.db.appliedMigration).toBeNull();
  });
});

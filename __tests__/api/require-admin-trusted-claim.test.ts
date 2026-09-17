/**
 * @jest-environment node
 */

const mockGetUser = jest.fn();

jest.mock('next/headers', () => ({
	cookies: jest.fn(async () => ({ getAll: () => [] })),
}));

jest.mock('@supabase/ssr', () => ({
	createServerClient: jest.fn(() => ({ auth: { getUser: mockGetUser } })),
}));

import { requireAdmin } from '@/lib/api-auth';

const session = (user: unknown) => ({ data: { user }, error: null });

/**
 * `requireAdmin` guards the routes that write `app_metadata.role`, the claim
 * authorization trusts. If it accepted the self-asserted `user_metadata.role`,
 * a signed-in user could:
 *
 *   1. `auth.updateUser({ data: { role: 'ADMIN' } })` from the browser
 *   2. pass this guard
 *   3. PATCH their own account with `role: 'ADMIN'`
 *   4. have the server mint a durable `app_metadata.role = 'ADMIN'` for them
 *
 * Step 4 is why these tests matter more than the plain privilege check: a
 * laundered claim is written by the service role, so it survives this fix and
 * is indistinguishable from a legitimate grant.
 *
 * The suite is written against the real `requireAdmin`, not a mock of it — the
 * other `__tests__/api/users-*` suites mock the helper, so none of them would
 * catch a regression here.
 */
describe('requireAdmin trusts only the service-role-owned claim', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
	});

	it('refuses a self-asserted ADMIN with no trusted claim', async () => {
		mockGetUser.mockResolvedValue(
			session({ id: 'attacker', app_metadata: {}, user_metadata: { role: 'ADMIN' } })
		);

		const result = await requireAdmin();

		expect(result.authorized).toBe(false);
		expect((result as { response: Response }).response.status).toBe(403);
	});

	it('refuses when user_metadata claims ADMIN over a lower trusted role', async () => {
		mockGetUser.mockResolvedValue(
			session({
				id: 'leader',
				app_metadata: { role: 'MINISTRY_LEADER' },
				user_metadata: { role: 'ADMIN' },
			})
		);

		const result = await requireAdmin();

		expect(result.authorized).toBe(false);
	});

	it('admits an ADMIN whose claim is in app_metadata', async () => {
		mockGetUser.mockResolvedValue(
			session({ id: 'real-admin', app_metadata: { role: 'ADMIN' }, user_metadata: {} })
		);

		const result = await requireAdmin();

		expect(result.authorized).toBe(true);
	});

	it('admits an ADMIN even when user_metadata says something lower', async () => {
		mockGetUser.mockResolvedValue(
			session({
				id: 'real-admin',
				app_metadata: { role: 'ADMIN' },
				user_metadata: { role: 'GUARDIAN' },
			})
		);

		expect((await requireAdmin()).authorized).toBe(true);
	});

	it('refuses a caller with no session', async () => {
		mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

		const result = await requireAdmin();

		expect(result.authorized).toBe(false);
		expect((result as { response: Response }).response.status).toBe(403);
	});

	it('refuses rather than proceeding when the public env is missing', async () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		const result = await requireAdmin();

		expect(result.authorized).toBe(false);
		expect((result as { response: Response }).response.status).toBe(503);
		expect(mockGetUser).not.toHaveBeenCalled();
	});
});

/**
 * @jest-environment node
 */

import { resolveTrustedRole } from '@/lib/api-auth';

/**
 * A signed-in user can rewrite their own `user_metadata` with
 * `supabase.auth.updateUser({ data: … })`. Only the service role can write
 * `app_metadata`. Authorization must therefore read the latter, and must not
 * fall back to the former when it is missing.
 */
describe('resolveTrustedRole', () => {
	it('reads the role from app_metadata', () => {
		expect(resolveTrustedRole({ app_metadata: { role: 'ADMIN' } })).toBe('ADMIN');
	});

	it('ignores a self-asserted ADMIN claim in user_metadata', () => {
		const forged = {
			app_metadata: {},
			user_metadata: { role: 'ADMIN' },
		} as unknown as { app_metadata: Record<string, unknown> };

		expect(resolveTrustedRole(forged)).toBe('GUEST');
	});

	it('does not let user_metadata override a lower trusted role', () => {
		const forged = {
			app_metadata: { role: 'MINISTRY_LEADER' },
			user_metadata: { role: 'ADMIN' },
		} as unknown as { app_metadata: Record<string, unknown> };

		expect(resolveTrustedRole(forged)).toBe('MINISTRY_LEADER');
	});

	it('falls back to GUEST when no trusted role is present', () => {
		expect(resolveTrustedRole({ app_metadata: {} })).toBe('GUEST');
		expect(
			resolveTrustedRole({ app_metadata: { role: '' } })
		).toBe('GUEST');
		expect(
			resolveTrustedRole({ app_metadata: { role: 42 } as never })
		).toBe('GUEST');
	});
})

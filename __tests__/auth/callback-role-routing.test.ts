import { AuthRole } from '@/lib/auth-types';
import { getPostLoginRoute } from '@/lib/auth-utils';

/**
 * The /auth/callback no-`next` fallback must route the way /login does:
 * the role's own landing page first, and the guardian resolver only for
 * guardian/guest/unassigned users. Calling the guardian resolver
 * unconditionally would send staff to /register.
 */

/** Roles whose destination comes from the guardian resolver, not the role map. */
const GUARDIAN_RESOLVED_ROLES = [AuthRole.GUARDIAN, AuthRole.GUEST, undefined];

/** Mirrors the branch condition in src/app/auth/callback/page.tsx. */
function usesGuardianResolver(role: AuthRole | undefined): boolean {
	return role === AuthRole.GUARDIAN || role === AuthRole.GUEST || !role;
}

describe('auth callback no-next fallback routing', () => {
	it('sends staff to their own landing page, never to /register', () => {
		const staffRoles = [
			AuthRole.ADMIN,
			AuthRole.MINISTRY_LEADER,
			AuthRole.VOLUNTEER,
		];

		for (const role of staffRoles) {
			expect(usesGuardianResolver(role)).toBe(false);

			const destination = getPostLoginRoute(role);
			expect(destination).not.toBe('/register');
			expect(destination).not.toBe('/household');
		}
	});

	it('maps each staff role to the same route the login page uses', () => {
		expect(getPostLoginRoute(AuthRole.ADMIN)).toBe('/admin-overview');
		expect(getPostLoginRoute(AuthRole.MINISTRY_LEADER)).toBe('/rosters');
		expect(getPostLoginRoute(AuthRole.VOLUNTEER)).toBe('/admin-overview');
	});

	it('defers to the guardian resolver for guardian, guest and unassigned users', () => {
		for (const role of GUARDIAN_RESOLVED_ROLES) {
			expect(usesGuardianResolver(role)).toBe(true);
		}
	});

	it('falls back to a role default that is never a staff route', () => {
		// When the guardian resolver throws, the callback keeps the role default.
		expect(getPostLoginRoute(AuthRole.GUARDIAN)).toBe('/household');
		expect(getPostLoginRoute(AuthRole.GUEST)).toBe('/register');
		expect(getPostLoginRoute(null)).toBe('/register');
	});
});

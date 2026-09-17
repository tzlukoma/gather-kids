/**
 * @jest-environment node
 */

// Plain ESM helper shared with the backfill script.
import { decideBackfill, parseAllowedAdmins } from '../../scripts/lib/backfill-role-decision.mjs';

const admins = (...emails: string[]) => new Set(emails.map((e) => e.toLowerCase()));

/**
 * The backfill copies `user_metadata.role` into `app_metadata.role`. Its source
 * is precisely the claim the migration exists to stop trusting: any signed-in
 * user can set it on themselves. Copying ADMIN on that authority would launder
 * a self-asserted claim into the trusted store, where it is indistinguishable
 * from a real grant — reintroducing the vulnerability through the fix.
 *
 * So ADMIN requires an explicit allowlist. These tests guard that.
 */
describe('decideBackfill', () => {
	it('refuses a self-asserted ADMIN that is not on the allowlist', () => {
		const attacker = {
			email: 'attacker@example.com',
			app_metadata: {},
			user_metadata: { role: 'ADMIN' },
		};

		expect(decideBackfill(attacker, admins('real@example.com'))).toEqual({
			action: 'refuse-admin',
		});
	});

	it('refuses every ADMIN when no allowlist was supplied', () => {
		const user = { email: 'someone@example.com', app_metadata: {}, user_metadata: { role: 'ADMIN' } };

		expect(decideBackfill(user, new Set()).action).toBe('refuse-admin');
	});

	it('grants ADMIN to an allowlisted account', () => {
		const real = { email: 'real@example.com', app_metadata: {}, user_metadata: { role: 'ADMIN' } };

		expect(decideBackfill(real, admins('real@example.com'))).toEqual({
			action: 'set',
			role: 'ADMIN',
		});
	});

	it('matches the allowlist case-insensitively', () => {
		const real = { email: 'Real@Example.com', app_metadata: {}, user_metadata: { role: 'ADMIN' } };

		expect(decideBackfill(real, admins('real@example.com')).action).toBe('set');
	});

	// An account with no email cannot be matched against the allowlist, so it
	// must not be able to slip through as ADMIN.
	it('refuses an ADMIN claim on an account with no email', () => {
		const anon = { email: null, app_metadata: {}, user_metadata: { role: 'ADMIN' } };

		expect(decideBackfill(anon, admins('real@example.com')).action).toBe('refuse-admin');
	});

	it('copies lower-privilege roles without an allowlist', () => {
		for (const role of ['MINISTRY_LEADER', 'GUARDIAN', 'GUEST']) {
			const user = { email: 'x@example.com', app_metadata: {}, user_metadata: { role } };
			expect(decideBackfill(user, new Set())).toEqual({ action: 'set', role });
		}
	});

	it('never overwrites a trusted claim that is already set', () => {
		const user = {
			email: 'x@example.com',
			app_metadata: { role: 'GUARDIAN' },
			user_metadata: { role: 'ADMIN' },
		};

		expect(decideBackfill(user, admins('x@example.com')).action).toBe('already-set');
	});

	it('skips an account with no role to copy', () => {
		expect(
			decideBackfill({ email: 'x@example.com', app_metadata: {}, user_metadata: {} }, new Set())
				.action
		).toBe('no-role');
	});
});

describe('parseAllowedAdmins', () => {
	it('parses, trims and lowercases a comma-separated list', () => {
		const set = parseAllowedAdmins(['node', 'script', '--admins= A@x.com , B@y.com ']);

		expect([...set].sort()).toEqual(['a@x.com', 'b@y.com']);
	});

	it('is empty when the flag is absent, so no ADMIN is granted by default', () => {
		expect(parseAllowedAdmins(['node', 'script', '--apply']).size).toBe(0);
	});
});

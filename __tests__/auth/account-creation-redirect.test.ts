import {
	POST_ACCOUNT_CREATION_PATH,
	buildAccountCreationRedirectUrl,
} from '@/lib/authRedirect';

/**
 * Regression cover for the email-confirmation-on path.
 *
 * Supabase validates `redirect_to` against the project's redirect allowlist and
 * silently falls back to SITE_URL on a miss. The preview entries are path-only
 * (`https://*.vercel.app/auth/callback`), so a confirmation link carrying a
 * query string stopped matching and every preview signup landed on SITE_URL —
 * a stale UAT domain — rather than the app.
 *
 * These tests pin the shape of the link. Where the family goes *after* sign-in
 * is decided by the role-aware fallback in /auth/callback, covered in
 * callback-role-routing.test.ts.
 */
describe('buildAccountCreationRedirectUrl', () => {
	const origin = 'https://gather-kids-git-some-branch-tzlukomas-projects.vercel.app';

	it('points at the callback on the deploying origin', () => {
		expect(buildAccountCreationRedirectUrl(origin)).toBe(
			`${origin}/auth/callback`
		);
	});

	it('carries no query string, so a path-only allowlist entry still matches', () => {
		const url = new URL(buildAccountCreationRedirectUrl(origin));

		expect(url.search).toBe('');
		expect(url.pathname).toBe('/auth/callback');
		// The exact string a path-only allowlist entry has to match.
		expect(url.toString()).toBe(`${origin}/auth/callback`);
	});

	it('stays on the origin it was given, so previews keep their own host', () => {
		const preview = 'https://gather-kids-abc123-tzlukomas-projects.vercel.app';
		const local = 'http://localhost:9002';

		expect(buildAccountCreationRedirectUrl(preview)).toBe(
			`${preview}/auth/callback`
		);
		expect(buildAccountCreationRedirectUrl(local)).toBe(
			`${local}/auth/callback`
		);
	});

	it('still names /register as where a new family belongs', () => {
		// The destination did not move, only how it is resolved: the callback
		// decides it after sign-in instead of the link declaring it up front.
		expect(POST_ACCOUNT_CREATION_PATH).toBe('/register');
	});
});

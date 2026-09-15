import {
	POST_ACCOUNT_CREATION_PATH,
	buildAccountCreationRedirectUrl,
	resolveSafePostAuthPath,
} from '@/lib/authRedirect';

/**
 * Regression cover for the email-confirmation-on path.
 *
 * /auth/callback falls back to /household everywhere except local development,
 * so an account-creation confirmation link that carries no `next` strands a
 * newly confirmed family on an empty household page instead of the
 * registration form the home page promised them.
 */
describe('buildAccountCreationRedirectUrl', () => {
	const origin = 'https://gatherkids.example.org';

	it('carries /register through the callback when no next is supplied', () => {
		expect(buildAccountCreationRedirectUrl(origin, null)).toBe(
			`${origin}/auth/callback?next=%2Fregister`
		);
	});

	it('defaults to /register for an empty or absent next', () => {
		expect(buildAccountCreationRedirectUrl(origin)).toBe(
			`${origin}/auth/callback?next=%2Fregister`
		);
		expect(buildAccountCreationRedirectUrl(origin, '')).toBe(
			`${origin}/auth/callback?next=%2Fregister`
		);
	});

	it('preserves an explicit same-origin destination', () => {
		expect(buildAccountCreationRedirectUrl(origin, '/household')).toBe(
			`${origin}/auth/callback?next=%2Fhousehold`
		);
		expect(
			buildAccountCreationRedirectUrl(origin, '/register?ministry=choir')
		).toBe(`${origin}/auth/callback?next=%2Fregister%3Fministry%3Dchoir`);
	});

	it('refuses to forward an off-origin destination', () => {
		for (const hostile of [
			'https://evil.com',
			'//evil.com',
			'/\\evil.com',
			'/\t/evil.com',
		]) {
			expect(buildAccountCreationRedirectUrl(origin, hostile)).toBe(
				`${origin}/auth/callback?next=%2Fregister`
			);
		}
	});

	it('round-trips through the callback back to /register', () => {
		const url = new URL(buildAccountCreationRedirectUrl(origin, null));

		// What /auth/callback does with the link, including its production
		// fallback — the point is that the fallback is never reached.
		expect(resolveSafePostAuthPath(url.searchParams.get('next'), '/household')).toBe(
			POST_ACCOUNT_CREATION_PATH
		);
	});

	it('lands on /household only when the link asks for it', () => {
		const url = new URL(buildAccountCreationRedirectUrl(origin, '/household'));

		expect(resolveSafePostAuthPath(url.searchParams.get('next'), '/register')).toBe(
			'/household'
		);
	});
});

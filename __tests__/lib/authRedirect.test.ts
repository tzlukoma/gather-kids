import {
	getAuthRedirectTo,
	resolveSafePostAuthPath,
} from '@/lib/authRedirect';

describe('resolveSafePostAuthPath', () => {
	it('returns fallback for missing or unsafe values', () => {
		expect(resolveSafePostAuthPath(null, '/household')).toBe('/household');
		expect(resolveSafePostAuthPath('', '/household')).toBe('/household');
		expect(resolveSafePostAuthPath('//evil.com', '/household')).toBe('/household');
		expect(resolveSafePostAuthPath('https://evil.com', '/household')).toBe(
			'/household'
		);
	});

	it('accepts same-origin relative paths', () => {
		expect(resolveSafePostAuthPath('/register', '/household')).toBe('/register');
		expect(resolveSafePostAuthPath('/household', '/register')).toBe('/household');
	});
});

describe('getAuthRedirectTo', () => {
	const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
	const originalVercelUrl = process.env.VERCEL_URL;

	beforeEach(() => {
		delete process.env.VERCEL_URL;
		process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:9002';
	});

	afterEach(() => {
		if (originalSiteUrl === undefined) {
			delete process.env.NEXT_PUBLIC_SITE_URL;
		} else {
			process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
		}
		if (originalVercelUrl === undefined) {
			delete process.env.VERCEL_URL;
		} else {
			process.env.VERCEL_URL = originalVercelUrl;
		}
	});

	it('includes encoded next query when provided', () => {
		const redirectTo = getAuthRedirectTo('/register');
		expect(redirectTo).toMatch(/\/auth\/callback\?next=%2Fregister$/);
	});
});

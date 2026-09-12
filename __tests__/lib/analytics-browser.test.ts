import {
	buildAnalyticsDistinctId,
	buildIdentifyProperties,
	getAnalyticsDeployEnv,
	sanitizeAnalyticsProperties,
	shouldInitBrowserPostHog,
} from '@/lib/analytics/browser';
import { AuthRole } from '@/lib/auth-types';

jest.mock('posthog-js', () => ({
	__esModule: true,
	default: {
		init: jest.fn(),
		identify: jest.fn(),
		reset: jest.fn(),
		capture: jest.fn(),
	},
}));

describe('analytics browser helpers', () => {
	const originalEnv = {
		deployEnv: process.env.NEXT_PUBLIC_DEPLOY_ENV,
		vercelEnv: process.env.VERCEL_ENV,
		token: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
		host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
	};

	afterEach(() => {
		if (originalEnv.deployEnv === undefined) {
			delete process.env.NEXT_PUBLIC_DEPLOY_ENV;
		} else {
			process.env.NEXT_PUBLIC_DEPLOY_ENV = originalEnv.deployEnv;
		}
		if (originalEnv.vercelEnv === undefined) {
			delete process.env.VERCEL_ENV;
		} else {
			process.env.VERCEL_ENV = originalEnv.vercelEnv;
		}
		if (originalEnv.token === undefined) {
			delete process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
		} else {
			process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN = originalEnv.token;
		}
		if (originalEnv.host === undefined) {
			delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
		} else {
			process.env.NEXT_PUBLIC_POSTHOG_HOST = originalEnv.host;
		}
	});

	it('prefers NEXT_PUBLIC_DEPLOY_ENV over VERCEL_ENV', () => {
		expect(
			getAnalyticsDeployEnv({
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
				VERCEL_ENV: 'preview',
			})
		).toBe('uat');
	});

	it('namespaces distinct ids by deploy env', () => {
		process.env.NEXT_PUBLIC_DEPLOY_ENV = 'production';
		expect(buildAnalyticsDistinctId('user-1')).toBe('production:user-1');
	});

	it('does not init in local development even with keys present', () => {
		expect(
			shouldInitBrowserPostHog({
				NODE_ENV: 'development',
				NEXT_PUBLIC_DEPLOY_ENV: 'development',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
				NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
			})
		).toBe(false);
	});

	it('does not init in development even when deploy env is uat', () => {
		expect(
			shouldInitBrowserPostHog({
				NODE_ENV: 'development',
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
				NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
			})
		).toBe(false);
	});

	it('does not init on localhost even with a production-like env', () => {
		expect(
			shouldInitBrowserPostHog(
				{
					NODE_ENV: 'production',
					NEXT_PUBLIC_DEPLOY_ENV: 'uat',
					NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
					NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
				},
				'localhost'
			)
		).toBe(false);
	});

	it('does not init in CI', () => {
		expect(
			shouldInitBrowserPostHog({
				NODE_ENV: 'production',
				CI: 'true',
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
				NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
			})
		).toBe(false);
	});

	it('inits on UAT when keys are present', () => {
		expect(
			shouldInitBrowserPostHog({
				NODE_ENV: 'production',
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
				NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
			})
		).toBe(true);
	});

	it('reads NEXT_PUBLIC deploy env from process.env when no override is passed', () => {
		process.env.NEXT_PUBLIC_DEPLOY_ENV = 'uat';
		expect(getAnalyticsDeployEnv()).toBe('uat');
	});

	it('identify properties are role and deploy_env only', () => {
		process.env.NEXT_PUBLIC_DEPLOY_ENV = 'uat';
		expect(buildIdentifyProperties(AuthRole.ADMIN)).toEqual({
			role: 'ADMIN',
			deploy_env: 'uat',
		});
	});

	it('strips email and name from event properties', () => {
		expect(
			sanitizeAnalyticsProperties({
				email: 'guardian@example.com',
				name: 'Jane Doe',
				child_count: 2,
				returning_household: true,
			})
		).toEqual({
			child_count: 2,
			returning_household: true,
		});
	});
});

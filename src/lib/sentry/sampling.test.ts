import {
	SENTRY_ENABLE_LOGS,
	SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
	SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
	SENTRY_REPLAY_MASKING,
	SENTRY_TRACES_SAMPLE_RATE_DEV,
	SENTRY_TRACES_SAMPLE_RATE_PRODUCTION,
	SENTRY_TRACES_SAMPLE_RATE_UAT,
	getClientReplaySampleRates,
	getSharedSentryRuntimeOptions,
	getTracesSampleRate,
	isUatDeploy,
} from './sampling';

describe('Sentry sampling policy', () => {
	it('does not use tracesSampleRate 1 in production', () => {
		expect(
			getTracesSampleRate({
				env: { NODE_ENV: 'production', NEXT_PUBLIC_DEPLOY_ENV: 'production' },
			})
		).toBe(SENTRY_TRACES_SAMPLE_RATE_PRODUCTION);
		expect(SENTRY_TRACES_SAMPLE_RATE_PRODUCTION).toBe(0.05);
		expect(SENTRY_TRACES_SAMPLE_RATE_PRODUCTION).toBeLessThan(1);
	});

	it('uses 0.2 when NEXT_PUBLIC_DEPLOY_ENV or environment is uat', () => {
		expect(
			getTracesSampleRate({
				env: { NODE_ENV: 'production', NEXT_PUBLIC_DEPLOY_ENV: 'uat' },
			})
		).toBe(SENTRY_TRACES_SAMPLE_RATE_UAT);
		expect(getTracesSampleRate({ environment: 'uat' })).toBe(SENTRY_TRACES_SAMPLE_RATE_UAT);
		expect(SENTRY_TRACES_SAMPLE_RATE_UAT).toBe(0.2);
		expect(isUatDeploy({ env: { NEXT_PUBLIC_DEPLOY_ENV: 'uat' } })).toBe(true);
	});

	it('allows a higher local/dev rate if Sentry is initialized there', () => {
		expect(
			getTracesSampleRate({
				env: { NODE_ENV: 'development' },
			})
		).toBe(SENTRY_TRACES_SAMPLE_RATE_DEV);
	});

	it('shares Replay policy and enableLogs via helpers', () => {
		expect(getClientReplaySampleRates()).toEqual({
			replaysSessionSampleRate: 0,
			replaysOnErrorSampleRate: 1.0,
		});
		expect(SENTRY_REPLAYS_SESSION_SAMPLE_RATE).toBe(0);
		expect(SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE).toBe(1.0);
		expect(SENTRY_ENABLE_LOGS).toBe(false);
		expect(getSharedSentryRuntimeOptions({ env: { NODE_ENV: 'production' } })).toEqual({
			tracesSampleRate: 0.05,
			enableLogs: false,
		});
		expect(SENTRY_REPLAY_MASKING).toEqual({
			maskAllText: true,
			maskAllInputs: true,
			blockAllMedia: true,
		});
	});
});

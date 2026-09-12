jest.mock('server-only', () => ({}));

jest.mock('posthog-node', () => ({
	__esModule: true,
	PostHog: jest.fn().mockImplementation(() => ({
		evaluateFlags: jest.fn(),
	})),
}));

import {
	buildFlagDistinctId,
	buildFlagPersonProperties,
	getFlagsDeployEnv,
	shouldUseRemoteFlags,
} from '@/lib/flags/env';
import { createFlagEvaluator } from '@/lib/flags';
import { createPostHogFlagAdapter } from '@/lib/flags/posthog-adapter';

describe('flags façade', () => {
	it('prefers NEXT_PUBLIC_DEPLOY_ENV over VERCEL_ENV', () => {
		expect(
			getFlagsDeployEnv({
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
				VERCEL_ENV: 'preview',
			})
		).toBe('uat');
	});

	it('does not use remote flags in development even when deploy env is uat', () => {
		expect(
			shouldUseRemoteFlags({
				NODE_ENV: 'development',
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
				NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
			})
		).toBe(false);
	});

	it('does not use remote flags in test', () => {
		expect(
			shouldUseRemoteFlags({
				NODE_ENV: 'test',
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
				NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
			})
		).toBe(false);
	});

	it('uses remote flags on UAT production builds when keys are present', () => {
		expect(
			shouldUseRemoteFlags({
				NODE_ENV: 'production',
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
				NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_test',
				NEXT_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com',
			})
		).toBe(true);
	});

	it('namespaces distinct ids and drops email-shaped ids', () => {
		expect(buildFlagDistinctId('user-1', { NEXT_PUBLIC_DEPLOY_ENV: 'uat' })).toBe(
			'uat:user-1'
		);
		expect(
			buildFlagDistinctId('guardian@example.com', {
				NEXT_PUBLIC_DEPLOY_ENV: 'uat',
			})
		).toBe('uat:anonymous');
		expect(
			buildFlagDistinctId(undefined, { NEXT_PUBLIC_DEPLOY_ENV: 'uat' })
		).toBe('uat:anonymous');
	});

	it('person properties are deploy_env and optional role only', () => {
		expect(
			buildFlagPersonProperties('ADMIN', { NEXT_PUBLIC_DEPLOY_ENV: 'uat' })
		).toEqual({
			deploy_env: 'uat',
			role: 'ADMIN',
		});
		expect(
			buildFlagPersonProperties(null, { NEXT_PUBLIC_DEPLOY_ENV: 'production' })
		).toEqual({
			deploy_env: 'production',
		});
	});

	it('local adapter returns caller defaults', async () => {
		const flags = createFlagEvaluator({
			getBoolean: async (_key, defaultValue) => defaultValue,
			getVariant: async (_key, defaultValue) => defaultValue,
		});

		await expect(flags.getBoolean('gathersystem_door', false)).resolves.toBe(
			false
		);
		await expect(
			flags.getVariant('gathersystem_door', 'control')
		).resolves.toBe('control');
	});

	it('PostHog adapter maps snapshot values and fails closed on errors', async () => {
		const evaluateFlags = jest.fn();
		const adapter = createPostHogFlagAdapter({ evaluateFlags });

		evaluateFlags.mockResolvedValueOnce({
			isEnabled: () => true,
			getFlag: () => 'treatment',
		});
		await expect(
			adapter.getBoolean('gathersystem_door', false, { userId: 'user-1' })
		).resolves.toBe(true);

		evaluateFlags.mockResolvedValueOnce({
			isEnabled: (_key: string, options?: { defaultValue?: boolean }) =>
				options?.defaultValue ?? false,
			getFlag: () => 'treatment',
		});
		await expect(
			adapter.getVariant('gathersystem_door', 'control', { userId: 'user-1' })
		).resolves.toBe('treatment');

		evaluateFlags.mockRejectedValueOnce(new Error('network'));
		await expect(
			adapter.getBoolean('gathersystem_door', false, { userId: 'user-1' })
		).resolves.toBe(false);

		const call = evaluateFlags.mock.calls[0];
		expect(call[0]).toMatch(/:user-1$/);
		expect(call[1].personProperties).not.toHaveProperty('email');
		expect(call[1].personProperties).not.toHaveProperty('name');
		expect(call[1].personProperties).toHaveProperty('deploy_env');
	});
});

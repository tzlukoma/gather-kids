import {
	LOCAL_FLAG_OVERRIDES_ENV_VAR,
	areLocalFlagOverridesAllowed,
	getLocalFlagOverrides,
	isLocalFlagOverrideEnabled,
	parseLocalFlagOverrides,
} from '@/lib/flags/local-flag-overrides';
import { GATHERSYSTEM_FLAG_KEYS, shouldUseRemoteFlags } from '@/lib/flags/env';

/**
 * Every "refuses" case below requests **every** GatherSystem key, so a guard
 * that had been dropped or weakened would return `true` and fail the test
 * rather than passing because nothing was requested.
 *
 * Derived from `GATHERSYSTEM_FLAG_KEYS` rather than listed here, so a key added
 * later is covered without anyone remembering to come back — which is what
 * happened when `gathersystem_auth` was added in #379.
 */
const ALL_KEYS = GATHERSYSTEM_FLAG_KEYS.join(',');

/** A permissive local environment, as a starting point for each case. */
const local = (extra: Record<string, string | undefined> = {}) => ({
	NODE_ENV: 'development',
	[LOCAL_FLAG_OVERRIDES_ENV_VAR]: ALL_KEYS,
	...extra,
});

describe('areLocalFlagOverridesAllowed', () => {
	it('allows development and test', () => {
		expect(areLocalFlagOverridesAllowed(local())).toBe(true);
		expect(areLocalFlagOverridesAllowed(local({ NODE_ENV: 'test' }))).toBe(true);
	});

	it('refuses NODE_ENV=production', () => {
		expect(areLocalFlagOverridesAllowed(local({ NODE_ENV: 'production' }))).toBe(
			false
		);
	});

	// Regression for the review finding on #445. NODE_ENV is an allowlist rather
	// than "not production" because `uat` slipped through the denylist: it is not
	// production, so the guard passed, and it is neither test nor development, so
	// shouldUseRemoteFlags fell through to the deploy env — which resolves to
	// `development` when unset and selects the LOCAL adapter. Permitted override
	// plus local adapter meant a gate could be forced on in a UAT runtime.
	it('refuses NODE_ENV=uat even with no deploy env set', () => {
		const env = {
			NODE_ENV: 'uat',
			[LOCAL_FLAG_OVERRIDES_ENV_VAR]: ALL_KEYS,
		};

		// The precondition that made this exploitable: the local adapter is chosen.
		expect(shouldUseRemoteFlags(env)).toBe(false);

		expect(areLocalFlagOverridesAllowed(env)).toBe(false);
		expect(getLocalFlagOverrides(env).size).toBe(0);
	});

	it('refuses NODE_ENV=uat with a preview deploy env', () => {
		const env = {
			NODE_ENV: 'uat',
			NEXT_PUBLIC_DEPLOY_ENV: 'preview',
			[LOCAL_FLAG_OVERRIDES_ENV_VAR]: ALL_KEYS,
		};
		expect(shouldUseRemoteFlags(env)).toBe(false);
		expect(areLocalFlagOverridesAllowed(env)).toBe(false);
		expect(getLocalFlagOverrides(env).size).toBe(0);
	});

	// The general property the allowlist buys: anything not positively recognised
	// as a dev machine or a test process is refused, including values nobody has
	// thought of yet.
	it.each([
		'uat',
		'staging',
		'preview',
		'qa',
		'Production',
		'PRODUCTION',
		'',
		'  ',
	])('refuses unrecognised NODE_ENV %p', (nodeEnv) => {
		expect(areLocalFlagOverridesAllowed(local({ NODE_ENV: nodeEnv }))).toBe(
			false
		);
	});

	it('refuses a missing NODE_ENV', () => {
		expect(
			areLocalFlagOverridesAllowed({
				[LOCAL_FLAG_OVERRIDES_ENV_VAR]: ALL_KEYS,
			})
		).toBe(false);
	});

	// The two signals are independent: a production deployment can be built with
	// a non-production NODE_ENV, so the deploy env has to be checked separately.
	it.each(['production', 'uat'])(
		'refuses NEXT_PUBLIC_DEPLOY_ENV=%s even when NODE_ENV is development',
		(deployEnv) => {
			expect(
				areLocalFlagOverridesAllowed(
					local({ NEXT_PUBLIC_DEPLOY_ENV: deployEnv })
				)
			).toBe(false);
		}
	);

	it.each(['production', 'uat'])('refuses VERCEL_ENV=%s', (deployEnv) => {
		expect(
			areLocalFlagOverridesAllowed(local({ VERCEL_ENV: deployEnv }))
		).toBe(false);
	});

	it('refuses a forbidden deploy env regardless of casing or padding', () => {
		expect(
			areLocalFlagOverridesAllowed(
				local({ NEXT_PUBLIC_DEPLOY_ENV: '  PRODUCTION  ' })
			)
		).toBe(false);
		expect(
			areLocalFlagOverridesAllowed(local({ NEXT_PUBLIC_DEPLOY_ENV: 'UAT' }))
		).toBe(false);
	});

	it('allows a preview deploy env', () => {
		expect(
			areLocalFlagOverridesAllowed(local({ NEXT_PUBLIC_DEPLOY_ENV: 'preview' }))
		).toBe(true);
	});
});

describe('production can never force a flag on', () => {
	// The acceptance criterion this issue exists for. If someone reintroduces an
	// inference like "we are on the local adapter, therefore we are local", this
	// is what catches it.
	it.each([
		['NODE_ENV=production', { NODE_ENV: 'production' }],
		['deploy env production', { NEXT_PUBLIC_DEPLOY_ENV: 'production' }],
		['deploy env uat', { NEXT_PUBLIC_DEPLOY_ENV: 'uat' }],
		['VERCEL_ENV production', { VERCEL_ENV: 'production' }],
		[
			'production both ways',
			{ NODE_ENV: 'production', NEXT_PUBLIC_DEPLOY_ENV: 'production' },
		],
		['NODE_ENV=uat, deploy env unset', { NODE_ENV: 'uat' }],
		['NODE_ENV=staging, deploy env unset', { NODE_ENV: 'staging' }],
	])('%s yields no overrides at all', (_label, extra) => {
		const env = local(extra as Record<string, string>);
		expect(getLocalFlagOverrides(env).size).toBe(0);
		for (const key of GATHERSYSTEM_FLAG_KEYS) {
			expect(isLocalFlagOverrideEnabled(key, env)).toBe(false);
		}
	});
});

describe('parseLocalFlagOverrides', () => {
	it('is empty for undefined or blank input', () => {
		expect(parseLocalFlagOverrides(undefined).size).toBe(0);
		expect(parseLocalFlagOverrides('').size).toBe(0);
		expect(parseLocalFlagOverrides('   ').size).toBe(0);
		expect(parseLocalFlagOverrides(',,').size).toBe(0);
	});

	it('accepts one key', () => {
		const keys = parseLocalFlagOverrides('gathersystem_door');
		expect([...keys]).toEqual(['gathersystem_door']);
	});

	it('accepts several keys and tolerates whitespace', () => {
		const keys = parseLocalFlagOverrides(
			' gathersystem_door , gathersystem_admin '
		);
		expect([...keys].sort()).toEqual(['gathersystem_admin', 'gathersystem_door']);
	});

	it('accepts every known key', () => {
		expect(parseLocalFlagOverrides(ALL_KEYS).size).toBe(
			GATHERSYSTEM_FLAG_KEYS.length
		);
	});

	// A typo must not enable a different flag, and must not crash a dev boot.
	it.each([
		'gathersystem_doors',
		'gathersystem-door',
		'GATHERSYSTEM_DOOR',
		'door',
		'*',
		'all',
	])('ignores the unknown key %s', (bogus) => {
		expect(parseLocalFlagOverrides(bogus).size).toBe(0);
	});

	it('keeps valid keys alongside an invalid one', () => {
		const keys = parseLocalFlagOverrides('nope,gathersystem_door');
		expect([...keys]).toEqual(['gathersystem_door']);
	});
});

describe('isLocalFlagOverrideEnabled', () => {
	it('is false for every key when the variable is unset', () => {
		const env = { NODE_ENV: 'development' };
		for (const key of GATHERSYSTEM_FLAG_KEYS) {
			expect(isLocalFlagOverrideEnabled(key, env)).toBe(false);
		}
	});

	it('enables only the listed key', () => {
		const env = local({ [LOCAL_FLAG_OVERRIDES_ENV_VAR]: 'gathersystem_door' });
		expect(isLocalFlagOverrideEnabled('gathersystem_door', env)).toBe(true);
		expect(isLocalFlagOverrideEnabled('gathersystem_admin', env)).toBe(false);
	});

	it('never enables a key outside the GatherSystem set', () => {
		const env = local();
		expect(isLocalFlagOverrideEnabled('some_other_flag', env)).toBe(false);
	});
});

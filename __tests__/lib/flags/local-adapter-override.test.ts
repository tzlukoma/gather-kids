/**
 * Adapter-level counterpart to `local-flag-overrides.test.ts`, which tests the
 * pure functions with an injected environment. This one drives the real
 * `getBoolean` path through `process.env`, so it proves the override is
 * actually wired into the adapter a flag-gated page ends up calling — not just
 * that the helper computes the right answer.
 */
jest.mock('server-only', () => ({}));

const ORIGINAL = process.env.GATHERSYSTEM_LOCAL_FLAGS;

function setOverrides(value: string | undefined) {
	if (value === undefined) {
		delete process.env.GATHERSYSTEM_LOCAL_FLAGS;
	} else {
		process.env.GATHERSYSTEM_LOCAL_FLAGS = value;
	}
}

describe('localAdapter honours GATHERSYSTEM_LOCAL_FLAGS', () => {
	afterEach(() => {
		setOverrides(ORIGINAL);
		jest.resetModules();
	});

	// NODE_ENV is 'test' under jest, so shouldUseRemoteFlags() is false and the
	// local adapter is the one in play — the same adapter a dev server uses.
	it('defaults every GatherSystem flag off when unset', async () => {
		setOverrides(undefined);
		const { getBoolean } = await import('@/lib/flags');
		const { GATHERSYSTEM_FLAG_KEYS } = await import('@/lib/flags/env');

		for (const key of GATHERSYSTEM_FLAG_KEYS) {
			await expect(getBoolean(key, false)).resolves.toBe(false);
		}
	});

	it('returns true for a forced key and false for the others', async () => {
		setOverrides('gathersystem_door');
		const { getBoolean } = await import('@/lib/flags');

		await expect(getBoolean('gathersystem_door', false)).resolves.toBe(true);
		await expect(getBoolean('gathersystem_admin', false)).resolves.toBe(false);
	});

	it('forces several keys at once', async () => {
		setOverrides('gathersystem_door,gathersystem_admin');
		const { getBoolean } = await import('@/lib/flags');

		await expect(getBoolean('gathersystem_door', false)).resolves.toBe(true);
		await expect(getBoolean('gathersystem_admin', false)).resolves.toBe(true);
		await expect(getBoolean('gathersystem_incidents', false)).resolves.toBe(
			false
		);
	});

	it('ignores a misspelled key rather than enabling anything', async () => {
		setOverrides('gathersystem_doors');
		const { getBoolean } = await import('@/lib/flags');

		await expect(getBoolean('gathersystem_door', false)).resolves.toBe(false);
	});

	// The override only ever forces a flag ON. It must not flip a true default
	// to false, or it would become a general flag-setting mechanism.
	it('leaves a true default alone', async () => {
		setOverrides(undefined);
		const { getBoolean } = await import('@/lib/flags');

		await expect(getBoolean('gathersystem_door', true)).resolves.toBe(true);
	});

	it('does not affect non-GatherSystem keys', async () => {
		setOverrides('gathersystem_door');
		const { getBoolean } = await import('@/lib/flags');

		await expect(getBoolean('some_unrelated_flag', false)).resolves.toBe(false);
	});
});

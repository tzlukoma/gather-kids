const mockGetBoolean = jest.fn();
const mockGetFlagEvalContext = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/flags', () => ({
	getBoolean: (...args: unknown[]) => mockGetBoolean(...args),
}));
jest.mock('@/lib/flags/get-flag-eval-context', () => ({
	getFlagEvalContext: () => mockGetFlagEvalContext(),
}));

import { getGatherSystemDoorFlag } from '@/lib/flags/get-gathersystem-door-flag';

/**
 * Regression cover for #432. The door helper used to keep its own copy of the
 * evaluation inline in `src/app/(admin)/check-in/page.tsx` without the
 * no-session guard, so every case here sets the provider to return `true`
 * first: a helper that skipped the guard would return `true` and fail.
 */
describe('getGatherSystemDoorFlag', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetBoolean.mockResolvedValue(true);
	});

	it('returns false when there is no session, even with the flag enabled', async () => {
		mockGetFlagEvalContext.mockResolvedValue({
			userId: undefined,
			role: undefined,
			canEvaluateFlags: true,
		});

		await expect(getGatherSystemDoorFlag()).resolves.toBe(false);
		// Never evaluated, so it cannot land in the shared `<env>:anonymous` bucket.
		expect(mockGetBoolean).not.toHaveBeenCalled();
	});

	it('returns false when flags cannot be evaluated', async () => {
		mockGetFlagEvalContext.mockResolvedValue({
			userId: 'user-1',
			role: 'ADMIN',
			canEvaluateFlags: false,
		});

		await expect(getGatherSystemDoorFlag()).resolves.toBe(false);
		expect(mockGetBoolean).not.toHaveBeenCalled();
	});

	it('returns false when the provider throws', async () => {
		mockGetFlagEvalContext.mockResolvedValue({
			userId: 'user-1',
			role: 'ADMIN',
			canEvaluateFlags: true,
		});
		mockGetBoolean.mockRejectedValue(new Error('provider down'));

		await expect(getGatherSystemDoorFlag()).resolves.toBe(false);
	});

	it('evaluates gathersystem_door with the session identity when there is one', async () => {
		mockGetFlagEvalContext.mockResolvedValue({
			userId: 'user-1',
			role: 'ADMIN',
			canEvaluateFlags: true,
		});

		await expect(getGatherSystemDoorFlag()).resolves.toBe(true);
		expect(mockGetBoolean).toHaveBeenCalledWith('gathersystem_door', false, {
			userId: 'user-1',
			role: 'ADMIN',
		});
	});
});

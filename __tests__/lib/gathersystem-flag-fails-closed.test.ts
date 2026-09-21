const mockGetBoolean = jest.fn();
const mockGetFlagEvalContext = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('@/lib/flags', () => ({
	getBoolean: (...args: unknown[]) => mockGetBoolean(...args),
}));
jest.mock('@/lib/flags/get-flag-eval-context', () => ({
	getFlagEvalContext: () => mockGetFlagEvalContext(),
}));

import { getGatherSystemFlag } from '@/lib/flags/get-gathersystem-flag';

/**
 * Every case here sets the provider to return `true` first, so a helper that
 * skipped its guard would return `true` and fail the test.
 *
 * All three GatherSystem kill switches now delegate here — `gathersystem_door`
 * joined `gathersystem_admin` and `gathersystem_incidents` in #432, which
 * deleted the inline copy that lived in `src/app/(admin)/check-in/page.tsx`
 * without the no-session guard. The door helper keeps its own cover in
 * `__tests__/lib/gathersystem-door-flag.test.ts`.
 *
 * `gathersystem_auth` joined them in #379. It covers `/onboarding` and
 * `/unauthorized`, which both require a session — not `/login` or
 * `/create-account`, whose signed-out audience cannot be bucketed per user and
 * which are held pending a rollout decision on that issue.
 *
 * `gathersystem_registration` is deliberately absent: `/register` serves
 * signed-out visitors and must not adopt the no-session guard.
 */
describe('getGatherSystemFlag fails closed', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGetBoolean.mockResolvedValue(true);
	});

	it.each([
		'gathersystem_door',
		'gathersystem_admin',
		'gathersystem_incidents',
		'gathersystem_auth',
	] as const)('returns false for %s when there is no session', async (key) => {
		mockGetFlagEvalContext.mockResolvedValue({
			userId: undefined,
			role: undefined,
			canEvaluateFlags: true,
		});

		await expect(getGatherSystemFlag(key)).resolves.toBe(false);
		// Never evaluated, so it cannot land in the shared anonymous bucket.
		expect(mockGetBoolean).not.toHaveBeenCalled();
	});

	it('returns false when flags cannot be evaluated', async () => {
		mockGetFlagEvalContext.mockResolvedValue({
			userId: 'user-1',
			role: 'ADMIN',
			canEvaluateFlags: false,
		});

		await expect(getGatherSystemFlag('gathersystem_door')).resolves.toBe(false);
		expect(mockGetBoolean).not.toHaveBeenCalled();
	});

	it('returns false when the provider throws', async () => {
		mockGetFlagEvalContext.mockResolvedValue({
			userId: 'user-1',
			role: 'ADMIN',
			canEvaluateFlags: true,
		});
		mockGetBoolean.mockRejectedValue(new Error('provider down'));

		await expect(getGatherSystemFlag('gathersystem_door')).resolves.toBe(false);
	});

	it('evaluates with the session identity when there is one', async () => {
		mockGetFlagEvalContext.mockResolvedValue({
			userId: 'user-1',
			role: 'ADMIN',
			canEvaluateFlags: true,
		});

		await expect(getGatherSystemFlag('gathersystem_door')).resolves.toBe(true);
		expect(mockGetBoolean).toHaveBeenCalledWith('gathersystem_door', false, {
			userId: 'user-1',
			role: 'ADMIN',
		});
	});
});

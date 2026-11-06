import { getScriptureProgress } from '@/lib/bible-bee-progress';

describe('getScriptureProgress', () => {
	it('reports partial progress toward the requirement', () => {
		expect(getScriptureProgress(2, 4)).toEqual({
			percent: 50,
			countedTowardRequired: 2,
			bonus: 0,
		});
	});

	it('reports exactly 100% when the requirement is met', () => {
		expect(getScriptureProgress(3, 3)).toEqual({
			percent: 100,
			countedTowardRequired: 3,
			bonus: 0,
		});
	});

	it('caps at 100% and counts extra scriptures as bonus', () => {
		expect(getScriptureProgress(4, 3)).toEqual({
			percent: 100,
			countedTowardRequired: 3,
			bonus: 1,
		});
	});

	it('returns 0% with no requirement and treats completions as bonus', () => {
		expect(getScriptureProgress(2, 0)).toEqual({
			percent: 0,
			countedTowardRequired: 0,
			bonus: 2,
		});
		expect(getScriptureProgress(undefined, undefined)).toEqual({
			percent: 0,
			countedTowardRequired: 0,
			bonus: 0,
		});
	});

	it('ignores negative counts', () => {
		expect(getScriptureProgress(-1, 3).percent).toBe(0);
	});
});

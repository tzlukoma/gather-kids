/**
 * Scripture progress toward a division's required count.
 *
 * A child can memorize more scriptures than their division requires. The
 * extra ones are a bonus, not progress past 100%, so the percentage is capped
 * and the overflow is reported separately.
 */
export interface ScriptureProgress {
	/** Percent of the requirement met, 0–100. */
	percent: number;
	/** Completed scriptures that count toward the requirement (≤ required). */
	countedTowardRequired: number;
	/** Completed scriptures beyond the requirement. */
	bonus: number;
}

export function getScriptureProgress(
	completed: number | null | undefined,
	required: number | null | undefined,
): ScriptureProgress {
	const done = Math.max(0, Number(completed) || 0);
	const target = Math.max(0, Number(required) || 0);

	if (target === 0) {
		return { percent: 0, countedTowardRequired: 0, bonus: done };
	}

	return {
		percent: Math.min(100, (done / target) * 100),
		countedTowardRequired: Math.min(done, target),
		bonus: Math.max(0, done - target),
	};
}

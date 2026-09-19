import {
	canonicalizeGradeForStorage,
	gradeCodeToLabel,
	isValidGradeCode,
} from '@/lib/gradeUtils';

/**
 * The grade control's options, and the one place that decides what a stored
 * grade selects.
 *
 * The wizard shipped with the label as the value — `<SelectItem value="5th">`
 * — while storage is canonical, the string `"5"`. Radix matches an option by
 * value, so a returning family's stored `"5"` matched nothing and the control
 * rendered its placeholder. Worse than an empty field: `"5"` is a perfectly
 * non-empty string, so the schema was satisfied and the step advanced. The
 * parent saw "Select grade" on a field the form insisted was fine, and the
 * child was re-registered into whatever they picked instead.
 *
 * Legacy `/register` has always used canonical values with friendly labels.
 * This restores that, so the two forms agree about what is on disk.
 */

export const GRADE_CODES = [
	-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

export type GradeOption = {
	/** Canonical, and what gets stored: "-1", "0", "1" … "12". */
	value: string;
	/** What the family reads: "Pre-K", "Kindergarten", "1st Grade" … */
	label: string;
};

/** Built from `gradeCodeToLabel` so these labels cannot drift from the rest of the app. */
export const GRADE_OPTIONS: readonly GradeOption[] = GRADE_CODES.map((code) => ({
	value: String(code),
	label: gradeCodeToLabel(code),
}));

const GRADE_VALUES = new Set(GRADE_OPTIONS.map((option) => option.value));

/**
 * The option a stored grade should select.
 *
 * Accepts anything the app has ever written to `child.grade` — canonical
 * `"5"`, the wizard's own `"5th"`, legacy free text like `"5th Grade"` or
 * `"Kindergarten"` — and returns the canonical option value.
 *
 * Returns `''` for anything unrecognised rather than a guess. An unmatched
 * grade has to read as unanswered so the family picks one, instead of quietly
 * selecting a neighbouring year for their child.
 */
export function gradeSelectValue(stored: string | null | undefined): string {
	if (stored === null || stored === undefined) return '';
	const canonical = canonicalizeGradeForStorage(String(stored));
	return GRADE_VALUES.has(canonical) ? canonical : '';
}

/** True when a stored grade maps onto a real option. */
export function isSelectableGrade(stored: string | null | undefined): boolean {
	return gradeSelectValue(stored) !== '';
}

/** The label for a stored grade, or null when it maps to no option. */
export function gradeSelectLabel(stored: string | null | undefined): string | null {
	const value = gradeSelectValue(stored);
	if (!value) return null;
	return GRADE_OPTIONS.find((option) => option.value === value)?.label ?? null;
}

/**
 * Canonicalize every child's grade in a set of form values.
 *
 * Applied wherever the wizard resets the form from something it did not write
 * itself — a household load, or a draft saved by the version of the wizard that
 * stored `"5th"`. Without this the control is correct but still shows nothing,
 * because the value it is handed never matched an option in the first place.
 */
export function withCanonicalGrades<
	T extends { children?: Array<{ grade?: string | null }> | null },
>(values: T): T {
	if (!values?.children?.length) return values;
	return {
		...values,
		children: values.children.map((child) => {
			const canonical = gradeSelectValue(child?.grade);
			// An unrecognised grade is left as it was rather than blanked: the
			// summary from #398 will ask for it, and nothing is silently lost.
			if (!canonical) return child;
			return { ...child, grade: canonical };
		}),
	};
}

export { isValidGradeCode };

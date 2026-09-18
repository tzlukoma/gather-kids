import {
	GRADE_CODES,
	GRADE_OPTIONS,
	gradeSelectLabel,
	gradeSelectValue,
	isSelectableGrade,
	withCanonicalGrades,
} from '@/components/gatherKids/registration-wizard/grade-options';
import { canonicalizeGradeForStorage } from '@/lib/gradeUtils';

describe('GRADE_OPTIONS', () => {
	it('covers Pre-K through 12 and nothing else', () => {
		expect(GRADE_OPTIONS).toHaveLength(14);
		expect(GRADE_OPTIONS.map((o) => o.value)).toEqual([
			'-1', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
		]);
	});

	it('shows a label a parent would recognise', () => {
		expect(GRADE_OPTIONS[0]).toEqual({ value: '-1', label: 'Pre-K' });
		expect(GRADE_OPTIONS[1]).toEqual({ value: '0', label: 'Kindergarten' });
		expect(GRADE_OPTIONS[6]).toEqual({ value: '5', label: '5th Grade' });
	});

	it('stores what the rest of the app stores', () => {
		// The regression: the wizard used the label as the value, so what the
		// Select held could never equal what the DAL wrote.
		for (const option of GRADE_OPTIONS) {
			expect(canonicalizeGradeForStorage(option.value)).toBe(option.value);
		}
	});
});

describe('gradeSelectValue — every canonical grade selects its own option', () => {
	// The ticket's first acceptance criterion, as a round trip: what the DAL
	// stored has to come back selected, for all fourteen grades.
	it.each(GRADE_CODES.map((code) => [String(code)]))(
		'canonical %s selects an option',
		(stored) => {
			const value = gradeSelectValue(stored);
			expect(value).toBe(stored);
			expect(GRADE_OPTIONS.some((o) => o.value === value)).toBe(true);
		}
	);

	it.each([
		['Pre-K', '-1'],
		['pre-k', '-1'],
		['Kindergarten', '0'],
		['K', '0'],
		['1st', '1'],
		['3rd', '3'],
		['5th', '5'],
		['12th', '12'],
		['5th Grade', '5'],
		['Grade 5', '5'],
		['  7  ', '7'],
	])('accepts %s, which some version of the app has written', (stored, expected) => {
		expect(gradeSelectValue(stored)).toBe(expected);
	});

	it.each([
		['', ''],
		[null, ''],
		[undefined, ''],
		['13', ''],
		['-2', ''],
		['Freshman', ''],
		['not a grade', ''],
	])('returns %s as unanswered rather than guessing', (stored, expected) => {
		// An unrecognised grade must read as empty. Snapping it to a neighbouring
		// year would silently move a child up or down a class.
		expect(gradeSelectValue(stored as string | null | undefined)).toBe(expected);
	});
});

describe('isSelectableGrade / gradeSelectLabel', () => {
	it('reports whether a stored grade maps to an option', () => {
		expect(isSelectableGrade('5')).toBe(true);
		expect(isSelectableGrade('5th')).toBe(true);
		expect(isSelectableGrade('Freshman')).toBe(false);
	});

	it('labels a stored grade for display', () => {
		expect(gradeSelectLabel('5')).toBe('5th Grade');
		expect(gradeSelectLabel('-1')).toBe('Pre-K');
		expect(gradeSelectLabel('Freshman')).toBeNull();
	});
});

describe('withCanonicalGrades', () => {
	it('rewrites a draft written by the first version of the wizard', () => {
		// The draft on a returning family's phone holds "5th", which matches no
		// option once the control is canonical. Restoring it untouched would show
		// an empty grade on a form that had one.
		const values = {
			children: [{ grade: '5th' }, { grade: 'Pre-K' }],
		};
		expect(withCanonicalGrades(values).children.map((c) => c.grade)).toEqual([
			'5',
			'-1',
		]);
	});

	it('leaves canonical values alone', () => {
		const values = { children: [{ grade: '5' }, { grade: '0' }] };
		expect(withCanonicalGrades(values).children.map((c) => c.grade)).toEqual([
			'5',
			'0',
		]);
	});

	it('preserves an unrecognised grade rather than blanking it', () => {
		// Blanking would destroy the only record of what was there; the step's
		// own validation asks for a real grade instead.
		const values = { children: [{ grade: 'Freshman' }] };
		expect(withCanonicalGrades(values).children[0].grade).toBe('Freshman');
	});

	it('keeps every other field on the child', () => {
		const values = {
			children: [{ first_name: 'Amara', grade: '3rd', allergies: 'None' }],
		};
		expect(withCanonicalGrades(values).children[0]).toEqual({
			first_name: 'Amara',
			grade: '3',
			allergies: 'None',
		});
	});

	it('preserves child order', () => {
		// An explicit acceptance criterion: multi-child ordering must stay stable.
		const values = {
			children: [
				{ first_name: 'A', grade: '1st' },
				{ first_name: 'B', grade: '2nd' },
				{ first_name: 'C', grade: '3rd' },
			],
		};
		expect(
			withCanonicalGrades(values).children.map((c) => c.first_name)
		).toEqual(['A', 'B', 'C']);
	});

	it('handles a form with no children yet', () => {
		expect(withCanonicalGrades({ children: [] })).toEqual({ children: [] });
		expect(withCanonicalGrades({})).toEqual({});
	});
});

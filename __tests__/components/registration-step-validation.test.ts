import type { FieldErrors } from 'react-hook-form';
import {
	describeProblemPath,
	firstInvalidEntryIndex,
	firstInvalidStep,
	firstProblemOnStep,
	flattenFieldErrors,
	stepForPath,
	stepTitle,
	summarizeStepErrors,
} from '@/components/gatherKids/registration-wizard/step-validation';
import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';

type Errors = FieldErrors<RegistrationFormInput>;

/** Shape of one RHF error leaf. */
const leaf = (message: string) => ({ type: 'custom', message, ref: undefined });

describe('stepForPath', () => {
	it.each([
		['household.address_line1', 1],
		['household', 1],
		['guardians.0.first_name', 2],
		['guardians.3.mobile_phone', 2],
		['emergencyContact.relationship', 2],
		['children', 3],
		['children.0.dob', 3],
		['children.2.allergies', 3],
		['consents.liability', 5],
		['consents.group_consents.choirs', 5],
	])('routes %s to step %i', (path, step) => {
		expect(stepForPath(path)).toBe(step);
	});

	it.each([
		'children.0.ministrySelections',
		'children.1.interestSelections',
		'children.0.customData',
		'children.0.customData.q1',
	])('routes %s to step 4, where those answers are collected', (path) => {
		// These live under `children` in the form but are filled in on step 4.
		// Routing by prefix alone would send the user to the wrong screen.
		expect(stepForPath(path)).toBe(4);
	});

	it('sends an unmapped path to step 1 rather than dropping it', () => {
		// Losing an error silently is the failure this module exists to remove,
		// so an unknown path is surfaced somewhere visible instead.
		expect(stepForPath('somethingNew.field')).toBe(1);
	});
});

describe('flattenFieldErrors', () => {
	it('returns nothing for a clean form', () => {
		expect(flattenFieldErrors(undefined)).toEqual([]);
		expect(flattenFieldErrors({})).toEqual([]);
	});

	it('flattens a nested object error to a dotted path', () => {
		const errors = {
			household: { city: leaf('City is required.') },
		} as unknown as Errors;

		expect(flattenFieldErrors(errors)).toEqual([
			{ path: 'household.city', message: 'City is required.' },
		]);
	});

	it('reports every entry in an array, not just the first', () => {
		// The regression that produced this ticket: guardian 1 could carry an
		// empty required field all the way to submit because nothing looked
		// past index 0.
		const errors = {
			guardians: [
				undefined,
				{ mobile_phone: leaf('A valid phone number is required.') },
			],
		} as unknown as Errors;

		expect(flattenFieldErrors(errors)).toEqual([
			{
				path: 'guardians.1.mobile_phone',
				message: 'A valid phone number is required.',
			},
		]);
	});

	it('keeps both an array-level error and its entries', () => {
		const errors = {
			children: Object.assign(
				[{ first_name: leaf('First name is required.') }],
				leaf('At least one child is required.')
			),
		} as unknown as Errors;

		const paths = flattenFieldErrors(errors).map((p) => p.path);
		expect(paths).toContain('children');
		expect(paths).toContain('children.0.first_name');
	});

	it('does not mistake a ref or type for a nested field', () => {
		const errors = {
			household: {
				city: { type: 'too_small', message: 'City is required.', ref: {} },
			},
		} as unknown as Errors;

		expect(flattenFieldErrors(errors)).toHaveLength(1);
	});
});

describe('summarizeStepErrors', () => {
	const errors = {
		consents: { liability: leaf('Liability consent is required.') },
		guardians: [
			undefined,
			{ mobile_phone: leaf('A valid phone number is required.') },
			{ first_name: leaf('First name is required.') },
		],
		household: { zip: leaf('ZIP code is required.') },
	} as unknown as Errors;

	it('orders problems by the step the user reaches first', () => {
		expect(summarizeStepErrors(errors).map((p) => p.step)).toEqual([
			1, 2, 2, 5,
		]);
	});

	it('orders array entries numerically within a step', () => {
		const paths = summarizeStepErrors(errors)
			.filter((p) => p.step === 2)
			.map((p) => p.path);
		expect(paths).toEqual([
			'guardians.1.mobile_phone',
			'guardians.2.first_name',
		]);
	});

	it('sorts index 2 before index 10 rather than as strings', () => {
		const many = {
			guardians: Object.assign([], {
				2: { first_name: leaf('a') },
				10: { first_name: leaf('b') },
			}),
		} as unknown as Errors;

		expect(summarizeStepErrors(many).map((p) => p.path)).toEqual([
			'guardians.2.first_name',
			'guardians.10.first_name',
		]);
	});

	it('carries each message through unchanged', () => {
		expect(summarizeStepErrors(errors)[0]).toEqual({
			path: 'household.zip',
			message: 'ZIP code is required.',
			step: 1,
		});
	});
});

describe('firstInvalidStep', () => {
	it('is null when nothing is wrong', () => {
		expect(firstInvalidStep({})).toBeNull();
		expect(firstInvalidStep(undefined)).toBeNull();
	});

	it('is the earliest step carrying a problem, not the first one emitted', () => {
		// The resolver emits in schema order, which is not step order.
		const errors = {
			consents: { liability: leaf('Liability consent is required.') },
			household: { city: leaf('City is required.') },
		} as unknown as Errors;

		expect(firstInvalidStep(errors)).toBe(1);
	});

	it('routes a ministry answer back to step 4, not step 3', () => {
		const errors = {
			children: [{ customData: { q1: leaf('Answer required.') } }],
		} as unknown as Errors;

		expect(firstInvalidStep(errors)).toBe(4);
	});
});

describe('firstProblemOnStep', () => {
	const errors = {
		guardians: [{ last_name: leaf('Last name is required.') }],
		household: { city: leaf('City is required.') },
	} as unknown as Errors;

	it('finds the problem the step owns', () => {
		expect(firstProblemOnStep(errors, 2)?.path).toBe('guardians.0.last_name');
	});

	it('is undefined for a step with nothing wrong', () => {
		expect(firstProblemOnStep(errors, 5)).toBeUndefined();
	});
});

describe('firstInvalidEntryIndex', () => {
	it('finds the first guardian with a problem', () => {
		const errors = {
			guardians: Object.assign([], {
				2: { mobile_phone: leaf('A valid phone number is required.') },
			}),
		} as unknown as Errors;

		// Step 2 collapses guardian cards, so the step has to know which one to
		// open before anything can be focused.
		expect(firstInvalidEntryIndex(errors, 'guardians')).toBe(2);
	});

	it('finds the first child with a problem', () => {
		const errors = {
			children: Object.assign([], { 1: { grade: leaf('Grade is required.') } }),
		} as unknown as Errors;

		expect(firstInvalidEntryIndex(errors, 'children')).toBe(1);
	});

	it('ignores an array-level error that names no entry', () => {
		const errors = {
			children: leaf('At least one child is required.'),
		} as unknown as Errors;

		expect(firstInvalidEntryIndex(errors, 'children')).toBeUndefined();
	});

	it('is undefined when that array is clean', () => {
		const errors = {
			household: { city: leaf('City is required.') },
		} as unknown as Errors;

		expect(firstInvalidEntryIndex(errors, 'guardians')).toBeUndefined();
	});
});

describe('describeProblemPath', () => {
	it.each([
		['guardians.0.first_name', 'Guardian 1'],
		['guardians.2.email', 'Guardian 3'],
		['children.1.dob', 'Child 2'],
		['emergencyContact.relationship', 'Emergency contact'],
		['household.zip', 'Household'],
		['consents.liability', 'Consents'],
	])('labels %s as %s', (path, label) => {
		// One-based, because "Guardian 0" means nothing to a parent.
		expect(describeProblemPath(path)).toBe(label);
	});
});

describe('stepTitle', () => {
	it('names each step', () => {
		expect(stepTitle(1)).toBe('Confirm your household');
		expect(stepTitle(5)).toBe('Review and submit');
	});

	it('falls back rather than rendering undefined', () => {
		expect(stepTitle(99)).toBe('Step 99');
	});
});

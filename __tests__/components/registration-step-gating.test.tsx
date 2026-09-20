import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	registrationFormBaseSchema,
	validateConditionalConsents,
	defaultConditionalConsentContext,
} from '@/components/gatherKids/registration-wizard/registration-schema';
import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';
import {
	firstInvalidStep,
	summarizeStepErrors,
} from '@/components/gatherKids/registration-wizard/step-validation';

/**
 * The gate, exercised end to end against the real schema.
 *
 * These are the tests the old `canProceed()` could never have passed. It read a
 * hand-picked list of fields with `Boolean(...)`, so `'5'` counted as a phone
 * number and `guardians[1]` was never looked at. Here the wizard's own field
 * lists are handed to `trigger()` with the canonical resolver behind it, so a
 * step passes only when the schema says the step's data is good.
 */

const schema = registrationFormBaseSchema.superRefine((data, ctx) => {
	validateConditionalConsents(data, ctx, defaultConditionalConsentContext);
});

const validGuardian = {
	first_name: 'Ada',
	last_name: 'Okoye',
	mobile_phone: '5551234567',
	email: '',
	relationship: 'Mother',
	is_primary: true,
};

const validChild = {
	first_name: 'Robin',
	last_name: 'Okoye',
	dob: '2015-04-02',
	grade: '5',
	child_mobile: '',
	allergies: 'none',
	medical_notes: '',
	special_needs: false,
	special_needs_notes: '',
	ministrySelections: {},
	interestSelections: {},
	customData: {},
};

const validValues: RegistrationFormInput = {
	household: {
		name: '',
		address_line1: '10 Cathedral Way',
		address_line2: '',
		city: 'Perth Amboy',
		state: 'NJ',
		zip: '08861',
		preferredScriptureTranslation: 'NIV',
	},
	guardians: [validGuardian],
	emergencyContact: {
		first_name: 'Sam',
		last_name: 'Reyes',
		mobile_phone: '5559876543',
		relationship: 'Neighbour',
	},
	children: [validChild],
	consents: {
		liability: true,
		photoRelease: true,
		group_consents: {},
		custom_consents: {},
	},
};

function setup(values: RegistrationFormInput) {
	return renderHook(() => {
		const form = useForm<RegistrationFormInput>({
			resolver: zodResolver(schema),
			defaultValues: values,
		});
		// `formState` is a Proxy that only propagates the keys something read
		// during render. The wizard subscribes because its steps read
		// `form.formState.errors`; this bare harness has to do it explicitly or
		// every assertion below sees an empty error object.
		void form.formState.errors;
		return form;
	});
}

/**
 * The wizard's gate, exactly as `handleNext` runs it: one whole-form
 * `trigger()`, then keep only the problems this step owns. The boolean
 * `trigger()` returns is deliberately unused — it speaks for the whole form, so
 * on step 1 it is false simply because step 5 has not been filled in yet.
 */
async function gate(values: RegistrationFormInput, step: 1 | 2 | 3 | 4 | 5) {
	const { result } = setup(values);
	await act(async () => {
		await result.current.trigger();
	});
	const problems = summarizeStepErrors(result.current.formState.errors).filter(
		(problem) => problem.step === step
	);
	return { ok: problems.length === 0, problems };
}

describe('step 1 — household', () => {
	it('passes with a complete address', async () => {
		expect((await gate(validValues, 1)).ok).toBe(true);
	});

	it('blocks on a missing city and says which field', async () => {
		const { ok, problems } = await gate(
			{ ...validValues, household: { ...validValues.household, city: '' } },
			1
		);
		expect(ok).toBe(false);
		expect(problems).toContainEqual({
			path: 'household.city',
			message: 'City is required.',
			step: 1,
		});
	});

	it('does not block on a problem that belongs to a later step', async () => {
		// Step 1 must not refuse to advance because consents are unticked — the
		// user has not reached them yet.
		const { ok } = await gate(
			{
				...validValues,
				consents: { ...validValues.consents, liability: false },
			},
			1
		);
		expect(ok).toBe(true);
	});
});

describe('step 2 — guardians and emergency contact', () => {
	it('passes with one complete guardian', async () => {
		expect((await gate(validValues, 2)).ok).toBe(true);
	});

	it('blocks on the SECOND guardian, which the old gate never looked at', async () => {
		const { ok, problems } = await gate(
			{
				...validValues,
				guardians: [
					validGuardian,
					{ ...validGuardian, is_primary: false, mobile_phone: '' },
				],
			},
			2
		);
		expect(ok).toBe(false);
		expect(problems.map((p) => p.path)).toContain('guardians.1.mobile_phone');
	});

	it('blocks a phone that is present but too short', async () => {
		// `Boolean('5')` is true; the schema wants ten characters. The old gate
		// let this through and the form died at submit instead.
		const { ok, problems } = await gate(
			{
				...validValues,
				guardians: [{ ...validGuardian, mobile_phone: '5' }],
			},
			2
		);
		expect(ok).toBe(false);
		expect(problems[0].message).toBe('A valid phone number is required.');
	});

	it('accepts a blank optional email', async () => {
		// #460. Blank means "not provided" and must stay valid.
		const { ok } = await gate(
			{ ...validValues, guardians: [{ ...validGuardian, email: '' }] },
			2
		);
		expect(ok).toBe(true);
	});

	it('blocks a malformed optional email with a visible message', async () => {
		const { ok, problems } = await gate(
			{
				...validValues,
				guardians: [{ ...validGuardian, email: 'not-an-address' }],
			},
			2
		);
		expect(ok).toBe(false);
		expect(problems).toContainEqual({
			path: 'guardians.0.email',
			message: 'A valid email is required.',
			step: 2,
		});
	});

	it('blocks on the emergency contact as well as the guardians', async () => {
		const { ok, problems } = await gate(
			{
				...validValues,
				emergencyContact: { ...validValues.emergencyContact, relationship: '' },
			},
			2
		);
		expect(ok).toBe(false);
		expect(problems.map((p) => p.path)).toContain(
			'emergencyContact.relationship'
		);
	});
});

describe('step 3 — children', () => {
	it('passes with one complete child', async () => {
		expect((await gate(validValues, 3)).ok).toBe(true);
	});

	it('blocks when no child has been added', async () => {
		const { ok, problems } = await gate({ ...validValues, children: [] }, 3);
		expect(ok).toBe(false);
		expect(problems[0].message).toBe('At least one child is required.');
	});

	it('blocks on a missing date of birth, which the old gate ignored', async () => {
		const { ok, problems } = await gate(
			{ ...validValues, children: [{ ...validChild, dob: '' }] },
			3
		);
		expect(ok).toBe(false);
		expect(problems.map((p) => p.path)).toContain('children.0.dob');
	});

	it('blocks on a missing grade', async () => {
		const { ok, problems } = await gate(
			{ ...validValues, children: [{ ...validChild, grade: '' }] },
			3
		);
		expect(ok).toBe(false);
		expect(problems.map((p) => p.path)).toContain('children.0.grade');
	});

	it('blocks on the SECOND child, not just the first', async () => {
		const { ok, problems } = await gate(
			{
				...validValues,
				children: [validChild, { ...validChild, first_name: '' }],
			},
			3
		);
		expect(ok).toBe(false);
		expect(problems.map((p) => p.path)).toContain('children.1.first_name');
	});

	it('still blocks on empty allergies, which is all the old gate checked', async () => {
		const { ok, problems } = await gate(
			{ ...validValues, children: [{ ...validChild, allergies: '' }] },
			3
		);
		expect(ok).toBe(false);
		expect(problems.map((p) => p.path)).toContain('children.0.allergies');
	});
});

describe('step 5 — consents', () => {
	it('passes when both consents are given', async () => {
		expect((await gate(validValues, 5)).ok).toBe(true);
	});

	it('blocks on an unticked liability consent', async () => {
		const { ok, problems } = await gate(
			{ ...validValues, consents: { ...validValues.consents, liability: false } },
			5
		);
		expect(ok).toBe(false);
		expect(problems.map((p) => p.path)).toContain('consents.liability');
	});

	it('blocks on a conditional consent added by the superRefine', async () => {
		// The choir rule is added by a refinement, not by a field. Naming
		// `consents` is what lets trigger() surface it on the right step.
		const { ok, problems } = await gate(
			{
				...validValues,
				children: [
					{ ...validChild, ministrySelections: { 'choir-joy': true } },
				],
				consents: { ...validValues.consents, group_consents: {} },
			},
			5
		);
		expect(ok).toBe(false);
		expect(problems.map((p) => p.path)).toContain(
			'consents.group_consents.choirs'
		);
	});
});

describe('cross-step submit routing', () => {
	it('sends the user to the earliest step that has a problem', async () => {
		const { result } = setup({
			...validValues,
			household: { ...validValues.household, zip: '' },
			consents: { ...validValues.consents, liability: false },
		});

		await act(async () => {
			await result.current.trigger();
		});

		// Standing on step 5 with a broken household field is exactly the dead
		// end this ticket removes: the answer is "go to step 1", not "disabled".
		expect(firstInvalidStep(result.current.formState.errors)).toBe(1);
	});

	it('lists every problem, across steps, for the summary', async () => {
		const { result } = setup({
			...validValues,
			guardians: [{ ...validGuardian, last_name: '' }],
			consents: { ...validValues.consents, photoRelease: false },
		});

		await act(async () => {
			await result.current.trigger();
		});

		const problems = summarizeStepErrors(result.current.formState.errors);
		expect(problems.map((p) => p.path)).toEqual([
			'guardians.0.last_name',
			'consents.photoRelease',
		]);
	});

	it('reports nothing for a form that is ready to submit', async () => {
		const { result } = setup(validValues);
		await act(async () => {
			await result.current.trigger();
		});
		expect(summarizeStepErrors(result.current.formState.errors)).toEqual([]);
		expect(firstInvalidStep(result.current.formState.errors)).toBeNull();
	});
});

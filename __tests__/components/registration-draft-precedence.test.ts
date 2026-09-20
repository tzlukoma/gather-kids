/**
 * #392 — deterministic precedence between household prefill and a saved draft.
 *
 * The rule under test: the draft wins for values the guardian typed, the
 * household load wins for identity (`household_id`, existing `child_id`s), so
 * restoring a draft can never turn an update into a duplicate insert.
 */

import {
	isMeaningfulDraft,
	resolveRegistrationDraft,
} from '@/components/gatherKids/registration-wizard/registration-draft-merge';
import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';

function prefill(
	overrides: Partial<RegistrationFormInput> = {}
): RegistrationFormInput {
	return {
		household: {
			household_id: 'hh-1',
			name: 'Wakanda House',
			address_line1: '1 Palace Way',
			address_line2: '',
			city: 'Birnin Zana',
			state: 'NY',
			zip: '10001',
			preferredScriptureTranslation: 'NIV',
		},
		guardians: [
			{
				first_name: 'Ramonda',
				last_name: 'Udaku',
				mobile_phone: '555-0100',
				email: 'ramonda@example.com',
				relationship: 'Mother',
				is_primary: true,
			},
		],
		emergencyContact: {
			first_name: 'Okoye',
			last_name: 'Dora',
			mobile_phone: '555-0101',
			relationship: 'Friend',
		},
		children: [
			{ child_id: 'child-1', first_name: 'Shuri', last_name: 'Udaku', grade: '7' },
			{ child_id: 'child-2', first_name: 'T’Challa', last_name: 'Udaku', grade: '9' },
		],
		consents: {
			liability: true,
			photoRelease: true,
			group_consents: {},
			custom_consents: {},
		},
		...overrides,
	} as RegistrationFormInput;
}

describe('isMeaningfulDraft', () => {
	it('rejects null, undefined and an empty object', () => {
		expect(isMeaningfulDraft(null)).toBe(false);
		expect(isMeaningfulDraft(undefined)).toBe(false);
		expect(isMeaningfulDraft({})).toBe(false);
	});

	it('rejects an autosaved shell with only blank fields', () => {
		expect(
			isMeaningfulDraft({
				household: { name: '', address_line1: '', city: '', state: '', zip: '' },
				guardians: [
					{ first_name: '', last_name: '', mobile_phone: '', relationship: '' },
				],
				children: [],
			} as Partial<RegistrationFormInput>)
		).toBe(false);
	});

	/**
	 * The wizard auto-saves as soon as a child row exists, so anything a
	 * guardian fills in before typing the name is already on disk. Requiring
	 * `first_name` here would classify that payload as "no draft" and discard
	 * it on the next load.
	 */
	describe('a child completed out of order', () => {
		const BLANK_CHILD = {
			child_id: '',
			first_name: '',
			last_name: '',
			dob: '',
			grade: '',
			child_mobile: '',
			allergies: '',
			medical_notes: '',
			special_needs: false,
			special_needs_notes: '',
			ministrySelections: {},
			interestSelections: {},
			customData: {},
		};

		function draftWithChild(overrides: Record<string, unknown>) {
			return {
				children: [{ ...BLANK_CHILD, ...overrides }],
			} as unknown as Partial<RegistrationFormInput>;
		}

		it.each([
			['a date of birth', { dob: '2016-04-02' }],
			['a grade', { grade: '3' }],
			['allergy details', { allergies: 'peanuts' }],
			['medical notes', { medical_notes: 'inhaler' }],
			['a mobile number', { child_mobile: '5551234567' }],
			['a special-needs flag', { special_needs: true }],
			['special-needs notes', { special_needs_notes: 'quiet room' }],
			['a ministry selection', { ministrySelections: { min_acolyte: true } }],
			['an expressed interest', { interestSelections: { min_choir: true } }],
			['a custom answer', { customData: { shirt_size: 'YM' } }],
			['a last name only', { last_name: 'Williams' }],
		])('treats %s as restorable work without a first name', (_label, overrides) => {
			expect(isMeaningfulDraft(draftWithChild(overrides))).toBe(true);
		});

		it('still rejects a freshly added, untouched child row', () => {
			expect(isMeaningfulDraft(draftWithChild({}))).toBe(false);
		});

		it('does not count a prefilled child id as work the guardian did', () => {
			expect(isMeaningfulDraft(draftWithChild({ child_id: 'child-1' }))).toBe(false);
		});

		it('does not count a ministry that was selected and then cleared', () => {
			expect(
				isMeaningfulDraft(draftWithChild({ ministrySelections: { min_acolyte: false } }))
			).toBe(false);
		});

		it('restores the partial child rather than resolving to no draft', () => {
			const draft = draftWithChild({
				dob: '2016-04-02',
				grade: '3',
				allergies: 'peanuts',
			});

			const result = resolveRegistrationDraft({
				prefillValues: null,
				draftValues: draft,
			});

			expect(result.resolution).toBe('draft_only');
			expect(result.values?.children?.[0].dob).toBe('2016-04-02');
			expect(result.values?.children?.[0].grade).toBe('3');
			expect(result.values?.children?.[0].allergies).toBe('peanuts');
		});
	});

	it('accepts a draft holding any typed household, guardian or child value', () => {
		expect(
			isMeaningfulDraft({ household: { city: 'Oakland' } } as Partial<RegistrationFormInput>)
		).toBe(true);
		expect(
			isMeaningfulDraft({
				guardians: [{ first_name: 'Nakia' }],
			} as Partial<RegistrationFormInput>)
		).toBe(true);
		expect(
			isMeaningfulDraft({
				children: [{ first_name: 'Shuri' }],
			} as Partial<RegistrationFormInput>)
		).toBe(true);
	});
});

describe('resolveRegistrationDraft', () => {
	it('empty: no prefill and no draft resolves to nothing to apply', () => {
		expect(resolveRegistrationDraft({ prefillValues: null, draftValues: null })).toEqual({
			values: null,
			resolution: 'none',
		});
	});

	it('prefill-only: household load applies unchanged', () => {
		const values = prefill();
		const result = resolveRegistrationDraft({ prefillValues: values, draftValues: null });

		expect(result.resolution).toBe('prefill_only');
		expect(result.values).toEqual(values);
	});

	it('prefill-only: an empty draft never downgrades the household load', () => {
		const values = prefill();
		const result = resolveRegistrationDraft({
			prefillValues: values,
			draftValues: { household: { name: '' } } as Partial<RegistrationFormInput>,
		});

		expect(result.resolution).toBe('prefill_only');
		expect(result.values).toEqual(values);
	});

	it('draft-only: draft applies when there is no household load', () => {
		const draft = {
			household: { name: 'New House', city: 'Oakland' },
			children: [{ first_name: 'Riri', last_name: 'Williams' }],
		} as Partial<RegistrationFormInput>;

		const result = resolveRegistrationDraft({ prefillValues: null, draftValues: draft });

		expect(result.resolution).toBe('draft_only');
		expect(result.values).toEqual(draft);
	});

	describe('both present', () => {
		it('draft values beat household values the guardian edited', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					household: { name: 'Wakanda House', city: 'Oakland', zip: '94601' },
				} as Partial<RegistrationFormInput>,
			});

			expect(result.resolution).toBe('merged');
			expect(result.values?.household.city).toBe('Oakland');
			expect(result.values?.household.zip).toBe('94601');
		});

		it('keeps household fields the draft never touched', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					household: { city: 'Oakland' },
				} as Partial<RegistrationFormInput>,
			});

			// address_line1 exists only on the household load.
			expect(result.values?.household.address_line1).toBe('1 Palace Way');
			expect(result.values?.household.preferredScriptureTranslation).toBe('NIV');
		});

		it('household_id always survives, even when the draft carries none', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					household: { name: 'Wakanda House', household_id: '' },
				} as Partial<RegistrationFormInput>,
			});

			expect(result.values?.household.household_id).toBe('hh-1');
		});

		it('re-attaches child_id by name when the draft predates the household match', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					children: [
						// No child_id: typed before the household loaded.
						{ first_name: 'Shuri', last_name: 'Udaku', grade: '8' },
					],
				} as Partial<RegistrationFormInput>,
			});

			expect(result.values?.children).toHaveLength(1);
			expect(result.values?.children?.[0].child_id).toBe('child-1');
			// The draft's edit to grade is what survives.
			expect(result.values?.children?.[0].grade).toBe('8');
		});

		it('matches child names case- and whitespace-insensitively', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					children: [{ first_name: '  shuri ', last_name: 'UDAKU' }],
				} as Partial<RegistrationFormInput>,
			});

			expect(result.values?.children?.[0].child_id).toBe('child-1');
		});

		it('leaves a genuinely new child without an id rather than stealing one', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					children: [
						{ first_name: 'Shuri', last_name: 'Udaku' },
						{ first_name: 'Riri', last_name: 'Williams' },
					],
				} as Partial<RegistrationFormInput>,
			});

			expect(result.values?.children?.[0].child_id).toBe('child-1');
			expect(result.values?.children?.[1].child_id).toBe('');
		});

		it('honours a child removed in the draft instead of resurrecting it', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					children: [{ child_id: 'child-1', first_name: 'Shuri', last_name: 'Udaku' }],
				} as Partial<RegistrationFormInput>,
			});

			expect(result.values?.children).toHaveLength(1);
			expect(result.values?.children?.[0].child_id).toBe('child-1');
		});

		it('keeps household children when the draft touched no children at all', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					household: { city: 'Oakland' },
				} as Partial<RegistrationFormInput>,
			});

			expect(result.values?.children).toHaveLength(2);
			expect(result.values?.children?.[1].child_id).toBe('child-2');
		});

		it('keeps household guardians and consents when the draft omits them', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					household: { city: 'Oakland' },
				} as Partial<RegistrationFormInput>,
			});

			expect(result.values?.guardians?.[0].first_name).toBe('Ramonda');
			expect(result.values?.consents?.liability).toBe(true);
		});

		it('applies draft guardians and consents when the draft has them', () => {
			const result = resolveRegistrationDraft({
				prefillValues: prefill(),
				draftValues: {
					guardians: [
						{
							first_name: 'Nakia',
							last_name: 'Udaku',
							mobile_phone: '555-0199',
							email: 'nakia@example.com',
							relationship: 'Mother',
							is_primary: true,
						},
					],
					consents: {
						liability: false,
						photoRelease: false,
						group_consents: {},
						custom_consents: {},
					},
				} as Partial<RegistrationFormInput>,
			});

			expect(result.values?.guardians).toHaveLength(1);
			expect(result.values?.guardians?.[0].first_name).toBe('Nakia');
			expect(result.values?.consents?.liability).toBe(false);
		});
	});
});

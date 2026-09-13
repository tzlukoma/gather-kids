import { z } from 'zod';
import {
	childHasChoirEnrollment,
	defaultConditionalConsentContext,
	isNoKnownAllergies,
	NO_KNOWN_ALLERGIES,
	registrationSchema,
	validateConditionalConsents,
} from './registration-schema';
import type { RegistrationFormInput } from './registration-schema';

function buildValidPayload(
	overrides?: Partial<RegistrationFormInput>
): RegistrationFormInput {
	return {
		household: {
			address_line1: '123 Main St',
			city: 'Perth Amboy',
			state: 'NJ',
			zip: '08861',
		},
		guardians: [
			{
				first_name: 'Alex',
				last_name: 'Rivera',
				mobile_phone: '5551234567',
				relationship: 'Parent',
				is_primary: true,
			},
		],
		emergencyContact: {
			first_name: 'Sam',
			last_name: 'Lee',
			mobile_phone: '5559876543',
			relationship: 'Aunt',
		},
		children: [
			{
				first_name: 'Jordan',
				last_name: 'Rivera',
				dob: '2015-05-15',
				grade: '3rd',
				allergies: NO_KNOWN_ALLERGIES,
				ministrySelections: {},
				interestSelections: {},
				customFields: {},
			},
		],
		consents: {
			liability: true,
			photoRelease: true,
			group_consents: {},
			custom_consents: {},
		},
		...overrides,
	};
}

describe('registrationSchema allergies', () => {
	it('rejects blank allergy response', () => {
		const result = registrationSchema.safeParse(
			buildValidPayload({
				children: [
					{
						...buildValidPayload().children[0],
						allergies: '',
					},
				],
			})
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) => issue.path.join('.') === 'children.0.allergies')
			).toBe(true);
		}
	});

	it('accepts explicit none sentinel', () => {
		const result = registrationSchema.safeParse(
			buildValidPayload({
				children: [
					{
						...buildValidPayload().children[0],
						allergies: NO_KNOWN_ALLERGIES,
					},
				],
			})
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.children[0].allergies).toBe(NO_KNOWN_ALLERGIES);
			expect(isNoKnownAllergies(result.data.children[0].allergies)).toBe(true);
		}
	});

	it('accepts populated allergy details and preserves text', () => {
		const details = 'Peanuts (anaphylaxis); tree nuts';
		const result = registrationSchema.safeParse(
			buildValidPayload({
				children: [
					{
						...buildValidPayload().children[0],
						allergies: details,
					},
				],
			})
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.children[0].allergies).toBe(details);
			expect(isNoKnownAllergies(result.data.children[0].allergies)).toBe(false);
		}
	});

	it('requires an independent allergy answer for every child', () => {
		const result = registrationSchema.safeParse(
			buildValidPayload({
				children: [
					{
						...buildValidPayload().children[0],
						first_name: 'Jordan',
						allergies: NO_KNOWN_ALLERGIES,
					},
					{
						...buildValidPayload().children[0],
						first_name: 'Casey',
						allergies: '',
					},
				],
			})
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(
				result.error.issues.some((issue) => issue.path.join('.') === 'children.1.allergies')
			).toBe(true);
		}
	});

	it('treats switching details to none as a single unambiguous stored result', () => {
		const withDetails = buildValidPayload({
			children: [
				{
					...buildValidPayload().children[0],
					allergies: 'Shellfish',
				},
			],
		});
		const switchedToNone = {
			...withDetails,
			children: [
				{
					...withDetails.children[0],
					allergies: NO_KNOWN_ALLERGIES,
				},
			],
		};

		const result = registrationSchema.safeParse(switchedToNone);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.children[0].allergies).toBe(NO_KNOWN_ALLERGIES);
		}
	});
});

describe('registrationSchema conditional consents', () => {
	it('accepts submission without conditional consents when none are selected', () => {
		const result = registrationSchema.safeParse(buildValidPayload());
		expect(result.success).toBe(true);
	});

	it('requires Orators custom consent when Orators is selected', () => {
		const result = registrationSchema.safeParse(
			buildValidPayload({
				children: [
					{
						...buildValidPayload().children[0],
						interestSelections: { orators: true },
					},
				],
			})
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((issue) => issue.path.join('.') === 'consents.custom_consents.orators')).toBe(true);
		}
	});

	it('accepts Orators when custom consent is checked', () => {
		const result = registrationSchema.safeParse(
			buildValidPayload({
				children: [
					{
						...buildValidPayload().children[0],
						interestSelections: { orators: true },
					},
				],
				consents: {
					liability: true,
					photoRelease: true,
					group_consents: {},
					custom_consents: { orators: true },
				},
			})
		);

		expect(result.success).toBe(true);
	});

	it('requires choir group consent when a choir ministry is selected', () => {
		const result = registrationSchema.safeParse(
			buildValidPayload({
				children: [
					{
						...buildValidPayload().children[0],
						ministrySelections: { 'teen-choir': true },
					},
				],
			})
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((issue) => issue.path.join('.') === 'consents.group_consents.choirs')).toBe(true);
		}
	});

	it('removes obsolete Orators requirement when interest is deselected', () => {
		const payload = buildValidPayload({
			children: [
				{
					...buildValidPayload().children[0],
					interestSelections: { orators: false },
				},
			],
			consents: {
				liability: true,
				photoRelease: true,
				group_consents: {},
				custom_consents: {},
			},
		});

		expect(registrationSchema.safeParse(payload).success).toBe(true);
	});

	it('removes obsolete choir requirement when choir enrollment is deselected', () => {
		const payload = buildValidPayload({
			children: [
				{
					...buildValidPayload().children[0],
					ministrySelections: { 'teen-choir': false },
				},
			],
		});

		expect(registrationSchema.safeParse(payload).success).toBe(true);
	});
});

describe('validateConditionalConsents', () => {
	it('uses explicit choir ministry codes when provided in context', () => {
		const data = buildValidPayload({
			children: [
				{
					...buildValidPayload().children[0],
					ministrySelections: { 'custom-code': true },
				},
			],
			consents: {
				liability: true,
				photoRelease: true,
				group_consents: {},
				custom_consents: {},
			},
		});

		expect(childHasChoirEnrollment(data.children, ['custom-code'])).toBe(true);
		expect(childHasChoirEnrollment(data.children, ['teen-choir'])).toBe(false);

		const issues: z.ZodIssue[] = [];
		const ctx = {
			addIssue: (issue: z.ZodIssue) => {
				issues.push(issue);
			},
			path: [],
		} as z.RefinementCtx;

		validateConditionalConsents(data, ctx, {
			...defaultConditionalConsentContext,
			groupConsentRules: [
				{
					groupCode: 'choirs',
					isRequired: (formData: RegistrationFormInput) =>
						childHasChoirEnrollment(formData.children, ['custom-code']),
				},
			],
		});

		expect(issues.some((issue) => issue.path.join('.') === 'consents.group_consents.choirs')).toBe(true);
	});
});

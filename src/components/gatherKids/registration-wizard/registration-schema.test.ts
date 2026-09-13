import { z } from 'zod';
import {
	childHasChoirEnrollment,
	defaultConditionalConsentContext,
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
				ministrySelections: {},
				interestSelections: {},
				customData: {},
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

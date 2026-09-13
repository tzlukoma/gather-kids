import { z } from 'zod';

const ministrySelectionSchema = z.record(z.boolean().optional()).optional();
const interestSelectionSchema = z.record(z.boolean().optional()).optional();
const customFieldsSchema = z.record(z.record(z.any()).optional()).optional();

const guardianSchema = z.object({
	first_name: z.string().min(1, 'First name is required.'),
	last_name: z.string().min(1, 'Last name is required.'),
	mobile_phone: z.string().min(10, 'A valid phone number is required.'),
	email: z.string().email('A valid email is required.').optional(),
	relationship: z.string().min(1, 'Relationship is required.'),
	is_primary: z.boolean().default(false),
});

const childSchema = z.object({
	child_id: z.string().optional(),
	first_name: z.string().min(1, 'First name is required.'),
	last_name: z.string().min(1, 'Last name is required.'),
	dob: z.string().refine((val) => val && !isNaN(Date.parse(val)), {
		message: 'Valid date of birth is required.',
	}),
	grade: z.string().min(1, 'Grade is required.'),
	child_mobile: z.string().optional(),
	allergies: z.string().optional(),
	medical_notes: z.string().optional(),
	special_needs: z.boolean().optional(),
	special_needs_notes: z.string().optional(),
	ministrySelections: ministrySelectionSchema,
	interestSelections: interestSelectionSchema,
	customFields: customFieldsSchema,
});

export type ConditionalConsentContext = {
	customConsentMinistryCodes: string[];
	groupConsentRules: Array<{
		groupCode: string;
		isRequired: (data: RegistrationFormInput) => boolean;
	}>;
};

export function childHasChoirEnrollment(
	children: RegistrationFormInput['children'],
	choirMinistryCodes?: string[]
): boolean {
	return children.some((child) =>
		Object.entries(child.ministrySelections ?? {}).some(([code, selected]) => {
			if (!selected) return false;
			if (choirMinistryCodes !== undefined) {
				return choirMinistryCodes.includes(code);
			}
			return /choir/i.test(code);
		})
	);
}

export const defaultConditionalConsentContext: ConditionalConsentContext = {
	customConsentMinistryCodes: ['orators'],
	groupConsentRules: [
		{
			groupCode: 'choirs',
			isRequired: (data) => childHasChoirEnrollment(data.children),
		},
	],
};

export function validateConditionalConsents(
	data: RegistrationFormInput,
	ctx: z.RefinementCtx,
	context: ConditionalConsentContext = defaultConditionalConsentContext
) {
	context.customConsentMinistryCodes.forEach((code) => {
		const isMinistrySelected = data.children.some(
			(child) => child.interestSelections?.[code]
		);
		if (isMinistrySelected && !data.consents.custom_consents?.[code]) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: [`consents.custom_consents.${code}`],
				message: 'Consent for this ministry is required.',
			});
		}
	});

	context.groupConsentRules.forEach(({ groupCode, isRequired }) => {
		if (!isRequired(data)) return;

		const value = data.consents.group_consents?.[groupCode];
		if (value !== 'yes' && value !== 'no') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: [`consents.group_consents.${groupCode}`],
				message: 'Please select Yes or No.',
			});
		}
	});
}

export const registrationFormBaseSchema = z.object({
	household: z.object({
		name: z.string().optional(),
		address_line1: z.string().min(1, 'Address is required.'),
		address_line2: z.string().optional(),
		city: z.string().min(1, 'City is required.'),
		state: z.string().min(1, 'State is required.'),
		zip: z.string().min(1, 'ZIP code is required.'),
		household_id: z.string().optional(),
		preferredScriptureTranslation: z.string().optional(),
	}),
	guardians: z
		.array(guardianSchema)
		.min(1, 'At least one guardian / authorized person is required.'),
	emergencyContact: z.object({
		first_name: z.string().min(1, 'First name is required.'),
		last_name: z.string().min(1, 'Last name is required.'),
		mobile_phone: z.string().min(10, 'A valid phone number is required.'),
		relationship: z.string().min(1, 'Relationship is required.'),
	}),
	children: z.array(childSchema).min(1, 'At least one child is required.'),
	consents: z.object({
		liability: z.boolean().refine((val) => val === true, {
			message: 'Liability consent is required.',
		}),
		photoRelease: z.boolean().refine((val) => val === true, {
			message: 'Photo release consent is required.',
		}),
		group_consents: z.record(z.enum(['yes', 'no'])).optional(),
		custom_consents: z.record(z.boolean().optional()).optional(),
	}),
});

export function createRegistrationSchema(
	context: ConditionalConsentContext = defaultConditionalConsentContext
) {
	return registrationFormBaseSchema.superRefine((data, ctx) => {
		validateConditionalConsents(data, ctx, context);
	});
}

/** Stable schema for tests; uses default legacy-like context. */
export const registrationSchema = createRegistrationSchema(
	defaultConditionalConsentContext
);

export type RegistrationFormInput = z.input<typeof registrationFormBaseSchema>;
export type RegistrationFormOutput = z.output<typeof registrationSchema>;

export const defaultChildValues = {
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
	customFields: {},
};

import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';
import {
	dobEligibleForMinistry,
	dobForAge,
	dobIneligibleOlderForMinistry,
	dobIneligibleYoungerForMinistry,
	type AgeRange,
} from './age';
import { syntheticId } from './ids';

export type ChildFixture = RegistrationFormInput['children'][number];

export type AllergyVariant =
	| 'none'
	| 'none_labeled'
	| 'details'
	| 'special_needs'
	| 'allergies_and_special_needs';

const ALLERGY_VARIANT_FIELDS: Record<
	AllergyVariant,
	Pick<
		ChildFixture,
		'allergies' | 'medical_notes' | 'special_needs' | 'special_needs_notes'
	>
> = {
	none: {
		allergies: '',
		medical_notes: '',
		special_needs: false,
		special_needs_notes: '',
	},
	none_labeled: {
		allergies: 'None',
		medical_notes: '',
		special_needs: false,
		special_needs_notes: '',
	},
	details: {
		allergies: 'Peanuts; tree nuts (synthetic fixture)',
		medical_notes: 'Carries synthetic EpiPen note',
		special_needs: false,
		special_needs_notes: '',
	},
	special_needs: {
		allergies: '',
		medical_notes: '',
		special_needs: true,
		special_needs_notes: 'Needs quiet space during large-group activities',
	},
	allergies_and_special_needs: {
		allergies: 'Dairy (synthetic fixture)',
		medical_notes: 'Watch for synthetic rash triggers',
		special_needs: true,
		special_needs_notes: 'Prefer seating near exit',
	},
};

export function allergyFieldsFor(
	variant: AllergyVariant
): Pick<
	ChildFixture,
	'allergies' | 'medical_notes' | 'special_needs' | 'special_needs_notes'
> {
	return { ...ALLERGY_VARIANT_FIELDS[variant] };
}

export type BuildChildOptions = Partial<ChildFixture> & {
	ageYears?: number;
	allergyVariant?: AllergyVariant;
	asOfIso?: string;
};

export function buildChild(overrides: BuildChildOptions = {}): ChildFixture {
	const {
		ageYears = 8,
		allergyVariant = 'none',
		asOfIso,
		...rest
	} = overrides;
	const allergyFields = allergyFieldsFor(allergyVariant);

	return {
		child_id: syntheticId('child'),
		first_name: 'Jordan',
		last_name: 'Fixture',
		dob: dobForAge(ageYears, asOfIso),
		grade: '3rd',
		child_mobile: '',
		ministrySelections: {},
		interestSelections: {},
		customFields: {},
		...allergyFields,
		...rest,
	};
}

/** One or more children for multi-child household scenarios. */
export function buildChildren(
	count = 2,
	options: Omit<BuildChildOptions, 'first_name'> = {}
): ChildFixture[] {
	if (count < 1) {
		throw new Error('buildChildren requires count >= 1');
	}
	const names = ['Jordan', 'Casey', 'Riley', 'Quinn', 'Avery'];
	return Array.from({ length: count }, (_, index) =>
		buildChild({
			...options,
			first_name: names[index % names.length],
			ageYears: options.ageYears ?? 8 - index,
			child_id: syntheticId('child'),
		})
	);
}

export function buildChildEligibleForMinistry(
	range: AgeRange,
	overrides: BuildChildOptions = {}
): ChildFixture {
	return buildChild({
		...overrides,
		dob: dobEligibleForMinistry(range, overrides.asOfIso),
	});
}

export function buildChildIneligibleYoungerForMinistry(
	range: AgeRange,
	overrides: BuildChildOptions = {}
): ChildFixture {
	const dob = dobIneligibleYoungerForMinistry(range, overrides.asOfIso);
	if (!dob) {
		throw new Error('Ministry has no min_age; cannot build younger-ineligible child');
	}
	return buildChild({ ...overrides, dob });
}

export function buildChildIneligibleOlderForMinistry(
	range: AgeRange,
	overrides: BuildChildOptions = {}
): ChildFixture {
	const dob = dobIneligibleOlderForMinistry(range, overrides.asOfIso);
	if (!dob) {
		throw new Error('Ministry has no max_age; cannot build older-ineligible child');
	}
	return buildChild({ ...overrides, dob });
}

export function withBibleBeeSelected(child: ChildFixture, selected = true): ChildFixture {
	return {
		...child,
		interestSelections: {
			...(child.interestSelections ?? {}),
			bible_bee: selected,
		},
	};
}

export function withMinistryEnrollment(
	child: ChildFixture,
	ministryCode: string,
	selected = true
): ChildFixture {
	return {
		...child,
		ministrySelections: {
			...(child.ministrySelections ?? {}),
			[ministryCode]: selected,
		},
	};
}

export function withInterestSelection(
	child: ChildFixture,
	ministryCode: string,
	selected = true
): ChildFixture {
	return {
		...child,
		interestSelections: {
			...(child.interestSelections ?? {}),
			[ministryCode]: selected,
		},
	};
}

export function withCustomFieldAnswer(
	child: ChildFixture,
	ministryCode: string,
	questionId: string,
	value: unknown
): ChildFixture {
	return {
		...child,
		customFields: {
			...(child.customFields ?? {}),
			[ministryCode]: {
				...((child.customFields ?? {})[ministryCode] as Record<string, unknown> | undefined),
				[questionId]: value,
			},
		},
	};
}

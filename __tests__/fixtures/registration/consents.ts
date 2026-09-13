import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';

export type ConsentsFixture = RegistrationFormInput['consents'];

export function buildBaseConsents(
	overrides: Partial<ConsentsFixture> = {}
): ConsentsFixture {
	return {
		liability: true,
		photoRelease: true,
		group_consents: {},
		custom_consents: {},
		...overrides,
	};
}

export function buildDeclinedBaseConsents(): ConsentsFixture {
	return buildBaseConsents({
		liability: false,
		photoRelease: false,
	});
}

export function withChoirGroupConsent(
	consents: ConsentsFixture,
	value: 'yes' | 'no'
): ConsentsFixture {
	return {
		...consents,
		group_consents: {
			...(consents.group_consents ?? {}),
			choirs: value,
		},
	};
}

export function withCustomMinistryConsent(
	consents: ConsentsFixture,
	ministryCode: string,
	accepted: boolean
): ConsentsFixture {
	return {
		...consents,
		custom_consents: {
			...(consents.custom_consents ?? {}),
			[ministryCode]: accepted,
		},
	};
}

/** Ready-to-submit consents including choir yes + Orators custom consent. */
export function buildConsentsWithChoirAndOrators(
	choir: 'yes' | 'no' = 'yes'
): ConsentsFixture {
	return withCustomMinistryConsent(
		withChoirGroupConsent(buildBaseConsents(), choir),
		'orators',
		true
	);
}

import type { Ministry, MinistryGroup } from '@/lib/types';
import type {
	ConditionalConsentContext,
	RegistrationFormInput,
} from './registration-schema';
import { childHasChoirEnrollment } from './registration-schema';

export function getChoirMinistryCodes(choirMinistries: Ministry[]): string[] {
	return choirMinistries.map((ministry) => ministry.code);
}

export function getGroupsRequiringConsent(ministryGroups: MinistryGroup[]): MinistryGroup[] {
	return ministryGroups.filter(
		(group) => group.custom_consent_required && group.custom_consent_text
	);
}

export function getCustomConsentMinistryCodes(allMinistries: Ministry[]): string[] {
	return allMinistries
		.filter(
			(ministry) =>
				ministry.enrollment_type === 'expressed_interest' &&
				Boolean(ministry.optional_consent_text)
		)
		.map((ministry) => ministry.code);
}

export function childHasChoirSelection(
	children: RegistrationFormInput['children'],
	choirMinistryCodes: string[]
): boolean {
	return children.some((child) =>
		Object.entries(child.ministrySelections ?? {}).some(
			([code, selected]) => selected && choirMinistryCodes.includes(code)
		)
	);
}

export function getSelectedCustomConsentMinistries(
	children: RegistrationFormInput['children'],
	allMinistries: Ministry[]
): Ministry[] {
	const codes = new Set(getCustomConsentMinistryCodes(allMinistries));
	return allMinistries.filter(
		(ministry) =>
			codes.has(ministry.code) &&
			children.some((child) => child.interestSelections?.[ministry.code])
	);
}

export function buildConditionalConsentContext(params: {
	allMinistries: Ministry[];
	ministryGroups: MinistryGroup[];
	choirMinistries: Ministry[];
}): ConditionalConsentContext {
	const choirMinistryCodes = getChoirMinistryCodes(params.choirMinistries);
	const groupsRequiringConsent = getGroupsRequiringConsent(params.ministryGroups);

	return {
		customConsentMinistryCodes: getCustomConsentMinistryCodes(params.allMinistries),
		groupConsentRules: groupsRequiringConsent.map((group) => ({
			groupCode: group.code,
			isRequired: (data: RegistrationFormInput) => {
				if (group.code === 'choirs') {
					return childHasChoirEnrollment(data.children, choirMinistryCodes);
				}
				return false;
			},
		})),
	};
}

export function shouldShowChoirGroupConsent(params: {
	children: RegistrationFormInput['children'];
	ministryGroups: MinistryGroup[];
	choirMinistries: Ministry[];
}): boolean {
	const choirsGroup = getGroupsRequiringConsent(params.ministryGroups).find(
		(group) => group.code === 'choirs'
	);
	if (!choirsGroup) return false;

	const choirMinistryCodes = getChoirMinistryCodes(params.choirMinistries);
	return childHasChoirSelection(params.children, choirMinistryCodes);
}

export function pruneStaleConsents(
	consents: RegistrationFormInput['consents'],
	data: RegistrationFormInput,
	context: ConditionalConsentContext
): RegistrationFormInput['consents'] {
	const applicableCustomCodes = context.customConsentMinistryCodes.filter((code) =>
		data.children.some((child) => child.interestSelections?.[code])
	);

	const applicableGroupCodes = context.groupConsentRules
		.filter((rule) => rule.isRequired(data))
		.map((rule) => rule.groupCode);

	const customConsents = Object.fromEntries(
		Object.entries(consents.custom_consents ?? {}).filter(([code]) =>
			applicableCustomCodes.includes(code)
		)
	) as Record<string, boolean | undefined>;

	const groupConsents = Object.fromEntries(
		Object.entries(consents.group_consents ?? {}).filter(
			(entry): entry is [string, 'yes' | 'no'] => {
				const [code, value] = entry;
				return (
					applicableGroupCodes.includes(code) &&
					(value === 'yes' || value === 'no')
				);
			}
		)
	);

	return {
		...consents,
		custom_consents: customConsents,
		group_consents: groupConsents,
	};
}

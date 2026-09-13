import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';
import { SYNTHETIC_EMAIL_DOMAIN } from './constants';

export type GuardianFixture = RegistrationFormInput['guardians'][number];

export type BuildGuardianOptions = Partial<GuardianFixture> & {
	/** When true and email is omitted, assigns a unique synthetic email. */
	withEmail?: boolean;
};

export function buildGuardian(
	overrides: BuildGuardianOptions = {}
): GuardianFixture {
	const { withEmail = false, ...rest } = overrides;
	const guardian: GuardianFixture = {
		first_name: 'Alex',
		last_name: 'Fixture',
		mobile_phone: '5551234567',
		relationship: 'Parent',
		is_primary: true,
		...rest,
	};

	if (withEmail && guardian.email === undefined) {
		guardian.email = `guardian.fixture@${SYNTHETIC_EMAIL_DOMAIN}`;
	}

	return guardian;
}

/** Primary + secondary guardians for multi-guardian flows. */
export function buildGuardians(count = 2): GuardianFixture[] {
	if (count < 1) {
		throw new Error('buildGuardians requires count >= 1');
	}
	const guardians: GuardianFixture[] = [
		buildGuardian({
			first_name: 'Alex',
			last_name: 'Fixture',
			mobile_phone: '5551234567',
			email: `primary.guardian@${SYNTHETIC_EMAIL_DOMAIN}`,
			relationship: 'Parent',
			is_primary: true,
		}),
	];
	for (let i = 1; i < count; i += 1) {
		guardians.push(
			buildGuardian({
				first_name: 'Blair',
				last_name: 'Fixture',
				mobile_phone: `555123456${i}`,
				email: `secondary.guardian.${i}@${SYNTHETIC_EMAIL_DOMAIN}`,
				relationship: i === 1 ? 'Parent' : 'Guardian',
				is_primary: false,
			})
		);
	}
	return guardians;
}

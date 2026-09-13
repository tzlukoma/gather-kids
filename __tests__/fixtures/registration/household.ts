import type { RegistrationFormInput } from '@/components/gatherKids/registration-wizard/registration-schema';
import { SYNTHETIC_HOUSEHOLD } from './constants';
import { syntheticId } from './ids';

export type HouseholdFixture = RegistrationFormInput['household'];
export type EmergencyContactFixture = RegistrationFormInput['emergencyContact'];

export function buildHousehold(
	overrides: Partial<HouseholdFixture> = {}
): HouseholdFixture {
	return {
		name: SYNTHETIC_HOUSEHOLD.name,
		address_line1: SYNTHETIC_HOUSEHOLD.address_line1,
		address_line2: SYNTHETIC_HOUSEHOLD.address_line2,
		city: SYNTHETIC_HOUSEHOLD.city,
		state: SYNTHETIC_HOUSEHOLD.state,
		zip: SYNTHETIC_HOUSEHOLD.zip,
		household_id: syntheticId('hh'),
		preferredScriptureTranslation: 'NIV',
		...overrides,
	};
}

export function buildEmergencyContact(
	overrides: Partial<EmergencyContactFixture> = {}
): EmergencyContactFixture {
	return {
		first_name: 'Sam',
		last_name: 'Lee',
		mobile_phone: '5559876543',
		relationship: 'Aunt',
		...overrides,
	};
}

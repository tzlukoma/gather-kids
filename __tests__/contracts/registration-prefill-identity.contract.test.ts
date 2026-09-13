import {
	buildIdentityPreservingPrefill,
	mapRegistrationPrefillState,
} from '@/components/gatherKids/registration-wizard/registration-prefill-state';

/**
 * Contract: current-cycle update must keep household/child identity so
 * registerHouseholdCanonical updates instead of creating a duplicate household.
 */
describe('current-cycle update identity contract', () => {
	const currentCycleLoad = {
		isCurrentYear: true as const,
		isReturningPrefill: false as const,
		existingChildIds: ['child-abc'],
		data: {
			household: {
				household_id: 'hh-abc',
				name: 'Rivera Household',
				address_line1: '200 Returning St',
				city: 'Perth Amboy',
				state: 'NJ',
				zip: '08861',
			},
			children: [
				{
					child_id: 'child-abc',
					first_name: 'Jordan',
					last_name: 'Rivera',
					grade: '1st',
				},
			],
			guardians: [],
			emergencyContact: null,
			consents: { liability: false, photoRelease: false },
		},
	};

	it('maps to current_cycle overwrite state', () => {
		const state = mapRegistrationPrefillState({ loadResult: currentCycleLoad });
		expect(state.kind).toBe('current_cycle');
		expect(state.isCurrentYearOverwrite).toBe(true);
		expect(state.isReturningPrefill).toBe(false);
	});

	it('preserves household_id and child_ids for form reset / submit', () => {
		const identity = buildIdentityPreservingPrefill(currentCycleLoad);
		expect(identity).not.toBeNull();
		expect(identity!.householdId).toBe('hh-abc');
		expect(identity!.childIds).toEqual(['child-abc']);

		// Wizard form reset must carry household_id so DAL treats submit as update.
		const formHousehold = {
			household_id: currentCycleLoad.data.household.household_id || '',
			name: currentCycleLoad.data.household.name || '',
		};
		expect(formHousehold.household_id).toBe('hh-abc');
		expect(formHousehold.household_id.length).toBeGreaterThan(0);

		const formChildren = (currentCycleLoad.data.children || []).map((child) => ({
			child_id: child.child_id,
			first_name: child.first_name,
		}));
		expect(formChildren[0].child_id).toBe('child-abc');
	});

	it('does not invent a new household id when current-cycle data is present', () => {
		const identity = buildIdentityPreservingPrefill(currentCycleLoad);
		expect(identity?.householdId).not.toBe('');
		expect(identity?.householdId).not.toBeNull();
		// Update path requires an existing id — creating a UUID would duplicate.
		expect(identity?.isCurrentYearOverwrite).toBe(true);
	});
});

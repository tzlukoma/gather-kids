import {
	analyticsReturningHousehold,
	buildIdentityPreservingPrefill,
	currentCycleOverwriteWarning,
	entryChildStatus,
	entryDescriptionForPrefillState,
	mapRegistrationPrefillState,
	step1OnFileCopy,
	type HouseholdRegistrationLoadLike,
} from '@/components/gatherKids/registration-wizard/registration-prefill-state';

function priorCycleLoad(): NonNullable<HouseholdRegistrationLoadLike> {
	return {
		isCurrentYear: false,
		isReturningPrefill: true,
		existingChildIds: ['child-prior-1'],
		data: {
			household: { household_id: 'hh-prior' },
			children: [{ child_id: 'child-prior-1' }],
		},
	};
}

function currentCycleLoad(): NonNullable<HouseholdRegistrationLoadLike> {
	return {
		isCurrentYear: true,
		isReturningPrefill: false,
		existingChildIds: ['child-current-1'],
		data: {
			household: { household_id: 'hh-current' },
			children: [{ child_id: 'child-current-1' }],
		},
	};
}

describe('mapRegistrationPrefillState', () => {
	it('maps null load to first_time', () => {
		expect(mapRegistrationPrefillState({ loadResult: null })).toEqual({
			kind: 'first_time',
			isReturningPrefill: false,
			isCurrentYearOverwrite: false,
			hasHouseholdSource: false,
		});
	});

	it('maps prior-cycle load to prior_cycle', () => {
		expect(
			mapRegistrationPrefillState({ loadResult: priorCycleLoad() })
		).toEqual({
			kind: 'prior_cycle',
			isReturningPrefill: true,
			isCurrentYearOverwrite: false,
			hasHouseholdSource: true,
		});
	});

	it('maps current-cycle load to current_cycle overwrite', () => {
		expect(
			mapRegistrationPrefillState({ loadResult: currentCycleLoad() })
		).toEqual({
			kind: 'current_cycle',
			isReturningPrefill: false,
			isCurrentYearOverwrite: true,
			hasHouseholdSource: true,
		});
	});

	it('maps draft-only when there is no household load', () => {
		expect(
			mapRegistrationPrefillState({
				loadResult: null,
				hasDraftChildren: true,
			})
		).toEqual({
			kind: 'draft_only',
			isReturningPrefill: false,
			isCurrentYearOverwrite: false,
			hasHouseholdSource: false,
		});
	});

	it('never treats a truthy load without returning flags as prior-year', () => {
		const ambiguous: HouseholdRegistrationLoadLike = {
			isCurrentYear: false,
			isReturningPrefill: false,
			data: { household: { household_id: 'hh-x' } },
		};
		const state = mapRegistrationPrefillState({ loadResult: ambiguous });
		expect(state.kind).not.toBe('prior_cycle');
		expect(state.isReturningPrefill).toBe(false);
		expect(entryDescriptionForPrefillState(state, '2026-fall')).not.toMatch(
			/last year/i
		);
	});
});

describe('entry and step1 copy', () => {
	it('uses neutral first-time copy without on-file or last-year claims', () => {
		const state = mapRegistrationPrefillState({ loadResult: null });
		const entry = entryDescriptionForPrefillState(state, '2026-fall');
		expect(entry).toMatch(/complete your family registration/i);
		expect(entry).not.toMatch(/last year|on file|returning/i);
		expect(step1OnFileCopy(state)).toBeNull();
	});

	it('uses prior-year prefill copy for prior_cycle', () => {
		const state = mapRegistrationPrefillState({
			loadResult: priorCycleLoad(),
		});
		const entry = entryDescriptionForPrefillState(state, '2026-fall');
		expect(entry).toMatch(/last year's answers/i);
		expect(step1OnFileCopy(state)).toMatch(/on file/i);
	});

	it('uses overwrite warning and never last-year for current_cycle', () => {
		const state = mapRegistrationPrefillState({
			loadResult: currentCycleLoad(),
		});
		const entry = entryDescriptionForPrefillState(state, '2026-fall');
		expect(entry).toMatch(/already registered/i);
		expect(entry).not.toMatch(/last year/i);
		expect(step1OnFileCopy(state)).toMatch(/on file/i);
		const warning = currentCycleOverwriteWarning('2026-fall');
		expect(warning.title).toMatch(/existing registration/i);
		expect(warning.description).toMatch(/overwrite/i);
		expect(warning.description).toMatch(/2026-fall/);
	});

	it('draft-only has no on-file copy', () => {
		const state = mapRegistrationPrefillState({
			loadResult: null,
			hasDraftChildren: true,
		});
		expect(step1OnFileCopy(state)).toBeNull();
		expect(entryDescriptionForPrefillState(state, '2026-fall')).not.toMatch(
			/last year|on file/i
		);
	});
});

describe('entryChildStatus', () => {
	it('labels prior-cycle household children as returning', () => {
		const state = mapRegistrationPrefillState({
			loadResult: priorCycleLoad(),
		});
		expect(
			entryChildStatus(state, { child_id: 'child-prior-1' }, true)
		).toBe('returning');
	});

	it('labels current-cycle household children as registered, not returning', () => {
		const state = mapRegistrationPrefillState({
			loadResult: currentCycleLoad(),
		});
		expect(
			entryChildStatus(state, { child_id: 'child-current-1' }, true)
		).toBe('registered');
	});

	it('does not label draft-only or children without household ids', () => {
		const draft = mapRegistrationPrefillState({
			loadResult: null,
			hasDraftChildren: true,
		});
		expect(entryChildStatus(draft, { child_id: null }, false)).toBeNull();
		expect(
			entryChildStatus(
				mapRegistrationPrefillState({ loadResult: null }),
				{ child_id: 'x' },
				false
			)
		).toBeNull();
	});
});

describe('analyticsReturningHousehold', () => {
	it('is true only for prior-cycle returning prefill — no PII fields', () => {
		expect(
			analyticsReturningHousehold(
				mapRegistrationPrefillState({ loadResult: priorCycleLoad() })
			)
		).toBe(true);
		expect(
			analyticsReturningHousehold(
				mapRegistrationPrefillState({ loadResult: currentCycleLoad() })
			)
		).toBe(false);
		expect(
			analyticsReturningHousehold(
				mapRegistrationPrefillState({ loadResult: null })
			)
		).toBe(false);

		const props = {
			child_count: 2,
			returning_household: analyticsReturningHousehold(
				mapRegistrationPrefillState({ loadResult: priorCycleLoad() })
			),
		};
		expect(Object.keys(props).sort()).toEqual([
			'child_count',
			'returning_household',
		]);
		expect(props).not.toHaveProperty('email');
		expect(props).not.toHaveProperty('name');
		expect(props).not.toHaveProperty('household_id');
	});
});

describe('buildIdentityPreservingPrefill', () => {
	it('preserves household and child ids for current-cycle updates', () => {
		const identity = buildIdentityPreservingPrefill(currentCycleLoad());
		expect(identity).toEqual({
			householdId: 'hh-current',
			childIds: ['child-current-1'],
			isCurrentYearOverwrite: true,
			isReturningPrefill: false,
		});
	});

	it('preserves ids for prior-cycle returning prefill', () => {
		const identity = buildIdentityPreservingPrefill(priorCycleLoad());
		expect(identity?.householdId).toBe('hh-prior');
		expect(identity?.childIds).toEqual(['child-prior-1']);
		expect(identity?.isCurrentYearOverwrite).toBe(false);
		expect(identity?.isReturningPrefill).toBe(true);
	});

	it('returns null when there is no household load', () => {
		expect(buildIdentityPreservingPrefill(null)).toBeNull();
	});
});

/**
 * Pure mapping of household load / draft signals → registration UI states.
 * Keeps entry, Step 1, analytics, and overwrite warning copy consistent.
 */

export type RegistrationPrefillKind =
	| 'first_time'
	| 'prior_cycle'
	| 'current_cycle'
	| 'draft_only';

/**
 * Structural subset of {@link HouseholdRegistrationLoadResult} for mapping + tests.
 * Prefer passing the full DAL result from production code.
 */
export type HouseholdRegistrationLoadLike = {
	isCurrentYear: boolean;
	isReturningPrefill: boolean;
	existingChildIds?: string[];
	data?: {
		household?: {
			household_id?: string | null;
			name?: string | null;
			address_line1?: string | null;
			address_line2?: string | null;
			city?: string | null;
			state?: string | null;
			zip?: string | null;
			preferredScriptureTranslation?: string | null;
		} | null;
		guardians?: unknown;
		emergencyContact?: unknown;
		children?: Array<{ child_id?: string | null }> | null;
		consents?: unknown;
	} | null;
} | null;

export type RegistrationPrefillState = {
	kind: RegistrationPrefillKind;
	/** Analytics / legacy: true only for prior-cycle returning prefill. */
	isReturningPrefill: boolean;
	/** True when household already has a registration for the active cycle. */
	isCurrentYearOverwrite: boolean;
	/** True when form values came from a household DB load (not draft-only). */
	hasHouseholdSource: boolean;
};

export type EntryChildStatus = 'returning' | 'registered' | null;

/**
 * Classify registration entry / wizard messaging from load + draft signals.
 *
 * Priority:
 * 1. Household load with current-cycle registration → current_cycle
 * 2. Household load with prior-cycle prefill → prior_cycle
 * 3. No load, but draft children → draft_only
 * 4. Otherwise → first_time
 */
export function mapRegistrationPrefillState(input: {
	loadResult: HouseholdRegistrationLoadLike;
	hasDraftChildren?: boolean;
}): RegistrationPrefillState {
	const { loadResult, hasDraftChildren = false } = input;

	if (loadResult?.isCurrentYear) {
		return {
			kind: 'current_cycle',
			isReturningPrefill: false,
			isCurrentYearOverwrite: true,
			hasHouseholdSource: true,
		};
	}

	if (loadResult?.isReturningPrefill) {
		return {
			kind: 'prior_cycle',
			isReturningPrefill: true,
			isCurrentYearOverwrite: false,
			hasHouseholdSource: true,
		};
	}

	// Truthy load without flags must never be treated as prior-year prefill.
	if (hasDraftChildren) {
		return {
			kind: 'draft_only',
			isReturningPrefill: false,
			isCurrentYearOverwrite: false,
			hasHouseholdSource: false,
		};
	}

	return {
		kind: 'first_time',
		isReturningPrefill: false,
		isCurrentYearOverwrite: false,
		hasHouseholdSource: false,
	};
}

/** Entry card body copy — never claims “last year” for current-cycle or empty. */
export function entryDescriptionForPrefillState(
	state: RegistrationPrefillState,
	cycleLabel: string
): string {
	switch (state.kind) {
		case 'prior_cycle':
			return "We found your household. Last year's answers are already filled in — review and update as needed.";
		case 'current_cycle':
			return `You already registered for the ${cycleLabel} cycle. Review your information and submit to update your registration.`;
		case 'draft_only':
			return `Continue your ${cycleLabel} registration. Your draft progress will be restored when you start.`;
		case 'first_time':
		default:
			return `Complete your family registration for ${cycleLabel} programs.`;
	}
}

/** Step 1 “on file” notice — only when data came from a household source. */
export function step1OnFileCopy(state: RegistrationPrefillState): string | null {
	if (!state.hasHouseholdSource) {
		return null;
	}
	return 'This information is on file. Update if anything has changed.';
}

/** Destructive overwrite warning for current-cycle updates (legacy safety). */
export function currentCycleOverwriteWarning(cycleLabel: string): {
	title: string;
	description: string;
} {
	return {
		title: 'Existing Registration Found',
		description: `A registration for the ${cycleLabel} cycle already exists for this household. Review the information below and make any necessary changes. Submitting this form will overwrite the previous submission for this year.`,
	};
}

/**
 * Child status chip on the entry screen.
 * Returning only for prior-cycle household children; current-cycle uses “registered”.
 * Draft-only / first-time / children without a household child_id → no status.
 */
export function entryChildStatus(
	state: RegistrationPrefillState,
	child: { child_id?: string | null },
	fromHouseholdProfile: boolean
): EntryChildStatus {
	if (!fromHouseholdProfile || !child.child_id) {
		return null;
	}
	if (state.kind === 'prior_cycle') {
		return 'returning';
	}
	if (state.kind === 'current_cycle') {
		return 'registered';
	}
	return null;
}

/** Analytics helper — boolean only, no PII. */
export function analyticsReturningHousehold(
	state: Pick<RegistrationPrefillState, 'isReturningPrefill'>
): boolean {
	return state.isReturningPrefill;
}

/**
 * Form prefill snapshot that preserves household/child identity for updates.
 * Used by the wizard when applying a household load result.
 */
export function buildIdentityPreservingPrefill(loadResult: HouseholdRegistrationLoadLike): {
	householdId: string | null;
	childIds: string[];
	isCurrentYearOverwrite: boolean;
	isReturningPrefill: boolean;
} | null {
	if (!loadResult?.data?.household) {
		return null;
	}

	const householdId = loadResult.data.household.household_id ?? null;
	const fromChildren =
		loadResult.data.children
			?.map((c) => c.child_id)
			.filter((id): id is string => Boolean(id)) ?? [];
	const childIds =
		loadResult.existingChildIds && loadResult.existingChildIds.length > 0
			? [...loadResult.existingChildIds]
			: fromChildren;

	return {
		householdId,
		childIds,
		isCurrentYearOverwrite: Boolean(loadResult.isCurrentYear),
		isReturningPrefill: Boolean(loadResult.isReturningPrefill),
	};
}

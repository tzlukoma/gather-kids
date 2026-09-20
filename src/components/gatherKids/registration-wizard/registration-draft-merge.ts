/**
 * Deterministic precedence between a household load (current-cycle or
 * prior-cycle prefill) and a locally persisted draft.
 *
 * The rule is decided by *source*, not by timestamp:
 *
 * - The **draft** wins for every value the guardian actually typed. A draft
 *   only exists because someone filled the form in and did not submit it;
 *   household prefill can always be re-derived, unsubmitted typing cannot.
 * - The **household load** always wins for identity — `household_id` and each
 *   existing `child_id` — so restoring a draft can never turn an update into a
 *   duplicate insert. A draft written before the household was matched carries
 *   no ids, which is exactly the case this protects.
 *
 * This is equivalent to "newest wins" in every state the user can reach by
 * typing, and unlike a timestamp comparison it cannot silently discard the
 * draft when an unrelated household edit happens to be more recent. The spec
 * requires drafts be surfaced rather than silently dropped, so callers should
 * tell the guardian when {@link DraftResolution} is `merged`.
 */

import type { RegistrationFormInput } from './registration-schema';

export type DraftResolution =
	/** Neither a household load nor a usable draft. */
	| 'none'
	/** Household load only — no usable draft to merge. */
	| 'prefill_only'
	/** Draft only — no household load. */
	| 'draft_only'
	/** Both present; draft values applied over household identity. */
	| 'merged';

export type RegistrationDraftLike = Partial<RegistrationFormInput> | null | undefined;

export type DraftMergeResult = {
	/** Values to reset the form with, or null when there is nothing to apply. */
	values: RegistrationFormInput | null;
	resolution: DraftResolution;
};

/** Normalized identity key for pairing a draft child with a household child. */
function childKey(child: { first_name?: string | null; last_name?: string | null }): string {
	const first = (child.first_name ?? '').trim().toLowerCase();
	const last = (child.last_name ?? '').trim().toLowerCase();
	return `${first}|${last}`;
}

/**
 * Whether a draft holds anything worth restoring.
 *
 * Mirrors the wizard's auto-save guard so an empty autosaved shell is never
 * treated as user work.
 */
export function isMeaningfulDraft(draft: RegistrationDraftLike): boolean {
	if (!draft) return false;

	const household = draft.household;
	if (
		household?.name ||
		household?.address_line1 ||
		household?.address_line2 ||
		household?.city ||
		household?.state ||
		household?.zip
	) {
		return true;
	}

	if (draft.guardians?.some((g) => g && (g.first_name || g.last_name || g.mobile_phone))) {
		return true;
	}

	const emergency = draft.emergencyContact;
	if (emergency?.first_name || emergency?.last_name || emergency?.mobile_phone) {
		return true;
	}

	return Boolean(draft.children?.some((c) => c?.first_name));
}

/**
 * Apply draft values over a household prefill, keeping household identity.
 */
function mergeDraftOverPrefill(
	prefill: RegistrationFormInput,
	draft: Partial<RegistrationFormInput>
): RegistrationFormInput {
	const householdId = prefill.household?.household_id || draft.household?.household_id || '';

	// Pair by name so a draft written before the household loaded still adopts
	// the existing child's id instead of creating a duplicate.
	const prefillChildIdsByKey = new Map<string, string>();
	for (const child of prefill.children ?? []) {
		if (child?.child_id) {
			prefillChildIdsByKey.set(childKey(child), child.child_id);
		}
	}

	const children = draft.children?.length
		? draft.children.map((child) => ({
				...child,
				child_id: child?.child_id || prefillChildIdsByKey.get(childKey(child ?? {})) || '',
			}))
		: prefill.children;

	return {
		...prefill,
		...draft,
		household: {
			...prefill.household,
			...draft.household,
			household_id: householdId,
		},
		guardians: draft.guardians?.length ? draft.guardians : prefill.guardians,
		emergencyContact: draft.emergencyContact ?? prefill.emergencyContact,
		children,
		consents: draft.consents ?? prefill.consents,
	} as RegistrationFormInput;
}

/**
 * Resolve which values the wizard should open with.
 */
export function resolveRegistrationDraft(input: {
	prefillValues: RegistrationFormInput | null;
	draftValues: RegistrationDraftLike;
}): DraftMergeResult {
	const { prefillValues, draftValues } = input;
	const usableDraft = isMeaningfulDraft(draftValues) ? draftValues! : null;

	if (!prefillValues && !usableDraft) {
		return { values: null, resolution: 'none' };
	}

	if (!usableDraft) {
		return { values: prefillValues, resolution: 'prefill_only' };
	}

	if (!prefillValues) {
		return { values: usableDraft as RegistrationFormInput, resolution: 'draft_only' };
	}

	return {
		values: mergeDraftOverPrefill(prefillValues, usableDraft),
		resolution: 'merged',
	};
}

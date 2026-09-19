/**
 * "Amara's ministries already saved."
 *
 * A returning household arrives at step 4 with last year's ministry choices
 * already ticked. Nothing on the screen said so, so a parent registering three
 * children had no way to tell which of them were carried over and which were
 * still untouched — the checkboxes for a prefilled sibling look exactly like
 * ones the parent just ticked themselves.
 *
 * The signed spec (`29:70`, and the locked decision "Sibling ministry Review →
 * jump back to that child's ministry step, then resume") calls for a status
 * card naming each such sibling with a Review action.
 *
 * This module is the answer to "which children, and what did they keep?" and
 * nothing else — no React, so the rule can be tested against real shapes
 * without mounting a Radix checkbox in jsdom.
 */

export type SiblingMinistryStatus = {
	childIndex: number;
	childId: string;
	name: string;
	/** Ministry display names, alphabetical; falls back to the code. */
	ministryLabels: string[];
	/** Where Review should take the guardian: the first ministry they kept. */
	firstMinistryCode: string;
};

type StatusChild = {
	child_id?: string | null;
	first_name?: string | null;
	ministrySelections?: Record<string, boolean | undefined> | null;
};

type StatusMinistry = {
	code?: string | null;
	name?: string | null;
};

/** The codes a child is currently enrolled in, in a stable order. */
export function selectedMinistryCodes(child: StatusChild | undefined): string[] {
	if (!child?.ministrySelections) return [];
	return Object.entries(child.ministrySelections)
		.filter(([, checked]) => checked === true)
		.map(([code]) => code)
		.sort();
}

/**
 * Children whose ministry choices came from the household record rather than
 * from this sitting.
 *
 * Restricted to `existingChildIds` — a child added during this session has no
 * saved anything, however many boxes the parent has just ticked, and calling
 * those "already saved" would be a lie about where the data came from.
 */
export function siblingMinistryStatuses(input: {
	children: StatusChild[] | undefined | null;
	ministries: StatusMinistry[] | undefined | null;
	existingChildIds: string[] | undefined | null;
	/** False for a first-time family or a draft-only session: nothing is saved. */
	enabled: boolean;
}): SiblingMinistryStatus[] {
	const { children, ministries, existingChildIds, enabled } = input;
	if (!enabled || !children?.length) return [];

	const onFile = new Set(existingChildIds ?? []);
	if (onFile.size === 0) return [];

	const nameByCode = new Map<string, string>();
	for (const ministry of ministries ?? []) {
		if (ministry?.code) {
			nameByCode.set(ministry.code, ministry.name || ministry.code);
		}
	}

	const statuses: SiblingMinistryStatus[] = [];
	children.forEach((child, childIndex) => {
		const childId = child?.child_id;
		if (!childId || !onFile.has(childId)) return;

		const codes = selectedMinistryCodes(child);
		if (codes.length === 0) return;

		statuses.push({
			childIndex,
			childId,
			name: child.first_name || `Child ${childIndex + 1}`,
			ministryLabels: codes
				.map((code) => nameByCode.get(code) || code)
				.sort((a, b) => a.localeCompare(b)),
			firstMinistryCode: codes[0],
		});
	});

	// Child order follows the form, which follows the household record — the
	// spec requires child order to match live.
	return statuses;
}

/** "Sunday School and Joy Bells", "A, B and C" — for the status card's subline. */
export function formatMinistryLabels(labels: string[]): string {
	if (labels.length === 0) return '';
	if (labels.length === 1) return labels[0];
	if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
	return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

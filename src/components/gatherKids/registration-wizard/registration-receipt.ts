/**
 * Questions answered from the registration receipt — what was actually stored —
 * rather than from the form the guardian submitted.
 *
 * Extracted from the wizard so the rejected-enrollment case is testable: the
 * derivation used to sit inline in `onSubmit`, where nothing could reach it
 * without driving a full five-step submit.
 */

import type { RegisteredChildReceipt } from '@/lib/types';

export const BIBLE_BEE_MINISTRY_CODE = 'bible-bee';

/**
 * Whether any child holds a *persisted, enrolled* Bible Bee place.
 *
 * The scripture deep link is only honest for a child the DAL actually enrolled.
 * An expression of interest is a request to be contacted, and a withdrawn or
 * otherwise declined enrollment is not a place either — neither may light the
 * panel, or the screen offers scripture assignments that do not exist.
 */
export function hasPersistedBibleBeeEnrollment(
	registeredChildren: RegisteredChildReceipt[] | undefined | null
): boolean {
	return Boolean(
		registeredChildren?.some((child) =>
			child.enrollments?.some(
				(enrollment) =>
					enrollment.ministry_code === BIBLE_BEE_MINISTRY_CODE &&
					enrollment.status === 'enrolled'
			)
		)
	);
}

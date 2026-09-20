/**
 * #394 — the Bible Bee scripture link follows the *persisted* enrollment.
 *
 * The signed spec locks it: "Show scripture deep link only if Bible Bee
 * enrolled." Offering scripture assignments to a child the DAL declined to
 * enrol is the same class of false success #400 removed from the roster.
 */

import { hasPersistedBibleBeeEnrollment } from '@/components/gatherKids/registration-wizard/registration-receipt';
import type { RegisteredChildReceipt } from '@/lib/types';

function child(
	enrollments: RegisteredChildReceipt['enrollments']
): RegisteredChildReceipt {
	return {
		child_id: 'child-1',
		first_name: 'Sky',
		last_name: 'Rivera',
		enrollments,
	};
}

const BIBLE_BEE = {
	ministry_id: 'min_bible_bee',
	ministry_name: 'Bible Bee',
	ministry_code: 'bible-bee',
};

const SUNDAY_SCHOOL = {
	ministry_id: 'min_sunday_school',
	ministry_name: 'Sunday School',
	ministry_code: 'min_sunday_school',
	status: 'enrolled' as const,
};

describe('hasPersistedBibleBeeEnrollment', () => {
	it('is true for a persisted Bible Bee enrollment', () => {
		expect(
			hasPersistedBibleBeeEnrollment([
				child([{ ...BIBLE_BEE, status: 'enrolled' }]),
			])
		).toBe(true);
	});

	it('is false when the child enrolled in something else', () => {
		expect(hasPersistedBibleBeeEnrollment([child([SUNDAY_SCHOOL])])).toBe(false);
	});

	it('is false for an expression of interest, which is not a place', () => {
		expect(
			hasPersistedBibleBeeEnrollment([
				child([{ ...BIBLE_BEE, status: 'expressed_interest' }]),
			])
		).toBe(false);
	});

	/**
	 * A rejected enrollment is not a status in the receipt — `status` is only
	 * `enrolled | expressed_interest`, so an enrollment the DAL declined to
	 * create is simply absent. That is the #400 case: the guardian ticked Bible
	 * Bee, persistence refused (closed window, ineligible age), and the screen
	 * must not offer scripture assignments on the strength of the tick.
	 */
	it('is false when the guardian chose Bible Bee but the DAL declined it', () => {
		const declined = child([SUNDAY_SCHOOL]);

		expect(
			declined.enrollments.some((e) => e.ministry_code === 'bible-bee')
		).toBe(false);
		expect(hasPersistedBibleBeeEnrollment([declined])).toBe(false);
	});

	it('is true when one sibling of several is enrolled', () => {
		expect(
			hasPersistedBibleBeeEnrollment([
				child([SUNDAY_SCHOOL]),
				{
					...child([{ ...BIBLE_BEE, status: 'enrolled' }]),
					child_id: 'child-2',
					first_name: 'Robin',
				},
			])
		).toBe(true);
	});

	it('is false for an empty, missing or absent receipt', () => {
		expect(hasPersistedBibleBeeEnrollment([])).toBe(false);
		expect(hasPersistedBibleBeeEnrollment(undefined)).toBe(false);
		expect(hasPersistedBibleBeeEnrollment(null)).toBe(false);
		expect(hasPersistedBibleBeeEnrollment([child([])])).toBe(false);
	});
});

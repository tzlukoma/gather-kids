/**
 * DAL — Active registration cycle scoping for staff UI
 *
 * Operational surfaces (check-in, rosters, dashboard counts, etc.) default to
 * children/households linked to a registration cycle. See
 * docs/ACTIVE_CYCLE_SCOPING_PLAN.md and GitHub #250.
 *
 * Inclusion (default `union`):
 * - `registrations` row for the cycle, OR
 * - `ministry_enrollments` with status = 'enrolled' for the cycle
 *
 * R1 guardian routing stays registrations-only and does not use this module.
 */

import { db as dbAdapter } from '../database/factory';
import { requireActiveRegistrationCycle } from './ministries';

export type CycleScopeMode = 'registration' | 'enrollment' | 'union';

/**
 * Pure helper: merge child id lists according to scope mode.
 * Exported for unit tests.
 */
export function mergeChildIdsForCycleScope(
	registrationChildIds: Iterable<string>,
	enrollmentChildIds: Iterable<string>,
	mode: CycleScopeMode = 'union',
): string[] {
	const registration = new Set(registrationChildIds);
	const enrollment = new Set(enrollmentChildIds);

	if (mode === 'registration') {
		return [...registration];
	}
	if (mode === 'enrollment') {
		return [...enrollment];
	}

	const union = new Set<string>(registration);
	for (const id of enrollment) {
		union.add(id);
	}
	return [...union];
}

/**
 * Child IDs linked to a cycle via registrations and/or enrolled ministry rows.
 */
export async function getChildIdsForCycle(
	cycleId: string,
	mode: CycleScopeMode = 'union',
): Promise<string[]> {
	const needRegistration = mode === 'registration' || mode === 'union';
	const needEnrollment = mode === 'enrollment' || mode === 'union';

	const [registrations, enrollments] = await Promise.all([
		needRegistration
			? dbAdapter.listRegistrations({ cycleId })
			: Promise.resolve([]),
		needEnrollment
			? dbAdapter.listMinistryEnrollments(undefined, undefined, cycleId)
			: Promise.resolve([]),
	]);

	const registrationIds = registrations.map((r) => r.child_id);
	const enrollmentIds = enrollments
		.filter((e) => e.status === 'enrolled')
		.map((e) => e.child_id);

	return mergeChildIdsForCycleScope(registrationIds, enrollmentIds, mode);
}

/**
 * Household IDs that have at least one active child in the cycle scope.
 */
export async function householdIdsForCycle(
	cycleId: string,
	mode: CycleScopeMode = 'union',
): Promise<string[]> {
	const childIds = new Set(await getChildIdsForCycle(cycleId, mode));
	if (childIds.size === 0) return [];

	const children = await dbAdapter.listChildren({ isActive: true });
	const householdIds = new Set<string>();
	for (const child of children) {
		if (child.is_active === false) continue;
		if (childIds.has(child.child_id)) {
			householdIds.add(child.household_id);
		}
	}
	return [...householdIds];
}

/**
 * Household + child counts for dashboard registration metrics (active children only).
 */
export async function getRegistrationStatsForCycle(
	cycleId: string,
	mode: CycleScopeMode = 'union',
): Promise<{ householdCount: number; childCount: number; cycleId: string }> {
	const childIds = new Set(await getChildIdsForCycle(cycleId, mode));
	if (childIds.size === 0) {
		return { householdCount: 0, childCount: 0, cycleId };
	}

	const children = await dbAdapter.listChildren({ isActive: true });
	const scopedChildren = children.filter(
		(c) => c.is_active !== false && childIds.has(c.child_id),
	);
	const householdIds = new Set(scopedChildren.map((c) => c.household_id));

	return {
		householdCount: householdIds.size,
		childCount: scopedChildren.length,
		cycleId,
	};
}

/**
 * Resolve the active cycle and return scoped registration stats.
 */
export async function getActiveCycleRegistrationStats(
	mode: CycleScopeMode = 'union',
): Promise<{
	householdCount: number;
	childCount: number;
	cycleId: string;
	cycleName: string;
}> {
	const cycle = await requireActiveRegistrationCycle();
	const stats = await getRegistrationStatsForCycle(cycle.cycle_id, mode);
	return {
		...stats,
		cycleName: cycle.name,
	};
}

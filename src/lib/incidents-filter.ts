import { isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import type { Incident } from '@/lib/types';

export type IncidentStatusFilter = 'all' | 'pending' | 'acknowledged';
export type IncidentSeverityFilter = 'all' | 'high' | 'medium' | 'low';

export const ALL_MINISTRIES = 'all';

export interface IncidentFilters {
	status: IncidentStatusFilter;
	severity: IncidentSeverityFilter;
	ministryId: string;
	/** Inclusive day-boundary range. `to` defaults to `from` for a single day. */
	dateRange?: { from?: Date; to?: Date };
}

export const EMPTY_INCIDENT_FILTERS: IncidentFilters = {
	status: 'all',
	severity: 'all',
	ministryId: ALL_MINISTRIES,
	dateRange: undefined,
};

export function hasActiveIncidentFilters(filters: IncidentFilters): boolean {
	return (
		filters.status !== 'all' ||
		filters.severity !== 'all' ||
		filters.ministryId !== ALL_MINISTRIES ||
		!!filters.dateRange?.from
	);
}

/**
 * Narrow an already-authorized incident list for display.
 *
 * This is presentation-only: `getIncidentsForUser` has already applied the
 * role/ministry-leader scope, so nothing here may widen visibility. A child can
 * belong to several ministries, so an incident matches a ministry filter when
 * that child is enrolled in the selected ministry.
 */
export function filterIncidents(
	incidents: Incident[],
	filters: IncidentFilters,
	ministryIdsByChild: Map<string, Set<string>>
): Incident[] {
	let filtered = incidents;

	if (filters.status === 'pending') {
		filtered = filtered.filter((i) => !i.admin_acknowledged_at);
	} else if (filters.status === 'acknowledged') {
		filtered = filtered.filter((i) => !!i.admin_acknowledged_at);
	}

	if (filters.severity !== 'all') {
		filtered = filtered.filter((i) => i.severity === filters.severity);
	}

	if (filters.ministryId !== ALL_MINISTRIES) {
		filtered = filtered.filter((i) =>
			ministryIdsByChild.get(i.child_id)?.has(filters.ministryId)
		);
	}

	const from = filters.dateRange?.from;
	if (from) {
		const start = startOfDay(from);
		const end = endOfDay(filters.dateRange?.to ?? from);
		filtered = filtered.filter((i) => {
			const at = new Date(i.timestamp);
			return !isBefore(at, start) && !isAfter(at, end);
		});
	}

	return filtered;
}

/** child_id → set of ministry ids, from active-cycle ministry enrollments. */
export function buildMinistryIdsByChild(
	enrollments: Array<{ child_id?: string; ministry_id?: string }>
): Map<string, Set<string>> {
	const map = new Map<string, Set<string>>();
	for (const enrollment of enrollments) {
		if (!enrollment.child_id || !enrollment.ministry_id) continue;
		if (!map.has(enrollment.child_id)) {
			map.set(enrollment.child_id, new Set());
		}
		map.get(enrollment.child_id)!.add(enrollment.ministry_id);
	}
	return map;
}

import {
	ALL_MINISTRIES,
	EMPTY_INCIDENT_FILTERS,
	buildMinistryIdsByChild,
	filterIncidents,
	hasActiveIncidentFilters,
	type IncidentFilters,
} from '@/lib/incidents-filter';
import type { Incident } from '@/lib/types';

function incident(overrides: Partial<Incident> & { incident_id: string }): Incident {
	return {
		child_id: 'child-1',
		child_name: 'Test Child',
		severity: 'low',
		description: 'Synthetic incident.',
		leader_id: 'leader-1',
		timestamp: '2026-09-13T14:20:00.000Z',
		admin_acknowledged_at: null,
		...overrides,
	} as Incident;
}

const pendingHigh = incident({
	incident_id: 'inc-high',
	severity: 'high',
	timestamp: '2026-09-13T14:20:00.000Z',
});
const ackLow = incident({
	incident_id: 'inc-low',
	child_id: 'child-2',
	severity: 'low',
	timestamp: '2026-09-06T13:44:00.000Z',
	admin_acknowledged_at: '2026-09-06T15:00:00.000Z',
});
const pendingMedium = incident({
	incident_id: 'inc-medium',
	child_id: 'child-3',
	severity: 'medium',
	timestamp: '2026-08-30T11:02:00.000Z',
});

const all = [pendingHigh, ackLow, pendingMedium];

const ministryIdsByChild = buildMinistryIdsByChild([
	{ child_id: 'child-1', ministry_id: 'min-ss' },
	{ child_id: 'child-1', ministry_id: 'min-choir' },
	{ child_id: 'child-2', ministry_id: 'min-choir' },
]);

const base: IncidentFilters = EMPTY_INCIDENT_FILTERS;
const ids = (list: Incident[]) => list.map((i) => i.incident_id);

describe('filterIncidents', () => {
	it('returns everything when no filter is active', () => {
		expect(ids(filterIncidents(all, base, ministryIdsByChild))).toEqual([
			'inc-high',
			'inc-low',
			'inc-medium',
		]);
	});

	it('filters by pending status', () => {
		const out = filterIncidents(all, { ...base, status: 'pending' }, ministryIdsByChild);
		expect(ids(out)).toEqual(['inc-high', 'inc-medium']);
	});

	it('filters by acknowledged status', () => {
		const out = filterIncidents(
			all,
			{ ...base, status: 'acknowledged' },
			ministryIdsByChild
		);
		expect(ids(out)).toEqual(['inc-low']);
	});

	it.each(['high', 'medium', 'low'] as const)('filters by %s severity', (severity) => {
		const out = filterIncidents(all, { ...base, severity }, ministryIdsByChild);
		expect(out.every((i) => i.severity === severity)).toBe(true);
		expect(out).toHaveLength(1);
	});

	it('filters by ministry through the child enrollment join', () => {
		const out = filterIncidents(
			all,
			{ ...base, ministryId: 'min-choir' },
			ministryIdsByChild
		);
		expect(ids(out)).toEqual(['inc-high', 'inc-low']);
	});

	it('excludes incidents whose child has no enrollment for the ministry', () => {
		const out = filterIncidents(
			all,
			{ ...base, ministryId: 'min-ss' },
			ministryIdsByChild
		);
		// child-3 has no enrollments at all and must not leak through
		expect(ids(out)).toEqual(['inc-high']);
	});

	// The date picker hands back local-midnight Dates and the filter uses local
	// day boundaries, so these fixtures are built the same way (month is
	// 0-indexed). Constructing them as UTC instants would compare against the
	// wrong calendar day for any negative UTC offset.
	const localDay = (year: number, monthIndex: number, day: number) =>
		new Date(year, monthIndex, day);

	it('filters by an inclusive date range', () => {
		const out = filterIncidents(
			all,
			{
				...base,
				dateRange: {
					from: localDay(2026, 8, 6),
					to: localDay(2026, 8, 13),
				},
			},
			ministryIdsByChild
		);
		expect(ids(out)).toEqual(['inc-high', 'inc-low']);
	});

	it('treats a single selected day as that whole day', () => {
		const out = filterIncidents(
			all,
			{ ...base, dateRange: { from: localDay(2026, 8, 13) } },
			ministryIdsByChild
		);
		expect(ids(out)).toEqual(['inc-high']);
	});

	it('combines filters conjunctively', () => {
		const out = filterIncidents(
			all,
			{ ...base, status: 'pending', ministryId: 'min-choir' },
			ministryIdsByChild
		);
		expect(ids(out)).toEqual(['inc-high']);
	});

	it('can produce an empty result without mutating the input', () => {
		const out = filterIncidents(
			all,
			{ ...base, status: 'acknowledged', severity: 'high' },
			ministryIdsByChild
		);
		expect(out).toEqual([]);
		expect(all).toHaveLength(3);
	});
});

describe('hasActiveIncidentFilters', () => {
	it('is false for the empty filter set', () => {
		expect(hasActiveIncidentFilters(base)).toBe(false);
	});

	it.each([
		['status', { ...base, status: 'pending' as const }],
		['severity', { ...base, severity: 'high' as const }],
		['ministry', { ...base, ministryId: 'min-ss' }],
		['date range', { ...base, dateRange: { from: new Date('2026-09-13') } }],
	])('is true when %s is set', (_label, filters) => {
		expect(hasActiveIncidentFilters(filters)).toBe(true);
	});

	it('ignores an empty date range object', () => {
		expect(hasActiveIncidentFilters({ ...base, dateRange: {} })).toBe(false);
	});
});

describe('buildMinistryIdsByChild', () => {
	it('groups multiple ministries per child', () => {
		expect(Array.from(ministryIdsByChild.get('child-1')!)).toEqual([
			'min-ss',
			'min-choir',
		]);
	});

	it('skips malformed enrollment rows', () => {
		const map = buildMinistryIdsByChild([
			{ child_id: 'child-1' },
			{ ministry_id: 'min-ss' },
			{},
		]);
		expect(map.size).toBe(0);
	});

	it('uses ALL_MINISTRIES as the documented sentinel', () => {
		expect(ALL_MINISTRIES).toBe('all');
	});
});

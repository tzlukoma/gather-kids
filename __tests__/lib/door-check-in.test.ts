import {
	computeDoorStats,
	countDoorStatuses,
	deriveDoorRowStatus,
	filterByDoorStatus,
	formatDoorStatusLabel,
	isCheckedInTo,
	isOnSite,
	matchesDoorStatusFilter,
	selectableForCheckIn,
	summarizeSelectedHouseholds,
	type DoorRosterEntry,
} from '@/lib/door-check-in';

/** The event the door is running in these fixtures. */
const SUNDAY = 'evt_sunday_school';
/** A concurrent event a child can be on site at instead. */
const CHILDRENS = 'evt_childrens_church';

function entry(
	child_id: string,
	options: {
		attendanceId?: string;
		checkInAt?: string;
		household?: string;
		/** Defaults to the event the door is running. */
		eventId?: string | null;
	} = {}
): DoorRosterEntry {
	return {
		child_id,
		activeAttendance: options.attendanceId
			? {
					attendance_id: options.attendanceId,
					check_in_at: options.checkInAt,
					event_id:
						options.eventId === undefined ? SUNDAY : options.eventId,
			  }
			: null,
		household: options.household ? { name: options.household } : null,
	};
}

// Roster mirroring Figma 17:2: 3 on site, 3 not checked in.
const amara = entry('amara', { household: 'Bennett' });
const eli = entry('eli', { household: 'Bennett' });
const jordan = entry('jordan', {
	attendanceId: 'att-jordan',
	checkInAt: '2026-09-13T14:04:00.000Z',
	household: 'Kim',
});
const maya = entry('maya', { attendanceId: 'att-maya', household: 'Okonjo' });
const noah = entry('noah', { attendanceId: 'att-noah', household: 'Ruiz' });
const sofia = entry('sofia', { household: 'Alvarez' });

const roster = [amara, eli, jordan, maya, noah, sofia];

const ids = (list: DoorRosterEntry[]) => list.map((e) => e.child_id);

describe('isOnSite', () => {
	it('is true only when an open attendance row exists', () => {
		expect(isOnSite(jordan)).toBe(true);
		expect(isOnSite(amara)).toBe(false);
	});
});

describe('deriveDoorRowStatus', () => {
	it('exposes the attendance id the check-out mutation needs', () => {
		expect(deriveDoorRowStatus(jordan, SUNDAY)).toEqual({
			status: 'checkedIn',
			attendanceId: 'att-jordan',
			checkInAt: '2026-09-13T14:04:00.000Z',
			elsewhereEventId: null,
		});
	});

	it('reports not checked in with no attendance id to check out against', () => {
		expect(deriveDoorRowStatus(amara, SUNDAY)).toEqual({
			status: 'notCheckedIn',
			attendanceId: null,
			checkInAt: null,
			elsewhereEventId: null,
		});
	});

	it('tolerates an attendance row with no check-in timestamp', () => {
		expect(deriveDoorRowStatus(maya, SUNDAY)).toEqual({
			status: 'checkedIn',
			attendanceId: 'att-maya',
			checkInAt: null,
			elsewhereEventId: null,
		});
	});
});

describe('formatDoorStatusLabel', () => {
	it('labels a not-checked-in row', () => {
		expect(formatDoorStatusLabel(deriveDoorRowStatus(amara, SUNDAY))).toBe(
			'Not checked in'
		);
	});

	it('appends the check-in time when there is one', () => {
		expect(formatDoorStatusLabel(deriveDoorRowStatus(jordan, SUNDAY))).toMatch(
			/^Checked in \d{1,2}:\d{2} (AM|PM)$/
		);
	});

	it('falls back to the bare label rather than rendering an invalid date', () => {
		expect(formatDoorStatusLabel(deriveDoorRowStatus(maya, SUNDAY))).toBe('Checked in');
		expect(
			formatDoorStatusLabel({
				status: 'checkedIn',
				attendanceId: 'att-x',
				checkInAt: 'not-a-timestamp',
				elsewhereEventId: null,
			})
		).toBe('Checked in');
	});
});

describe('computeDoorStats', () => {
	it('counts on site, the roster total and the remainder', () => {
		const stats = computeDoorStats(roster, [], SUNDAY);
		expect(stats.onSite).toBe(3);
		expect(stats.total).toBe(6);
		expect(stats.notCheckedIn).toBe(3);
	});

	it('always reconciles: on site + not checked in === total', () => {
		const stats = computeDoorStats(roster, [], SUNDAY);
		expect(stats.onSite + stats.notCheckedIn).toBe(stats.total);
	});

	it('counts only incidents still awaiting admin acknowledgement', () => {
		const stats = computeDoorStats(
			roster,
			[
				{ admin_acknowledged_at: null },
				{ admin_acknowledged_at: undefined },
				{ admin_acknowledged_at: '2026-09-13T16:00:00.000Z' },
			],
			SUNDAY
		);
		expect(stats.openIncidents).toBe(2);
	});

	it('handles an empty roster without dividing by anything', () => {
		expect(computeDoorStats([], [], SUNDAY)).toEqual({
			onSite: 0,
			total: 0,
			notCheckedIn: 0,
			checkedInElsewhere: 0,
			openIncidents: 0,
		});
	});
});

describe('countDoorStatuses', () => {
	it('produces the live tab counts', () => {
		expect(countDoorStatuses(roster, SUNDAY)).toEqual({
			all: 6,
			checkedIn: 3,
			notCheckedIn: 3,
		});
	});

	it('agrees with the stats cards', () => {
		const stats = computeDoorStats(roster, [], SUNDAY);
		const counts = countDoorStatuses(roster, SUNDAY);
		expect(counts.all).toBe(stats.total);
		expect(counts.checkedIn).toBe(stats.onSite);
		expect(counts.notCheckedIn).toBe(stats.notCheckedIn);
	});
});

describe('matchesDoorStatusFilter / filterByDoorStatus', () => {
	it('matches everything under "all"', () => {
		expect(roster.every((e) => matchesDoorStatusFilter(e, 'all', SUNDAY))).toBe(true);
		expect(ids(filterByDoorStatus(roster, 'all', SUNDAY))).toEqual(ids(roster));
	});

	it('keeps only children on site under "checkedIn"', () => {
		expect(ids(filterByDoorStatus(roster, 'checkedIn', SUNDAY))).toEqual([
			'jordan',
			'maya',
			'noah',
		]);
	});

	it('keeps only children not on site under "checkedOut" (the Not checked in tab)', () => {
		expect(ids(filterByDoorStatus(roster, 'checkedOut', SUNDAY))).toEqual([
			'amara',
			'eli',
			'sofia',
		]);
	});

	it('partitions the roster with no row counted twice or lost', () => {
		const checkedIn = filterByDoorStatus(roster, 'checkedIn', SUNDAY);
		const notCheckedIn = filterByDoorStatus(roster, 'checkedOut', SUNDAY);
		expect(checkedIn.length + notCheckedIn.length).toBe(roster.length);
		expect(
			checkedIn.some((c) => notCheckedIn.some((n) => n.child_id === c.child_id))
		).toBe(false);
	});
});

/**
 * Cross-event behaviour.
 *
 * A child can be on site at an event other than the one this door is running.
 * The legacy `ChildCard` distinguished the two ("In Children's Church", with
 * Check In disabled); the GatherSystem door lost that in #383, which matters
 * once the door can also check children *out*: without it, the Sunday School
 * door would happily release a child from the Children's Church roster.
 */
describe('a child on site at a different event', () => {
	const elsewhere = entry('priya', {
		attendanceId: 'att-priya',
		checkInAt: '2026-09-13T14:10:00.000Z',
		household: 'Okonjo',
		eventId: CHILDRENS,
	});
	const mixed = [amara, jordan, elsewhere];

	it('is on site, but not checked in to this door\'s event', () => {
		expect(isOnSite(elsewhere)).toBe(true);
		expect(isCheckedInTo(elsewhere, SUNDAY)).toBe(false);
		expect(isCheckedInTo(elsewhere, CHILDRENS)).toBe(true);
	});

	it('offers no attendance id, so this door cannot check them out', () => {
		const state = deriveDoorRowStatus(elsewhere, SUNDAY);
		expect(state.status).toBe('checkedInElsewhere');
		expect(state.attendanceId).toBeNull();
		expect(state.elsewhereEventId).toBe(CHILDRENS);
	});

	it('names the event holding them', () => {
		expect(formatDoorStatusLabel(deriveDoorRowStatus(elsewhere, SUNDAY))).toBe(
			"In Children's Church"
		);
	});

	it('falls back to a generic label rather than a blank chip', () => {
		expect(
			formatDoorStatusLabel({
				status: 'checkedInElsewhere',
				attendanceId: null,
				checkInAt: null,
				elsewhereEventId: null,
			})
		).toBe('In another event');
	});

	it('is not counted as on site here, and is called out on the card', () => {
		const stats = computeDoorStats(mixed, [], SUNDAY);
		expect(stats.onSite).toBe(1);
		expect(stats.notCheckedIn).toBe(2);
		expect(stats.checkedInElsewhere).toBe(1);
		expect(stats.onSite + stats.notCheckedIn).toBe(stats.total);
	});

	it('lands in the Not checked in tab, never in Checked in', () => {
		expect(matchesDoorStatusFilter(elsewhere, 'checkedIn', SUNDAY)).toBe(false);
		expect(matchesDoorStatusFilter(elsewhere, 'checkedOut', SUNDAY)).toBe(true);
		expect(countDoorStatuses(mixed, SUNDAY)).toEqual({
			all: 3,
			checkedIn: 1,
			notCheckedIn: 2,
		});
	});

	it('cannot be swept into this event by a bulk check-in', () => {
		expect(
			ids(selectableForCheckIn(mixed, ['amara', 'priya', 'jordan']))
		).toEqual(['amara']);
	});

	it('swaps sides when the door changes to that event', () => {
		expect(countDoorStatuses(mixed, CHILDRENS)).toEqual({
			all: 3,
			checkedIn: 1,
			notCheckedIn: 2,
		});
		expect(deriveDoorRowStatus(elsewhere, CHILDRENS).attendanceId).toBe(
			'att-priya'
		);
		// ...and Jordan, checked in to Sunday School, becomes the one held elsewhere.
		expect(deriveDoorRowStatus(jordan, CHILDRENS).status).toBe(
			'checkedInElsewhere'
		);
	});

	it('treats an attendance row with no event at all as this door\'s own', () => {
		// Otherwise such a row could never be closed from any door, leaving a
		// child marked on site after they have gone home.
		const noEvent = entry('legacy-row', {
			attendanceId: 'att-legacy',
			eventId: null,
		});
		expect(deriveDoorRowStatus(noEvent, SUNDAY).attendanceId).toBe('att-legacy');
		expect(deriveDoorRowStatus(noEvent, CHILDRENS).attendanceId).toBe(
			'att-legacy'
		);
	});
});

/**
 * An open attendance row carrying no `event_id` is the one case where the row
 * status and the aggregates could disagree: the row is deliberately treated as
 * belonging to whichever door is asking, so that it stays closable. Every
 * consumer has to apply that same rule, or the row shows a Check out button
 * while the tab it belongs to, the on-site count and the "in another event"
 * label all say something different about it.
 */
describe('an open attendance row with no event', () => {
	const noEvent = entry('legacy-row', {
		attendanceId: 'att-legacy',
		checkInAt: '2026-09-13T14:00:00.000Z',
		household: 'Ruiz',
		eventId: null,
	});
	const withLegacyRow = [amara, jordan, noEvent];

	it('is checked in to whichever door is asking', () => {
		expect(isCheckedInTo(noEvent, SUNDAY)).toBe(true);
		expect(isCheckedInTo(noEvent, CHILDRENS)).toBe(true);
	});

	it('is counted on site, not as not-checked-in', () => {
		const stats = computeDoorStats(withLegacyRow, [], SUNDAY);
		expect(stats.onSite).toBe(2);
		expect(stats.notCheckedIn).toBe(1);
	});

	it('is never reported as being in another event, because it has none', () => {
		// The roster is this row alone, so the count can only be about it —
		// Jordan, checked in to Sunday School, really is elsewhere from the
		// Children's Church door and would otherwise account for it.
		const alone = [noEvent];
		for (const event of [SUNDAY, CHILDRENS]) {
			const stats = computeDoorStats(alone, [], event);
			expect(stats.checkedInElsewhere).toBe(0);
			expect(stats.onSite).toBe(1);
		}
	});

	it('appears in the Checked in tab it offers a check-out from', () => {
		expect(matchesDoorStatusFilter(noEvent, 'checkedIn', SUNDAY)).toBe(true);
		expect(matchesDoorStatusFilter(noEvent, 'checkedOut', SUNDAY)).toBe(false);
		expect(ids(filterByDoorStatus(withLegacyRow, 'checkedIn', SUNDAY))).toEqual([
			'jordan',
			'legacy-row',
		]);
	});

	it('cannot be checked in again by a bulk action', () => {
		expect(ids(selectableForCheckIn(withLegacyRow, ['amara', 'legacy-row']))).toEqual(
			['amara']
		);
	});
});

/**
 * The property that makes the above hold for every row, not just the ones with
 * a test: the row's own status, the tab predicate and the card arithmetic are
 * all the same question, so they must never give different answers.
 */
describe('row status, tabs and cards agree for every row', () => {
	const everyShape = [
		...roster,
		entry('elsewhere', { attendanceId: 'att-e', eventId: CHILDRENS }),
		entry('no-event', { attendanceId: 'att-n', eventId: null }),
	];

	for (const event of [SUNDAY, CHILDRENS]) {
		it(`holds with the door set to ${event}`, () => {
			const counts = countDoorStatuses(everyShape, event);
			const stats = computeDoorStats(everyShape, [], event);

			for (const row of everyShape) {
				const isHere = deriveDoorRowStatus(row, event).status === 'checkedIn';
				expect(isCheckedInTo(row, event)).toBe(isHere);
				expect(matchesDoorStatusFilter(row, 'checkedIn', event)).toBe(isHere);
				// Only a row on site somewhere else is "elsewhere".
				expect(deriveDoorRowStatus(row, event).status === 'checkedInElsewhere').toBe(
					isOnSite(row) && !isHere
				);
			}

			expect(counts.checkedIn).toBe(stats.onSite);
			expect(counts.notCheckedIn).toBe(stats.notCheckedIn);
			expect(stats.onSite + stats.notCheckedIn).toBe(stats.total);
			expect(stats.checkedInElsewhere).toBe(
				everyShape.filter(
					(r) =>
						deriveDoorRowStatus(r, event).status === 'checkedInElsewhere'
				).length
			);
		});
	}
});

describe('summarizeSelectedHouseholds', () => {
	it('is empty with nothing selected', () => {
		expect(summarizeSelectedHouseholds(roster, [])).toBe('');
	});

	it('orders by count then name and multiplies repeats', () => {
		expect(
			summarizeSelectedHouseholds(roster, ['amara', 'eli', 'sofia'])
		).toBe('Bennett ×2 · Alvarez');
	});

	it('names a single child household without a multiplier', () => {
		expect(summarizeSelectedHouseholds(roster, ['sofia'])).toBe('Alvarez');
	});

	it('caps the list so the dock cannot overflow', () => {
		expect(
			summarizeSelectedHouseholds(
				roster,
				['amara', 'eli', 'jordan', 'maya', 'noah', 'sofia'],
				2
			)
		).toBe('Bennett ×2 · Alvarez · +3 more');
	});

	it('labels a missing household rather than printing "undefined"', () => {
		expect(
			summarizeSelectedHouseholds([entry('orphan')], ['orphan'])
		).toBe('Unknown household');
	});

	it('ignores selected ids that are not on the roster', () => {
		expect(summarizeSelectedHouseholds(roster, ['ghost'])).toBe('');
	});
});

describe('selectableForCheckIn', () => {
	it('drops children who are already on site', () => {
		expect(
			ids(selectableForCheckIn(roster, ['amara', 'jordan', 'sofia']))
		).toEqual(['amara', 'sofia']);
	});

	it('is empty when every selected child is already checked in', () => {
		expect(selectableForCheckIn(roster, ['jordan', 'maya'])).toEqual([]);
	});
});

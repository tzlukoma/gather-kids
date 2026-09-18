import {
	computeDoorStats,
	countDoorStatuses,
	deriveDoorRowStatus,
	filterByDoorStatus,
	formatDoorStatusLabel,
	isOnSite,
	matchesDoorStatusFilter,
	selectableForCheckIn,
	summarizeSelectedHouseholds,
	type DoorRosterEntry,
} from '@/lib/door-check-in';

function entry(
	child_id: string,
	options: {
		attendanceId?: string;
		checkInAt?: string;
		household?: string;
	} = {}
): DoorRosterEntry {
	return {
		child_id,
		activeAttendance: options.attendanceId
			? {
					attendance_id: options.attendanceId,
					check_in_at: options.checkInAt,
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
		expect(deriveDoorRowStatus(jordan)).toEqual({
			status: 'checkedIn',
			attendanceId: 'att-jordan',
			checkInAt: '2026-09-13T14:04:00.000Z',
		});
	});

	it('reports not checked in with no attendance id to check out against', () => {
		expect(deriveDoorRowStatus(amara)).toEqual({
			status: 'notCheckedIn',
			attendanceId: null,
			checkInAt: null,
		});
	});

	it('tolerates an attendance row with no check-in timestamp', () => {
		expect(deriveDoorRowStatus(maya)).toEqual({
			status: 'checkedIn',
			attendanceId: 'att-maya',
			checkInAt: null,
		});
	});
});

describe('formatDoorStatusLabel', () => {
	it('labels a not-checked-in row', () => {
		expect(formatDoorStatusLabel(deriveDoorRowStatus(amara))).toBe(
			'Not checked in'
		);
	});

	it('appends the check-in time when there is one', () => {
		expect(formatDoorStatusLabel(deriveDoorRowStatus(jordan))).toMatch(
			/^Checked in \d{1,2}:\d{2} (AM|PM)$/
		);
	});

	it('falls back to the bare label rather than rendering an invalid date', () => {
		expect(formatDoorStatusLabel(deriveDoorRowStatus(maya))).toBe('Checked in');
		expect(
			formatDoorStatusLabel({
				status: 'checkedIn',
				attendanceId: 'att-x',
				checkInAt: 'not-a-timestamp',
			})
		).toBe('Checked in');
	});
});

describe('computeDoorStats', () => {
	it('counts on site, the roster total and the remainder', () => {
		const stats = computeDoorStats(roster, []);
		expect(stats.onSite).toBe(3);
		expect(stats.total).toBe(6);
		expect(stats.notCheckedIn).toBe(3);
	});

	it('always reconciles: on site + not checked in === total', () => {
		const stats = computeDoorStats(roster, []);
		expect(stats.onSite + stats.notCheckedIn).toBe(stats.total);
	});

	it('counts only incidents still awaiting admin acknowledgement', () => {
		const stats = computeDoorStats(roster, [
			{ admin_acknowledged_at: null },
			{ admin_acknowledged_at: undefined },
			{ admin_acknowledged_at: '2026-09-13T16:00:00.000Z' },
		]);
		expect(stats.openIncidents).toBe(2);
	});

	it('handles an empty roster without dividing by anything', () => {
		expect(computeDoorStats([], [])).toEqual({
			onSite: 0,
			total: 0,
			notCheckedIn: 0,
			openIncidents: 0,
		});
	});
});

describe('countDoorStatuses', () => {
	it('produces the live tab counts', () => {
		expect(countDoorStatuses(roster)).toEqual({
			all: 6,
			checkedIn: 3,
			notCheckedIn: 3,
		});
	});

	it('agrees with the stats cards', () => {
		const stats = computeDoorStats(roster, []);
		const counts = countDoorStatuses(roster);
		expect(counts.all).toBe(stats.total);
		expect(counts.checkedIn).toBe(stats.onSite);
		expect(counts.notCheckedIn).toBe(stats.notCheckedIn);
	});
});

describe('matchesDoorStatusFilter / filterByDoorStatus', () => {
	it('matches everything under "all"', () => {
		expect(roster.every((e) => matchesDoorStatusFilter(e, 'all'))).toBe(true);
		expect(ids(filterByDoorStatus(roster, 'all'))).toEqual(ids(roster));
	});

	it('keeps only children on site under "checkedIn"', () => {
		expect(ids(filterByDoorStatus(roster, 'checkedIn'))).toEqual([
			'jordan',
			'maya',
			'noah',
		]);
	});

	it('keeps only children not on site under "checkedOut" (the Not checked in tab)', () => {
		expect(ids(filterByDoorStatus(roster, 'checkedOut'))).toEqual([
			'amara',
			'eli',
			'sofia',
		]);
	});

	it('partitions the roster with no row counted twice or lost', () => {
		const checkedIn = filterByDoorStatus(roster, 'checkedIn');
		const notCheckedIn = filterByDoorStatus(roster, 'checkedOut');
		expect(checkedIn.length + notCheckedIn.length).toBe(roster.length);
		expect(
			checkedIn.some((c) => notCheckedIn.some((n) => n.child_id === c.child_id))
		).toBe(false);
	});
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

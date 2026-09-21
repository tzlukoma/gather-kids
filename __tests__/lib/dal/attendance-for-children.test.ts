/**
 * The guardian home's attendance read is scoped to the household's own
 * children. Attendance carries no RLS, so the scope of the query is the scope
 * of what reaches the browser — these tests hold that line.
 */

const listAttendance = jest.fn();

jest.mock('@/lib/database/factory', () => ({
	db: {
		listAttendance: (...args: unknown[]) => listAttendance(...args),
	},
}));

import { getAttendanceForChildrenOnDate } from '@/lib/dal/attendance';
import { queryKeys } from '@/hooks/data/keys';

describe('getAttendanceForChildrenOnDate', () => {
	beforeEach(() => {
		listAttendance.mockReset();
		listAttendance.mockResolvedValue([]);
	});

	it('asks only for the children it was given, on the given date', async () => {
		await getAttendanceForChildrenOnDate(['amara', 'eli'], '2026-09-21');

		expect(listAttendance).toHaveBeenCalledTimes(1);
		expect(listAttendance).toHaveBeenCalledWith({
			childIds: ['amara', 'eli'],
			date: '2026-09-21',
		});
	});

	it('never asks for the whole day', async () => {
		await getAttendanceForChildrenOnDate(['amara'], '2026-09-21');

		const filters = listAttendance.mock.calls[0][0];
		expect(filters).toHaveProperty('childIds');
		expect(filters.childIds).toEqual(['amara']);
	});

	it('returns nothing for an empty household without going to the database', async () => {
		await expect(getAttendanceForChildrenOnDate([], '2026-09-21')).resolves.toEqual(
			[]
		);
		expect(listAttendance).not.toHaveBeenCalled();
	});

	it('passes the adapter rows straight through', async () => {
		const rows = [{ attendance_id: 'a1', child_id: 'amara' }];
		listAttendance.mockResolvedValue(rows);

		await expect(
			getAttendanceForChildrenOnDate(['amara'], '2026-09-21')
		).resolves.toBe(rows);
	});
});

describe('attendanceForChildren query key', () => {
	it('is stable whatever order the children arrive in', () => {
		expect(queryKeys.attendanceForChildren('2026-09-21', ['eli', 'amara'])).toEqual(
			queryKeys.attendanceForChildren('2026-09-21', ['amara', 'eli'])
		);
	});

	it('separates different households and different days', () => {
		expect(
			queryKeys.attendanceForChildren('2026-09-21', ['amara'])
		).not.toEqual(queryKeys.attendanceForChildren('2026-09-21', ['eli']));
		expect(
			queryKeys.attendanceForChildren('2026-09-21', ['amara'])
		).not.toEqual(queryKeys.attendanceForChildren('2026-09-28', ['amara']));
	});

	it('sits under the date prefix the check-in mutations invalidate', () => {
		// `useCheckInMutation` invalidates `queryKeys.attendance(today)`, and
		// TanStack matches by prefix. If this key stopped starting with that
		// prefix, checking a child in would leave the home screen stale.
		const prefix = queryKeys.attendance('2026-09-21');
		const scoped = queryKeys.attendanceForChildren('2026-09-21', ['amara']);
		expect(scoped.slice(0, prefix.length)).toEqual(prefix);
	});
});

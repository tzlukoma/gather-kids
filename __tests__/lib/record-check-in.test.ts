import {
	ALREADY_CHECKED_IN_MESSAGE,
	getCheckedInCount,
	recordCheckIn,
} from '@/lib/dal/attendance';
import { db as dbAdapter } from '@/lib/database/factory';

jest.mock('@/lib/database/factory', () => ({
	db: {
		listAttendance: jest.fn(),
		createAttendance: jest.fn(),
	},
}));

const mockAdapter = dbAdapter as unknown as {
	listAttendance: jest.Mock;
	createAttendance: jest.Mock;
};

describe('getCheckedInCount', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('counts a child once when two open rows exist for them', async () => {
		mockAdapter.listAttendance.mockResolvedValue([
			{ child_id: 'c1', check_out_at: null },
			{ child_id: 'c1', check_out_at: null },
			{ child_id: 'c2', check_out_at: null },
		]);

		await expect(getCheckedInCount('2026-09-20')).resolves.toBe(2);
	});
});

describe('recordCheckIn', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('throws when the child already has an open row', async () => {
		mockAdapter.listAttendance.mockResolvedValue([
			{ child_id: 'c1', check_out_at: null, attendance_id: 'att-1' },
		]);

		await expect(
			recordCheckIn('c1', 'evt_sunday_school')
		).rejects.toThrow(ALREADY_CHECKED_IN_MESSAGE);
		expect(mockAdapter.createAttendance).not.toHaveBeenCalled();
	});

	it('maps a unique-violation insert to the already-checked-in error', async () => {
		mockAdapter.listAttendance.mockResolvedValue([]);
		mockAdapter.createAttendance.mockRejectedValue({
			code: '23505',
			message: 'duplicate key value violates unique constraint',
		});

		await expect(
			recordCheckIn('c1', 'evt_sunday_school')
		).rejects.toThrow(ALREADY_CHECKED_IN_MESSAGE);
	});
});

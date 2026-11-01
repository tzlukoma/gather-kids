import {
	AttendanceTransferError,
	transferCheckIn,
} from '@/lib/dal/attendance';
import { db as dbAdapter } from '@/lib/database/factory';
import { transferDestinations } from '@/lib/door-check-in';
import { canTransferCheckIn } from '@/lib/permissions';
import { AuthRole, type BaseUser } from '@/lib/auth-types';

jest.mock('@/lib/database/factory', () => ({
	db: {
		transferAttendance: jest.fn(),
		updateAttendance: jest.fn(),
		createAttendance: jest.fn(),
	},
}));

const mockAdapter = dbAdapter as unknown as {
	transferAttendance: jest.Mock;
	updateAttendance: jest.Mock;
	createAttendance: jest.Mock;
};

/**
 * The client half of #561. The database (`transfer_attendance`) owns
 * atomicity, authorization and destination validation; see
 * `scripts/db/check_attendance_transfer.sql`. What the DAL owns is making one
 * call for the whole move and turning a refusal into something staff can act
 * on.
 */
describe('transferCheckIn', () => {
	beforeEach(() => jest.clearAllMocks());

	it('moves the child in one atomic call and returns the destination row', async () => {
		mockAdapter.transferAttendance.mockResolvedValue('att-dest');

		await expect(transferCheckIn('att-src', 'evt_teen_church')).resolves.toBe('att-dest');
		expect(mockAdapter.transferAttendance).toHaveBeenCalledWith('att-src', 'evt_teen_church');
		// Never a check-out followed by a check-in from the browser.
		expect(mockAdapter.updateAttendance).not.toHaveBeenCalled();
		expect(mockAdapter.createAttendance).not.toHaveBeenCalled();
	});

	it.each([
		[
			'P0002',
			'this child has already been moved to another event',
			'stale',
			'This child has already been moved to another event.',
		],
		[
			'22023',
			'that event is not set up for check-in',
			'invalid',
			'That event is not set up for check-in.',
		],
		[
			'42501',
			'permission denied for function transfer_attendance',
			'forbidden',
			'You are not allowed to transfer this child.',
		],
		[
			'08006',
			'connection failure',
			'failed',
			'The transfer did not go through and nothing was changed. Please try again.',
		],
	])('maps SQLSTATE %s to a %s refusal staff can read', async (code, serverMessage, reason, shown) => {
		mockAdapter.transferAttendance.mockRejectedValue({ code, message: serverMessage });

		const error = await transferCheckIn('att-src', 'evt_teen_church').catch((e) => e);
		expect(error).toBeInstanceOf(AttendanceTransferError);
		expect(error.reason).toBe(reason);
		expect(error.message).toBe(shown);
	});

	it('treats a thrown non-database error as a failed transfer', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(new TypeError('fetch failed'));

		const error = await transferCheckIn('att-src', 'evt_teen_church').catch((e) => e);
		expect(error.reason).toBe('failed');
	});
});

describe('transferDestinations', () => {
	it('offers every configured check-in event except the current one', () => {
		expect(transferDestinations('evt_sunday_school')).toEqual([
			{ id: 'evt_childrens_church', name: "Children's Church" },
			{ id: 'evt_teen_church', name: 'Teen Church' },
		]);
	});

	it('does not invent events that are not configured, such as Joy Bells', () => {
		const ids = transferDestinations('evt_sunday_school').map((d) => d.id);
		expect(ids.some((id) => /joy/i.test(id))).toBe(false);
	});

	it('offers all configured events when the source is unknown', () => {
		expect(transferDestinations(null)).toHaveLength(3);
	});
});

describe('canTransferCheckIn', () => {
	const user = (role: AuthRole): BaseUser =>
		({ uid: 'u-1', metadata: { role } }) as unknown as BaseUser;

	it('offers the action to admins and ministry leaders', () => {
		expect(canTransferCheckIn(user(AuthRole.ADMIN))).toBe(true);
		expect(canTransferCheckIn(user(AuthRole.MINISTRY_LEADER))).toBe(true);
	});

	it('does not offer it to anyone else, or to no one signed in', () => {
		expect(canTransferCheckIn(user(AuthRole.GUARDIAN))).toBe(false);
		expect(canTransferCheckIn(user(AuthRole.VOLUNTEER))).toBe(false);
		expect(canTransferCheckIn(user(AuthRole.GUEST))).toBe(false);
		expect(canTransferCheckIn(null)).toBe(false);
	});
});

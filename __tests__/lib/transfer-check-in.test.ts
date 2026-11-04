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
		getAttendance: jest.fn(),
		updateAttendance: jest.fn(),
		createAttendance: jest.fn(),
	},
}));

const mockAdapter = dbAdapter as unknown as {
	transferAttendance: jest.Mock;
	getAttendance: jest.Mock;
	updateAttendance: jest.Mock;
	createAttendance: jest.Mock;
};

/** What postgrest-js returns when the request never got an answer. */
const LOST_RESPONSE = { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' };

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
			// PostgREST answered: it could not reach the database, so nothing ran.
			'PGRST000',
			'Could not connect with the database',
			'failed',
			'The transfer was refused and nothing was changed. Please try again.',
		],
		[
			'57014',
			'canceling statement due to statement timeout',
			'failed',
			'The transfer was refused and nothing was changed. Please try again.',
		],
	])('maps the database answer %s to a confirmed %s refusal staff can read', async (code, serverMessage, reason, shown) => {
		mockAdapter.transferAttendance.mockRejectedValue({ code, message: serverMessage });

		const error = await transferCheckIn('att-src', 'evt_teen_church').catch((e) => e);
		expect(error).toBeInstanceOf(AttendanceTransferError);
		expect(error.reason).toBe(reason);
		expect(error.message).toBe(shown);
	});

});

/**
 * Review finding on #563: a lost response does not prove a rollback. The
 * database may have committed before the answer was lost, so staff must never
 * be told "nothing changed" on a transport failure. The DAL reads the source
 * row back and reports what actually happened.
 */
describe('transferCheckIn when the response is lost', () => {
	beforeEach(() => jest.clearAllMocks());

	const NOTHING_CHANGED = /nothing (was )?changed/i;

	it('reports success when the transfer committed but its response was lost', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(LOST_RESPONSE);
		mockAdapter.getAttendance.mockImplementation(async (id: string) =>
			id === 'att-src'
				? {
						attendance_id: 'att-src',
						event_id: 'evt_sunday_school',
						check_out_at: '2026-11-01T15:15:00Z',
						transferred_to_attendance_id: 'att-dest',
					}
				: {
						attendance_id: 'att-dest',
						event_id: 'evt_joy_bells',
						check_out_at: null,
						transferred_from_attendance_id: 'att-src',
					}
		);

		await expect(transferCheckIn('att-src', 'evt_joy_bells')).resolves.toBe('att-dest');
		// Reconciled by reading, not by sending the transfer again.
		expect(mockAdapter.transferAttendance).toHaveBeenCalledTimes(1);
	});

	it('says it could not confirm, and where the child is, when the source is still open', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(LOST_RESPONSE);
		mockAdapter.getAttendance.mockResolvedValue({
			attendance_id: 'att-src',
			event_id: 'evt_sunday_school',
			check_out_at: null,
			transferred_to_attendance_id: null,
		});

		const error = await transferCheckIn('att-src', 'evt_joy_bells').catch((e) => e);
		expect(error).toBeInstanceOf(AttendanceTransferError);
		expect(error.reason).toBe('unknown');
		expect(error.currentEventId).toBe('evt_sunday_school');
		expect(error.message).toMatch(/unable to confirm/i);
		expect(error.message).not.toMatch(NOTHING_CHANGED);
	});

	it('names the other event when someone else moved the child meanwhile', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(LOST_RESPONSE);
		mockAdapter.getAttendance.mockImplementation(async (id: string) =>
			id === 'att-src'
				? { attendance_id: 'att-src', event_id: 'evt_sunday_school', check_out_at: 'x', transferred_to_attendance_id: 'att-other' }
				: { attendance_id: 'att-other', event_id: 'evt_teen_church', check_out_at: null }
		);

		const error = await transferCheckIn('att-src', 'evt_joy_bells').catch((e) => e);
		expect(error.reason).toBe('unknown');
		expect(error.currentEventId).toBe('evt_teen_church');
	});

	/** Serve `getAttendance` from a fixed set of synthetic rows. */
	function rows(...list: Array<Record<string, unknown>>) {
		const byId = new Map(list.map((r) => [r.attendance_id as string, r]));
		mockAdapter.getAttendance.mockImplementation(async (id: string) => byId.get(id) ?? null);
	}

	/*
	 * Follow-up review on #563: the transfer to B committed and its response
	 * was lost, then the child was picked up from B, or moved on from B to C,
	 * before the read-back. B matches the requested destination but is closed,
	 * so this is not a plain success: staff must not be told the child is
	 * "still on site" in B.
	 */
	it('does not report success when the destination has since been checked out', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(LOST_RESPONSE);
		rows(
			{ attendance_id: 'att-a', event_id: 'evt_sunday_school', check_out_at: 't1', transferred_to_attendance_id: 'att-b' },
			{ attendance_id: 'att-b', event_id: 'evt_joy_bells', check_out_at: 't2', picked_up_by: 'Guardian A', pickup_method: 'PIN', transferred_to_attendance_id: null },
		);

		const error = await transferCheckIn('att-a', 'evt_joy_bells').catch((e) => e);
		expect(error).toBeInstanceOf(AttendanceTransferError);
		expect(error.reason).toBe('stale');
		expect(error.message).toBe('The transfer went through, but the child has since been checked out.');
		expect(error.currentEventId).toBeNull();
	});

	it('names the onward event when the child has since been moved from the destination', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(LOST_RESPONSE);
		rows(
			{ attendance_id: 'att-a', event_id: 'evt_sunday_school', check_out_at: 't1', transferred_to_attendance_id: 'att-b' },
			{ attendance_id: 'att-b', event_id: 'evt_joy_bells', check_out_at: 't2', transferred_to_attendance_id: 'att-c' },
			{ attendance_id: 'att-c', event_id: 'evt_teen_church', check_out_at: null, transferred_to_attendance_id: null },
		);

		const error = await transferCheckIn('att-a', 'evt_joy_bells').catch((e) => e);
		expect(error.reason).toBe('stale');
		expect(error.message).toBe('The transfer went through, but the child has since been moved to another event.');
		expect(error.currentEventId).toBe('evt_teen_church');
	});

	it('follows a longer chain to a pickup after an onward transfer', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(LOST_RESPONSE);
		rows(
			{ attendance_id: 'att-a', event_id: 'evt_sunday_school', check_out_at: 't1', transferred_to_attendance_id: 'att-b' },
			{ attendance_id: 'att-b', event_id: 'evt_joy_bells', check_out_at: 't2', transferred_to_attendance_id: 'att-c' },
			{ attendance_id: 'att-c', event_id: 'evt_teen_church', check_out_at: 't3', transferred_to_attendance_id: null },
		);

		const error = await transferCheckIn('att-a', 'evt_joy_bells').catch((e) => e);
		expect(error.reason).toBe('stale');
		expect(error.message).toMatch(/checked out/);
		expect(error.currentEventId).toBeNull();
	});

	it('reports an unknown outcome if the chain cannot be read to its end', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(LOST_RESPONSE);
		rows(
			{ attendance_id: 'att-a', event_id: 'evt_sunday_school', check_out_at: 't1', transferred_to_attendance_id: 'att-b' },
			{ attendance_id: 'att-b', event_id: 'evt_joy_bells', check_out_at: 't2', transferred_to_attendance_id: 'att-missing' },
		);

		const error = await transferCheckIn('att-a', 'evt_joy_bells').catch((e) => e);
		expect(error.reason).toBe('unknown');
		expect(error.currentEventId).toBeNull();
	});

	it('still does not claim nothing changed when the check cannot be made either', async () => {
		mockAdapter.transferAttendance.mockRejectedValue(new TypeError('Failed to fetch'));
		mockAdapter.getAttendance.mockRejectedValue(new TypeError('Failed to fetch'));

		const error = await transferCheckIn('att-src', 'evt_joy_bells').catch((e) => e);
		expect(error.reason).toBe('unknown');
		expect(error.currentEventId).toBeNull();
		expect(error.message).toMatch(/unable to confirm/i);
		expect(error.message).toMatch(/trying again is safe/i);
		expect(error.message).not.toMatch(NOTHING_CHANGED);
	});

	it.each([['EPIPE'], ['ECONNRESET'], ['']])(
		'treats transport code %p as a lost response, not a database answer',
		async (code) => {
			mockAdapter.transferAttendance.mockRejectedValue({ code, message: 'socket closed' });
			mockAdapter.getAttendance.mockRejectedValue(new Error('offline'));

			const error = await transferCheckIn('att-src', 'evt_joy_bells').catch((e) => e);
			expect(error.reason).toBe('unknown');
		}
	);
});

describe('transferDestinations', () => {
	const persisted = [
		{ id: 'evt_sunday_school', name: 'Sunday School' },
		{ id: 'evt_childrens_church', name: "Children's Church" },
		{ id: 'evt_joy_bells', name: 'Joy Bells' },
	];

	it('offers every persisted check-in event except the current one', () => {
		expect(transferDestinations(persisted, 'evt_sunday_school')).toEqual([
			{ id: 'evt_childrens_church', name: "Children's Church" },
			{ id: 'evt_joy_bells', name: 'Joy Bells' },
		]);
	});

	it('offers all events when the source is unknown', () => {
		expect(transferDestinations(persisted, null)).toHaveLength(3);
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

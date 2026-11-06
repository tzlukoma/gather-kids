import {
	createCheckInEvent,
	deleteCheckInEvent,
	EventManagementError,
	renameCheckInEvent,
	setCheckInEventArchived,
} from '@/lib/dal/events';
import { db as dbAdapter } from '@/lib/database/factory';

jest.mock('@/lib/database/factory', () => ({
	db: {
		createCheckInEvent: jest.fn(),
		updateCheckInEvent: jest.fn(),
		deleteEvent: jest.fn(),
		getEvent: jest.fn(),
	},
}));

const mockAdapter = dbAdapter as unknown as {
	createCheckInEvent: jest.Mock;
	updateCheckInEvent: jest.Mock;
	deleteEvent: jest.Mock;
	getEvent: jest.Mock;
};

const existing = [
	{ id: 'evt_sunday_school', name: 'Sunday School' },
	{ id: 'evt_joy_bells', name: 'Joy Bells (old)', archived: true },
];

/**
 * #565. The database is the authority (admin-only RLS, blank-name check,
 * delete refused with history); the DAL turns its answers into something an
 * admin can act on, and catches what it can before the round trip.
 */
describe('createCheckInEvent', () => {
	beforeEach(() => jest.clearAllMocks());

	it('creates with a derived id and the tidied name', async () => {
		mockAdapter.createCheckInEvent.mockResolvedValue({
			event_id: 'evt_joy_bells_2',
			name: 'Joy Bells',
			archived_at: null,
		});
		mockAdapter.createCheckInEvent.mockClear();

		await expect(
			createCheckInEvent('  Joy   Bells ', [...existing, { id: 'evt_joy_bells', name: 'x' }])
		).resolves.toEqual({ id: 'evt_joy_bells_2', name: 'Joy Bells', archived: false });
		expect(mockAdapter.createCheckInEvent).toHaveBeenCalledWith({
			event_id: 'evt_joy_bells_2',
			name: 'Joy Bells',
		});
	});

	it('refuses a blank or duplicate name without a round trip', async () => {
		for (const name of ['  ', 'sunday school']) {
			const error = await createCheckInEvent(name, existing).catch((e) => e);
			expect(error).toBeInstanceOf(EventManagementError);
			expect(error.reason).toBe('invalid_name');
		}
		expect(mockAdapter.createCheckInEvent).not.toHaveBeenCalled();
	});

	it('reports a database refusal for a non-admin', async () => {
		mockAdapter.createCheckInEvent.mockRejectedValue({ code: '42501', message: 'new row violates row-level security policy' });
		const error = await createCheckInEvent('Youth Night', existing).catch((e) => e);
		expect(error.reason).toBe('forbidden');
		expect(error.message).toBe('Only admins can manage events.');
	});
});

describe('name conflicts the database catches (#567 review)', () => {
	beforeEach(() => jest.clearAllMocks());

	const nameConflict = {
		code: '23505',
		message: 'duplicate key value violates unique constraint "events_name_unique_normalized"',
		details: 'Key (lower(btrim(regexp_replace(name, \'\\s+\'::text, \' \'::text, \'g\'::text))))=(joy bells) already exists.',
	};

	it('reports a stale-tab rename into a taken name as a duplicate name', async () => {
		// This tab's list does not know another admin just took the name.
		mockAdapter.updateCheckInEvent.mockRejectedValue(nameConflict);
		const error = await renameCheckInEvent('evt_sunday_school', 'Joy Bells', existing).catch((e) => e);
		expect(error.reason).toBe('duplicate_name');
		expect(error.message).toMatch(/already has this name/);
	});

	it('reports a create into a taken name as a duplicate name', async () => {
		mockAdapter.createCheckInEvent.mockRejectedValue(nameConflict);
		const error = await createCheckInEvent('Youth Night', existing).catch((e) => e);
		expect(error.reason).toBe('duplicate_name');
	});

	it('still reports an id collision as an id collision', async () => {
		mockAdapter.createCheckInEvent.mockRejectedValue({
			code: '23505',
			message: 'duplicate key value violates unique constraint "events_pkey"',
		});
		const error = await createCheckInEvent('Youth Night', existing).catch((e) => e);
		expect(error.reason).toBe('failed');
		expect(error.message).toMatch(/same id/);
	});
});

describe('renameCheckInEvent', () => {
	beforeEach(() => jest.clearAllMocks());

	it('changes only the name, keeping the id', async () => {
		mockAdapter.updateCheckInEvent.mockResolvedValue({});
		await renameCheckInEvent('evt_sunday_school', ' Sunday  Bible Class ', existing);
		expect(mockAdapter.updateCheckInEvent).toHaveBeenCalledWith('evt_sunday_school', {
			name: 'Sunday Bible Class',
		});
	});

	it('reports a row it could not reach', async () => {
		mockAdapter.updateCheckInEvent.mockRejectedValue({ code: 'PGRST116', message: '0 rows' });
		const error = await renameCheckInEvent('evt_sunday_school', 'New', existing).catch((e) => e);
		expect(error.reason).toBe('not_found');
	});
});

describe('setCheckInEventArchived', () => {
	beforeEach(() => jest.clearAllMocks());

	it('archives with a timestamp and restores with null', async () => {
		mockAdapter.updateCheckInEvent.mockResolvedValue({});
		await setCheckInEventArchived('evt_x', true);
		expect(mockAdapter.updateCheckInEvent.mock.calls[0][1].archived_at).toEqual(expect.any(String));
		await setCheckInEventArchived('evt_x', false);
		expect(mockAdapter.updateCheckInEvent.mock.calls[1][1]).toEqual({ archived_at: null });
	});
});

describe('deleteCheckInEvent', () => {
	beforeEach(() => jest.clearAllMocks());

	it('deletes an event with no history', async () => {
		mockAdapter.deleteEvent.mockResolvedValue(undefined);
		mockAdapter.getEvent.mockResolvedValue(null);
		await expect(deleteCheckInEvent('evt_empty')).resolves.toBeUndefined();
	});

	it('turns the database refusal for an event with history into "archive instead"', async () => {
		mockAdapter.deleteEvent.mockRejectedValue({
			code: '23503',
			message: 'this event has attendance history and cannot be deleted; archive it instead',
		});
		const error = await deleteCheckInEvent('evt_used').catch((e) => e);
		expect(error.reason).toBe('has_history');
		expect(error.message).toBe(
			'This event has attendance history, so it cannot be deleted. Archive it instead.'
		);
	});

	it('does not claim success when the delete removed nothing', async () => {
		// RLS hides the row from a non-admin delete without an error.
		mockAdapter.deleteEvent.mockResolvedValue(undefined);
		mockAdapter.getEvent.mockResolvedValue({ event_id: 'evt_x', name: 'X' });
		const error = await deleteCheckInEvent('evt_x').catch((e) => e);
		expect(error.reason).toBe('forbidden');
	});
});

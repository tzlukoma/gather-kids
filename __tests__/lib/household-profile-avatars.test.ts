/**
 * getHouseholdProfile must enrich children with avatars.storage_path as photo_url,
 * matching getAllChildren() (issue #415).
 */

const mockFrom = jest.fn();

jest.mock('@/lib/database/factory', () => {
	const mockAdapter = {
		getHousehold: jest.fn(),
		listGuardians: jest.fn(),
		listEmergencyContacts: jest.fn(),
		listChildren: jest.fn(),
		listMinistryEnrollments: jest.fn(),
		listMinistries: jest.fn(),
		listRegistrationCycles: jest.fn(),
		client: {
			from: (...args: unknown[]) => mockFrom(...args),
		},
	};
	return {
		createDatabaseAdapter: jest.fn(() => mockAdapter),
		db: mockAdapter,
	};
});

import { getHouseholdProfile } from '@/lib/dal/households';
import { db as mockAdapter } from '@/lib/database/factory';

const mockDb = mockAdapter as unknown as {
	getHousehold: jest.Mock;
	listGuardians: jest.Mock;
	listEmergencyContacts: jest.Mock;
	listChildren: jest.Mock;
	listMinistryEnrollments: jest.Mock;
	listMinistries: jest.Mock;
	listRegistrationCycles: jest.Mock;
};

function avatarQuery(result: {
	data: { entity_id: string; storage_path: string }[] | null;
	error: unknown;
}) {
	const chain = {
		select: jest.fn().mockReturnThis(),
		eq: jest.fn().mockReturnThis(),
		in: jest.fn().mockResolvedValue(result),
	};
	mockFrom.mockReturnValue(chain);
	return chain;
}

describe('getHouseholdProfile avatar enrichment', () => {
	const householdId = 'hh-1';
	const childId = 'child-1';

	beforeEach(() => {
		jest.clearAllMocks();

		mockDb.getHousehold.mockResolvedValue({
			household_id: householdId,
			name: 'Test Household',
		});
		mockDb.listGuardians.mockResolvedValue([]);
		mockDb.listEmergencyContacts.mockResolvedValue([]);
		mockDb.listChildren.mockResolvedValue([
			{
				child_id: childId,
				household_id: householdId,
				first_name: 'Ada',
				last_name: 'Lovelace',
				is_active: true,
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
			},
		]);
		mockDb.listMinistryEnrollments.mockResolvedValue([]);
		mockDb.listMinistries.mockResolvedValue([]);
		mockDb.listRegistrationCycles.mockResolvedValue([
			{
				cycle_id: 'cycle-1',
				name: 'Fall 2026',
				is_active: true,
				start_date: '2026-09-01',
				end_date: '2027-06-30',
			},
		]);
	});

	it('sets child photo_url from avatars.storage_path', async () => {
		const chain = avatarQuery({
			data: [{ entity_id: childId, storage_path: 'avatars/children/ada.webp' }],
			error: null,
		});

		const profile = await getHouseholdProfile(householdId);

		expect(mockFrom).toHaveBeenCalledWith('avatars');
		expect(chain.select).toHaveBeenCalledWith('entity_id, storage_path');
		expect(chain.eq).toHaveBeenCalledWith('entity_type', 'child');
		expect(chain.in).toHaveBeenCalledWith('entity_id', [childId]);
		expect(profile.children[0].photo_url).toBe('avatars/children/ada.webp');
	});

	it('leaves photo_url undefined when no avatar row exists', async () => {
		avatarQuery({ data: [], error: null });

		const profile = await getHouseholdProfile(householdId);

		expect(profile.children[0].photo_url).toBeUndefined();
	});

	it('skips the avatars query when the household has no children', async () => {
		mockDb.listChildren.mockResolvedValue([]);

		const profile = await getHouseholdProfile(householdId);

		expect(mockFrom).not.toHaveBeenCalled();
		expect(profile.children).toEqual([]);
	});
});

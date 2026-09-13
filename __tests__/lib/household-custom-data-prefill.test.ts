import { fetchFullHouseholdDataFromAdapter } from '@/lib/dal/households';

jest.mock('@/lib/database/factory', () => ({
	db: {
		getHousehold: jest.fn(),
		listGuardians: jest.fn(),
		listEmergencyContacts: jest.fn(),
		listChildren: jest.fn(),
		listMinistryEnrollments: jest.fn(),
		listMinistries: jest.fn(),
	},
}));

import { db } from '@/lib/database/factory';

describe('fetchFullHouseholdDataFromAdapter customData prefill', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(db.getHousehold as jest.Mock).mockResolvedValue({
			household_id: 'household-1',
			name: 'Rivera Household',
		});
		(db.listGuardians as jest.Mock).mockResolvedValue([]);
		(db.listEmergencyContacts as jest.Mock).mockResolvedValue([]);
		(db.listChildren as jest.Mock).mockResolvedValue([
			{
				child_id: 'child-1',
				first_name: 'Jordan',
				last_name: 'Rivera',
				is_active: true,
			},
		]);
		(db.listMinistryEnrollments as jest.Mock).mockResolvedValue([
			{
				child_id: 'child-1',
				ministry_id: 'min_custom',
				status: 'enrolled',
				custom_fields: { 'experience-notes': 'Prefilled answer' },
			},
		]);
		(db.listMinistries as jest.Mock).mockResolvedValue([
			{
				ministry_id: 'min_custom',
				code: 'e2e-custom-questions',
				enrollment_type: 'enrolled',
			},
		]);
	});

	it('maps enrollment custom_fields into child customData for wizard controls', async () => {
		const profile = await fetchFullHouseholdDataFromAdapter('household-1', 'cycle-1');

		expect(profile.children[0].customData).toEqual({
			'experience-notes': 'Prefilled answer',
		});
		expect(profile.children[0].ministrySelections).toEqual({
			'e2e-custom-questions': true,
		});
	});
});

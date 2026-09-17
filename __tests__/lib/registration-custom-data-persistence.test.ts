import { db } from '@/lib/database/factory';
import { registerHouseholdCanonical } from '@/lib/database/canonical-dal';

jest.mock('@/lib/database/factory', () => ({
	db: {
		transaction: jest.fn(async (fn: () => Promise<unknown>) => fn()),
		createHousehold: jest.fn(),
		createGuardian: jest.fn(),
		createEmergencyContact: jest.fn(),
		createChild: jest.fn(),
		createRegistration: jest.fn(),
		createMinistryEnrollment: jest.fn(),
		listMinistries: jest.fn(),
		listChildren: jest.fn(),
		getHouseholdForUser: jest.fn(),
	},
}));

jest.mock('@/lib/supabaseClient', () => ({
	supabase: null,
}));

jest.mock('@/lib/bibleBee', () => ({
	enrollChildInBibleBee: jest.fn(),
}));

const CUSTOM_MINISTRY = {
	ministry_id: 'min_custom',
	code: 'e2e-custom-questions',
	name: 'E2E Custom Questions Ministry',
	enrollment_type: 'enrolled' as const,
	data_profile: 'Basic',
	is_active: true,
	custom_questions: [
		{
			id: 'experience-notes',
			text: 'Experience notes',
			type: 'text' as const,
		},
	],
};

describe('registration customData persistence', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(db.transaction as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) =>
			fn()
		);
		(db.createHousehold as jest.Mock).mockResolvedValue({
			household_id: 'household-1',
			name: 'Test Household',
			address_line1: '100 Test St',
			city: 'Perth Amboy',
			state: 'NJ',
			zip: '08861',
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
		});
		(db.createGuardian as jest.Mock).mockImplementation(async (data: Record<string, unknown>) => ({
			guardian_id: 'guardian-1',
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z',
			...data,
		}));
		(db.createEmergencyContact as jest.Mock).mockResolvedValue({ contact_id: 'contact-1' });
		(db.createChild as jest.Mock).mockImplementation(async (data: Record<string, unknown>) => ({
			child_id: data.child_id || 'child-1',
			...data,
		}));
		(db.createRegistration as jest.Mock).mockResolvedValue({ registration_id: 'reg-1' });
		(db.createMinistryEnrollment as jest.Mock).mockResolvedValue({ enrollment_id: 'enr-1' });
		(db.listMinistries as jest.Mock).mockResolvedValue([CUSTOM_MINISTRY]);
		(db.listChildren as jest.Mock).mockResolvedValue([]);
		(db.getHouseholdForUser as jest.Mock).mockResolvedValue(null);
	});

	it('persists wizard customData answers on ministry enrollment custom_fields', async () => {
		await registerHouseholdCanonical(
			{
				household: {
					name: 'Test Household',
					address_line1: '100 Test St',
					city: 'Perth Amboy',
					state: 'NJ',
					zip: '08861',
				},
				guardians: [
					{
						first_name: 'Alex',
						last_name: 'Rivera',
						mobile_phone: '5551234567',
						email: 'alex@example.com',
						relationship: 'Parent',
						is_primary: true,
					},
				],
				emergencyContact: {
					first_name: 'Sam',
					last_name: 'Lee',
					mobile_phone: '5559876543',
					relationship: 'Aunt',
				},
				children: [
					{
						first_name: 'Jordan',
						last_name: 'Rivera',
						dob: '2015-05-15',
						grade: '3rd',
						is_active: true,
						ministrySelections: { 'e2e-custom-questions': true },
						customData: { 'experience-notes': 'Two years in choir' },
					},
				],
				consents: {
					liability: true,
					photoRelease: true,
				},
			},
			'test-cycle-id'
		);

		expect(db.createMinistryEnrollment).toHaveBeenCalledWith(
			expect.objectContaining({
				ministry_id: 'min_custom',
				custom_fields: { 'experience-notes': 'Two years in choir' },
			})
		);
	});

	it('does not merge customData across children', async () => {
		(db.createChild as jest.Mock)
			.mockImplementationOnce(async (data: Record<string, unknown>) => ({
				child_id: 'child-a',
				...data,
			}))
			.mockImplementationOnce(async (data: Record<string, unknown>) => ({
				child_id: 'child-b',
				...data,
			}));

		await registerHouseholdCanonical(
			{
				household: {
					address_line1: '100 Test St',
					city: 'Perth Amboy',
					state: 'NJ',
					zip: '08861',
				},
				guardians: [
					{
						first_name: 'Alex',
						last_name: 'Rivera',
						mobile_phone: '5551234567',
						relationship: 'Parent',
						is_primary: true,
					},
				],
				emergencyContact: {
					first_name: 'Sam',
					last_name: 'Lee',
					mobile_phone: '5559876543',
					relationship: 'Aunt',
				},
				children: [
					{
						first_name: 'Jordan',
						last_name: 'Rivera',
						dob: '2015-05-15',
						grade: '3rd',
						is_active: true,
						ministrySelections: { 'e2e-custom-questions': true },
						customData: { 'experience-notes': 'Child A answer' },
					},
					{
						first_name: 'Taylor',
						last_name: 'Rivera',
						dob: '2017-08-01',
						grade: '1st',
						is_active: true,
						ministrySelections: { 'e2e-custom-questions': true },
						customData: { 'experience-notes': 'Child B answer' },
					},
				],
				consents: {
					liability: true,
					photoRelease: true,
				},
			},
			'test-cycle-id'
		);

		const enrollmentCalls = (db.createMinistryEnrollment as jest.Mock).mock.calls.filter(
			([payload]) => payload.ministry_id === 'min_custom'
		);

		expect(enrollmentCalls).toHaveLength(2);
		expect(enrollmentCalls[0][0].custom_fields).toEqual({
			'experience-notes': 'Child A answer',
		});
		expect(enrollmentCalls[1][0].custom_fields).toEqual({
			'experience-notes': 'Child B answer',
		});
	});
});

import { db } from '@/lib/database/factory';
import { registerHouseholdCanonical } from '@/lib/database/canonical-dal';
import { registerHousehold } from '@/lib/dal/registration';

const PERSISTED_HOUSEHOLD_ID = 'persisted-from-adapter';

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


import { stubHouseholdRoute } from '../helpers/household-route-stub';

const { createdHouseholdIds, bibleBeeEnrollRequests, calls } = stubHouseholdRoute();

const newHouseholdPayload = {
	household: {
		name: 'Rivera Household',
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
			email: 'alex.rivera@example.com',
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
			dob: '2018-06-15',
			grade: 'K',
			is_active: true,
		},
	],
	consents: {
		liability: true,
		photoRelease: true,
	},
};

describe('new household registration ids', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(db.transaction as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) =>
			fn(),
		);
		(db.createHousehold as jest.Mock).mockResolvedValue({
			household_id: PERSISTED_HOUSEHOLD_ID,
			name: 'Rivera Household',
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
		(db.listMinistries as jest.Mock).mockResolvedValue([]);
		(db.listChildren as jest.Mock).mockResolvedValue([]);
		(db.getHouseholdForUser as jest.Mock).mockResolvedValue(null);
	});

	// The guarantee is unchanged — related rows must carry the id the household
	// was actually persisted under, never one invented locally. What changed is
	// where that id comes from: `POST /api/household` returns it, because the
	// browser no longer chooses it (#496).
	test('registerHouseholdCanonical uses the server-issued id for related rows', async () => {
		const result = await registerHouseholdCanonical(newHouseholdPayload, 'test-cycle-id');

		expect(db.createHousehold).not.toHaveBeenCalled();
		const serverIssuedId = createdHouseholdIds[0];
		expect(db.createGuardian).toHaveBeenCalledWith(
			expect.objectContaining({ household_id: serverIssuedId }),
		);
		expect(db.createEmergencyContact).toHaveBeenCalledWith(
			expect.objectContaining({ household_id: serverIssuedId }),
		);
		expect(db.createChild).toHaveBeenCalledWith(
			expect.objectContaining({ household_id: serverIssuedId }),
		);
		expect(result.household_id).toBe(serverIssuedId);
	});

	test('registerHousehold uses createHousehold return id for related rows', async () => {
		const result = await registerHousehold(newHouseholdPayload, 'test-cycle-id', false);

		expect(db.createHousehold).toHaveBeenCalled();
		expect(db.createGuardian).toHaveBeenCalledWith(
			expect.objectContaining({ household_id: PERSISTED_HOUSEHOLD_ID }),
		);
		expect(db.createEmergencyContact).toHaveBeenCalledWith(
			expect.objectContaining({ household_id: PERSISTED_HOUSEHOLD_ID }),
		);
		expect(db.createChild).toHaveBeenCalledWith(
			expect.objectContaining({ household_id: PERSISTED_HOUSEHOLD_ID }),
		);
		expect(result.household_id).toBe(PERSISTED_HOUSEHOLD_ID);
	});

	// Families may not write Bible Bee records (#527), so signing a child up
	// for Bible Bee asks the server to enroll them, naming only the child. The
	// cycle and division are the server's to decide.
	test('Bible Bee sign-up is enrolled by the server, never from the browser', async () => {
		(db.listMinistries as jest.Mock).mockResolvedValue([
			{
				ministry_id: 'min-bible-bee',
				code: 'bible-bee',
				name: 'Bible Bee',
				enrollment_type: 'enrolled',
				is_active: true,
			},
		]);
		const payload = {
			...newHouseholdPayload,
			children: [{ ...newHouseholdPayload.children[0], ministrySelections: { 'bible-bee': true } }],
		};

		await registerHouseholdCanonical(payload, 'test-cycle-id');

		const childId = (db.createChild as jest.Mock).mock.calls[0][0].child_id;
		expect(db.createMinistryEnrollment).toHaveBeenCalledWith(
			expect.objectContaining({ child_id: childId, ministry_id: 'min-bible-bee' }),
		);
		expect(bibleBeeEnrollRequests).toEqual([{ childId }]);
		// The route authorizes a guardian through their `user_households` link.
		// `/api/household` creates that link together with the household, so
		// it must come first. (`/api/household/link`, later in registration,
		// only covers an existing household and would be too late.)
		expect(calls.indexOf('/api/household')).toBe(0);
		expect(calls.indexOf('/api/bible-bee/enroll')).toBeGreaterThan(0);
		expect((db as unknown as Record<string, unknown>).createEnrollment).toBeUndefined();
	});
});

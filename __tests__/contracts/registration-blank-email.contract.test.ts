import { db } from '@/lib/database/factory';
import { registerHouseholdCanonical } from '@/lib/database/canonical-dal';

/**
 * Contract: a guardian who leaves their email blank can still register.
 *
 * #460 — the schema-level halves of this are covered in
 * `__tests__/lib/blank-guardian-email.test.ts`. This exercises the whole
 * persistence path, because `GuardianWriteDto.parse` runs inside
 * `registerHouseholdCanonical`: before the fix a blank email threw there, after
 * the guardian had already pressed submit, and the wizard turned it into a
 * generic "Submission Error" toast with the registration lost.
 */

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

jest.mock('@/lib/supabaseClient', () => ({ supabase: null }));
jest.mock('@/lib/bibleBee', () => ({ enrollChildInBibleBee: jest.fn() }));


import { stubHouseholdRoute } from '../helpers/household-route-stub';

const { createdHouseholdIds, requests: householdRequests } = stubHouseholdRoute();

const SUNDAY_SCHOOL = {
	ministry_id: 'min_sunday_school',
	code: 'min_sunday_school',
	name: 'Sunday School',
	enrollment_type: 'enrolled' as const,
	data_profile: 'Basic',
	is_active: true,
};

function payload(guardianEmail: string | undefined) {
	return {
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
				email: guardianEmail,
				relationship: 'Mother',
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
				first_name: 'Sky',
				last_name: 'Rivera',
				dob: '2016-03-02',
				grade: '4th',
				is_active: true,
			},
		],
		consents: { liability: true, photoRelease: true },
	};
}

describe('registration with a blank guardian email', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		(db.transaction as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
		(db.createHousehold as jest.Mock).mockResolvedValue({ household_id: 'household-1' });
		(db.createGuardian as jest.Mock).mockImplementation(async (data: Record<string, unknown>) => ({
			guardian_id: 'guardian-1',
			...data,
		}));
		(db.createEmergencyContact as jest.Mock).mockResolvedValue({ contact_id: 'contact-1' });
		(db.createChild as jest.Mock).mockImplementation(async (data: Record<string, unknown>) => ({
			child_id: data.child_id || 'child-1',
			...data,
		}));
		(db.createRegistration as jest.Mock).mockResolvedValue({ registration_id: 'reg-1' });
		(db.createMinistryEnrollment as jest.Mock).mockResolvedValue({ enrollment_id: 'enr-1' });
		(db.listMinistries as jest.Mock).mockResolvedValue([SUNDAY_SCHOOL]);
		(db.listChildren as jest.Mock).mockResolvedValue([]);
		(db.getHouseholdForUser as jest.Mock).mockResolvedValue(null);
	});

	it('completes rather than throwing part-way through', async () => {
		const result = await registerHouseholdCanonical(payload(''), 'cycle-1');

		// The id now comes back from `POST /api/household`, not from the browser.
		expect(result.household_id).toBe(createdHouseholdIds[0]);
		expect(db.createGuardian).toHaveBeenCalledTimes(1);
		expect(db.createChild).toHaveBeenCalledTimes(1);
		// The child is registered, which is the thing the blank email was costing.
		expect(result.registeredChildren[0].enrollments.map((e) => e.ministry_id)).toEqual([
			'min_sunday_school',
		]);
	});

	it('does not invent an email for the household', async () => {
		// `primary_email` is derived from the primary guardian, so a blank one must
		// stay blank rather than become a bogus address.
		await registerHouseholdCanonical(payload(''), 'cycle-1');

		// The household is created through the server now, so the thing to check
		// is what registration *sends* — an invented address would be in the body.
		expect(db.createHousehold as jest.Mock).not.toHaveBeenCalled();
		const sent = householdRequests[0];
		expect(sent.email === '' || sent.email === undefined || sent.email === null).toBe(true);
	});

	it('still registers when the email is present', async () => {
		await registerHouseholdCanonical(payload('alex@example.com'), 'cycle-1');

		const guardian = (db.createGuardian as jest.Mock).mock.calls[0][0];
		expect(guardian.email).toBe('alex@example.com');
	});

	it('refuses a malformed email instead of storing it', async () => {
		// Blank means "not provided"; a typo is still a mistake worth catching.
		await expect(registerHouseholdCanonical(payload('alex-at-example'), 'cycle-1')).rejects.toThrow();
	});
});

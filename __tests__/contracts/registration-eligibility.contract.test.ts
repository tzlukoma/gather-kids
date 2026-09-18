/**
 * Contract: a registration cannot persist an enrollment the child is not
 * eligible for, and it reports back exactly what it did persist.
 *
 * #400: the GatherSystem wizard offered every ministry to every child, the DAL
 * quietly dropped the ones that failed its age check, and the confirmation
 * screen — built from the submitted form rather than from the result — told the
 * family their child was enrolled in something with no enrollment behind it.
 * Hiding ineligible options in the wizard is the fix guardians see; this is the
 * boundary that has to hold for imports and any other caller.
 */

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

jest.mock('@/lib/supabaseClient', () => ({ supabase: null }));
jest.mock('@/lib/bibleBee', () => ({ enrollChildInBibleBee: jest.fn() }));

const TODAY = '2026-09-18';

const SUNDAY_SCHOOL = {
	ministry_id: 'min_sunday_school',
	code: 'min_sunday_school',
	name: 'Sunday School',
	enrollment_type: 'enrolled' as const,
	data_profile: 'Basic',
	is_active: true,
};

/** Ages 8–12, always open. */
const CHOIR = {
	ministry_id: 'min_choir',
	code: 'joy-bells',
	name: 'Joy Bells Choir',
	enrollment_type: 'enrolled' as const,
	min_age: 8,
	max_age: 12,
	data_profile: 'Basic',
	is_active: true,
};

/** Open to any age, but its enrollment window shut last month. */
const CLOSED_MINISTRY = {
	ministry_id: 'min_closed',
	code: 'summer-camp',
	name: 'Summer Camp',
	enrollment_type: 'enrolled' as const,
	open_at: '2026-05-01',
	close_at: '2026-08-31',
	data_profile: 'Basic',
	is_active: true,
};

/** A request to be contacted, not a place in the ministry. */
const INTEREST_ONLY = {
	ministry_id: 'min_mentoring',
	code: 'mentoring',
	name: 'Youth Mentoring',
	enrollment_type: 'expressed_interest' as const,
	data_profile: 'Basic',
	is_active: true,
};

const MINISTRIES = [SUNDAY_SCHOOL, CHOIR, CLOSED_MINISTRY, INTEREST_ONLY];

type ChildInput = Record<string, unknown>;

function payload(children: ChildInput[]) {
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
		children,
		consents: { liability: true, photoRelease: true },
	};
}

/** The ministry ids a registration actually wrote enrollments for. */
function persistedMinistryIds(): string[] {
	return (db.createMinistryEnrollment as jest.Mock).mock.calls.map(
		([args]) => args.ministry_id as string
	);
}

describe('registration eligibility contract', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T17:00:00.000Z`));

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
		(db.listMinistries as jest.Mock).mockResolvedValue(MINISTRIES);
		(db.listChildren as jest.Mock).mockResolvedValue([]);
		(db.getHouseholdForUser as jest.Mock).mockResolvedValue(null);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('refuses to persist a selection the child is too young for', async () => {
		// Turns 8 tomorrow — one day short of the choir's minimum.
		const result = await registerHouseholdCanonical(
			payload([
				{
					first_name: 'Jordan',
					last_name: 'Rivera',
					dob: '2018-09-19',
					grade: '2nd',
					is_active: true,
					ministrySelections: { 'joy-bells': true },
				},
			]),
			'cycle-1'
		);

		expect(persistedMinistryIds()).toEqual(['min_sunday_school']);
		expect(result.registeredChildren[0].enrollments.map(e => e.ministry_id)).toEqual([
			'min_sunday_school',
		]);
	});

	it('refuses to persist a selection the child has aged out of', async () => {
		// Turned 13 yesterday.
		await registerHouseholdCanonical(
			payload([
				{
					first_name: 'Casey',
					last_name: 'Rivera',
					dob: '2013-09-17',
					grade: '8th',
					is_active: true,
					ministrySelections: { 'joy-bells': true },
				},
			]),
			'cycle-1'
		);

		expect(persistedMinistryIds()).toEqual(['min_sunday_school']);
	});

	it('refuses to persist a selection whose enrollment window has closed', async () => {
		// The inline age check the wizard's path used to rely on had no window
		// rule at all, so a closed ministry persisted happily.
		await registerHouseholdCanonical(
			payload([
				{
					first_name: 'Rowan',
					last_name: 'Rivera',
					dob: '2015-01-01',
					grade: '5th',
					is_active: true,
					ministrySelections: { 'summer-camp': true },
				},
			]),
			'cycle-1'
		);

		expect(persistedMinistryIds()).toEqual(['min_sunday_school']);
	});

	it('persists a selection at the exact age boundary', async () => {
		// Turns 8 today. Inclusive bounds mean today counts.
		await registerHouseholdCanonical(
			payload([
				{
					first_name: 'Sky',
					last_name: 'Rivera',
					dob: '2018-09-18',
					grade: '3rd',
					is_active: true,
					ministrySelections: { 'joy-bells': true },
				},
			]),
			'cycle-1'
		);

		expect(persistedMinistryIds()).toEqual(['min_sunday_school', 'min_choir']);
	});

	it('enrolls the eligible sibling without letting the ineligible one through', async () => {
		const result = await registerHouseholdCanonical(
			payload([
				{
					child_id: 'child-eligible',
					first_name: 'Sky',
					last_name: 'Rivera',
					dob: '2016-03-02',
					grade: '4th',
					is_active: true,
					ministrySelections: { 'joy-bells': true },
				},
				{
					child_id: 'child-too-young',
					first_name: 'Robin',
					last_name: 'Rivera',
					dob: '2022-03-02',
					grade: 'Pre-K',
					is_active: true,
					ministrySelections: { 'joy-bells': true },
				},
			]),
			'cycle-1'
		);

		const [eligible, tooYoung] = result.registeredChildren;
		expect(eligible.first_name).toBe('Sky');
		expect(eligible.enrollments.map(e => e.ministry_id)).toEqual([
			'min_sunday_school',
			'min_choir',
		]);
		expect(tooYoung.first_name).toBe('Robin');
		expect(tooYoung.enrollments.map(e => e.ministry_id)).toEqual(['min_sunday_school']);
	});

	it('reports interest as interest and not as a confirmed enrollment', async () => {
		const result = await registerHouseholdCanonical(
			payload([
				{
					first_name: 'Sky',
					last_name: 'Rivera',
					dob: '2016-03-02',
					grade: '4th',
					is_active: true,
					ministrySelections: { 'joy-bells': true },
					interestSelections: { mentoring: true },
				},
			]),
			'cycle-1'
		);

		expect(result.registeredChildren[0].enrollments).toEqual([
			{
				ministry_id: 'min_sunday_school',
				ministry_name: 'Sunday School',
				ministry_code: 'min_sunday_school',
				status: 'enrolled',
			},
			{
				ministry_id: 'min_choir',
				ministry_name: 'Joy Bells Choir',
				ministry_code: 'joy-bells',
				status: 'enrolled',
			},
			{
				ministry_id: 'min_mentoring',
				ministry_name: 'Youth Mentoring',
				ministry_code: 'mentoring',
				status: 'expressed_interest',
			},
		]);
	});

	it('records Sunday School once, under its real name', async () => {
		// The confirmation screen used to prettify the selection *code* into a
		// label and prepend a hardcoded 'Sunday School', which double-counted it
		// whenever the form carried the key too.
		const result = await registerHouseholdCanonical(
			payload([
				{
					first_name: 'Sky',
					last_name: 'Rivera',
					dob: '2016-03-02',
					grade: '4th',
					is_active: true,
					ministrySelections: { min_sunday_school: true, 'joy-bells': true },
				},
			]),
			'cycle-1'
		);

		const sundaySchool = result.registeredChildren[0].enrollments.filter(
			e => e.ministry_id === 'min_sunday_school'
		);
		expect(sundaySchool).toHaveLength(1);
		expect(sundaySchool[0].ministry_name).toBe('Sunday School');
		expect(persistedMinistryIds().filter(id => id === 'min_sunday_school')).toHaveLength(1);
	});
});

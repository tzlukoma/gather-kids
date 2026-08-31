import { DatabaseAdapter } from '@/lib/database/types';
import { SupabaseAdapter } from '@/lib/database/supabase-adapter';
import { createSupabaseMock } from '@/test-utils/supabase-mock';

describe('Database Adapter Interface Compliance', () => {
	const requiredMethods = [
		// Household methods
		'getHousehold',
		'createHousehold',
		'updateHousehold',
		'listHouseholds',
		'deleteHousehold',
		
		// Child methods
		'getChild',
		'createChild',
		'updateChild',
		'listChildren',
		'deleteChild',
		
		// Guardian methods
		'getGuardian',
		'createGuardian',
		'updateGuardian',
		'listGuardians',
		'deleteGuardian',
		
		// Emergency Contact methods
		'getEmergencyContact',
		'createEmergencyContact',
		'updateEmergencyContact',
		'listEmergencyContacts',
		'deleteEmergencyContact',
		
		// Registration Cycle methods
		'getRegistrationCycle',
		'createRegistrationCycle',
		'updateRegistrationCycle',
		'listRegistrationCycles',
		'deleteRegistrationCycle',
		
		// Registration methods
		'getRegistration',
		'createRegistration',
		'updateRegistration',
		'listRegistrations',
		'deleteRegistration',
		
		// Ministry methods
		'getMinistry',
		'createMinistry',
		'updateMinistry',
		'listMinistries',
		'deleteMinistry',
		
		// Ministry Enrollment methods
		'getMinistryEnrollment',
		'createMinistryEnrollment',
		'updateMinistryEnrollment',
		'listMinistryEnrollments',
		'deleteMinistryEnrollment',
		
		// Attendance methods
		'getAttendance',
		'createAttendance',
		'updateAttendance',
		'listAttendance',
		'deleteAttendance',
		
		// Incident methods
		'getIncident',
		'createIncident',
		'updateIncident',
		'listIncidents',
		'deleteIncident',
		
		// Event methods
		'getEvent',
		'createEvent',
		'updateEvent',
		'listEvents',
		'deleteEvent',
		
		// User methods
		'getUser',
		'createUser',
		'updateUser',
		'listUsers',
		'deleteUser',
		
		// Leader Profile methods
		'getLeaderProfile',
		'createLeaderProfile',
		'updateLeaderProfile',
		'listLeaderProfiles',
		'deleteLeaderProfile',
		
		// Ministry Leader Membership methods
		'getMinistryLeaderMembership',
		'createMinistryLeaderMembership',
		'updateMinistryLeaderMembership',
		'listMinistryLeaderMemberships',
		'deleteMinistryLeaderMembership',
		
		// Ministry Account methods
		'getMinistryAccount',
		'createMinistryAccount',
		'updateMinistryAccount',
		'listMinistryAccounts',
		'deleteMinistryAccount',
		
		// Branding Settings methods
		'getBrandingSettings',
		'createBrandingSettings',
		'updateBrandingSettings',
		'listBrandingSettings',
		'deleteBrandingSettings',
		
		// Bible Bee methods
		'getBibleBeeCycle',
		'createBibleBeeCycle',
		'updateBibleBeeCycle',
		'listBibleBeeCycles',
		'deleteBibleBeeCycle',
		
		'getDivision',
		'createDivision',
		'updateDivision',
		'listDivisions',
		'deleteDivision',
		
		'getEssayPrompt',
		'createEssayPrompt',
		'updateEssayPrompt',
		'listEssayPrompts',
		'deleteEssayPrompt',
		
		'getEnrollment',
		'createEnrollment',
		'updateEnrollment',
		'listEnrollments',
		'deleteEnrollment',
		
		'getEnrollmentOverride',
		'createEnrollmentOverride',
		'updateEnrollmentOverride',
		'listEnrollmentOverrides',
		'deleteEnrollmentOverride',
		
		// Student Scripture methods
		'getStudentScripture',
		'createStudentScripture',
		'updateStudentScripture',
		'listStudentScriptures',
		'deleteStudentScripture',
		
		// Student Essay methods
		'getStudentEssay',
		'createStudentEssay',
		'updateStudentEssay',
		'listStudentEssays',
		'deleteStudentEssay',
		
		// Special methods
		'subscribeToTable',
		'transaction',
	];

	describe('SupabaseAdapter Interface Compliance', () => {
		test('implements all required methods', () => {
			const mockClient = createSupabaseMock();
			const adapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);
			
			for (const method of requiredMethods) {
				expect(typeof (adapter as any)[method]).toBe('function');
			}
		});

		test('implements DatabaseAdapter interface', () => {
			const mockClient = createSupabaseMock();
			const adapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);
			
			expect(adapter).toBeInstanceOf(SupabaseAdapter);
			
			// Check that it has the interface structure
			expect(adapter).toHaveProperty('getHousehold');
			expect(adapter).toHaveProperty('createHousehold');
			expect(adapter).toHaveProperty('subscribeToTable');
			expect(adapter).toHaveProperty('transaction');
		});

		test('methods have correct signatures', () => {
			const mockClient = createSupabaseMock();
			const adapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);
			
			// Test a few key method signatures
			expect(adapter.getHousehold.length).toBe(1);
			expect(adapter.createHousehold.length).toBe(1);
			expect(adapter.updateHousehold.length).toBe(2);
			expect(adapter.listHouseholds.length).toBe(1);
			expect(adapter.deleteHousehold.length).toBe(1);
			
			expect(adapter.subscribeToTable.length).toBe(2);
			expect(adapter.transaction.length).toBe(1);
		});

		test('subscription method returns function', () => {
			const mockClient = createSupabaseMock();
			const adapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);
			const callback = jest.fn();
			
			const unsubscribe = adapter.subscribeToTable('test', callback);
			expect(typeof unsubscribe).toBe('function');
			
			// Should be safe to call
			expect(() => unsubscribe()).not.toThrow();
		});

		test('transaction method returns promise', async () => {
			const mockClient = createSupabaseMock();
			const adapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);
			const callback = jest.fn().mockResolvedValue('test-result');
			
			const result = adapter.transaction(callback);
			expect(result).toBeInstanceOf(Promise);
			
			const resolved = await result;
			expect(callback).toHaveBeenCalled();
		});
	});

	describe('Interface Consistency', () => {
		test('SupabaseAdapter implements all required methods', () => {
			const mockClient = createSupabaseMock();
			const supabaseAdapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);

			const supabaseMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(supabaseAdapter))
				.filter(name => typeof (supabaseAdapter as any)[name] === 'function' && name !== 'constructor');

			for (const method of requiredMethods) {
				expect(supabaseMethods).toContain(method);
			}
		});

		test('adapter return types are promises and unsubscribe functions', async () => {
			const mockClient = createSupabaseMock();
			const adapter: DatabaseAdapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);

			expect(typeof adapter.getHousehold('test-id')).toBe('object');
			expect(typeof adapter.listHouseholds()).toBe('object');
			expect(typeof adapter.subscribeToTable('test', () => {})).toBe('function');
			expect(typeof adapter.transaction(async () => 'test')).toBe('object');
		});
	});

	describe('Runtime Interface Validation', () => {
		test('adapter can be used through DatabaseAdapter', async () => {
			const mockClient = createSupabaseMock();
			const adapter: DatabaseAdapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);

			try {
				const result = await adapter.getHousehold('non-existent-id');
				expect(result).toBeNull();
			} catch (error) {
				expect(error).toBeDefined();
			}

			try {
				const results = await adapter.listHouseholds();
				expect(Array.isArray(results)).toBe(true);
			} catch (error) {
				expect(error).toBeDefined();
			}

			const unsubscribe = adapter.subscribeToTable('test', () => {});
			expect(typeof unsubscribe).toBe('function');
			unsubscribe();

			const transactionResult = await adapter.transaction(async () => 'test');
			expect(transactionResult).toBe('test');
		});
	});
});
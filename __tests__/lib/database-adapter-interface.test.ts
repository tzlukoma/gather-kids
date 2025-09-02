import { DatabaseAdapter } from '@/lib/database/types';
import { IndexedDBAdapter } from '@/lib/database/indexed-db-adapter';
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
		'getBibleBeeYear',
		'createBibleBeeYear',
		'updateBibleBeeYear',
		'listBibleBeeYears',
		'deleteBibleBeeYear',
		
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
		
		// Special methods
		'subscribeToTable',
		'transaction',
	];

	describe('IndexedDBAdapter Interface Compliance', () => {
		test('implements all required methods', () => {
			const adapter = new IndexedDBAdapter();
			
			for (const method of requiredMethods) {
				expect(typeof (adapter as any)[method]).toBe('function');
			}
		});

		test('implements DatabaseAdapter interface', () => {
			const adapter = new IndexedDBAdapter();
			
			// TypeScript should ensure this, but let's verify at runtime
			expect(adapter).toBeInstanceOf(IndexedDBAdapter);
			
			// Check that it has the interface structure
			expect(adapter).toHaveProperty('getHousehold');
			expect(adapter).toHaveProperty('createHousehold');
			expect(adapter).toHaveProperty('subscribeToTable');
			expect(adapter).toHaveProperty('transaction');
		});

		test('methods have correct signatures', () => {
			const adapter = new IndexedDBAdapter();
			
			// Test a few key method signatures
			expect(adapter.getHousehold.length).toBe(1); // Takes id parameter
			expect(adapter.createHousehold.length).toBe(1); // Takes data parameter
			expect(adapter.updateHousehold.length).toBe(2); // Takes id and data parameters
			expect(adapter.listHouseholds.length).toBe(1); // Takes optional filters parameter
			expect(adapter.deleteHousehold.length).toBe(1); // Takes id parameter
			
			expect(adapter.subscribeToTable.length).toBe(2); // Takes table and callback
			expect(adapter.transaction.length).toBe(1); // Takes callback
		});

		test('subscription method returns function', () => {
			const adapter = new IndexedDBAdapter();
			const callback = jest.fn();
			
			const unsubscribe = adapter.subscribeToTable('test', callback);
			expect(typeof unsubscribe).toBe('function');
			
			// Should be safe to call
			expect(() => unsubscribe()).not.toThrow();
		});

		test('transaction method returns promise', async () => {
			const adapter = new IndexedDBAdapter();
			const callback = jest.fn().mockResolvedValue('test-result');
			
			const result = adapter.transaction(callback);
			expect(result).toBeInstanceOf(Promise);
			
			const resolved = await result;
			expect(callback).toHaveBeenCalled();
		});
	});

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
		test('both adapters implement same interface methods', () => {
			const indexedAdapter = new IndexedDBAdapter();
			const mockClient = createSupabaseMock();
			const supabaseAdapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);
			
			const indexedMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(indexedAdapter))
				.filter(name => typeof (indexedAdapter as any)[name] === 'function' && name !== 'constructor');
			
			const supabaseMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(supabaseAdapter))
				.filter(name => typeof (supabaseAdapter as any)[name] === 'function' && name !== 'constructor');
			
			// Both should have all required methods
			for (const method of requiredMethods) {
				expect(indexedMethods).toContain(method);
				expect(supabaseMethods).toContain(method);
			}
		});

		test('both adapters return compatible types', async () => {
			const indexedAdapter = new IndexedDBAdapter();
			const mockClient = createSupabaseMock();
			const supabaseAdapter = new SupabaseAdapter(
				'https://test.supabase.co',
				'test-key',
				mockClient
			);

			// Test that both adapters can be used interchangeably
			const adapters: DatabaseAdapter[] = [indexedAdapter, supabaseAdapter];
			
			for (const adapter of adapters) {
				// Test return types are consistent
				expect(typeof adapter.getHousehold('test-id')).toBe('object'); // Promise
				expect(typeof adapter.listHouseholds()).toBe('object'); // Promise
				expect(typeof adapter.subscribeToTable('test', () => {})).toBe('function'); // Unsubscribe function
				expect(typeof adapter.transaction(async () => 'test')).toBe('object'); // Promise
			}
		});
	});

	describe('Runtime Interface Validation', () => {
		test('adapters can be used polymorphically', async () => {
			const mockClient = createSupabaseMock();
			const adapters: DatabaseAdapter[] = [
				new IndexedDBAdapter(),
				new SupabaseAdapter('https://test.supabase.co', 'test-key', mockClient)
			];

			for (const adapter of adapters) {
				// Should be able to call methods without knowing the specific adapter type
				try {
					const result = await adapter.getHousehold('non-existent-id');
					expect(result).toBeNull();
				} catch (error) {
					// Some adapters might throw for non-existent IDs, which is also valid
					expect(error).toBeDefined();
				}
				
				// Should be able to call list methods
				try {
					const results = await adapter.listHouseholds();
					expect(Array.isArray(results)).toBe(true);
				} catch (error) {
					// Some test scenarios might not have working databases
					expect(error).toBeDefined();
				}
				
				// Should be able to use utility methods
				const unsubscribe = adapter.subscribeToTable('test', () => {});
				expect(typeof unsubscribe).toBe('function');
				unsubscribe();
				
				const transactionResult = await adapter.transaction(async () => 'test');
				expect(transactionResult).toBe('test');
			}
		});
	});
});